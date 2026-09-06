#!/bin/zsh

set -euo pipefail

script_dir="${0:A:h}"
project_root="${script_dir:h}"
project_path="$project_root/Rivune.xcodeproj"
scheme="Rivune Mac"
entitlements_path="$project_root/Rivune/Rivune-Mac.entitlements"
developer_id="${RIVUNE_DEVELOPER_ID:-}"
notary_profile="${RIVUNE_NOTARY_PROFILE:-}"
requested_archs="${RIVUNE_ARCHS:-arm64 x86_64}"

usage() {
  cat <<'USAGE'
Usage:
  package_macos_dmg.sh --public-release
  package_macos_dmg.sh --allow-adhoc-preview

--public-release
  Build a distributable release. This is the default when no flag is given and
  fails closed unless RIVUNE_DEVELOPER_ID and RIVUNE_NOTARY_PROFILE are set.

--allow-adhoc-preview
  Explicitly opt into a local-only ad-hoc build. Preview artifacts use distinct
  names and are never reported as distributable or Gatekeeper-ready.
USAGE
}

release_mode="public"
if (( $# > 1 )); then
  usage >&2
  exit 2
fi
if (( $# == 1 )); then
  case "$1" in
    --public-release)
      release_mode="public"
      ;;
    --allow-adhoc-preview)
      release_mode="preview"
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      print -u2 "Unknown option: $1"
      usage >&2
      exit 2
      ;;
  esac
fi

if [[ "$release_mode" == "public" ]]; then
  if [[ -z "$developer_id" || -z "$notary_profile" ]]; then
    print -u2 "Public release blocked: set both RIVUNE_DEVELOPER_ID and RIVUNE_NOTARY_PROFILE."
    print -u2 "For a local-only build, explicitly pass --allow-adhoc-preview."
    exit 1
  fi
  if [[ "$developer_id" != "Developer ID Application: "* ]]; then
    print -u2 "Public release blocked: RIVUNE_DEVELOPER_ID must be a Developer ID Application identity."
    exit 1
  fi
else
  if [[ -n "$developer_id" || -n "$notary_profile" ]]; then
    print -u2 "Ad-hoc preview mode does not accept release credentials. Use --public-release instead."
    exit 1
  fi
fi

if [[ -n "${RIVUNE_OUTPUT_DIR:-}" ]]; then
  output_dir="$RIVUNE_OUTPUT_DIR"
elif [[ "$release_mode" == "preview" ]]; then
  output_dir="$project_root/release/preview"
else
  output_dir="$project_root/release"
fi

if [[ -z "$output_dir" || "$output_dir" == "/" ]]; then
  print -u2 "Refusing unsafe RIVUNE_OUTPUT_DIR: $output_dir"
  exit 1
fi

if [[ -n "${RIVUNE_DEVELOPER_DIR:-}" ]]; then
  developer_dir="$RIVUNE_DEVELOPER_DIR"
elif [[ -d /Applications/Xcode-beta.app/Contents/Developer ]]; then
  developer_dir=/Applications/Xcode-beta.app/Contents/Developer
else
  print -u2 "Xcode Beta was not found. Set RIVUNE_DEVELOPER_DIR to its Contents/Developer directory."
  exit 1
fi

if [[ ! -d "$developer_dir" || ! -x "$developer_dir/usr/bin/xcodebuild" ]]; then
  print -u2 "Invalid Xcode developer directory: $developer_dir"
  exit 1
fi

if [[ ! -d "$project_path" || ! -f "$entitlements_path" ]]; then
  print -u2 "Rivune project or macOS entitlements are missing."
  exit 1
fi

for required_tool in xcodebuild hdiutil codesign xcrun shasum ditto plutil file lipo osascript xattr security spctl grep sed awk head cat readlink mktemp rm mkdir ln sync mv tr; do
  if ! command -v "$required_tool" >/dev/null 2>&1; then
    print -u2 "Missing required release tool: $required_tool"
    exit 1
  fi
done

if [[ "$release_mode" == "public" ]]; then
  valid_identities="$(security find-identity -v -p codesigning 2>/dev/null || true)"
  if [[ "$valid_identities" != *\"$developer_id\"* ]]; then
    print -u2 "Public release blocked: the requested Developer ID Application identity is not available or valid in the Keychain."
    exit 1
  fi
fi

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/rivune-dmg.XXXXXX")"
derived_data="$work_dir/DerivedData"
app_stage="$work_dir/app"
dmg_stage="$work_dir/dmg-root"
rw_dmg="$work_dir/Rivune-read-write.dmg"
pending_dmg="$work_dir/Rivune.dmg"
app_notary_zip="$work_dir/Rivune-app-notarization.zip"
app_notary_result="$work_dir/app-notary-result.json"
dmg_notary_result="$work_dir/dmg-notary-result.json"
layout_attach_plist="$work_dir/layout-attach.plist"
layout_mount=""
layout_device=""
validation_mount="$work_dir/validation-mount"
layout_attached=false
validation_attached=false

cleanup() {
  if [[ "$validation_attached" == true ]]; then
    hdiutil detach "$validation_mount" -quiet >/dev/null 2>&1 || true
  fi
  if [[ "$layout_attached" == true ]]; then
    layout_detach_target="${layout_mount:-$layout_device}"
    if [[ -n "$layout_detach_target" ]]; then
      hdiutil detach "$layout_detach_target" -quiet >/dev/null 2>&1 || true
    fi
  fi
  rm -rf -- "$work_dir"
}
trap cleanup EXIT INT TERM

mkdir -p "$app_stage" "$dmg_stage" "$validation_mount" "$output_dir"

sanitize_release_xattrs() {
  local target_path="$1"
  xattr -cr "$target_path"
  for attribute_name in com.apple.FinderInfo com.apple.ResourceFork 'com.apple.fileprovider.fpfs#P'; do
    xattr -d "$attribute_name" "$target_path" 2>/dev/null || true
  done
}

validate_developer_signature() {
  local target_path="$1"
  local label="$2"
  local require_hardened_runtime="$3"
  local signature_report="$work_dir/${label// /-}-signature.txt"
  local timestamp_value=""
  local team_identifier=""

  if ! codesign --display --verbose=4 "$target_path" 2> "$signature_report"; then
    print -u2 "Public release blocked: could not inspect the $label signature."
    return 1
  fi
  if ! grep -F "Authority=$developer_id" "$signature_report" >/dev/null; then
    print -u2 "Public release blocked: $label is not signed by the requested Developer ID Application identity."
    return 1
  fi

  timestamp_value="$(sed -n 's/^Timestamp=//p' "$signature_report" | head -n 1)"
  if [[ -z "$timestamp_value" || "$timestamp_value" == "none" ]]; then
    print -u2 "Public release blocked: $label does not contain a secure signing timestamp."
    return 1
  fi

  team_identifier="$(sed -n 's/^TeamIdentifier=//p' "$signature_report" | head -n 1)"
  if [[ -z "$team_identifier" || "$team_identifier" == "not set" ]]; then
    print -u2 "Public release blocked: $label has no Developer ID team identifier."
    return 1
  fi

  if [[ "$require_hardened_runtime" == "1" ]] \
    && ! grep -E '^flags=.*runtime' "$signature_report" >/dev/null; then
    print -u2 "Public release blocked: $label is missing the hardened runtime signature flag."
    return 1
  fi
}

submit_and_require_notary_acceptance() {
  local artifact_path="$1"
  local result_path="$2"
  local label="$3"
  local status=""
  local submission_id=""

  print "Submitting $label for Apple notarization..."
  if ! DEVELOPER_DIR="$developer_dir" xcrun notarytool submit "$artifact_path" \
    --keychain-profile "$notary_profile" \
    --wait \
    --output-format json > "$result_path"; then
    print -u2 "Public release blocked: Apple notarization did not complete successfully for $label."
    return 1
  fi

  status="$(plutil -extract status raw -o - "$result_path" 2>/dev/null || true)"
  submission_id="$(plutil -extract id raw -o - "$result_path" 2>/dev/null || true)"
  if [[ "$status" != "Accepted" ]]; then
    print -u2 "Public release blocked: Apple notarization status for $label was '${status:-unknown}' (submission ${submission_id:-unknown})."
    return 1
  fi
  print "Apple notarization accepted $label (submission $submission_id)."
}

require_gatekeeper_acceptance() {
  local target_path="$1"
  local assessment_type="$2"
  local label="$3"
  local report_path="$work_dir/${label// /-}-gatekeeper.txt"
  local -a assessment_command

  if [[ "$assessment_type" == "open" ]]; then
    assessment_command=(spctl --assess --type open --context context:primary-signature --verbose=4 "$target_path")
  else
    assessment_command=(spctl --assess --type execute --verbose=4 "$target_path")
  fi

  if ! "${assessment_command[@]}" > "$report_path" 2>&1; then
    print -u2 "Public release blocked: Gatekeeper rejected $label."
    cat "$report_path" >&2
    return 1
  fi
  if ! grep -F 'accepted' "$report_path" >/dev/null \
    || ! grep -F 'source=Notarized Developer ID' "$report_path" >/dev/null; then
    print -u2 "Public release blocked: Gatekeeper did not report both acceptance and a Notarized Developer ID source for $label."
    cat "$report_path" >&2
    return 1
  fi
}

update_build_settings=()
if [[ "${RIVUNE_ENABLE_DIRECT_UPDATES:-0}" == "1" ]]; then
  [[ "$release_mode" == "public" ]] || { print -u2 "Direct updates require a public Developer ID release."; exit 1; }
  : "${RIVUNE_UPDATE_FEED_URL:?Supply HTTPS appcast URL}"
  : "${RIVUNE_UPDATE_PUBLIC_KEY:?Supply public EdDSA key}"
  : "${RIVUNE_UPDATE_TEAM_ID:?Supply expected Developer ID team}"
  update_build_settings=('SWIFT_ACTIVE_COMPILATION_CONDITIONS=$(inherited) DIRECT_UPDATES')
fi

print "Building Rivune Release with Xcode Beta..."
DEVELOPER_DIR="$developer_dir" xcodebuild -quiet \
  -project "$project_path" \
  -scheme "$scheme" \
  -configuration Release \
  -destination 'generic/platform=macOS' \
  -derivedDataPath "$derived_data" \
  ARCHS="$requested_archs" \
  ONLY_ACTIVE_ARCH=NO \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  "${update_build_settings[@]}" \
  clean build

built_app="$derived_data/Build/Products/Release/Rivune.app"
if [[ ! -d "$built_app" ]]; then
  print -u2 "Release build did not produce Rivune.app at $built_app"
  exit 1
fi

release_app="$app_stage/Rivune.app"
ditto "$built_app" "$release_app"
if [[ "${RIVUNE_ENABLE_DIRECT_UPDATES:-0}" == "1" ]]; then
  python3 "$script_dir/configure_update_release.py" "$release_app/Contents/Info.plist"
fi
sanitize_release_xattrs "$release_app"

if [[ "$release_mode" == "public" ]]; then
  signing_mode="Developer ID signed"
  codesign --force --deep --options runtime --timestamp \
    --entitlements "$entitlements_path" \
    --sign "$developer_id" \
    "$release_app"
  validate_developer_signature "$release_app" "Rivune app" 1
else
  signing_mode="Ad-hoc local preview"
  codesign --force --deep --options runtime \
    --entitlements "$entitlements_path" \
    --sign - \
    "$release_app"
fi

codesign --verify --deep --strict --verbose=2 "$release_app"

display_name="$(plutil -extract CFBundleDisplayName raw -o - "$release_app/Contents/Info.plist")"
bundle_name="$(plutil -extract CFBundleName raw -o - "$release_app/Contents/Info.plist")"
bundle_id="$(plutil -extract CFBundleIdentifier raw -o - "$release_app/Contents/Info.plist")"
icon_name="$(plutil -extract CFBundleIconName raw -o - "$release_app/Contents/Info.plist")"
marketing_version="$(plutil -extract CFBundleShortVersionString raw -o - "$release_app/Contents/Info.plist")"
build_number="$(plutil -extract CFBundleVersion raw -o - "$release_app/Contents/Info.plist")"

if [[ "$display_name" != "Rivune" || "$bundle_name" != "Rivune" \
  || "$bundle_id" != "com.aaravshah.alloy.mac" || "$icon_name" != "AppIcon" ]]; then
  print -u2 "Unexpected app identity: display=$display_name name=$bundle_name bundle=$bundle_id icon=$icon_name"
  exit 1
fi

icon_path="$release_app/Contents/Resources/AppIcon.icns"
if [[ ! -s "$icon_path" ]]; then
  print -u2 "Rivune's compiled AppIcon.icns is missing or empty."
  exit 1
fi

binary_path="$release_app/Contents/MacOS/Rivune"
if [[ ! -x "$binary_path" ]]; then
  print -u2 "Rivune executable is missing from the Release app."
  exit 1
fi
binary_archs="$(lipo -archs "$binary_path")"
for requested_arch in ${(z)requested_archs}; do
  if [[ " $binary_archs " != *" $requested_arch "* ]]; then
    print -u2 "Release executable is missing requested architecture: $requested_arch"
    exit 1
  fi
done

if [[ "$release_mode" == "public" ]]; then
  ditto -c -k --keepParent "$release_app" "$app_notary_zip"
  submit_and_require_notary_acceptance "$app_notary_zip" "$app_notary_result" "Rivune.app"
  DEVELOPER_DIR="$developer_dir" xcrun stapler staple "$release_app"
  DEVELOPER_DIR="$developer_dir" xcrun stapler validate "$release_app"
  codesign --verify --deep --strict --verbose=2 "$release_app"
  validate_developer_signature "$release_app" "stapled Rivune app" 1
fi

ditto "$release_app" "$dmg_stage/Rivune.app"
ln -s /Applications "$dmg_stage/Applications"

if [[ "$release_mode" == "public" ]]; then
  volume_name="Rivune"
else
  volume_name="Rivune Preview"
fi

hdiutil create -quiet \
  -volname "$volume_name" \
  -fs HFS+ \
  -format UDRW \
  -srcfolder "$dmg_stage" \
  "$rw_dmg"

hdiutil attach -readwrite -nobrowse -noverify -plist "$rw_dmg" > "$layout_attach_plist"
layout_attached=true
for entity_index in {0..9}; do
  candidate_mount="$(plutil -extract "system-entities.$entity_index.mount-point" raw -o - "$layout_attach_plist" 2>/dev/null || true)"
  if [[ -n "$candidate_mount" ]]; then
    layout_mount="$candidate_mount"
    layout_device="$(plutil -extract "system-entities.$entity_index.dev-entry" raw -o - "$layout_attach_plist" 2>/dev/null || true)"
    break
  fi
done
if [[ -z "$layout_mount" || ! -d "$layout_mount" ]]; then
  print -u2 "Could not resolve the writable DMG mount point."
  exit 1
fi
layout_volume_name="${layout_mount:t}"

if [[ "${RIVUNE_SKIP_FINDER_LAYOUT:-0}" != "1" ]]; then
  if ! osascript - "$layout_volume_name" <<'APPLESCRIPT'
on run argv
    set volumeName to item 1 of argv
    tell application "Finder"
        tell disk volumeName
            open
            set current view of container window to icon view
            set toolbar visible of container window to false
            set statusbar visible of container window to false
            set pathbar visible of container window to false
            set bounds of container window to {180, 180, 820, 610}
            set theViewOptions to the icon view options of container window
            set arrangement of theViewOptions to not arranged
            set icon size of theViewOptions to 112
            set text size of theViewOptions to 13
            set position of item "Rivune.app" of container window to {170, 205}
            set position of item "Applications" of container window to {470, 205}
            update without registering applications
            delay 1
            close
        end tell
    end tell
end run
APPLESCRIPT
  then
    print -u2 "Warning: Finder layout could not be applied; the DMG remains usable with its default icon layout."
  fi
fi

sanitize_release_xattrs "$layout_mount/Rivune.app"
codesign --verify --deep --strict --verbose=2 "$layout_mount/Rivune.app"
sync
hdiutil detach "$layout_mount" -quiet
layout_attached=false

hdiutil convert -quiet "$rw_dmg" \
  -format UDZO \
  -imagekey zlib-level=9 \
  -o "$pending_dmg"

if [[ "$release_mode" == "public" ]]; then
  codesign --force --timestamp --sign "$developer_id" "$pending_dmg"
  validate_developer_signature "$pending_dmg" "Rivune DMG" 0
else
  codesign --force --sign - "$pending_dmg"
fi
codesign --verify --verbose=2 "$pending_dmg"

notarization_mode="Not notarized"
if [[ "$release_mode" == "public" ]]; then
  submit_and_require_notary_acceptance "$pending_dmg" "$dmg_notary_result" "Rivune.dmg"
  DEVELOPER_DIR="$developer_dir" xcrun stapler staple "$pending_dmg"
  DEVELOPER_DIR="$developer_dir" xcrun stapler validate "$pending_dmg"
  codesign --verify --verbose=2 "$pending_dmg"
  validate_developer_signature "$pending_dmg" "notarized Rivune DMG" 0
  notarization_mode="App and DMG notarized and stapled"
fi

hdiutil attach -quiet -readonly -nobrowse -noverify \
  -mountpoint "$validation_mount" "$pending_dmg"
validation_attached=true

mounted_app="$validation_mount/Rivune.app"
if [[ ! -d "$mounted_app" ]]; then
  print -u2 "Mounted DMG is missing Rivune.app"
  exit 1
fi
if [[ ! -L "$validation_mount/Applications" || "$(readlink "$validation_mount/Applications")" != "/Applications" ]]; then
  print -u2 "Mounted DMG is missing the /Applications symlink"
  exit 1
fi
if [[ "$(plutil -extract CFBundleDisplayName raw -o - "$mounted_app/Contents/Info.plist")" != "Rivune" ]]; then
  print -u2 "Mounted app has the wrong display name"
  exit 1
fi
if [[ "$(plutil -extract CFBundleIdentifier raw -o - "$mounted_app/Contents/Info.plist")" != "com.aaravshah.alloy.mac" ]]; then
  print -u2 "Mounted app has the wrong compatibility bundle identifier"
  exit 1
fi
if [[ "$(plutil -extract CFBundleName raw -o - "$mounted_app/Contents/Info.plist")" != "Rivune" \
  || "$(plutil -extract CFBundleIconName raw -o - "$mounted_app/Contents/Info.plist")" != "AppIcon" \
  || ! -s "$mounted_app/Contents/Resources/AppIcon.icns" ]]; then
  print -u2 "Mounted app has the wrong Rivune name or icon identity"
  exit 1
fi
codesign --verify --deep --strict --verbose=2 "$mounted_app"

gatekeeper_mode="Not assessed; ad-hoc preview is not distributable"
if [[ "$release_mode" == "public" ]]; then
  DEVELOPER_DIR="$developer_dir" xcrun stapler validate "$mounted_app"
  DEVELOPER_DIR="$developer_dir" xcrun stapler validate "$pending_dmg"
  codesign --verify --deep --strict --check-notarization --verbose=2 "$mounted_app"
  require_gatekeeper_acceptance "$mounted_app" "execute" "mounted Rivune app"
  require_gatekeeper_acceptance "$pending_dmg" "open" "Rivune DMG"
  gatekeeper_mode="Accepted mounted app and DMG"
fi

hdiutil detach "$validation_mount" -quiet
validation_attached=false

if [[ "$release_mode" == "public" ]]; then
  artifact_name="Rivune"
  distribution_label="Distributable public release"
else
  artifact_name="Rivune-Preview"
  distribution_label="Local ad-hoc preview only"
fi

final_dmg="$output_dir/$artifact_name.dmg"
checksum_path="$output_dir/$artifact_name.dmg.sha256"
release_info_path="$output_dir/$artifact_name.dmg.release-info.txt"

# The immutable DMG is the only distributable artifact. Do not leave a second
# loose app in a cloud-backed workspace: File Provider can attach Finder xattrs
# after validation and make that convenience copy fail later strict checks.
rm -rf -- "$output_dir/$artifact_name.app"
mv -f "$pending_dmg" "$final_dmg"

(
  cd "$output_dir"
  shasum -a 256 "$artifact_name.dmg" > "$artifact_name.dmg.sha256"
  shasum -a 256 -c "$artifact_name.dmg.sha256"
)

checksum_value="$(awk '{print $1}' "$checksum_path")"
xcode_version="$(DEVELOPER_DIR="$developer_dir" xcodebuild -version | tr '\n' ' ' | sed 's/[[:space:]]*$//')"

{
  print "Product: Rivune"
  print "Version: $marketing_version ($build_number)"
  print "Distribution: $distribution_label"
  print "Architectures: $binary_archs"
  print "Signing: $signing_mode"
  print "Notarization: $notarization_mode"
  print "Gatekeeper: $gatekeeper_mode"
  print "Bundle identifier: $bundle_id (retained for update compatibility)"
  print "Xcode: $xcode_version"
  print "SHA-256: $checksum_value"
} > "$release_info_path"

if [[ "$release_mode" == "preview" ]]; then
  print -u2 "LOCAL PREVIEW ONLY: $artifact_name.dmg is ad-hoc signed, is not notarized, and must not be published."
else
  print "Public release gate passed: Developer ID signature, secure timestamps, hardened runtime, notarization, stapling, and Gatekeeper assessment all succeeded."
fi

print "Created $final_dmg"
print "Created $checksum_path"
print "Created $release_info_path"
print "Architectures: $binary_archs"
print "SHA-256: $checksum_value"

# Optional local preparation only, after every public packaging gate above.
# No upload occurs here. Private keys and endpoints are supplied by release owners.
if [[ "${RIVUNE_PREPARE_UPDATE_FEED:-0}" == "1" ]]; then
  if [[ "$release_mode" != "public" ]]; then
    print -u2 "Update feed blocked: local previews cannot enter a public appcast."
    exit 1
  fi
  python3 "$project_root/scripts/prepare_update_feed.py" \
    --dmg "$final_dmg" --release-info "$release_info_path" \
    --notes "${RIVUNE_UPDATE_NOTES:?Supply reviewed HTML release notes}" \
    --output "${RIVUNE_UPDATE_OUTPUT:?Supply a new local feed output directory}" \
    --sparkle-bin "${RIVUNE_SPARKLE_BIN:?Supply the official Sparkle bin directory}" \
    --private-key "${RIVUNE_UPDATE_PRIVATE_KEY_FILE:?Supply external signing key path}" \
    --download-prefix "${RIVUNE_UPDATE_DOWNLOAD_PREFIX:?Supply HTTPS archive directory}" \
    --notes-prefix "${RIVUNE_UPDATE_NOTES_PREFIX:?Supply HTTPS notes directory}" \
    --team-id "${RIVUNE_UPDATE_TEAM_ID:?Supply expected Developer ID team}" \
    --previous-build "${RIVUNE_UPDATE_PREVIOUS_BUILD:?Supply previous public build}"
fi
