# Direct Host Native Acceptance Matrix — 2026-09-09

Status: handoff for the single authorized native fixture run. This document is a test contract, not execution evidence.

## Boundary

- Use a fresh temporary profile and fixture provider only.
- Do not read, replace, migrate, or modify the installed Rivune profile.
- Do not invoke a real provider CLI, account, API, or network service.
- Record the exact source hashes, build command, test command, artifact path/hash, temporary profile path, and cleanup outcome.
- A test passes only from durable state observed after reopening. Renderer memory, browser storage, logs alone, and an uninterrupted process do not prove recovery.

## Required evidence

| ID | Failure point and setup | Required action | Pass evidence after reopen | Claim unlocked |
|---|---|---|---|---|
| N1 | Fresh profile; exact request/conversation recovery reservation durably written; no run admitted | Kill the packaged process without graceful shutdown, reopen the same temporary profile, reconcile once | Same versioned identity is loaded; no provider execution occurred; reconcile durably rejects/fences the orphan; another reconcile/reopen does not dispatch; exact clear succeeds only after authoritative rejection | Reservation survives process death and delayed dispatch is fenced |
| N2 | Fresh profile; fixture submit admitted and exact run durably queued/running; fixture execution held before terminal | Kill the packaged process, reopen, inspect snapshot, then release/resume only through the supported fixture path | Same request/run identity is present; prompt is not resubmitted; submit count remains exactly 1; durable run reaches one terminal state; reopening again renders the same terminal result | Admitted run recovery does not replay work |
| N3 | Original `submitRun` promise held pending while exact durable run becomes queued/running | From the mounted packaged UI, invoke Cancel before submit resolves; then resolve the late submit response and reopen | Exactly 1 submit and 1 cancel call; Cancel is visibly available only after durable admission; durable state is `cancelled`; late accepted/rejected/thrown submit cannot replace it; reopening shows `cancelled` and submit count remains 1 | Long-running exact-ID cancellation works in the packaged lifetime |
| N4 | Active run A plus completed run B in the same fixture profile | Attempt cancellation with unknown ID, B's terminal ID, and mismatched unresolved identity; then cancel A twice concurrently | Invalid requests never reach host cancel; duplicate active cancel produces at most 1 host cancel; completed result B remains unchanged; A's terminal status comes only from authoritative snapshot | Cancellation is identity-bound and duplicate-safe |
| N5 | Dirty draft with shutdown requested; fixture injects failure/uncertainty during begin, flush, or completion | Try closing, confirm app remains open/blocked, choose the explicit stay/abort path, then reopen | No window close before durable flush receipt; draft text and revision are preserved; no submit occurs; shutdown token is neither silently completed nor implicitly retried; explicit recovery returns workspace to editable state | Failed shutdown cannot lose drafts or admit work |
| N6 | Valid saved snapshot is replaced in the temporary profile by a fixture-created malformed/unsupported/cross-bound recovery record | Launch packaged app against that profile | Load fails closed with a recoverable bounded message; no empty workspace is created or saved; no provider execution/admission occurs; original corrupt bytes remain available for diagnosis | Corrupt persistence is rejected without destructive fallback |
| N7 | Inject persistence faults after pending-file write, file sync, rename, and directory sync for reserve and clear | Run each fault once, restart after each, and read authoritative recovery state | Pre-commit faults retain prior state; post-rename committed uncertainty is resolved by authoritative reread; reserve never disappears after committed rename; clear never reappears after committed removal; no duplicate dispatch | Atomic persistence and post-rename uncertainty handling are proven |

## Native test compilation gate

Before the packaged matrix, compile and execute the frozen Rust recovery tests covering reservation restart, reconcile fencing, exact clear, write/sync/rename faults, clear atomicity, and corrupt load rejection. Record:

1. exact command and working directory;
2. Rust/toolchain versions;
3. total passed/failed/ignored tests;
4. test names for every recovery case;
5. source and receipt SHA-256 values;
6. full failure output if any test does not pass.

A compile failure or ignored recovery test is a failed gate, not “partially verified.”

## Packaged-run receipt requirements

For each N1–N7 row, the receipt must include:

- fixture identity and proof that no real provider was reachable;
- process PID before kill and new PID after reopen where applicable;
- request ID, conversation ID, rich-draft revision, and recovery schema version;
- ordered host calls and counts (`reserve`, `submit`, `reconcile`, `cancel`, `clear`);
- durable snapshot/recovery state before failure, after failure, and after reopen;
- terminal status and persisted answer/error provenance, with prompt/credentials redacted;
- explicit pass/fail against every sentence in the row;
- temporary profile cleanup result after evidence is captured.

Screenshots may support visibility claims, but machine-readable state and call counts are required for lifecycle claims.

## Decision rule

- **Source-ready:** current TypeScript/controller suite remains green and native recovery tests compile/pass.
- **Fixture-ready:** every applicable N1–N7 row passes in the packaged temporary profile.
- **Not yet provider-ready:** fixture success does not prove a real CLI is installed, authenticated, entitled, response-tested, or safe to execute.
- **Not yet installer-ready:** this matrix does not prove signing, notarization, updates, download integrity, or replacement of the installed app.

Any skipped row keeps its corresponding claim unverified. Do not convert a source test, mock, or uninterrupted launch into process-restart evidence.
