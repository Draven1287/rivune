# Independent review — Rivune build 2026090621

Status: **accepted as the current installed local review checkpoint, with the evidence limits below.** This is not public-release, live-provider, physical-phone, or model-quality acceptance.

## Independently verified identity

- `/Applications/Rivune.app` reports version `0.2`, build `2026090621`.
- Installed executable SHA-256 is `bc38e49625bb9f2419d6d1e6c5a9543eaf16b6771570888f1f6e091026118b88`.
- `codesign --verify --deep --strict` passes. The app remains locally ad hoc signed and is not a notarized public release.
- The five current workspace files listed in `source-manifest.json` match all five recorded SHA-256 values.

## Crash closure evidence

The retained `Rivune-2026-09-07-003000.ips` is a real build-2026090621 crash: `EXC_BREAKPOINT` / `SIGTRAP` on the main thread inside AppKit layout. This establishes the prior compact selected-artifact crash; the report does not by itself prove a specific Swift modifier caused it.

The corrected `Components.swift` removes the selected-artifact `.fixedSize` modifiers and multiline `.help` value present in the crashing candidate, retains two-line display bounds, and adds the no-preset `Manager · Automatic` explanation. The final source hash matches the manifest. The supplied compact screenshot and accessibility tree show a focused draft, the exact two-file selection, removal control, tools-off state, and the native split width of 1008. No later Rivune-named crash report was present in the scoped diagnostic directory at independent review time.

This closes the reproduced transition for the installed local checkpoint on the supplied exact compact and wide sequence evidence. It does not establish a general absence of future AppKit layout failures.

## Sanitized history-preservation comparison

The comparison baseline is the retained `/private/tmp/rivune-review-2026090620/user-data-before` snapshot. It is not claimed to be a newly captured immediate pre-0621 snapshot.

- `conversations.json`: 24 conversations, 27 turns, 53 answers, and zero selected artifacts before and after; all semantic values are identical. Conversation, turn, and answer ID-set hashes are identical.
- `conversations.backup.json`: the same counts and ID-set hashes are preserved. Exactly one scalar differs: `/10/turns/0/togetherTrace/sharedPlan`. The before value is a 72-byte canonical JSON scalar with SHA-256 `afe702364274fa57cea4539dab955f8f30e96d67c9e922330c7d57892575357c`; the after value is 68 bytes with SHA-256 `976d6b8163dd5bc4b1419ce3717083faeec6dfbacabd5af2e1fd40a74aef6c6c`.
- `projects.json`, `workspace-runs.json`, and `workspace-drafts.json`: no semantic value differs.

No prompt, answer, filename, or other personal content was emitted by the comparison. These results support a bounded normalization claim: the canonical conversation file retained every value, while the backup changed only one known `sharedPlan` scalar. They do not prove the exact moment or process that performed the normalization.

## Test and build receipts

`mac-tests.log` contains `** TEST SUCCEEDED **`; the owner acceptance records 297 passed and zero failed. The Mac Release log contains only a destination warning and the iOS Simulator log is empty, so those two files do not independently prove successful exit status. Their success remains an owner-recorded result. Installed executable identity, source identity, strict signature validation, static screenshot review, accessibility evidence, and sanitized data comparison were independently checked.

No provider request, account mutation, publishing, deployment, purchase, signing for public distribution, or physical-device test was performed in this review.
