#!/bin/zsh

set -euo pipefail

script_dir="${0:A:h}"
project_root="${script_dir:h}"
download_dir="$project_root/website/public/downloads"
archive_path="$download_dir/rivune-source-preview.zip"
checksum_path="$download_dir/rivune-source-preview.zip.sha256"
staging_dir="$(mktemp -d "${TMPDIR:-/tmp}/rivune-source-preview.XXXXXX")"
package_root="$staging_dir/Rivune-source-preview"

mkdir -p "$download_dir"
pending_dir="$(mktemp -d "$download_dir/.rivune-source-preview.pending.XXXXXX")"
pending_archive="$pending_dir/rivune-source-preview.zip"
pending_checksum="$pending_dir/rivune-source-preview.zip.sha256"

cleanup() {
  rm -rf -- "$staging_dir"
  rm -rf -- "$pending_dir"
}
trap cleanup EXIT INT TERM

cd "$project_root"

for required_tool in rg zip unzip shasum awk find sort sed; do
  if ! command -v "$required_tool" >/dev/null 2>&1; then
    print -u2 "Missing required release tool: $required_tool"
    exit 1
  fi
done

copy_release_file() {
  local source_path="$1"

  if [[ ! -f "$source_path" || -L "$source_path" ]]; then
    print -u2 "Unsafe or missing release file: $source_path"
    exit 1
  fi

  local destination="$package_root/$source_path"
  mkdir -p "${destination:h}"
  cp -p "$source_path" "$destination"
}

# This manifest is intentionally exact. Adding a new public source file requires
# reviewing it and adding its path here; ignored or newly created files are never
# discovered by extension and therefore cannot silently enter a release.
release_files=(
  .github/ISSUE_TEMPLATE/bug_report.yml
  .github/ISSUE_TEMPLATE/config.yml
  .github/ISSUE_TEMPLATE/feature_request.yml
  .github/pull_request_template.md
  .gitignore
  Rivune.xcodeproj/project.pbxproj
  "Rivune.xcodeproj/xcshareddata/xcschemes/Rivune Mac.xcscheme"
  "Rivune.xcodeproj/xcshareddata/xcschemes/Rivune iOS.xcscheme"
  Rivune/RivuneApp.swift
  Rivune/Rivune-Mac.entitlements
  Rivune/RivuneStore.swift
  Rivune/Assets.xcassets/AccentColor.colorset/Contents.json
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneAppIcon.png
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac128.png
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac16.png
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac256.png
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac32.png
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac512.png
  Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac64.png
  Rivune/Assets.xcassets/AppIcon.appiconset/Contents.json
  Rivune/Assets.xcassets/Contents.json
  Rivune/BrandMigration.swift
  Rivune/Components.swift
  Rivune/EvaluationLab.swift
  Rivune/Info-Mac.plist
  Rivune/Info-iOS.plist
  Rivune/Models.swift
  Rivune/PairingScannerView.swift
  Rivune/PeerBridge.swift
  Rivune/ProviderRegistry.swift
  Rivune/RootView.swift
  Rivune/RivuneCollaborationRunner.swift
  Rivune/SettingsView.swift
  Rivune/SidebarView.swift
  Rivune/SpeechDictationController.swift
  Rivune/TerminalAIService.swift
  Rivune/Theme.swift
  Rivune/WelcomeView.swift
  Rivune/WorkspaceView.swift
  RivuneTests/RivuneDeterministicTests.swift
  CODE_OF_CONDUCT.md
  CONTRIBUTING.md
  LICENSE
  NOTICE
  README.md
  SECURITY.md
  docs/ARCHITECTURE.md
  docs/MACOS_RELEASE.md
  docs/OPEN_SOURCE_STRATEGY.md
  scripts/generate_app_icon.swift
  scripts/package_macos_dmg.sh
  scripts/package_source_preview.sh
  scripts/validate_bridge_budget.swift
)

for release_file in "${release_files[@]}"; do
  copy_release_file "$release_file"
done

# Keep the reviewed manifest explicit, but fail if a Swift source referenced by
# the Xcode project was accidentally omitted. This prevents a downloadable
# archive from looking complete while failing as soon as it is opened.
while IFS= read -r source_name; do
  if ! find "$package_root/Rivune" "$package_root/RivuneTests" \
    -type f -name "$source_name" -print -quit | rg -q .; then
    print -u2 "Release manifest is missing Xcode source: $source_name"
    exit 1
  fi
done < <(
  rg 'path = [A-Za-z][A-Za-z0-9_-]*\.swift;' Rivune.xcodeproj/project.pbxproj \
    | sed -E 's/.*path = ([A-Za-z][A-Za-z0-9_-]*\.swift);.*/\1/' \
    | sort -u
)

if rg -l --hidden --fixed-strings "/Users/${USER}/" "$package_root"; then
  print -u2 "Release staging contains a machine-specific user path"
  exit 1
fi

if rg -l --hidden \
  'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|ghp_[0-9A-Za-z]{30,}|xox[baprs]-[0-9A-Za-z-]{20,}|sk-[A-Za-z0-9_-]{20,}|ANTHROPIC_API_KEY[[:space:]]*=|OPENAI_API_KEY[[:space:]]*=' \
  "$package_root"; then
  print -u2 "Release staging contains a credential-like value"
  exit 1
fi

(
  cd "$staging_dir"
  zip -q -r -X "$pending_archive" Rivune-source-preview
)

checksum_value="$(shasum -a 256 "$pending_archive" | awk '{print $1}')"
print "$checksum_value  rivune-source-preview.zip" > "$pending_checksum"
unzip -tq "$pending_archive"

mv -f "$pending_archive" "$archive_path"
mv -f "$pending_checksum" "$checksum_path"

(
  cd "$download_dir"
  shasum -a 256 -c rivune-source-preview.zip.sha256
)

checksum_value="$(awk '{print $1}' "$checksum_path")"
print "Created $archive_path"
print "SHA-256: $checksum_value"
