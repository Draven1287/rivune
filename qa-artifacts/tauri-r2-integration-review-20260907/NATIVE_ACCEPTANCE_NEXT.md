# Combined Settings and onboarding acceptance

Status: prepared, not executed. Operator: Audit Rivune native app. Runtime owns the combined build and source pause; coordinator grants the native QA lease. No additional build, launch, or provider invocation is authorized by this document.

## Entry requirements

- Runtime supplies the exact development bundle path, executable SHA-256, combined source manifest, build result, and explicit source/build pause.
- The four frontend hashes must match `SETTINGS_SOURCE_RECEIPT.json`, or runtime must identify a reviewed superseding revision. Bind app.mjs, core.mjs, desktop-host.mjs, host.rs and lib.rs to the same combined build.
- If Graphite and conversation actions are included, bind their current hashes to `APPEARANCE_CONTROLS_SOURCE_RECEIPT.json` and `TRANSCRIPT_ACTIONS_SOURCE_RECEIPT.json`, or identify reviewed superseding revisions. Confirm the runtime actually initializes the appearance module and supplies supported clipboard/opener callbacks. The presence of source files alone is not integration evidence.
- Reuse the existing `tauri-native-smoke-20260907` procedure, correcting its older workspace-profile wording: create a fresh small **/private/tmp** profile. Never reuse the old smoke profile as an empty-profile fixture.
- The QA-only wrapper's `LSEnvironment.RIVUNE_ISOLATED_PROFILE_DIR` and explicit launch environment must both identify that exact absolute temporary directory. Keep the installed Rivune app and all user history untouched.
- Before and after CUA attachment, verify the exact executable PID, effective isolated-profile environment, and open `.profile.lock` path. Abort attachment/interaction if the process changed or isolation cannot be established. CUA can relaunch a stopped app; never attach first and check isolation afterward.
- Current discovery must remain detection-only: no CLI execution, authentication check, inference, successful provider configuration, or production fixture-provider bypass.

## Native sequence

| Step | Exact input/action | Required observation |
| --- | --- | --- |
| 1 | First launch into the verified empty profile | Guide opens once; discovery may list installed Codex/Claude, but labels sign-in unchecked and response untested. Send remains unavailable without a configured usable connection. |
| 2 | Continue to connection step, then choose Explore first | Main workspace is usable without an account; no provider or run record is created. |
| 3 | Create a conversation titled `R2 settings acceptance` and enter `R2 draft: before settings.` | Actual host draft save succeeds and text remains editable. |
| 4 | Open footer Settings; inspect all seven categories; use arrow keys between tabs | Settings remains inside the same app window; selection, focus and content agree. |
| 5 | In Connections choose Claude, expand Advanced, type `/private/tmp/rivune-no-such-cli`, model `qa-unsaved-model`; switch to Codex and back | Separate editor drafts are retained. Selecting a kind does not claim connection or sign-in. |
| 6 | Save the deliberately nonexistent path | Visible actionable rejection; no provider record. Do not save a detected real installation during this pass. |
| 7 | Open Models & Team, then Edit connection options | Connections/Advanced opens and model field receives focus. Unsupported team features stay accurately disclosed. |
| 8 | Select Graphite, Galaxy, then Orbit; toggle motion off/on | Theme updates immediately. Orbit companions traverse a full circle; foreground reading surface is stable; motion-off stops motion. Check minimum supported window size for clipping. |
| 9 | Press Escape; append ` Appended after settings.`; switch conversations and return | Focus restores correctly and the complete draft is retained. |
| 10 | Open General and replay guide, then dismiss it | Replay works without losing the draft or creating a provider/run. |
| 11 | Native zoom/restore; minimize then tray Open Rivune; red close then tray Open Rivune | Actual authoritative window is restored or recreated and focused. Draft persists; no duplicate main window. Do not mark minimized state verified solely because a click was sent. Red close is not assumed to quit a tray-enabled build. |
| 12 | Open tray Settings… with main window hidden and again while visible | Real in-app Settings opens in the authoritative window. Tray status agrees with actual host state; zero runs must not be shown as running. |
| 13 | Execute synthetic native migration/export sequence below | Original data, readonly guards, duplicate handling and exports verified through actual host IPC. |
| 14 | Type ` Final text immediately before tray Quit.` and immediately choose Quit Rivune | Asynchronous shutdown waits for latest draft persistence before exit. Relaunch exact binary/profile and verify every character plus imported records. Recheck PID/env/lock before and after CUA. |
| 15 | Execute scoped shutdown-failure case below; restore only QA-owned paths afterward | A failed save/cleanup leaves app open with recovery action; it never silently exits or reports successful save. |
| 16 | Inspect only this isolated profile, then gracefully quit identified QA process | Synthetic local/imported conversations remain; zero configured providers and zero provider dispatches. Imported historical runs, if represented as runs by the host, retain their legacy provenance and are counted separately from new executions. Record identities and all failures before releasing lease. |

Do not change the user's global accessibility preferences to test Reduce Motion. Existing controller checks cover that signal; native system-preference acceptance is recorded only if the environment already supplies it. Background/foreground transitions should demonstrate motion pausing without making menus or settings float over other apps.

## Added appearance and conversation actions

Run these only if integrated in the exact combined build; otherwise record them as not integrated, never as passing module checks.

1. In Appearance, choose Graphite, Midnight background and Mint accent, then Save colors. Close Settings and inspect both the main conversation backdrop and sidebar, plus the send/action accent. The opaque ambient layer must not conceal the new background.
2. Switch to Galaxy and Orbit, then back to Graphite. Both illustrated themes retain their original appearance; Graphite restores the saved colors. Enter an invalid/light background and verify Save is unavailable and the active workspace is unchanged. Use Reset colors, then save a distinct valid choice to verify after Quit/reopen.
3. Use an imported synthetic answer containing Unicode, newlines, a code block and a valid HTTP(S) documentation link. Import must remain read-only even though copying its text is allowed. Copy response must pass only the exact answer text to the clipboard capability. Copy code must pass only its code content. A partial imported response stays identified as partial; copying never upgrades its execution status.
4. Native clipboard verification uses the explicit Copy action on synthetic QA text. Compare the resulting bytes/hash to the expected fixture, without printing unrelated clipboard contents. Do not read clipboard history. Callback-only checks remain separately labeled and cannot substitute for an actual platform write.
5. A valid response link must open externally only after the explicit click, preserving the app's conversation and draft. Use a synthetic public test URL approved for the QA run; no provider/account links. Invalid schemes/credentials/control characters remain non-actionable and are independently rejected at the host boundary.
6. Exercise supported clipboard/opener failure handling and navigation during a pending action. Never show success before acknowledgement, never announce old-action results into a different conversation, and keep copy controls stable during unchanged polling. Actual platform failure cases not induced remain unexecuted, with exact-host evidence listed separately.
7. After graceful Quit/reopen, confirm the saved Graphite colors and conversation draft. These checks do not replace the failed-save/shutdown sequence below.

Additional selectable input: `native-synthetic-inputs/response-actions.json`, with expected exact copy bytes in `expected-response-copy.txt` and `expected-code-copy.txt`. `RESPONSE_ACTIONS_MANIFEST.json` binds those files. It contains one separate synthetic failed/partial conversation with Unicode, a code block, one public example link and non-actionable unsafe-link examples. Import it separately from the four-file migration baseline so that baseline deduplication/count checks remain unchanged. This fixture is prepared, not native-import accepted.

## Native synthetic migration and export (combined M1)

Entry additionally requires runtime's export and asynchronous shutdown integration to have landed in the frozen build. This sequence is authorized for synthetic files only, not user history.

Prepare source inputs once in the same fresh QA temporary area using the existing `tauri-migration-audit-20260907/fixtures` envelopes. Select their **input payloads**, never the enclosing test metadata. Preserve exact generated bytes and SHA-256 before opening any picker:

Prepared reviewed payloads now live beside this document in `native-synthetic-inputs/`; `prepare_native_inputs.py` records their source envelopes and refuses to overwrite changed bytes. `MANIFEST.json` identifies the four files selected together and the separate malformed input. Payload size/hash, three valid distinct answer IDs, original failed state, and one matched/two unmatched drafts were checked locally. This preparation is not importer/native acceptance. Copy only these small synthetic payloads into the authorized fresh QA temporary area if required by the native picker procedure, retaining exact bytes.

- `conversations.json`: use `conversation-project-reference.json` input. Add a synthetic Claude answer and combined answer with distinct IDs/content alongside the existing ChatGPT answer, following the same `claudeAnswer` and `combinedAnswer` shapes already exercised by canonical host tests. Set its original `executionState` to `failed` so partial answers must not turn it into completed work. Keep original prompt, attachment, date, mode, and project reference.
- `drafts.json`: `drafts-multiple-and-new.json` input, including its orphan draft.
- `projects.json`: `project-needs-new-file-permission.json` input.
- `preferences.json`: `settings-and-stale-consent.json` input; old consent must never authorize new work.
- For the separate malformed rejection case use `truncated-drafts.json` rawUTF8 bytes, as the existing import-preview test does. Do not silently repair them.

Sequence:

1. Use General's real file selectors to choose these four synthetic source files. Preview must distinguish readable/activated data from archive-only project/preferences/orphan information, original failure state, and unavailable exact retry/file permissions. No source changes, dispatch or auto-confirmation.
2. Cancel or dismiss before confirmation and establish that no import was activated. Reopen, select the same inputs again, preview and explicitly confirm the exact selection.
3. Open the imported conversation. Verify all three distinct answers and original prompt/state; attachment representation and dates where presented. Composer/retry must remain read-only. Never accept a provider call as an import side effect.
4. Inspect archive-only counts/disclosures and any available metadata. Confirm preservation in the export below; do not claim archive-only data is a functional project or permission grant.
5. Select the same unchanged files and confirm again. Verify deduplication: no duplicate imported conversation, answers or receipts. Restart through the tray Quit/reopen sequence and repeat visible content/read-only checks.
6. Choose export originals, then cancel the real destination dialog. No success notice or output may result. Next select a fresh QA-owned `/private/tmp` output directory and export. Compare every returned file with the original byte sequence and SHA-256; do not merely reparse JSON. Verify source files themselves remain unchanged.
7. Exercise export failure only with a runtime-supported fault seam or a deliberately unwritable **QA-owned** destination (first confirm a write probe actually fails). A failure must stay visible, leave original/archive recoverable, and never claim success or silently overwrite another file. Restore only that directory's original permissions. If privileges prevent inducing a real failure, record it as unexecuted and require exact host fault-test evidence separately.
8. Select the synthetic truncated input for a separate preview. Show an actionable validation error, no confirmation/activation, no fallback to a different source, and unchanged source bytes.

For shutdown-save failure, runtime must identify the supported isolated failure seam or exact QA-only writable path to make temporarily unwritable. Do not guess at live storage, chmod the user's directories, or inject a production fixture provider. After confirming the failure setup, edit the local draft then tray Quit: the window must remain open with recoverable text and error status. Restore the QA-only path, explicitly retry saving/quit, and verify full draft on reopen. Active-process cancellation is separately labeled exact-host-test evidence until supported without real provider access.

## Existing synthetic coverage and fixtures

Reuse canonical `candidate4-runtime-r2/tests/integrated-browser.cjs`; do not create a second mock product or build target. Its test-only host already covers discovery, explicit staging versus Save, drafts, failure/retry/cancel, and import preview races. Runtime owns edits and execution of that harness during the freeze.

- Discovery rows: Codex or Claude, absolute synthetic `/fixture/bin/...` path, installed true, authentication `unknown`, tested false. Missing/empty/malformed/duplicate rows and delayed refresh are covered by `discovery-controller-check.mjs`.
- Settings hydration: saved Codex/Claude records, delayed snapshot, edited-path/unedited-model overlay, and late save success are covered by `settings-controller-check.mjs`.
- Imports: existing harness uses named `conversations.json` with `[]` and a synthetic typed host receipt, plus pre-read oversize and changed-selection cases. This validates renderer handling only; actual synthetic native migration is covered by the combined M1 sequence above. Do not import any user's files.
- Failure/cancel/team fixtures remain in test processes. Never register a `fixture` provider in production or use it to assert live Constellation execution.

## Result recording

Append one combined native result to the existing review evidence directory after execution. Include build/source binding, profile, PID checks before/after attach and reopen, each observed pass/failure, synthetic source/export byte hashes, profile counts separating imported history from new executions, and limitations. Do not overwrite old receipts or infer a pass from earlier browser/old-binary checks. Installer, updates, account authentication, real AI responses, user's real-history migration, and parallel Constellation remain separate acceptance work.
