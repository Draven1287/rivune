# Build the native client from source

The tested local toolchain is Xcode 27.0 beta, build 27A5228h, at
/Applications/Xcode-beta.app,
macOS 27.0 beta on Apple Silicon. The project deployment target is macOS 26+.
GitHub Actions also builds and tests on its macOS 26 runner. Other SDK/toolchain
combinations have not been validated. Swift package versions and revisions are
pinned in Package.resolved.

```sh
export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer
xcodebuild -resolvePackageDependencies -project Rivune.xcodeproj -scheme 'Rivune Mac'
xcodebuild -project Rivune.xcodeproj -scheme 'Rivune Mac' -configuration Release \
  -destination 'platform=macOS' -derivedDataPath /tmp/rivune-source-build CODE_SIGNING_ALLOWED=NO build
xcodebuild -project Rivune.xcodeproj -scheme 'Rivune Mac' \
  -destination 'platform=macOS' -derivedDataPath /tmp/rivune-source-tests CODE_SIGNING_ALLOWED=NO test
xcodebuild -project Rivune.xcodeproj -scheme 'Rivune iOS' \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/rivune-source-ios CODE_SIGNING_ALLOWED=NO build
```

Tests use synthetic fixtures and do not need provider accounts. Building is
separate from signing/installing; never treat an unsigned local build as an
end-user installer. Live CLI/API tests require explicit provider access and may
incur provider charges. Physical iPhone relay remains a separate acceptance test.

## Prepare a source release candidate

Python 3.9+ is sufficient. The exact allowlist is scripts/open_source_files.txt.
New files must be reviewed and explicitly added. Run from the repository root:

```sh
python3 scripts/test_source_export.py
python3 scripts/prepare_open_source.py \
  --revision "$(git rev-parse HEAD)" /tmp/rivune-public-candidate
unzip -t /tmp/rivune-public-candidate.zip
cd /tmp && shasum -a 256 -c rivune-public-candidate.zip.sha256
```

This creates a native-only export and a deterministic ZIP, including exact file
hashes and version/build provenance. It removes official account configuration,
excludes local history/coordination/build output, and reports heuristic scan
findings by filename/rule only. A scan is not proof that no secrets exist.
Inspect candidate contents, extract to a fresh directory and run the checks
above. This command does not update website downloads, create a remote, or
upload an artifact. Omitting `--revision` is supported for local unpublished
review, but a public archive should always identify the full commit it represents.

The separately maintained website uses Node >=22.13 and its npm lockfile:
`npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run test:account`,
`npm run test:workspace`, `npm run build`. These are website checks, not native
app or authentication proof. Website source is not in this native export.
