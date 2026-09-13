# R6 build 002 result

Status: compilation and `.app` bundling succeeded; expected bundle qualification failed at the linker-only signature gate. The single released invocation is consumed. No retry or signing was performed.

## Authority and invocation

- Release: `CENTRAL_BUILD_RELEASE_R6_002.md`
- Release SHA-256: `3cd97eb0ac3002663d180289ae2ec9735f769b86713154f21b0f0edc1084a178`
- Accepted receipt: `CENTRAL_ACCEPTED_PROJECT_R6_001.json`
- Accepted receipt SHA-256: `011450ff14f9c4eb757a714736e8634d4899cd0435073c1a3eba31ba957820f1`
- Executor SHA-256: `1256d71507b38c7d9b8d17ab703b26ad66bc53e642238c1f68edda247f00323f`
- Phase: `build-reviewable-app`
- Exact executor exit: 1, after approximately 2 minutes 11 seconds of optimized compilation.
- Terminal result: `installer packaging refused: artifact validator did not qualify the bundle`

The invocation supplied exactly the six non-sensitive environment values bound in the accepted receipt: `CARGO_HOME`, `RUSTUP_HOME`, `CARGO_TARGET_DIR`, `SDKROOT`, `PATH`, and `CARGO_NET_OFFLINE=true`. The target remained `.toolchains/target-candidate4-r2`.

## Produced artifact

- App: `.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`
- Tree SHA-256: `175ffbbcf6c5b6bf854818ac0b5a70a569df2eaca4101c94966a47cb32d38137`
- Tree entries: 7
- Executable SHA-256: `4cff1fbc4f148a9fcaa79ad39222f9e18626f7de3df7d897c69236e165f1cb32`
- Architecture: arm64
- Minimum macOS: 11.0
- SDK: 27.0
- Bundle identifier: `com.rivune.desktop.development`
- Version: 0.0.1

The release executable contains the new isolated-profile fail-closed messages and does not contain the removed `RIVUNE_ISOLATED_PROFILE_DIR is development-only` message.

## Qualification evidence

- Evidence SHA-256: `cdcb080305e34cf5e146fd3f2a45cddfe02f73222062dda88854d8854cd99f42`
- Validation report SHA-256: `0a4c22860c49c2e5166c5a6d90161fce6938bd9fd732f194f0f0efc6460a121b`
- Classification: `linker_only`
- Strict deep verification exit: 1
- Info.plist bound: false
- Sealed resources present: false
- Qualified for native review: false
- Distribution ready: false
- Verification error: `code has no resources but signature indicates they must be present`

## Boundary

The result is an exact unsealed R6 build candidate, not a runnable native-review acceptance and not a distribution artifact. No second build, ad-hoc bundle seal, launch, installation, DMG, Developer ID signing, notarization, provider call, deletion, or publication occurred. Any staging/seal attempt requires a separately frozen artifact and explicit central release.
