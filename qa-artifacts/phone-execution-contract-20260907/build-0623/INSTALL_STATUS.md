# Rivune build 2026090623 installation status

Status: **accepted source candidate; not currently installed.** `/Applications/Rivune.app` is build `2026090622` and is running.

## What happened

Build `2026090623` was locally ad hoc signed, copied into `/Applications`, and briefly launched after an earlier handoff stated that local-review installation was already authorized. A later owner-boundary clarification said that independent source acceptance only made the candidate eligible for Aarav's decision and required explicit approval before replacing the installed app. The app was therefore quit and build `2026090622` was restored immediately. This rollback was caused by the authorization clarification, not by a reproduced application failure. No provider request was made.

## Brief native evidence

Accessibility inspection of the brief `2026090623` launch found the native main window, macOS close/minimize/full-screen controls, a compact conversation list ending with `Show all 24 conversations`, two visible projects, the Council composer, and ready Codex CLI and Claude Code CLI status. The account/settings menu was opened, but the later authorization clarification arrived before the remaining planned navigation checks, so account/footer and project/file-continuation rendered acceptance remain unperformed for this build.

## Identity and rollback

- Candidate build: `0.2 (2026090623)`
- Candidate binary SHA-256: `5880a08cb176567fcf2d8edd81ec7e37108d5073a90ef0f6d2ad551a299368cc`
- Restored installed build: `0.2 (2026090622)`
- Restored binary SHA-256: `8c541ff94c8662117d4c4e4763d3c9a0f648411ae8fa220dbdda3a68becfc8eb`
- Retained review/rollback directory: `/private/tmp/rivune-review-2026090623.RsHYt8`

The restored application passed deep strict code-signature verification and its installed plist reports build `2026090622`.

## Data preservation

The pre-launch and post-rollback canonical JSON hashes match for all five local data files: `conversations.json`, `conversations.backup.json`, `projects.json`, `workspace-drafts.json`, and `workspace-runs.json`. The main conversation file retains 24 conversations. Byte-level formatting changed during normal persistence, but decoded JSON content is semantically equal. Snapshots and receipts are retained in `/private/tmp/rivune-review-2026090623.RsHYt8`.

## Next gate

Do not install `2026090623` until Aarav explicitly approves the local review install. Once approved, use the accepted frozen build, retain the `2026090622` rollback bundle and user-data snapshot, then finish native account/footer and project/file-continuation smoke checks without provider calls.

## 2026-09-07 authorization clarification

The temporary rollback described above arose from unsupported cross-task guidance, not from a new user restriction, an auto-review rejection, a skill, or a review requirement. Aarav's existing instructions already authorize updating and continuing the native local app. The conflicting gate was withdrawn, so no repeated approval was required. The independently accepted build `2026090623` was installed from the retained candidate, its binary identity was verified, and the `2026090622` rollback plus all data snapshots remain preserved.
