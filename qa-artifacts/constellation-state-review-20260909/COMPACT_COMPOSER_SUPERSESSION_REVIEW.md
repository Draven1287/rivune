# Compact composer acknowledged-supersession closure

2026-09-10. Independent source/state review, limited to the correction in supersession-fix-hashes.json and preservation of the preceding confirmation fix.

## Verdict

PASS — the superseded-acknowledgement P2 in COMPACT_COMPOSER_CONFIRMATION_REVIEW.md is closed at this exact source boundary. The original unconfirmed-summary P2 remains closed. No new actionable defect was found in this targeted review. This is bounded controller/source acceptance, not mounted UI, native persistence/restart, provider execution, export or release acceptance.

## Evidence

Copied current source to compact-composer-supersession-recheck/. All eight files matched the supplied manifest at capture. Post-test source drift: none. No product files were edited; no browser, provider, native operation, server or publication was used.

10/10 independent tests passed in reviewer-tests.log:

- Four retained confirmation regressions cover applied lost reply, malformed acknowledgement, acknowledgement followed by refresh failure, and ordinary refresh recovery. Last-confirmed summary stays held while unacknowledged, actual host snapshot stays truthful, exact full-request replay happens only before acknowledgement, and refresh-only recovery does not save or submit. Newer local message edits and attachment IDs survive.
- Six supersession cases cross immediate/recovered acknowledgement with second revision/catalog/provider-route changes. Unacknowledged observations cannot be explicitly accepted. Lost-reply recovery asserts exact original payload replay, then the acknowledged mismatching state stays fenced pending review.
- Each case captures the reviewed key and defers both snapshot/catalog reads; a second change before those reads rejects the captured review. The confirmation remains and the latest local text survives. A fresh explicit review resolves it.
- Acceptance leaves the entire synthetic host snapshot unchanged, performs zero additional save/submit/journal-write calls, and retains local text. The next explicit Save draft uses the accepted revision, latest local text, preserved attachment IDs and current saved selection/team. It performs exactly one new save and no submission.

The one selected owner test passes (two acknowledgement scenarios), retained in owner-focused-tests.log. Owner mounted/typecheck evidence in the receipt was read but not rerun.

Commands from the retained directory:

`node --experimental-strip-types --test tests/confirmationClosure.test.mjs tests/supersessionReview.test.mjs`

`node --experimental-strip-types --test --test-name-pattern='compact composer explicitly accepts superseding' tests/hostController.test.mjs`

## Source checks

workspaceController.ts:244-256 requires an acknowledged original record and no pending mutation before refresh, compares the immutable string reviewedKey with the current configuration key, and requires a strictly newer saved revision. It updates only local draftBases/dirty/confirmation state. It does not call saveRichDraft or submitRun and does not overwrite local message text. The old acknowledgement's original request remains the comparison baseline. Ordinary matching-revision recovery remains refresh-only.

HostWorkspace.tsx:165-166 captures conversation ID, key, revision, summary and saved text together after an explicit Review saved configuration action. The acceptance callback passes that captured key instead of deriving a new key from later renders. A rejected acceptance keeps review state, requiring a new explicit review. UI source includes return-to-Message focus after success; no focus execution is claimed here. Button and keyboard Send remain fenced while confirmation exists.

The helper key includes rich-draft revision, attachment IDs, selection/team, default provider, provider configuration, capabilities and catalog. This is a frontend read-time comparison, not a host-wide lock across separately obtained snapshot/catalog reads. A later host change still relies on the existing revision CAS for any subsequent write; acceptance itself is local-only.

## Test setup correction and limits

Initial catalog-drift tests delayed only getSnapshot; getModelCatalog had already returned before the injected catalog mutation. Those two expected rejections were invalid test timing assumptions. The corrected gate delays both reads and verifies changes visible to the refreshed catalog; all ten cases pass. reviewer-tests-initial.log is retained. No product source was modified to satisfy the test.

Tests use the retained synthetic fixture with an exact receipt cache for replay. They do not prove native disk persistence, native mutation replay, cross-process locking or crash recovery. No unrelated audits were repeated.

## Exact hashes

| Frontend path | SHA-256 |
| --- | --- |
| src/host/ComposerExecutionControl.tsx | `00bdcd86e6584acaa5584df39cbdb218c8dbb4f9125b12bd58d398af50b3c6db` |
| src/host/ComposerExecutionControl.css | `32826f66be0fc2b142ddac9f5e4db1a89dd7154d1754e61341a3f266fb36bea2` |
| src/host/composerConfiguration.ts | `49cd0bce2b8a78fdb9a1236e328bfad40b99c931f0e02e00cf6567fa73bca433` |
| src/host/workspaceController.ts | `85913533ae1a15b07312b70efe81a894927bdf3d84ed94c2b0f8fe05b89a67bb` |
| src/host/HostWorkspace.tsx | `a36af0125c132b46c74437208790a1cfb141de07668073fd1f111a6389482214` |
| tests/hostController.test.mjs | `d36b7862d4cdcb51cc592a72a58cbb805d27564dc290e72a1f3a6cbe9a350f40` |
| tests/hostRenderer.test.tsx | `a0f4648a7d60407a1a782ee3113ab8d137c26c67b0f6469944b1aec461b25f7f` |
| tests/rendererScenarios.ts | `2b6abffffc5b3ff9636cd08c18d05acbdc6475cf0d42a878ed5c763aaf546708` |

Full copied dependency hashes are in compact-composer-supersession-recheck/source-hashes.json.
