# Constellation isolated native validation — 2026-09-09

Status: matching Rust/bridge compiles; bounded synthetic packaged host cancellation/restart checks pass. Native visual/tray acceptance remains incomplete. No real provider, account, installed profile, signing, installer, or release operation occurred. No N5 dirty-draft/failed-flush shutdown test or blocked evidence forwarding was attempted.

## Frozen build and tests

Artifact directory: `qa-artifacts/constellation-native-validation-20260909/run-221053`.

Final staged binary SHA-256: `cb1d80b15078e2d89f274ec1beb06be95f25a2ccd8b34544be52ba2d3c4a907c`.

The exact current React dist, matching `desktop-host.mjs`, Rust source and staging override were built with the existing repository-local Cargo/Rustup/target cache, `--locked --offline --features custom-protocol --bin rivune`. Baseline frontendDist remains unchanged; `tauri-override.json` selects the isolated stage. `frozen-hashes.json` records the source checkpoint; `fixed-harness-frozen-hashes.json` records the final embedded web files and binary. QA driver code is stage-only and is not added to production React source.

`tests.log`: **112 library tests + 12 main tests passed**, zero failed. One library subprocess helper is intentionally ignored unless invoked by its parent with an owned test profile. The two new main tests verify delayed/coalesced Settings consumption and rejection of a recovery-mode Settings request without pending navigation. Earlier source/mock receipt covers 102 frontend/bridge unit checks, 23 mounted checks, and the passing frontend build; this native pass does not relabel them as tray UI tests.

## Settings changes

- One bounded host-owned Settings hint survives activation before renderer registration. The bridge subscribes before consuming it and preserves an in-flight hint through receiver replacement. Fake bridge tests exercise delayed subscription, coalescing, rejected subscription, disposal, and remount.
- Recovery mode now disables the actual tray Settings MenuItem during setup. The host navigation function also rejects the action in recovery mode. The new request guard is covered by compiled Rust tests. Rendered disabled-menu behavior is not observed.
- The pending hint is navigation state, not a durable delivery protocol across a lost command response. Recovery-mode frontend stays gated; no capability check was weakened.

## Packaged two-member fixture

Final fresh profile: `/private/tmp/rivune-team-fixed-qa-wydd7kmb/profile`. The local `codex` executable is reviewed synthetic Python only, parses the actual bound Council request, emits a fixed decision/contribution, logs invocations, and holds member-2 until cancellation. It makes no account/network/provider call. Both configured routes use this executable with distinct route IDs; this is not proof of two real model providers.

The stage-only harness used real Tauri IPC and the production bridge to configure two routes, durably save the team with leadIndex 1, reserve and submit one request, poll for one saved member answer while the sibling remained running, cancel the exact request, await its original submission receipt, and save its evidence into a separate synthetic conversation. It did not simulate host snapshots or bypass admission.

`native-bridge-trace.json` records:

- Request `qa-team-partial-cancel`, saved draft revision 1, two admitted routes, selected lead `qa:team-second`, and exact saved model/catalog selections.
- Lead decision and two independent contributions dispatched under Council. Member-1's answer persisted while member-2 remained running.
- Cancellation and the original submission returned accepted for the same identity. Terminal status is cancelled; one saved member contribution remains; final answer and resolution are null.

PID 9504 was stopped only after terminal state and evidence were durable. PID 9672 reopened the identical profile and binary. `restart-comparison.json` proves the complete saved snapshot, every profile file hash, and fixture invocation log are unchanged. Exactly three starts remain (lead decision plus two independent answers), with no restart replay. The restored run is cancelled with no final answer. `stopped.json` confirms the own QA app and synthetic child processes are gone. Stops used process termination after saved-state verification; this is not graceful-close or dirty-draft validation.

An initial harness run falsely reported team drift because it compared JSON property order. Field values matched. The assertion was corrected to compare schema/lead/route values, and the test reran in a separate fresh profile. The failed initial run and its metadata remain preserved and are not counted as a passing run.

## Limits and remaining checks

One attempt to inspect only the QA app through CUA requested a 20-second timeout but returned after approximately 2138 seconds, showing a window/menu tree without usable workspace content. No further native inspection was attempted and SystemUIServer was never inspected. The packaged result above is IPC/harness and persisted-state evidence, not rendered native interaction proof.

Still unverified: actual tray click before renderer readiness and one visible dialog afterward; rendered recovery-mode disabled Settings; native focus/minimize/foreground behavior; Dock reopen; current-build native visual approval. The synthetic harness does not establish manual composer/team-control behavior in the package. Real-provider integration, explicit per-member model selection, lead-policy metadata, and exposed strategy selection remain outside this gate.

Port 4317 was restored as the sole browser preview. No evidence was forwarded to other tasks. Temporary synthetic profiles and local receipts are retained for review; installed application/profile state was not changed.
