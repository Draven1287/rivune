# Rivune installer readiness candidate 3

This is a small offline correction artifact. It does not build or publish an installer.

The execution gate derives the Tauri config, Cargo manifest, build script, lockfile, and `frontendDist` from an explicit absolute working directory. A v3 receipt binds the actual project, renderer, host, reachable Cargo configuration, operating system, and architecture. Filesystem tree hashes cover entry type, permission mode, size, content, and internal symlink targets; broken and external tree symlinks are rejected.

Tool discovery follows valid executable symlinks and returns the resolved executable. Windows lookup honors `PATH`, `PATHEXT`, and case-insensitive filenames. Artifact locations use the effective `CARGO_TARGET_DIR`.

On macOS, execution also requires a prior accepted hash of the complete Tauri `.app` under the effective target directory. The app must contain `Contents/Info.plist` and `Contents/Resources`; its verified copy is staged outside the accepted project and compared in full before the packaging command can run.

Run `npm test` and `npm run check`. Tests use temporary Node fixtures only and never invoke Cargo, Tauri, a package manager, or the network.
