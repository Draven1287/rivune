# Settings registration race: bounded fixture report

2026-09-09. Production source unchanged. No native/SystemUIServer/browser interaction, dirty-draft/shutdown execution, provider calls or cross-task forwarding.

Command: `node --experimental-strip-types --test qa-artifacts/tray-settings-review-20260909/settings-registration.test.mjs` — **6 passed, 0 failed**. Four cases import the actual lifecycle coordinator with mocked registration; two test a proposed navigation-slot model only. Passing reproduction tests confirm the race exists; they do not mean it is fixed.

## Observed

- Before start: emitted Settings disappears; completing registration does not replay it.
- During delayed registration: emitted Settings disappears; only a later click reaches the callback.
- Ready: three clicks invoke the callback three times through one subscription; disposal prevents later delivery. React's existing boolean Settings state is intended to keep a single dialog, but DOM idempotence/focus was not executed here.
- Registration failure: lifecycle enters blocked, with zero Settings callbacks and zero mutation calls. All mutation methods in the fixture throw if invoked.
- Actual startup recovery excludes ConnectedHostWorkspace by source inspection in the preceding report. The recovery test here is the proposed policy model, not a mounted/native recovery test.

## Smallest proposed protocol

Keep the existing `rivune://open-settings` event and add one **volatile host navigation slot**, containing only a process-local monotonic request ID. It is neither draft persistence nor an authorization token. Successful main-window focus precedes recording/emitting the request. Coalesce repeated clicks into the latest ID; never accumulate a queue.

Add read-only `pending_settings_request` and conditional `ack_settings_request(id)` bridge operations. Register the event listener **first**, then read the pending slot, closing the subscribe/read race. Pass IDs to a small renderer dispatcher that deduplicates concurrent delivery of the same ID. Acknowledge only after the mounted dialog is actually open (including already-open state); an older acknowledgement cannot clear a later ID. Failed mount/show or disposal must leave the slot pending for the next valid listener. Duplicate delivery retries acknowledgement without toggling/closing the dialog or resetting focus. Keep only bounded last-handled/in-flight identity, not an ever-growing set.

Recovery policy: disable Settings in host startup recovery, clear any pending Settings navigation, and preserve the existing recovery surface. If event capability registration fails after normal startup, keep the existing explicit lifecycle-unavailable notice and do not acknowledge a Settings request as opened. No automatic retry loop; a deliberate next activation or remount can retry.

## Exact acceptance for builder

| Schedule | Required outcome |
| --- | --- |
| Click before renderer ready | Main window focuses; one pending ID survives; one dialog opens after a valid mount and ACK clears it. |
| Click while listener registration is pending | Register-then-read catches it; no lost request even if event and pending-read both deliver the ID. |
| Repeated clicks before ready | One coalesced request; one dialog after ready. |
| Repeated clicks while open | Remains open, focus stays in dialog, no draft/state reset; each latest request is acknowledged. |
| New click while earlier ACK is pending | Earlier ACK cannot clear the newer slot; newer delivery is eventually handled. |
| Unmount or showModal failure before ACK | Slot retained; no callbacks into disposed React; remount may deliver once. |
| Startup recovery | Settings disabled; no queued navigation, mutation or hidden background dialog. |
| Subscription failure | Visible unavailable state; no false ACK or mutation. |

Next verification should extend clean component fixtures to actual dialog open/focus/ACK and delayed registration. The current six cases do not execute IPC, Rust, HTML focus or native tray selection. Builder alone owns production protocol implementation.

Hashes: imported lifecycle.ts `525870d379655896d86b8964bde41852c00249a4017ada100f1ea380ccc3f30e`; fixture `5ed2d39e1d4844e9e0cb77bc66a97fa8c18dc4064047f48cd5880295ebe65db9`.
