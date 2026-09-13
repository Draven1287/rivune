# R5 native runtime checkpoint — 2026-09-08

This checkpoint is source/test evidence only. It does not authorize or claim a build, install, live provider request, account probe, spend, publish, signing, notarization, DMG, update, or release.

## Landed in the canonical Tauri host source

- `selection` and `team` are one atomic rich-draft mutation identity, are persisted, reopened, and echoed in every rich receipt.
- A saved provider-default selection is resolved only against the exact current catalog revision and frozen in the admitted request. A legacy free-text provider model is cleared rather than silently leaking into the new selection route.
- Stale revisions fail with `CATALOG_STALE`; explicit models or efforts fail with `MODEL_CAPABILITIES_UNKNOWN` until an adapter proves them.
- Catalog refresh is cache-only and performs no provider execution, network call, account inspection, or credential read.
- Saved providers are capped, validated, unique, and selected-provider references are fail-closed on reopen.
- Team structure is validated (2–6 distinct members and an exact lead match), but Constellation submission is deliberately rejected with `ENGINE_NOT_CONNECTED` until the existing team engine is wired to host persistence, cancellation, retry, and public activity.
- Public `runtimeCapabilities` therefore truthfully remains `unavailable`.

## Verification

- Rust library tests: 88 passed, 0 failed.
- Rust binary tests: 2 passed, 0 failed.
- R5-specific host tests cover truthful catalog state, exact runtime capability JSON, mutation identity, receipt echo, reopen persistence, provider-default admission, stale revision rejection, unverified model rejection, duplicate-team rejection, and unconnected-engine rejection.
- The serialized fixture was produced by compiling and running `src-tauri/examples/r5_contract_fixture.rs`; the captured output is `RUNTIME_FIXTURE_ACTUAL.json`.

## Frozen source hashes

- `src-tauri/src/host.rs`: `4d98341da52e965666e671a90bdb043695dacda756f3b1ae95e9aa7efc122c84`
- `src-tauri/src/main.rs`: `8b6895dbdb6420a1b3bb0d06200599e6d404f8b8b2475448f631647d2e14db65`
- `src-tauri/examples/r5_contract_fixture.rs`: `2b977deddd4b1e50cfb31543aacf2ee166db0c9fdf2552385af0d5eb48c6b579`

The next safe milestone is the actual Council/Constellation host connection. The interface must not expose that mode while this checkpoint reports `ENGINE_NOT_CONNECTED`.
