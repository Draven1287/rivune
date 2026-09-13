# Saved-result fixture lifecycle and dialog focus correction

Two source files changed: prototypes/ai-native-workspace/tests/savedResult.fixture.tsx and src/host/SavedResult.tsx. Exact before/after hashes: qa-artifacts/saved-result-lifecycle-focus-20260910/previous-hashes.json and source-hashes.json. The retained fixture manifest is refreshed. Global stylesheet, galaxy/sidebar edits, result CSS and copy-session implementation are unchanged.

Fixture P2: removed restoration of the original clipboard and removal of settlement listeners on pagehide. Stub and key handler now remain throughout the selected document's lifetime, including a retained back/forward-cache document. Nothing in the mounted fixture can fall through to an original clipboard. No actual clipboard is read or written.

Adapted the independent reviewer's VM harness to transpile the current fixture and assert safe behavior. Three tests pass: invalid scenario isolation; selected initial stub/no fallthrough; repeated persisted/nonpersisted pagehide/pageshow leaves the same stub and keyboard settlement listener with zero instrumented-original calls. Harness and tests.log are in qa-artifacts/saved-result-lifecycle-focus-20260910. This is lifecycle orchestration evidence, not actual browser BFCache eligibility proof.

Dialog keyboard improvement: on Tab, collect currently visible, enabled, nonnegative-tabIndex controls inside the dialog. Forward at the last wraps to first; reverse at first wraps to last; an out-of-list focused control also returns inside. Escape/Close logic is preserved. No styling changes.

Targeted rendered evidence on the existing4317 fixture: opening partial B initially focused Close; Shift+Tab moved directly to Select all; Tab returned directly to Close; Escape restored Inspect saved partial answer. No BODY boundary occurred in these changed-edge samples. Deferred stub still accepted a pending copy without OS clipboard access; no broader stale-copy matrix rerun. A later accessibility handle became stale and the page returned to initial fixture state, so no extra deferred-settlement acceptance is claimed from that sequence.

TypeScript passes. No server/native/provider process started or restarted, no OS clipboard mutation, no publication, no private QA forwarding. Existing URL remains http://127.0.0.1:4317/tests/savedResult.html?scenario=saved-result. Independent reviewers can now verify only the changed lifecycle and focus boundaries; prior responsive/literal/denial/stale review remains separately scoped evidence.
