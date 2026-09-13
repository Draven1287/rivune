# Verification — filesystem candidate v2

## Clean run

Copied the exact package, source, and tests to:

`/private/tmp/rivune-swarm-fs-v2.JrmGCi`

Then ran:

```sh
swift test --package-path /private/tmp/rivune-swarm-fs-v2.JrmGCi
```

Result: 16 tests passed, 0 failures, no compiler warnings. Target: `arm64e-apple-macos14.0`.

## Original behavior retained

The 11 filesystem-v1 owner tests still pass: normal staging/apply; traversal and normalized planned overlap; stage/apply symlink rejection; case and Unicode ancestor conflicts; wrong base; exact and ancestor changes at apply; unrelated-edit tolerance; ordinary overwrite rollback; and cleanup of an adapter-created nested tree.

## P1 regression coverage

1. Existing `Existing.app/Contents/valuable.txt` with expected nil is rejected and unchanged.
2. The same package-owned file with the correct base is backed up and restored on injected failure.
3. A relevant symlink below `Existing.app` is rejected without touching its destination.
4. A later user edit substituted after Rivune's proposal write is preserved, hashed in recovery evidence, and returns `recoveryRequired`.
5. A later directory containing `keep.txt` substituted at a new-file target is preserved and returns `recoveryRequired`; no recursive deletion occurs.

## Not proven

Native mapping, durable restart, genuine failing-volume recovery, descriptor-relative race resistance, provider execution, user-project behavior, multi-file atomicity, UI, and enabled Swarm availability remain outside this isolated package.
