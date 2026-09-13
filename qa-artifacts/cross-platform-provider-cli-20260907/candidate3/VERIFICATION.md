# Verification record

Boundary: zero spend; no provider calls; no credential reads; no account changes; no production source edits; no Windows/Linux support claim.

Run from this directory:

```sh
xcrun swiftc -typecheck Sources/CrossPlatformProviderCLI/CrossPlatformProviderCLI.swift
xcrun swiftc Sources/CrossPlatformProviderCLI/CrossPlatformProviderCLI.swift Smoke/main.swift -o /tmp/rivune-cross-platform-provider-cli-smoke
/tmp/rivune-cross-platform-provider-cli-smoke
```

Observed for candidate 3 on macOS on 2026-09-07:

- Typecheck: passed.
- Offline recording-runner smoke suite: `PASS: 21 isolated checks`.
- The equivalent SwiftPM/XCTest suite is included. Its run was stopped without a result after it waited behind concurrent workspace Xcode/Swift compilation; it is not counted as passing or failing.

Coverage includes POSIX and native Windows PATH syntax, case-insensitive Windows environment keys with ambiguous duplicate-key fail-closed handling, PATHEXT, relative-PATH rejection, WSL separation, rooted explicit paths and directories with spaces, drive-relative and direct-runner path rejection, argument/metacharacter preservation without a shell, script-wrapper fail-closed behavior across PATH discovery, explicit discovery, and direct runner calls, native `.exe` success, unknown-host fail-closed behavior, actionable missing-provider feedback, unverified-support launch blocking, mandatory credential environment stripping at the runner boundary, and architecture classification.

The Windows/Linux cases are deterministic contract simulations executed by Swift on macOS. They are not native Windows/Linux runtime tests.
