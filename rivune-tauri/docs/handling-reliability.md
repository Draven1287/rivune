# Rivune handling reliability — September 12, 2026

This change focuses on functional behavior while preserving the existing visual direction.

## Changes

- Composer Send becomes Stop during an active reply, including when the message field is empty. Stopping preserves partial output and the unsent follow-up draft. Enter while replying does not cancel the reply.
- View active reply returns to a running conversation after navigating away. A second live Claude request is blocked locally while another chat is replying; the existing server concurrency guard remains.
- Initial message persistence is transactional in memory: a failed save rolls back a newly added chat or appended turn, leaves the draft intact, and prevents provider execution. Known draft conflicts block sending until resolved.
- Claude stream cancellation interrupts pending reads even when an injected fetch or stream cancellation hook ignores abort. Buffered completion cannot follow an abort, and partial output remains available.
- Anchored menus support Escape focus restoration, Tab wrapping, and arrow/Home/End navigation in button menus. Native form controls keep their keys. Menus reposition and scroll within available window space.

## Verification

- Production frontend build passed.
- All 74 regression tests passed, including four stream-cancellation cases and three failed-save rollback cases.
- Browser mock check: Send → navigate to New conversation → View active reply → Stop; the draft survived.
- Browser mock check: offline error → retry with success; the draft remained, and completed output plus draft survived reload.
- Browser menus: End selected the last AI option; Tab wrapped to the first; Escape restored the anchor. At 760 × 500, message options and expanded Connections stayed within viewport bounds with overflow scrolling.
- Shared Mac preview built and launched. The composer Stop control stopped a local simulated reply. Its ad hoc signature passed verification; all 21 bundled files matched the frontend dist hashes.

No live or paid model requests were used for these checks. Local storage failure handling is regression-tested through the persistence callback; native live provider execution, native Liquid Glass, and release signing remain separate unfinished integrations.
