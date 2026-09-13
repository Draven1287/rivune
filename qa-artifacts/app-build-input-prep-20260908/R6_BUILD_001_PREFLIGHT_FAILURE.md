# R6 build 001 preflight failure

Status: stopped before build; the one-invocation release is consumed. No retry was made.

- Authority: `CENTRAL_BUILD_RELEASE_R6_001.md`
- Accepted receipt SHA-256: `011450ff14f9c4eb757a714736e8634d4899cd0435073c1a3eba31ba957820f1`
- Executor SHA-256: `1256d71507b38c7d9b8d17ab703b26ad66bc53e642238c1f68edda247f00323f`
- Phase: `build-reviewable-app`
- Exit code: 1
- Elapsed: approximately 0.079 seconds
- Exact output: `installer packaging refused: Build environment CARGO_HOME does not match acceptance`

The command shell did not export the environment values bound in the accepted receipt. The executor correctly failed its environment preflight before Cargo metadata, Tauri compilation, artifact production, or evidence collection. The required app output path remains absent. The preserved R5 original and the separately sealed R5 QA artifact remain untouched.

Any next attempt requires a new explicit release binding the same accepted receipt and executor to a shell environment that exactly exports `CARGO_HOME`, `RUSTUP_HOME`, `CARGO_TARGET_DIR`, `SDKROOT`, `PATH`, and `CARGO_NET_OFFLINE`. This receipt does not authorize a retry.
