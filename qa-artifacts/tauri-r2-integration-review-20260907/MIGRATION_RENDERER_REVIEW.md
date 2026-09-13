# Independent migration renderer review

Executed canonical web modules with the existing integrated-browser test-only host. No native launch, real provider, or user data. No canonical files edited. Reproduction is `migration-renderer-review.cjs`; exact hashes, rendered observations and zero renderer errors are in `MIGRATION_RENDERER_REVIEW.json` beside this report. The script derives its setup from canonical `tests/integrated-browser.cjs` and limits execution to three imported-state fixtures.

## Findings

1. **P2 — Read-only imports still offer Retry.** `web/app.mjs:244` shows Retry based on failed/cancelled status without checking conversation readOnly or imported provider/mode. The click handler at line 495 has the same omission. Repro: synthetic readOnly conversation with three imported failed (or cancelled) answer records; composer and Send are disabled, yet Retry is visible/enabled and clicking calls `host.retryRun` once. Real host rejection remains a separate protection; this does not prove real execution is possible. Hide/disable and guard the handler for read-only/imported work, retaining the host guard. Assert zero retry calls for both states.

2. **P2 — Polling removes keyboard focus from archive controls.** `web/app.mjs:152` rebuilds every receipt on each render. Repro: open Settings > General with an imported receipt, focus `.import-recover`, then run the existing snapshot poll. The focused control is removed and activeElement is no longer that control in all three fixtures. Keep receipt nodes stable when unchanged, or reconcile keyed nodes while preserving focus and in-flight operation state. This is independent of the already tracked export-success claim.

3. **P2 / M1 scope gap — Archive-only data has counts but no inspection UI.** `web/app.mjs:153-189` exposes only summary counts and Export verified originals. Fixture contains one archived project, orphan draft, attachment and preferences; actual receipt controls contain only the export button. There is no in-app way to inspect item names/content or safety notices before deciding what was preserved. Add bounded read-only inspection through an explicit host contract; do not turn legacy file permissions into active grants. This is a product acceptance gap, not evidence that the archive bytes are lost.

## Positive observations

All three ChatGPT/Claude/combined contents remain visible for failed, cancelled and preserved/unknown states. Failed/stopped labels retain partial-answer wording; unknown stays `Preserved legacy state · inert` and original state text remains in the explanatory message. Composer/Send are disabled in all cases. Unknown-state Retry is hidden. Native migration, exact exported bytes and actual host retry rejection are not established by these synthetic renderer checks.

Source binding: app.mjs `17b7769f458dae54f730814393d5775442017e34d982809b97826f7c2fca0dc5`; core.mjs `21f1a6d02280a06cdcad0bf6269169a1384a4b28de7fe38622894329551e9ab6`; transcript.mjs `128d75c8554d38c4bbf2fdf97fbd8d575cdcd409d68bd780eaef0c5e62af0f59`. These were unchanged across both focused reproductions. Rebind any fix to its new manifest.
