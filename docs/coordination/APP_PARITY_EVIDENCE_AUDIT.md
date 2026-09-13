# App parity evidence audit

Independent audit, 2026-09-09. Scope: current `prototypes/ai-native-workspace`, existing http://127.0.0.1:4317, design direction and chat-first receipt. No source edits, build, provider calls or desktop actions. Sole implementation owner remains Rivune App builder.

## Conclusion

Chat-first structure is present and clearly labelled as a demonstration. This is a useful browser design checkpoint, not restored desktop feature parity. No actual host-connected capability was established. Earlier acceptance was scoped to particular source/builds; it must not transfer automatically to this React implementation.

## Prioritized acceptance checklist

- [x] **P2 — Result cards open the wrong file after navigation — closed by independent targeted recheck below.** Historical reproduction: Open “Agent status labels”, select README.md, close the artifact panel, then click that same result card. README.md opens, despite the card promising the status file and diff. `src/components/chat/ChatPanel.tsx:46` gives every completed assistant message the same unbound card; `src/App.tsx:17` only opens the panel, and line 31 passes that callback unchanged. Bind each message result to its artifact/file/revision; clicking the card must select the named result regardless of the previously selected file. Messages without artifacts must not acquire an unrelated result card. Verify with two distinct results and an intervening file selection.
- [ ] **P1 before durable daily use — Conversation recovery and reachable drafts.** `src/hooks/useWorkspaceDemo.ts:27-38,86-97` recreates only the initial conversation on reload and generates transient IDs for new conversations; `ChatPanel.tsx:8-9` stores drafts under those IDs. A new-conversation draft can remain in sessionStorage while its conversation is no longer reachable. This is a source-confirmed limitation, not a reload test against user data. Before claiming persistence, restore conversation IDs, messages and drafts together, including restart and failed-save recovery. Settings wording is now corrected to distinguish switching from reload. This closes the wording issue only; restoration of new conversations remains missing.
- [ ] **P1 before connected-app parity — One complete host-backed conversation.** `workspaceAdapter.ts:3-8` is a future-boundary type/pass-through; App uses `useWorkspaceDemo`. Demonstrate real connection readiness, a selected supported model, admitted request, streamed answer, cancellation, follow-up and recovery on an explicitly authorized future host checkpoint. Keep current demo labels until proven; executable discovery is not authentication or inference.
- [ ] **P1 before Constellation parity — Real contributions and result provenance.** `useWorkspaceDemo.ts:5-8,113-152` supplies fixed text and timer-driven agent/step transitions. Verify actual lead/member assignments, independent contributions where required, partial failure, cancellation, integrated output and source-linked artifacts. Do not treat the demo timeline or elapsed timers as measured execution.
- [ ] **P2 before artifact/workflow parity — Explicit continuation and reviewed application.** Add/select a particular result as removable composer context; prove full selected bytes or a pre-send actionable size block, stable revision identity and zero silent disk writes. Current editor/JSON preview is local demonstration, not project snapshot/apply or continuation. Preserve earlier conflict, path and approval boundaries when connecting the host.

## Capability classification

| Capability | Current evidence | Classification |
| --- | --- | --- |
| Chat-first default, optional adjacent artifacts, collapsed activity | Independently rendered current desktop; matches design direction | Working demo |
| Conversation creation/switching, streaming/Stop, draft switching, resize and mobile layouts | Current code plus builder receipt `CHAT_FIRST_PREVIEW_20260909.md`; receipt reports 1117,390x844,320x740 and targeted interactions | Working demo; these interactions not independently repeated here |
| Source/diff and constrained JSON preview | Current component wiring; earlier browser-demo review is historical, not a new full regression pass | Demo present; latest full regression unverified |
| Settings appearance and explicit disconnected state | Current App and rendered preview labels | Working demo; no account setup |
| Providers/models, Single AI selection, configurable Council/Swarm, real terminal | No current connected implementation established; fixed demo used | Missing from this preview |
| Durable history, retry context, export/recovery, project apply | No equivalent current preview path established | Missing from this preview; earlier backend preservation/integration unverified |
| Tauri IPC, native lifecycle/tray, installer/update and cross-platform behavior | Browser receipt explicitly excludes host/desktop work | Unverified, not accepted by this audit |

## Baseline and evidence limits

Read current `docs/RIVUNE_DESIGN_DIRECTION.md` and `docs/coordination/CHAT_FIRST_PREVIEW_20260909.md`. Codex interaction structure and Rivune identity control; Traycer is not a design reference. Typography, colors and galaxy treatment remain proposals, not approved specifications.

Earlier baseline references: `docs/coordination/TAURI_CENTRAL_ACCEPTANCE_20260907.md` distinguishes a bounded shell from host persistence/execution acceptance; `docs/PROJECT_WORKFLOW_ACCEPTANCE.md` documents existing bounded snapshots/reviewed application and disabled-JS preview limits; `docs/coordination/ARTIFACT_CONTINUATION_ACCEPTANCE.md` records the complete-file/retry/recovery criteria, not proof they all shipped; `docs/coordination/TAURI_PRODUCT_EXPERIENCE_20260907.md` explicitly distinguishes assigned requirements from implemented/accepted behavior. Historical memory was used only to locate these evidence boundaries and was superseded by the current documents. No historical installed acceptance is asserted.

Current-source SHA-256 checkpoint (tree not frozen; subsequent edits supersede this audit):

- App.tsx: `cebc734fc72815813f19e1564dc674802395f0fd7fa8ccd5d9a8794134ef77a7`
- hooks/useWorkspaceDemo.ts: `486d28b5683f9e712b6d5d343fbdda2460174cef2b904560e82532fc9a5c599c`
- components/chat/ChatPanel.tsx: `aa3cabebee251d2f2e60038f60722cf1b38a5c6e55603107fd336fb8f8be6d0d`

Independent browser observation used the same 4317 server in a temporary audit tab at 1280x720. AX state and screenshot showed the mismatched README after the result-card reproduction. No user conversation was submitted or reloaded. No broad accessibility, contrast, IME, mobile, host or production acceptance is claimed. Build success remains builder-reported for its receipt, not rerun by this auditor.


## Artifact correction recheck — 2026-09-09

**PASS for the reported wrong-file defect and cancelled/unassociated response guard.** Independently inspected current source and rendered the existing 4317 service in temporary audit tab 2. No server/build/native operation or app-source edit.

- Repeated exact sequence: click “Agent status labels” → select README.md → close panel → click the same result card. `agentStatus.ts` now has `aria-pressed=true` and its source textbox is visible. README no longer remains selected.
- Created only a synthetic local conversation in the temporary audit tab, submitted “Audit cancellation fixture”, and clicked Stop demo before completion. Render showed “Demo stream stopped locally.” and no result card on the cancelled assistant response. No provider was called.
- Source: `types.ts:37` supplies optional `ChatMessage.artifactId`; `data/demo.ts:44` associates the initial answer; `ChatPanel.tsx:46` requires a completed assistant message with a matching artifact and uses that artifact title/ID; `App.tsx:31` resolves its file before selection. `useWorkspaceDemo.ts:146` assigns the result only on completion. Unassociated responses therefore have no card; the cancelled response exercised this absence in the browser. No source mutation or injected test fixture was used.
- Scope limit: the current demo completes to one fixed artifact, so two different completed-result revisions were not exercised. This closes the concrete wrong-selected-file regression, not immutable multi-revision provenance or continuation acceptance.
- Settings now says drafts restore while switching, and reload does not restore new conversations. **Persistence remains missing**; wording is not an implementation fix.

Recheck SHA-256 checkpoint (supersedes the earlier hashes for this correction; source was not frozen):

| File under src/ | SHA-256 |
| --- | --- |
| App.tsx | fc532a84f102a8f00d40c875f4de76c8fcb2716f0148dab4f380da5e83c6e481 |
| types.ts | a75648433acb44630b7a691b3375e156a73f961d896d7a190e7794d2d67b1882 |
| data/demo.ts | 448938fb908773d45aeb71a3232c48b4014be7f52f57731ce43a1481e4a6c051 |
| hooks/useWorkspaceDemo.ts | 04ad14a24a74e328a67de48b6684c6d31e229a0380d6f385e018fce9e9726b1b |
| components/chat/ChatPanel.tsx | 639663e3e91551d796b0c4a0094091f62355f20116920a45807cd107bf2c48c4 |
