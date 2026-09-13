# Account cancellation and deferred refresh — 2026-09-06

Scope: RivuneAccount.swift and native deterministic lifecycle tests. Account services remain disabled; no SDK storage, live sign-in, keychain, or provider calls were used. Installed 0608 was not replaced.

Cancellation is now available beside the waiting indicator outside the disabled form. It immediately invalidates the operation generation, hides identity, clears the challenge/message and queued refresh, and suppresses automatic restoration until another explicit account action. Late success/error and old operation cleanup cannot mutate the newer generation. Authentication checks ownership again before requesting verified identity. Pending sign-out cleanup remains non-cancellable.

The observer admits refresh events synchronously while requests are busy. Events coalesce into one recheck after the owned operation finishes; cancellation/signed-out invalidation drops pending refresh work. A newly started user operation takes precedence over a scheduled recheck.

Five added deterministic tests suspend fake send or identity verification using continuations and expectation barriers: cancel/send/late callback; late verification success and error after a new challenge; stale send success/error while a newer verification stays busy; refresh during send; repeated refresh during verification. No fixed sleeps/yield counts in new tests. Refresh cases exercise the exact synchronous observer admission method, not a live SDK stream.

Validation: all 216 native tests passed, zero failures/skips. Result: /tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_16-33-45--0600.xcresult. Log: /private/tmp/rivune-account-cancel-full-tests.log. Focused seven-test account pass preceded the final two cases.

Limits: these tests establish controller generation ownership for in-flight operations (C01/C02/S02), not a live provider's cancellation or PKCE callback binding. A callback received after a new challenge still relies on the SDK's PKCE state; cold magic-link return and backend session cleanup after cancelled OAuth are not newly proven. Local workspace data is untouched. Account activation and end-to-end Google/Apple/email acceptance remain separate gates. No release, install, or public source archive was produced for this change.
