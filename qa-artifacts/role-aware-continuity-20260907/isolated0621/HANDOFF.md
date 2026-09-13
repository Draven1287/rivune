# Role-aware continuity production candidate

Status: corrected v3 candidate independently accepted for ownership integration. This candidate was built and verified in an isolated copy of the 2026-09-07 06:21 snapshot. It has not been applied to the shared native source.

## Why it remains isolated

The shared `Rivune/RivuneStore.swift` changed after the snapshot. Its base Git blob was `d6efa772c6e62e0a69a714799f8da177c8099c16`; the current shared blob observed during handoff was `8e521ecd76ce574693fb291d1ca6b93a5d7f796a`. Applying the patch automatically would overwrite or conflict with active native work.

## Deliverables

- `role-aware-production-v3.patch`: corrected 801-line unified patch, dry-run verified against `base/` with `patch -p1`.
- `REVIEW_V3.md` and `INDEPENDENT_V3_TEST_RECEIPT.json`: final independent acceptance and exact four-run receipt.
- `role-aware-production-v2.patch`: superseded review candidate retained for reproducibility. Do not integrate it.
- `role-aware-production.patch`: superseded v1 retained only so the independent review remains reproducible. Do not integrate it.
- `base/`: untouched source snapshot.
- `candidate/`: verified production candidate.
- `base-hashes.txt`: SHA-256 hashes captured before candidate work.

Changed files:

- `Rivune/Models.swift`
- `Rivune/ProjectWorkspace.swift`
- `Rivune/RivuneStore.swift`
- `Rivune/RivuneRunCoordinator.swift`
- `Rivune/RivuneWebWorkspace.swift`
- `Rivune/CouncilRunner.swift`
- `RivuneTests/RivuneRunCoordinatorTests.swift`

## Contract implemented

- Typed user and assistant history with an eight-turn, sixteen-message, 12 KB encoded ceiling.
- Later user messages outrank earlier user messages; assistant text never becomes an instruction, including text that begins with labels such as `USER:`.
- Current user request, project instructions, selected documents, and selected artifact remain distinct approved channels.
- Memory-off state is explicit. Legacy flattened history is marked `legacy_untrusted` and phone bridge admission rejects it rather than guessing roles.
- Direct provider and Council production entry paths share the same authority contract.
- Council behavior is preserved: two or more independent drafts and one appointed lead synthesis. No extra cross-review provider call was added.
- Council retries require the exact frozen typed context.
- Existing top-level compatibility fields remain available to old readers, but they do not gain instruction authority.
- Direct selected-artifact requests retain the typed authority envelope and the exact `ArtifactContinuation.instructions` contract requiring application of the edit and exactly one complete-file JSON manifest.

## Verification receipt

- New recording-runner production tests: 6 passed. The added test records both direct provider routes with an exact immutable selected revision, verifies one call per route, preserves current-request priority and the artifact-as-reference boundary, and requires the original complete-file manifest instructions. The class passed four consecutive local runs after its Council wait became event-driven and bounded.
- Independent v3 acceptance: four consecutive six-test runs, 24 test executions, 0 failures; patch SHA-256 and all seven reconstructed Git blobs matched.
- Full isolated `Rivune Mac` suite: 303 passed, 0 failed, 0 skipped.
- Isolated unsigned `Rivune Mac` Debug build: passed.
- Isolated unsigned generic `Rivune iOS` Simulator Debug build: passed.
- Patch dry run against the frozen base: passed for all seven files.
- No live provider calls, CUA actions, publishing, signing, installation, or shared native-source edits were performed.

Candidate Git blob hashes, in the changed-file order above:

```text
Models.swift                         7f0c497bc27641cc565cc9c188ca1955e1d6d2c8
ProjectWorkspace.swift               a718d7de2e6cf21e33aaf67596c3bd061233775f
RivuneStore.swift                    c9ae1dc3418703844040a5cb204bf99fcae3b349
RivuneRunCoordinator.swift           f74c8b5d644ef5cf0ed0cbeee7798a4674479347
RivuneWebWorkspace.swift             ae9cca90705c56f231a0bba2d293613aa0a1bb3b
CouncilRunner.swift                  d186be426db86f2ed4dadc55cf7a6baf42f4d605
RivuneRunCoordinatorTests.swift      eddc814ecd5fbd2d20cd35754ed49a110eb41198
```

## Integration guidance

Do not apply the patch blindly to the current tree. The native owner should merge the `RivuneStore.swift` hunks around the newer phone-host admission and ID-binding work, then run the full Mac suite plus both Mac and generic iOS builds. The other six files may also be rechecked against their base hashes before applying.

For the frozen base only, the reproducible dry run is:

```sh
cd qa-artifacts/role-aware-continuity-20260907/isolated0621
patch --dry-run -p1 -d base < role-aware-production-v3.patch
```

The phone legacy test in this isolated candidate proves serialization state only. Actual host rejection with zero provider calls belongs with the newer shared phone admission and immutable request-ID work and remains deferred to that owner; this handoff does not label phone execution as tested.
