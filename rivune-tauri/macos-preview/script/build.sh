#!/usr/bin/env bash
set -euo pipefail
PREVIEW_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT="$(cd "$PREVIEW_ROOT/.." && pwd)"
SKIP_WEB=false
RELEASE=false
for ARG in "$@"; do
  case "$ARG" in
    --skip-web-build) SKIP_WEB=true ;;
    --release) RELEASE=true ;;
    *) echo "Usage: $0 [--skip-web-build] [--release]" >&2; exit 2 ;;
  esac
done
if ! $SKIP_WEB; then (cd "$WEB_ROOT" && npm run build); fi
CONFIGURATION=debug
if $RELEASE; then
  : "${RIVUNE_SIGNING_IDENTITY:?Set a Developer ID Application identity for release builds}"
  case "$RIVUNE_SIGNING_IDENTITY" in "Developer ID Application:"*) ;; *) echo "A Developer ID Application identity is required" >&2; exit 2;; esac
  CONFIGURATION=release
  (cd "$WEB_ROOT" && node scripts/release-config.mjs --release)
fi
(cd "$WEB_ROOT" && node scripts/shared-bundle.mjs verify && node scripts/release-config.mjs)
test -f "$WEB_ROOT/dist/index.html" || { echo "Missing dist; run npm run build first." >&2; exit 1; }
export CLANG_MODULE_CACHE_PATH="$PREVIEW_ROOT/build/module-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$PREVIEW_ROOT/build/module-cache"
swift build --package-path "$PREVIEW_ROOT" --scratch-path "$PREVIEW_ROOT/build/swift" --configuration "$CONFIGURATION" --disable-sandbox
BINARY_DIR="$(swift build --package-path "$PREVIEW_ROOT" --scratch-path "$PREVIEW_ROOT/build/swift" --configuration "$CONFIGURATION" --show-bin-path --disable-sandbox)"
# Assemble outside Documents/iCloud: its file provider can reattach FinderInfo
# immediately after xattr removes it, making otherwise valid signatures fail.
STAGING_ROOT="$(mktemp -d /private/tmp/rivune-sharedpreview.XXXXXX)"
APP="$STAGING_ROOT/Rivune Preview.app"
trap 'rm -rf "$STAGING_ROOT"' ERR
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BINARY_DIR/RivunePreview" "$APP/Contents/MacOS/RivunePreview"
cp "$WEB_ROOT/src-tauri/icons/icon.icns" "$APP/Contents/Resources/icon.icns"
mkdir -p "$APP/Contents/Frameworks"
cp -R "$BINARY_DIR/Sparkle.framework" "$APP/Contents/Frameworks/"
# A fresh bundle has no stale hashed assets. Normal copies preserve source attributes.
cp -R "$WEB_ROOT/dist" "$APP/Contents/Resources/Web"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>RivunePreview</string>
<key>CFBundleIdentifier</key><string>com.rivune.sharedpreview</string>
<key>CFBundleName</key><string>Rivune Preview</string>
<key>CFBundleDisplayName</key><string>Rivune Preview</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>0.1.0</string>
<key>CFBundleVersion</key><string>1</string>
<key>LSMinimumSystemVersion</key><string>14.0</string>
<key>NSPrincipalClass</key><string>NSApplication</string>
<key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
python3 - "$WEB_ROOT/release/generated/host.json" "$APP/Contents/Info.plist" <<'PYINFO'
import json,plistlib,sys
with open(sys.argv[1]) as f: config=json.load(f)
with open(sys.argv[2],'rb') as f: info=plistlib.load(f)
info['CFBundleIconFile']='icon.icns'
info['CFBundleShortVersionString']=config['version']
info['CFBundleVersion']=config['version']
info['RivuneDevelopmentBuild']=config['channel']=='development'
info['RivuneSourceDigest']=config['sourceDigest']
info['SUEnableAutomaticChecks']=False
info['SUAutomaticallyUpdate']=False
if config['sparkle']['endpoint']:
 info['SUFeedURL']=config['sparkle']['endpoint']
 info['SUPublicEDKey']=config['sparkle']['publicKey']
with open(sys.argv[2],'wb') as f: plistlib.dump(info,f)
PYINFO
# Clean only signing-incompatible metadata on these generated copies. Do not
# clear quarantine, provenance, or other extended attributes, or touch sources.
xattr -dr com.apple.FinderInfo "$APP" 2>/dev/null || true
xattr -dr com.apple.ResourceFork "$APP" 2>/dev/null || true
if $RELEASE; then
  FRAMEWORK="$APP/Contents/Frameworks/Sparkle.framework/Versions/B"
  for ITEM in "$FRAMEWORK/XPCServices/Downloader.xpc" "$FRAMEWORK/XPCServices/Installer.xpc" "$FRAMEWORK/Updater.app" "$FRAMEWORK/Autoupdate" "$APP/Contents/Frameworks/Sparkle.framework"; do
    if test -e "$ITEM"; then codesign --force --options runtime --timestamp --sign "$RIVUNE_SIGNING_IDENTITY" "$ITEM"; fi
  done
  codesign --force --options runtime --timestamp --sign "$RIVUNE_SIGNING_IDENTITY" "$APP"
else
  codesign --force --sign - "$APP"
fi
xattr -dr com.apple.FinderInfo "$APP" 2>/dev/null || true
codesign --verify --deep --strict "$APP"
# Keep the existing developer launch entrypoint while the actual bundle stays
# outside the file-provider-managed workspace. Replace only our generated output.
LOCAL_APP="$PREVIEW_ROOT/build/Rivune Preview.app"
rm -rf "$LOCAL_APP"
ln -s "$APP" "$LOCAL_APP"
printf '%s\n' "$APP" > "$PREVIEW_ROOT/build/verified-app-path.txt"
trap - ERR
echo "Built local preview: $APP"
echo "Workspace launch alias: $LOCAL_APP"
