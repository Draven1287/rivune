# AO05/AO02 corrected checkpoint v2

Supersedes v1 for source review. Original v1 checkpoint remains unchanged. No install, Release build, live calls, auth, or new schema. Installed build0619 remains untouched.

Manifest SHA256: `711c170ab0adce7f802516bdd2dcfc0a4d1f3b523b8cc3dd6891c93123cf97c1`. All fifteen scoped frozen files match the final test build mirror. `review-fix.patch` contains ONLY the Store history-guard correction and ArtifactContinuationTests regression addition versus v1; `changes.patch` contains the full scoped delta versus accepted0619.

Canonical XCTest: 297 passed / 0 failed / 0 skipped, including eighteen ArtifactContinuationTests. Bundle `/private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_23-33-06--0600.xcresult`; summary and complete test log included.

AF02 correction: parse turn arrays as `[Any]` and inspect each element individually. Null/numeric elements no longer suppress adjacent invalid new metadata. Malformed nested turn arrays, a non-array turns object, and malformed councilRun containers are held for recovery when they structurally contain a selectedArtifact key. Current-primary / backup / legacy precedence remains unchanged. The existing conservative literal marker check applies only when the top JSON container cannot be structurally decoded; it is not described as structural proof.

Six regression variants each assert: invalid primary plus valid backup returns no fallback history, standard save fails, and BOTH original primary and backup byte arrays remain unchanged. Existing valid-primary/invalid-unused-backup and valid-primary/invalid-unused-legacy tests continue to pass.

All other v1 behavior, limits, coverage, and rendered gates are unchanged; see `/private/tmp/rivune-ao05-checkpoint/HANDOFF.md`. v1's iOS compatibility build passed; v2's small Store correction has not been separately recompiled for iOS yet. Mac final source is compiled and tested.

Separate polish candidate `/private/tmp/rivune-polish-candidate` successfully built Debug in its own source copy against v1. It has NOT been rebased onto v2, launched, installed, or rendered. Keep that candidate distinct until this source review is accepted. No changes to frozen v1 or user data.
