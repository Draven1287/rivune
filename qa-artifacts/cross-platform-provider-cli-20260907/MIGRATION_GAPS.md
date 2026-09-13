# Exact migration gaps from Rivune's current adapter

Current source inspected: `Rivune/TerminalAIService.swift` and `Rivune/ProviderRegistry.swift` on 2026-09-07. No production source was changed.

1. `TerminalAIService` compiles provider discovery, probing, execution, and cancellation only under `#if os(macOS)` and returns `macRequired` elsewhere.
2. `CLIProviderDiscovery.trustedSearchDirectories` is intentionally macOS-specific and splits PATH only on `:`. It has no native Windows `;`/`PATHEXT` handling and no WSL identity.
3. `MacCLIInventory` bakes in Homebrew, npm, nvm, Volta, and macOS user paths. Replace it with an OS-specific inventory conforming to the neutral discovery contract; retain bounded search directories.
4. `TerminalProcessJob.safeEnvironment` creates a fixed macOS PATH and uses `HOME`/`TMPDIR`. Native Windows needs injected `USERPROFILE`, `TEMP`, PATH and PATHEXT rules without forwarding provider tokens or API keys.
5. `Process` launch already uses `executableURL` plus `[String]` arguments, which is the correct no-shell boundary. Preserve it on POSIX; implement and test a native Windows launcher rather than quoting a command string.
6. Cancellation imports Darwin and sends POSIX signals. Linux needs Glibc equivalents; native Windows needs a reviewed process-tree termination implementation. Do not label cancellation supported until those tests exist.
7. Authentication commands are currently rendered as shell-quoted strings for copying. Model setup actions as executable-plus-arguments and render per shell only at the UI boundary.
8. Provider readiness errors say “Mac” and `macRequired`. Replace with host-aware copy that distinguishes unsupported OS, missing CLI, sign-in required, adapter unavailable, and remote Mac relay.
9. Codex and Claude argument/output contracts must be verified per current CLI version on each OS before release. This prototype intentionally does not execute either CLI.
10. Add real Windows and Linux CI runners with dummy executables before claiming cross-platform support. macOS unit success proves only the pure compatibility seam.
11. Native Windows package-manager installs may expose `.cmd` wrappers. Candidate 2 detects these but refuses to invoke a shell. A future owner must either locate a direct vendor `.exe` or specify and fuzz-test a shell-specific launcher before supporting wrappers.

Recommended merge order for the native owner: add neutral types and fixtures; adapt macOS without behavior changes; add Linux runner/tests; add WSL bridge/tests; add native Windows launcher/cancellation/tests; only then expose new availability in UI.
