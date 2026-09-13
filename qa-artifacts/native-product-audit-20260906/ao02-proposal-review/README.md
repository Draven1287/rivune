# AO-02 isolated provider recovery candidate

2026-09-06. Not integrated, installed, or UI-tested. Shared source unchanged.

## Review files

- `recovery.patch`: two-file implementation patch for Rivune/TerminalAIService.swift and new Rivune/ProviderStatusRecovery.swift.
- `base/TerminalAIService.swift`: exact copied baseline.
- `candidate/`: proposed implementation.
- `tests/`: executable synthetic fixtures and minimal type doubles.
- `fixture-results.txt`: durable 24/24 passing fixture output.

## Behavior

Generic nonzero status-check exits no longer assert sign-out. Claude exit-zero JSON must contain a strict boolean loggedIn: true means signed-in, false means sign-in required. Missing/null/numeric/string/malformed fields are unknown. Even nonzero with loggedIn:false remains unknown until that CLI-version error contract is validated. Codex retains the existing login-status exit-zero success contract; free-form output is not parsed. This means Codex text on successful exit is deliberately not schema-validated, and nonzero textual sign-out is conservatively unknown.

Timeout/launch exceptions remain unavailable. Missing executable remains distinct. Pure recovery values carry static sanitized copy and next-action identifiers; no raw stdout/stderr is returned. No model-unavailable, quota, or network categories are guessed: reliable structured contracts for those are not established here.

Removed generation's broad string matching for authentication/not-logged-in/login-required. Nonzero generation still throws its existing processFailed(provider,status); cancel checks, routes, timeout durations, provider calls, retries and fallback policy are untouched. No additional request is introduced.

## Validation

Compiled helper plus fixtures with xcrun swiftc; all24 checks passed. Parsed candidate TerminalAIService.swift with swiftc -frontend -parse successfully. Patch parses with git apply --stat. The fixture timeout case checks the pure failure mapping, not a real timer/process. Missing-executable case checks its typed recovery, not filesystem discovery. No full app typecheck/link, provider/network/auth call, install or UI interaction occurred.

Reproduce from this directory:

```sh
xcrun swiftc tests/TypeDoubles.swift candidate/ProviderStatusRecovery.swift tests/RecoveryFixtures.swift -o recovery-fixtures
./recovery-fixtures
xcrun swiftc -frontend -parse candidate/TerminalAIService.swift
```

## Integration ownership / remaining work

Native owner integrates only after0619 acceptance and independent review, resolving any newer edits first. Add the helper to the appropriate build/test targets if project discovery is not automatic. Convert fixture cases into native XCTest and run app tests/build. Validate version-specific real status contracts separately before broadening recognition; this patch intentionally favors unknown over a false sign-out claim.

UI integration is NOT included: existing readiness labels still display Unavailable/Sign in required. Suggested separate owner patch: connect unknown to one Check connection action, missing/signed-out to provider setup, and surface the static explanation. Do not add automatic retry, provider switching, auth activation, or raw diagnostics. Until that UI work lands this is a classification fix, not the complete AO-02 UX improvement.

## SHA-256

```text
b78b67ffd65d15173674f61caf8668f0177d634b92b898af82f6719f66d00e31 base/TerminalAIService.swift
43060dcbdf58cd8ff4c17d36f3c96ef49bedd9a75d83c8f1ec562ef10eb194cf candidate/TerminalAIService.swift
063bb7322539bc9e1bde94293f92729097b3ce70beada54b3ccf5cc4b830e806 candidate/ProviderStatusRecovery.swift
```

Shared TerminalAIService.swift still matched the baseline hash at completion.
