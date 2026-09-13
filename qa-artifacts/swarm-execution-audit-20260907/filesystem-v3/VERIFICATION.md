# Verification — filesystem candidate v3

## Clean run

Copied exact package, source, and tests to `/private/tmp/rivune-swarm-fs-v3.IlYP02` and ran:

```sh
swift test --package-path /private/tmp/rivune-swarm-fs-v3.IlYP02
```

Result: 17 tests passed, 0 failures, no compiler warnings. Target: `arm64e-apple-macos14.0`.

## Coverage

All 16 filesystem-v2 tests pass, covering normal stage/apply, traversal and normalized ownership, pre-stage/apply symlinks, case/Unicode aliases, wrong/stale bases, apply-time exact/ancestor conflicts, unrelated edits, ordinary rollback, new-tree cleanup, complete package traversal/backups, later user-edit preservation, and replacement-directory preservation.

The added P1 replay:

1. starts with `project/a.txt = original` and `external/a.txt = proposal`;
2. applies `proposal` to the admitted project;
3. deterministically moves the real project and replaces the admitted path with a symlink to external before rollback begins;
4. requires `recoveryRequired` plus root-level `unsafe-root` evidence;
5. proves `external/a.txt` remains `proposal`;
6. proves `moved-project/a.txt` remains `proposal` pending explicit recovery;
7. proves the original backup remains staged.

## Not proven

Native mapping, durable reconstruction, crash-window recovery, genuine failing-volume behavior, descriptor-relative syscall-race resistance, provider execution, user-project behavior, multi-file atomicity, UI, or enabled Swarm availability are not claimed.
