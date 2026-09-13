# Saved result viewer — independent source/state review, 2026-09-10

**Bounded source acceptance; no actionable defect found.** Verified all seven current files against qa-artifacts/saved-result-viewer-20260910/source-hashes.json before inspection and again at completion. Captured independent copies in saved-result-frozen-tests; this is a workspace hash boundary, not an accepted frozen Git candidate or native build. Receipt and documentation were read locally.

SavedResult captures the selected text into both React snapshot state and the copy session when Inspect is clicked, and separately captures the label. Subsequent prop updates do not change the open textarea or pending copy. Each mounted result owns its own refs/session; keyed run/member rendering preserves result identity. Close and effect cleanup increment the generation, suppressing stale success/failure notifications. Reopening starts another generation and resets status. The captured string is passed directly to clipboard.writeText without formatting, trimming or adding provenance.

Canonical answers whose run is not completed are labeled saved partial answer. Member inspection retains the participant label and host-shortened warning. A completed independent contribution need not be labeled partial merely because the overall run is unfinished. Existing saved provider/model/lead attribution remains in the surrounding transcript/evidence; copying intentionally contains only answer text, not those metadata. No checkpoint, draft, conversation, provider or persistence mutation is introduced by the viewer.

Untrusted content is rendered through React text/textarea value, with readOnly and no HTML insertion, markdown execution, iframe, generated resource loading or link activation. Labels are text children too. Clipboard access occurs only on the explicit copy button; unavailable/rejected access reports failure and focuses/selects the textarea for manual copying. It never reports copied on rejection. The busy flag is synchronous, so duplicate pending clicks do not issue another write. Late callbacks cannot update a closed/reopened or unmounted viewer, and old finally cannot clear the newer generation's pending flag. Already-issued OS writes cannot be cancelled; their actual clipboard completion order is outside this session guarantee and is disclosed in the source contract.

Independent checks: **6 passed** under Node v22.23.1 against copied hash-verified savedResultCopy.ts: four owner tests plus two reviewer tests. Additional tests cover close without reopen for both late success/failure, and old completion arriving while a new copy remains pending, with a duplicate attempt correctly blocked. Reproduce from workspace root:

```sh
node --experimental-strip-types --test qa-artifacts/constellation-state-review-20260909/saved-result-frozen-tests/tests/*.test.mjs
```

The integration source uses a labeled native dialog, Escape cancellation routed through close, explicit close focus return, and textarea selection on copy failure. These are implementation observations, not rendered keyboard/focus proof. No browser/native app/server was launched; actual showModal behavior, focus return if the opener disappears, small-window overflow, clipboard permissions and OS write ordering remain unverified. The receipt's TypeScript result was not rerun or promoted to runtime evidence. Full application provenance and unrelated workspace changes were not re-audited.

No product files were edited, no real clipboard write/provider call occurred, and no private artifacts were forwarded or published. Release/integration and whole-build visual acceptance remain outside this bounded review.
