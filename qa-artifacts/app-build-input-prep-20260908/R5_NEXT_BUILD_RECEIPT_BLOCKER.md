# Next build receipt blocker

Canonical `src-tauri/src/main.rs` is now SHA-256 `47fca9898207ebdf7881b52f36b460d3161579ac152ac1c0e4243caf91c5d78a`, replacing the R5 build receipt hash `e1d25ff5db187cc7f2908dc96610e4c63b5dd1a9ca3edef1b97840e7123cdbba`.

The source diff removes the `cfg!(debug_assertions)` restriction on `RIVUNE_ISOLATED_PROFILE_DIR`. It now accepts an explicit absolute non-root path distinct from the default profile, rejects parent/current relative components, rejects already existing symlink components and regular files, and adds four focused unit tests for default, valid isolated, invalid/fallback, and symlink/file cases.

No accepted runtime correction checkpoint, exact test receipt, or new aggregate project/host receipt was present during this review. The existing sealed R5 app remains bound to the older `main.rs` and must not be treated as containing this correction. Preparing another executable receipt now would freeze an unaccepted changing source.

Next gate: runtime supplies the accepted `main.rs` hash and test receipt; central freezes all current project, renderer, host, explicit-source, Cargo-config, metadata, external-dependency, tool, and fresh-output bindings. The previously proven packaging sequence may then be reused: one accepted build, external non-File-Provider staging, one local ad hoc seal, and strict metadata qualification. All prior build and seal releases are consumed.

Independent source-review limit: the component checks use path inspection followed later by profile opening, so they do not by themselves establish race-proof filesystem confinement. This does not invalidate the controlled fresh-profile QA plan, but any stronger hostile-local-process security claim needs a directory-handle-based design or equivalent proof.

No build, copy, signing, normalization, launch, installation, DMG, deletion, provider call, or publication was performed.
