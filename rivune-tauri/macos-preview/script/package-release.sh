#!/usr/bin/env bash
set -euo pipefail
PREVIEW_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT="$(cd "$PREVIEW_ROOT/.." && pwd)"
: "${RIVUNE_SIGNING_IDENTITY:?Set the Developer ID identity used to sign the app}"
: "${RIVUNE_NOTARY_PROFILE:?Set the Keychain profile for Apple notarization}"
(cd "$WEB_ROOT" && node scripts/shared-bundle.mjs verify && node scripts/release-config.mjs --release)
APP="$(cat "$PREVIEW_ROOT/build/verified-app-path.txt")"
codesign --verify --deep --strict "$APP"
# Refuse development bundles even if ad hoc signing validation passes.
python3 - "$APP/Contents/Info.plist" "$WEB_ROOT/release/generated/host.json" <<'PY'
import json,plistlib,sys
with open(sys.argv[1],'rb') as f: info=plistlib.load(f)
with open(sys.argv[2]) as f: host=json.load(f)
assert not info.get('RivuneDevelopmentBuild',True), 'Rebuild with --release'
assert info['RivuneSourceDigest']==host['sourceDigest'], 'App does not match current shared source'
assert info['CFBundleShortVersionString']==host['version'], 'Version mismatch'
PY
SIGNATURE="$(codesign -dv --verbose=2 "$APP" 2>&1)"
[[ "$SIGNATURE" == *"Authority=Developer ID Application:"* ]] || { echo "Developer ID signature required" >&2; exit 1; }
STAGING="$(mktemp -d /private/tmp/rivune-release.XXXXXX)"
ZIP="$STAGING/Rivune.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
# Explicit release operation: submits the signed app to Apple, never a model provider.
xcrun notarytool submit "$ZIP" --keychain-profile "$RIVUNE_NOTARY_PROFILE" --wait
xcrun stapler staple "$APP"
xcrun stapler validate "$APP"
spctl --assess --type execute "$APP"
rm "$ZIP"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ZIP"
mkdir "$STAGING/Installer"
cp -R "$APP" "$STAGING/Installer/Rivune.app"
ln -s /Applications "$STAGING/Installer/Applications"
hdiutil create -volname Rivune -srcfolder "$STAGING/Installer" -ov -format UDZO "$STAGING/Rivune.dmg"
codesign --timestamp --sign "$RIVUNE_SIGNING_IDENTITY" "$STAGING/Rivune.dmg"
xcrun notarytool submit "$STAGING/Rivune.dmg" --keychain-profile "$RIVUNE_NOTARY_PROFILE" --wait
xcrun stapler staple "$STAGING/Rivune.dmg"
# generate_appcast uses Sparkle's signing key in Keychain; keep the private key local.
PREFIX="$(python3 - "$WEB_ROOT/release/config.json" <<'PY'
import json,sys
from urllib.parse import urljoin
with open(sys.argv[1]) as f: print(urljoin(json.load(f)['sparkle']['endpoint'],'.'))
PY
)"
mkdir "$STAGING/Updates"
mv "$ZIP" "$STAGING/Updates/"
"$PREVIEW_ROOT/build/swift/artifacts/sparkle/Sparkle/bin/generate_appcast" --download-url-prefix "$PREFIX" "$STAGING/Updates"
echo "Release artifacts prepared at $STAGING. Review and upload separately; nothing was published."
