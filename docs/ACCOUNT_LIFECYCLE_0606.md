# Account lifecycle changes for local review 2026090606

Source/fixture evidence only; review account configuration remains disabled.

- AuthClient now lives behind a MainActor backend protocol. Its real implementation
  is created only after explicit account action and the stable Developer ID gate.
  Tests alone can inject a fake backend; launch/Settings are inert.
- One owned observer starts with the client. Refresh triggers fresh verification;
  signed-out events invalidate pending results. Verification clears the verified
  identity while underway and supports an explicit retry after an offline failure.
- Each operation captures a revision. Sign-out invalidates it before awaiting
  cleanup. Old verification results cannot restore the identity.
- Sign-out intent and cleanup-pending state persist independently. Failure makes
  no claim of successful token removal and keeps Retry sign-out visible after
  recreation. Repeated in-flight sign-out calls are suppressed. New sign-in is
  blocked until cleanup succeeds.
- Unsolicited URL-shaped email callbacks cannot create a client: an explicit
  in-process pending email challenge is required. Cold email return after process
  termination is not supported by this policy; restart the sign-in flow. The SDK
  must still validate PKCE/exchange. No transaction tokens are logged or exported.

Tests exercise no client before explicit action, unsolicited callback rejection,
exactly-one observer, refreshed-event/offline verification/retry, revoked session
identity clearing, failed sign-out/recreation/retry, and delayed verification after
sign-out. These do not prove real SDK Keychain cleanup or OAuth delivery.

Still required before activation: stable signed Google/Apple/email tests, real
expiry/foreground behavior, full email challenge/replay cases, account deletion
backend and user-confirmed deletion flow, privacy/export scope, and all requirements
in the planning task's A01–A16 acceptance contract. No account or provider credentials
were enabled and no real account was deleted or signed in during this pass.

Project inspection diagnosis: the September 6 13:39:42 SkyComputerUseService crash
report records EXC_BREAKPOINT/SIGTRAP at Swift Array.remove(at:), followed by helper
compactMap traversal frames. Rivune remains alive. This establishes a helper crash;
it does not prove the project's accessibility structure is correct. Do not change
project layout speculatively to mask the helper failure. Project detail rendered
CRUD/file/keyboard acceptance remains pending.

## Installed evidence

Installed 0.2 (2026090606) at /Applications/Rivune.app after Release success and
204 passed / 0 failed / 0 skipped in saved xcresult:
/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_14-05-27--0600.xcresult.
Build log /private/tmp/rivune-0606-build.log; tests /private/tmp/rivune-0606-tests.log.
Deep strict ad-hoc signature verified, account Enabled=false. Rollback 0605 kept
at /private/tmp/rivune-review-2026090606/Rivune-previous.app; recovery from it has
not been exercised. Native inspection observed Home/Ready, Command-comma Settings,
and Account/Local workspace without a Keychain authorization dialog on0606.
No real sign-in or provider request was made.
