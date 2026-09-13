# R6 temporary no-cleanup seal proposal

Status: review-ready proposal only. No copy, staging, signing, cleanup, launch, installation, DMG, provider call, or publication is authorized.

## Bound input

- Original R6 app: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`
- Full tree SHA-256: `175ffbbcf6c5b6bf854818ac0b5a70a569df2eaca4101c94966a47cb32d38137`
- Executable SHA-256: `4cff1fbc4f148a9fcaa79ad39222f9e18626f7de3df7d897c69236e165f1cb32`
- Runtime result: `R6_BUILD_002_RESULT.md` SHA-256 `0c9acc551e10fdc3c6f4f2b8102611ca0bf82ac54346319c4c711815ca8fd6c1`
- Independent review: `R6_BUILD_ARTIFACT_INDEPENDENT_REVIEW.json` SHA-256 `e4e042819d396dad77ebb094e0ecead04c207923a54fa2f1197f5f909377870a`

The original R6 app remains immutable. Any authority must bind the exact hashes above and must not inherit or reuse an R5 seal release.

## Proposed one-time sequence

1. Require `/private/tmp/rivune-r6-seal-001` to be absent, then create it as a fresh directory.
2. Copy the exact R6 app once to `/private/tmp/rivune-r6-seal-001/Rivune.app` without touching the original.
3. Verify the staged pre-seal tree equals `175ffbbcf6c5b6bf854818ac0b5a70a569df2eaca4101c94966a47cb32d38137` and the executable equals `4cff1fbc4f148a9fcaa79ad39222f9e18626f7de3df7d897c69236e165f1cb32`.
4. Record a binary-safe pre-seal inventory with `/usr/bin/xattr -lr -x`. Do not remove or alter xattrs. Expected current state is seven `com.apple.provenance` values, each 11 bytes, hex `0102000E9C74CF0E22EC1C`, value SHA-256 `4cd890844e38317ff65ca710eb18c383c23f3ce6cb95f437ebc26cf8337e9522`.
5. Run exactly one seal command on the staged copy: `/usr/bin/codesign --force --sign - --timestamp=none /private/tmp/rivune-r6-seal-001/Rivune.app`.
6. Record a binary-safe post-seal xattr inventory, full post-seal tree and executable hashes, `/usr/bin/codesign -d --verbose=4`, and `/usr/bin/codesign --verify --deep --strict --verbose=4`.
7. Re-run the existing metadata validator into a fresh R6 seal evidence directory. Stop and report either success or failure. Do not launch the app.

## Acceptance target

Strict verification exits 0, Info.plist is bound, sealed resources are present, identity remains Rivune / `com.rivune.desktop.development` / `0.0.1`, architecture remains arm64, minimum macOS remains 11.0, and `distribution_ready` remains false.

Central must issue a separately hashed, exact one-copy/one-sign release before execution.
