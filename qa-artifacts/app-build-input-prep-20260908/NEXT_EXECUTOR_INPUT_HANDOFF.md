# Next executor input handoff

Status: held until the current frontend, host, and cross-layer sources receive a central acceptance freeze. No Cargo, build, bundle, or signing command was run.

The accepted R3 receipt binds the whole project and host trees, but its explicit `sourceInputs` list omits `src-tauri/Info.plist`, `src-tauri/src/lib.rs`, and `src-tauri/src/constellation_projection.rs`. `PROPOSED_EXECUTOR_NEXT.patch` extends the accepted executor to require and hash all three before execution, then composes the already prepared artifact collector and path-safe writer.

`NEXT_EXECUTOR_INPUT_DELTA.json` is the ready receipt proposal. It leaves the changing aggregate hashes null and keeps the receipt status unresolved. The pinned config, manifest, build script, lockfile, Info.plist, lib.rs, and projection hashes are observations for freeze-time revalidation, not an acceptance claim.

The proposed artifact output root is `qa-artifacts/mac-artifact-evidence-r5-freeze-001`. It did not exist during preparation. At execution freeze, create it as a real, empty directory outside the accepted source root; the evidence and report direct-child paths must remain absent until the path-safe helper creates them.

The v4 concurrency snapshot is not currently source-identical: `host.rs` and `constellation_acceptance_tests.rs` differed during observation while runtime corrections were underway. Central must resolve those mismatches and recompute every aggregate and explicit source hash before setting `central-accepted-stable`.
