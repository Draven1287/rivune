# Frozen AO05/AO02 independent source review

Verdict: changes requested for AF02 / P2 history recovery. Other checks have bounded source and supplied recording acceptance below; no new native UI, build, install, auth, or provider call was performed by this reviewer. Separate two-file polish candidate excluded.

Checkpoint: `/private/tmp/rivune-ao05-checkpoint/HANDOFF.md`. Independently rechecked all 15 file hashes against manifest SHA256 `fdbbe7f26c43babbd5ff4139490baaa67aec41b382a5a335bee63829e45940d6`; zero mismatches. Read supplied authoritative 296 passed / 0 failed / 0 skipped summary and all 17 ArtifactContinuationTests. These are owner-executed XCTest results, not a new independent full-suite run. iOS evidence is compile-only.

## P2 AF02: mixed malformed turns bypass the history guard

Frozen `Rivune/RivuneStore.swift:2715` casts the entire turns array to `[[String: Any]]`, then substitutes an empty array on failure. Adding null or a number to an array containing an invalid selectedArtifact causes the guard to ignore that invalid field. Exact extracted function plus the actual frozen ArtifactContinuation decoder reproduced:

```
invalid-selection: recoveryRequired=true
invalid-selection-plus-null-turn: recoveryRequired=false
invalid-selection-plus-number-turn: recoveryRequired=false
```

`artifactRecoveryRequired` lines 2699–2704 then continues after primary decode failure to a healthy backup. `load` lines 2743–2750 normalizes that backup and calls standard save over the primary. This defeats the new-field original-byte preservation guarantee. The guard failure is executed evidence; the subsequent fallback/overwrite is source-traced, not an end-to-end filesystem test.

Fix the lossy container cast: inspect individual array entries and hold malformed new-field-bearing containers for recovery. Keep the existing correct rule that a healthy authoritative primary ignores unused invalid backups/legacy files. Add a regression with malformed primary, valid backup, and unchanged primary/backup bytes after load and attempted standard save.

Harness seams: exact extracted `hasInvalidArtifactSelections`, full actual ArtifactContinuation source; IntelligenceMode is a minimal enum double (raw values immaterial to these malformed Boolean fixtures), CouncilRunner is only the 112KiB constant required to compile the unused direct builder. No Conversation decoder, history filesystem, app, or provider is modeled/executed. Ran with `xcrun swift -module-cache-path /private/tmp/rivune-review-module-cache history-guard-harness.swift`. Artifacts alongside this receipt preserve extraction, harness and output.

## AF matrix disposition

| Case | Bounded disposition |
| --- | --- |
| AF01 | Source/recording accepted: immutable IDs, response and canonical digest, full files; original-source parse/hash comparison at submit; newer answer does not replace selection. Changed source rejects rather than silently rebinding. |
| AF02 | Changes requested for mixed malformed history containers above. Draft decoder and new journal snapshot/record equality are checked before relevant mutations. Unsafe paths and digest checks source-reviewed; not every invalid-path case independently executed. No schema version was introduced or required. |
| AF03 | Optional fields default nil; legacy round trip supplied. HTTP schema and bridge consent unchanged. |
| AF04 | Shared native submit validates source; coordinator checks supported mode, typed/document budget, exact encoded direct/Council envelope before journaling/publication. Supplied escaped-payload tests assert zero requests/revision/publication and retained draft bytes. |
| AF05 | Supplied recording tests decode exact selectedArtifact in both direct providers, Council drafts, lead, fallback and repair. Full snapshot carried by frozenTask; no clipping branch. |
| AF06 | Supplied late synthesis and repair overflow tests assert no later request and retain complete drafts/original output. Existing 112KiB envelope unchanged. |
| AF07 | Frozen selection and successful drafts retained through journal restart/retry; record/turn selection equality checked. Mismatched snapshot test preserves journal bytes/revision zero. |
| AF08 | Supplied store-level conversation switch/new chat/Settings/restart/removal tests accepted. Actual rendered chip/action/focus and restart interactions remain pending. |
| AF09 | ChatGPT, Claude and Council routed; unsupported modes rejected. Native action hidden on iOS; no HTTP/capability additions. No universal-API transcript acceptance. |
| AF10 | Source diff only adds context selection/card callback; existing disk save/conflict code unchanged. This is no-write source acceptance, not a repeated disk/UI integration test. |

AO02: corrected test hash `7bbc9cd4d5d71bce637302b49251af9063cc24211b401a55a4153a6d1da148ee` included in this native test checkpoint. Prior reviewed classifier and complete startup-phase guard retained. No unconditional pass prints. Native registration is present; UI rendering and actual connection concurrency remain separate. PBX source IDs alone renamed for collision, package product IDs retained, no TeamConfiguration schema diff.

Installed corrected0619 and its accepted Settings/preset coverage remain separate. NP-02 is already rendered-confirmed in the recovered0619 receipt, and preset Tab/Space acceptance is documented there. No unrelated closed matrices reopened.
