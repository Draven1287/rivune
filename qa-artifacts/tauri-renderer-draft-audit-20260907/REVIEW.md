# Renderer draft regression findings

Two actual-module tests fail against the frozen source identified by SOURCE.json. This is a deterministic Node DOM/host fixture, not a rendered native-app test. The initial harness file-URL decoding error was fixed before these behavioral failures were recorded.

1. Pending input debounce resurrects an accepted draft: enter text, send before the 180ms draft timer, receive acceptance, then execute the pending timer. Composer is blank, but host draft becomes the sent text again.
2. Switching C1 to C2 and back uses stale conversation snapshot data: after the new draft was successfully saved at the host, returning to C1 displays an empty composer. The host still has the draft; subsequent editing can replace it.

Runtime owner has these findings and the portable regression harness. Source stays frozen here; root made no candidate4 edits. Run node --test regressions.test.mjs for the captured failures; set RIVUNE_RENDERER_SOURCE to a corrected web directory for retest.

No claim of a third reproduced failure: source inspection also found no automatic run-completion refresh, and the owner was asked to verify answer delivery after asynchronous completion.
