# Saved result inspection and reuse — source receipt

Chosen requirement: provide a useful next step after a saved chat/Constellation result. Product result-presentation guidance calls for inspection and copying tied to the selected response, while the actual native React transcript only displayed raw answer text. This bounded slice adds Inspect to saved direct/lead answers and saved member contributions.

Sole-owner files: prototypes/ai-native-workspace/SAVED_RESULT_VIEWER.md; src/host/SavedResult.tsx, SavedResult.css, savedResultCopy.ts, HostWorkspace.tsx, Constellation.tsx; tests/savedResultCopy.test.mjs. Exact SHA256 hashes are in qa-artifacts/saved-result-viewer-20260910/source-hashes.json.

The read-only dialog captures the selected text and label on open. Non-completed answers are labeled partial; shortened member contributions retain their warning. Code/HTML stays literal text. Copy sends only captured text to the clipboard on explicit click. Failure selects the text for manual copying and never reports success. Duplicate pending copies are ignored; late completion cannot update another result or an unmounted viewer. Escape/Close return focus to the opener by implementation. Draft, persistence, provider execution and Constellation provenance logic are unchanged.

Validation: TypeScript passes and four focused copy-session tests pass: exact whitespace/code, denial/retry, duplicate pending click, and stale success/failure after close/reopen. Log: qa-artifacts/saved-result-viewer-20260910/tests.log. Existing S02 tests were not repeated. Rendered dialog/focus, small-window layout, native clipboard permissions and actual result inspection remain unverified; no browser/native app/server was launched or restarted for this slice.

Source is ready for independent review, not runtime acceptance. The isolated import candidate remains dd9cfed; it has not been advanced or rebuilt. An attempted freeze stopped before copying when prior native-build generated node_modules/gen entries made that candidate non-clean; those build products were preserved, not staged. This receipt provides an exact workspace hash boundary instead. Direct-user galaxy/sidebar/style edits were preserved, and no installed app, private QA forwarding, N5 operation or publication was touched.

Next: review the seven hashed source files, then validate modal open/close/focus, exact selected result isolation and clipboard failure fallback in an authorized rendered environment. Real AI/provider/release readiness remains a separate dependency.
