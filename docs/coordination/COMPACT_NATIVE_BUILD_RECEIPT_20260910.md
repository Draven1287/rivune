# Isolated compact workspace Tauri build

Build PASS; build-only scope. Accepted source commit3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d, Git tree9c588772e018a7b1cbbd1f742497f4c69c9ae71f, manifest SHA2562fd881e5fe5f5579f0e1d4b7f7a094b894ba7a6d2453afb21d1fab9d8fe7c46e. Read COMPACT_WORKSPACE_EXPORT_REVIEW.md independent PASS before work. All141 accepted source file hashes and tracked Git state matched before and after compilation.

Artifact: qa-artifacts/compact-native-build-20260910/Rivune Compact QA.app.
Executable: Contents/MacOS/rivune, Mach-O64-bit arm64.
Binary SHA256: efbd99a1bfb9b149057874f942aa07f72ebbcd9e3ccee41628429a925575850a.
Bundle ID: com.rivune.desktop.qa.compact20260910.
Window title override: Rivune Compact QA · build review only.
Reserved profile: qa-artifacts/compact-native-build-20260910/profile-reserved-not-launched (not launched/initialized).

Exact commands (full argv, cwd and environment are in build-receipt.json):
1. In accepted candidate prototypes/ai-native-workspace: npm run build:desktop. Uses existing node_modules symlink; TypeScript passed, Vite built54 modules, and accepted build-desktop.mjs copied matching native desktop-host.mjs and generated desktop-entry.mjs. No dependency install or server.
2. Copy that dedicated generated dist-desktop into isolated qa-artifacts/compact-native-build-20260910/frontend-dist; it is the absolute frontendDist in tauri-override.json.
3. In accepted candidate qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri: .toolchains/cargo/bin/cargo build --locked --offline --features custom-protocol --bin rivune (Cargo executable is workspace absolute). Existing CARGO_HOME=.toolchains/cargo, RUSTUP_HOME=.toolchains/rustup and shared CARGO_TARGET_DIR=.toolchains/target-candidate4-r2. TAURI_CONFIG supplies the isolated identity/window/frontend path only. Cargo/rustc1.98.1, aarch64-apple-darwin. Compile completed in7.50s.
4. Stage compiled binary, accepted icon and an isolated Info.plist in the distinct QA.app directory. This is a manually staged local review bundle, not a distributable installer. No codesign, notarization, installer or release command was invoked. LSEnvironment reserves only this build's profile and system PATH.

Embedded frontend evidence: frontend-assets.json lists all7 generated input file hashes. desktop-entry imports the accepted desktop-host bridge before assets/index-CkgoZvBh.js. The bridge SHA256 is0d23ea7fb3bdc3cb521994fad953ca568f0e73ef88ac46ef5fdd2fa1a722c17f, byte-identical to the accepted native web bridge. Frontend HTML uses the desktop entry and removes browser CSP; accepted native CSP remains the base configuration. Native compiler dependency output references every isolated frontend input, captured in native-asset-dependencies.d and packaging-verification.json. This is compiled asset/path evidence, not webview runtime acceptance.

Logs: frontend-build.log and native-build.log, both exit0. Native emitted the existing unused-variable warning for d at constellation_projection.rs:104; no error. Full build/environment/toolchain/config/binary and bundle-file hashes are in build-receipt.json. build.py is the exact guarded build driver. It refuses to overwrite an existing receipt.

Preservation: source-before.json equals source-after.json. Installed Rivune binary/Info.plist, prior S02 QA binary/Info.plist and every prior S02 profile file match preserved-before.json/preserved-after.json. Process reads before and after show only installed PID1250 (started Sep9 22:13:18) and S02 QA PID64247 (started Sep10 07:12:24), with unchanged executable paths/start times; no new Rivune process was launched. Those read-only ps checks required sandbox escalation. The candidate retains clean tracked state and its same recorded untracked node_modules symlink/gen directory. No prior app/profile was replaced, restarted or edited.

No provider operation, new server/cache/dependency installation, remote, push, publication or signing/notarization action. Shared build cache was reused as authorized. Exact-export global styles remain the prior accepted export version, so source/packaging acceptance does not substitute for exact-export rendered review. Native startup, viewer/list/composer interactions and restart remain separate gates. Desktop reviewer can now inspect packaging and source identity without launching this build.
