# Separate AO-02 setup-row candidate

Not integrated. This patch is only the first-run ConnectionSetupSheet providerRow in SettingsView.swift, not a redesign of every connection surface.

- Patch: `recovery-ui.patch`.
- Base: `ui-base/SettingsView.swift`, SHA-256 `ea208d9823b4f107d22eca3d76806cd40582055e79f606b0c0a98de38860375e`.
- Candidate: `ui-candidate/SettingsView.swift`, SHA-256 `5ce09bfdf6356ac04f91b8e8ddfde41c24e24e63bc9930dee4a79be306dbd79b`.
- Revised patch SHA-256: `30e76d6f5a6f029eb7772fdd98bfaf2f14e95b6341ae5efb1ca355dc7f6d3fdd`.
- Requires `ProviderStatusRecovery` from the separate classification patch to be in the build target.

Unknown readiness displays “Not verified,” the helper’s sanitized explanation, and a user-triggered Check connection button. The button calls the existing refreshConnections action; the help/accessibility copy makes clear this refreshes configured connections, not just one provider. Both its action guard and disabled state use startupPhase == checking, not the CLI-only isChecking helper. Isolated-preview protection remains. Missing/signed-out sign-in help and copy-command behavior are untouched. No onAppear/task/automatic check was introduced, and no retry or model/account inference was added.

Review correction: the original candidate used the CLI-only isChecking helper and could restart a pending API check. Revised candidate fixes that. Source inspection confirms RivuneStore.refreshConnections calls launchConnectionChecks synchronously; StartupReadiness.swift:108 marks checking before launching work and :193 completes the phase after the task group and capability read (:155–159). tests/check_refresh_guard.rb extracts the actual candidate action and disabled expression and runs9/9 passing recording-state checks, including immediate double invocation, CLI-done/API-held, full completion, and preview no-op. Durable output: ui-fixture-results.txt. This models lifecycle state; it does not run real concurrent provider checks.

Validation: candidate Swift syntax parse passed. Inspected exact unified diff (one label change and one16-line conditional block). Shared Settings source still matched base when checked. No SwiftUI typecheck/full app build, rendered test, activation, or live connection check occurred. The isolated preview retains its existing generic Preview state; this is not a newly injectable live readiness fixture.

Native owner must review/rebase after0619, integrate the helper first, then typecheck and visually exercise unknown→checking→ready/unknown with a safe fixture. Confirm one click triggers only the existing check path, stays disabled during checking, preserves the draft, and does not send chat. Existing refresh routing policy is unchanged; this patch does not add provider switching logic.

Other Settings connection surfaces remain separate follow-up work; do not label this the complete AO-02 UX implementation.
