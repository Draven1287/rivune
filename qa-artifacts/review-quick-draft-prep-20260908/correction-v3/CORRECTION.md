# REVIEW-QUICK-DRAFT correction v3

Status: frozen isolated incremental correction over correction-v2. No canonical, profile, Rust, native-build, or rendered-UI change.

The `add()` rejection path now verifies the captured operation epoch, action ID, and current state before publishing an error. A late failure from a dismissed action therefore returns without changing the current action or text. A legitimate failure for the still-current settling/saving action continues to restore that action's editable text and error.

Regression evidence:

- Late `settleCurrentDraft()` rejection after A dismissal and B entry: B remains intact; no Review host write.
- Late `getCurrentTarget()` rejection after A dismissal and B entry: B remains intact; no Review host write.
- Current-action settlement rejection: A's text and error remain editable.
- New v3 suite: 3 passed, 0 failed.
- V2 suite re-run: 9 passed, 0 failed.
- JavaScript syntax check passed.
- Incremental patch apply-check passed against the frozen v2 candidate.

Cross-process recovery remains conservatively blocked and is still an integration limitation, not accepted restart recovery.
