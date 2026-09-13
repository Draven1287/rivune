# Rivune installer readiness candidate 2

This small offline review artifact corrects the installer gate without building an installer or changing Rivune source.

- macOS, Windows, and Linux all use Tauri packaging plans.
- Execution requires an explicit absolute working directory and a v2 acceptance receipt bound to hashes computed from the real renderer and host trees.
- Windows tool discovery honors `PATH` and `PATHEXT`; entry-point comparison uses Node's `pathToFileURL`.
- macOS bundle staging compares the complete `.app` inventory and contents, including `Info.plist`, resources, and symlink targets.

Run `npm test` and `npm run check`. Tests use temporary local fixtures only. They do not invoke Cargo, Tauri, hdiutil, a network, or a package manager.
