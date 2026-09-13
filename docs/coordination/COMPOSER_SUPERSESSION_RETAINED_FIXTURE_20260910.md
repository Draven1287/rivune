# Retained acknowledged-superseded review fixture

URL: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=composer-supersession-preview&preview=1

Read COMPOSER_SUPERSESSION_UI_REVIEW_20260910.md. The new selected scenario runs no automated suite. It uses the existing synthetic host fixture, one fake acknowledged configuration save and actual mounted controller/UI actions to retain an acknowledged revision3 superseded by saved revision4. Setup asserts the exact displayed revision4/third-provider route and one fake save/no submission. No real persistence, provider, clipboard, native or server operation. The retained fixture's submit implementation throws without invoking a provider.

Deterministic manual steps at390x844:
1. Open the exact URL. The top rail says Synthetic review fixture · setup verified. Review is already open. Local Message is “Keep this local message while reviewing saved configuration.”
2. Scroll within Write a message/composer to the bottom. Inspect “Saved revision 4: Single AI · Mock connection (third-provider)” and “Revision 4: saved by the first external writer.” The acceptance button is visible.
3. Click Apply fake second change in the fixture rail. This changes only in-memory host state to revision5, second-provider, and “Revision 5: saved by the second external writer.” The captured review remains4.
4. Click Accept saved configuration and keep my text. It must reject with “Saved configuration changed again”; captured review4 remains and Send stays fenced.
5. Click Re-review saved configuration in the fixture rail (it invokes the actual Review saved configuration button). The panel now displays revision5, second-provider, and the second writer's message.
6. Click acceptance again. The summary becomes Single AI · Mock connection (second-provider), local Message is preserved and focused, and the fence clears. No host write is performed by review/acceptance.
7. Reload the exact URL to reset. The second fake change is single-use per fixture load. Expanding the fixture status rail explains setup rather than claiming an unrelated suite passed.

Concrete layout defect found and corrected: before the correction, the retained review extended below the390px viewport and scrolling the composer did not reveal acceptance, because the compact composer removed its height bound. A scoped CSS rule now bounds the composer to65% height only when a host conflict/review is present and allows internal scrolling. Normal closed/open execution editor styling remains as accepted. After the rule, screenshots visibly showed revision/route/message and acceptance; pointer clicks exercised the stale reject, re-review and successful acceptance above. No controller or production rendering logic changed in this slice.

Validation: TypeScript passed. Retained setup assertions passed. Manual390 screenshots and pointer flow passed as described; no unrelated tests were rerun. These are owner observations for the independent UI reviewer, not independent acceptance. The temporary viewport is reset and the retained fixture is left at initial review state for handoff.

Exact changed hashes: qa-artifacts/compact-composer-20260910/retained-fixture-hashes.json. Changes are tests/hostRenderer.test.tsx, tests/rendererScenarios.ts, and the one scoped rule in src/host/ComposerExecutionControl.css. Full current eight-file manifest remains source-hashes.json; pre-retained-fixture-hashes.json preserves the prior accepted source boundary. No export/publication. Independent manual UI closure can resume at the URL above.
