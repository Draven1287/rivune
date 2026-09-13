# AO05 native source checkpoint, with AO02 integration

Status: source and deterministic recording checkpoint only. NOT installed; no Release build, live provider request, auth activation, signing/distribution claim, or new TeamConfiguration schema. Installed `/Applications/Rivune.app` remains version 0.2/build2026090619, executable SHA256 `c7e880b9f770a8dbe2e7f1dd35bba0d15ef012156eda406c476d5d7468c5128b` (read-only checked this turn).

## Frozen evidence
- `source/`: fifteen scoped source/project/test files, each identical to the tested build mirror at freeze.
- `source-manifest.json`: SHA256 `fdbbe7f26c43babbd5ff4139490baaa67aec41b382a5a335bee63829e45940d6`.
- `changes.patch`: scoped diff against accepted0619 frozen source (new files from empty).
- `test-summary.json`: authoritative XCTest summary, 296 passed / 0 failed / 0 skipped. Includes 17 ArtifactContinuationTests plus AO02's one XCTest method with its assertion scenarios; no hand-printed pass counts used.
- Result bundle: `/private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_23-14-35--0600.xcresult`.
- `mac-tests.log`: full final test run.
- `ios-build.log`: final exact-source generic iOS Simulator Debug BUILD SUCCEEDED. Compile compatibility only, no iPhone runtime/pairing acceptance.

## Implemented behavior
Main native workspace generated-file cards expose **Continue editing these files** for ChatGPT, Claude, and Council. The action selects the exact response revision without sending, writing project files, or replacing typed draft text. The composer shows a removable selected-files chip. Text, ordinary attachments, and the explicit file snapshot are stored per draft/conversation, survive Settings and restart, and are cleared only after successful request admission. The feature action is hidden on iOS; selected file submission there is rejected rather than extending the bridge.

`ArtifactContinuation` is a portable immutable Codable snapshot: source conversation/turn/answer IDs, SHA256 of the exact original response, summary, complete ordered paths/content, and canonical content digest. Existing file path/extensions/size constraints are reproduced; selection origin is verified against the exact original response and parsed files before native submission. It never resolves to the latest response.

Full snapshots travel as a distinct typed JSON field, even with conversation memory disabled. Selected source turn is excluded from generic history to avoid depending on its clipped copy. All actual Council draft, synthesis, fallback, repair, and retry requests retain the same exact snapshot. Direct requests may omit optional history when necessary; selected files are never clipped. Existing 16KiB typed prompt, 20KB encoded ordinary document, 12KB history, and 112KiB protected prompt limits remain unchanged. Actual final encoded prompt length is checked before admission and each later Council phase. Later outputs may make synthesis/repair too large: those paths stop explicitly and retain full partial/original outputs. Initial admission does not promise later phases fit.

Draft decoding validates snapshots before changing state. Invalid new draft metadata preserves the original draft file and blocks saving/sending. New journal artifact metadata and turn/record snapshot binding are validated before publishing loaded state; invalid new fields preserve journal bytes. Existing nil-field legacy recovery remains unchanged. Direct and Council journals retain snapshots across restart; Council retry uses the frozen snapshot and previously valid independent results.

Narrow history guard: candidate precedence is respected. A valid current primary is authoritative and ignores unused malformed backups/legacy files. Invalid new artifact metadata in the candidate that would otherwise be loaded blocks fallback/normalization/standard overwrite, preserves source bytes, and exposes a recovery warning. Legacy records without this field retain old fallback behavior. For syntactically malformed JSON, detecting the literal `"selectedArtifact"` marker is intentionally conservative, not structural proof of a valid/new field; a truncated file with that marker is held for recovery.

## Recording coverage
- Exact 33,001 file-content bytes through direct ChatGPT/Claude, native memory-off follow-up to an older selected answer, and every actual Council request.
- Quotes, backslashes, newlines, Unicode, and boundary-like content survive JSON; exact 112KiB direct envelope boundary and one-byte overflow.
- JSON expansion can reject a raw-small payload before calls, journal creation/revision/publication; native prompt/selection/draft bytes retained.
- Full Council draft/lead/fallback/word-limit-repair envelopes; later synthesis overflow keeps both 55KiB drafts; later repair overflow keeps original110KB output and makes no repair call.
- Draft conversation switch, Settings, restart, removal; missing/changed source rejection; selected old answer does not become newer answer.
- Restart/retry, corrupted snapshot draft/journal, mismatched turn/record snapshot before recovery mutation, legacy nil round trip.
- Invalid primary plus valid backup cannot overwrite original; valid primary ignores invalid unused backup/legacy.

## AO02 and project integration
Scoped provider recovery source and Settings providerRow change are included; updated ProviderStatusRecoveryTests SHA256 `7bbc9cd4d5d71bce637302b49251af9063cc24211b401a55a4153a6d1da148ee`. The new helper/test and AO05 helper/test are registered.

Compatibility build exposed pre-existing duplicate PBXBuildFile IDs C100...01/02 used by both Council/Team source and Auth framework product entries. Only the two source build IDs were renamed to E100...01/02, preserving package product IDs and TeamConfiguration source/schema. Final iOS compile passes.

## Remaining gates / limits
Independent source review requested before next Release build/install. Rendered chip/action layout, keyboard focus, and no-draft-loss interaction must be checked in an isolated clone once reviewer releases CUA; installed0619 remains untouched. No CUA attempted by this owner during the helper failure/recovery. The provider-returned result's semantic completeness is not proven by input-byte tests. Main native workspace only; no universal-API transcript, HTTP schema, cloud, or TeamConfiguration expansion. The separate pre-existing CmdN composer-focus issue is queued after this checkpoint.
