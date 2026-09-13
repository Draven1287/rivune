# Verification — filesystem candidate v1

## Clean execution

The exact `Package.swift`, `Sources`, and `Tests` were copied into a new `/private/tmp/rivune-swarm-fs.*` directory. This avoids Finder/resource-fork detritus observed in an in-workspace `.build` product.

Command:

```sh
swift test --package-path /private/tmp/rivune-swarm-fs.ntQyYK
```

Result: 11 tests passed, 0 failures, no compiler warnings. Target: `arm64e-apple-macos14.0`.

## Proven cases

1. stages and applies existing plus new nested owned files;
2. rejects traversal and normalized planned ownership overlap;
3. rejects a relevant symlink before staging without touching its destination;
4. rejects case and Unicode-canonical ancestor aliases;
5. rejects a stale base hash without changing the project;
6. detects an exact apply-time byte conflict and preserves the user's bytes;
7. detects a new normalized ancestor at apply and leaves it unchanged;
8. rejects an apply-time symlink and leaves external bytes unchanged;
9. allows an unrelated project file to change without a false conflict;
10. rolls back an injected partial overwrite while preserving proposal, backup, and journal;
11. removes a newly created nested tree after injected failure while preserving staging evidence.

## Explicitly not proven

- native coordinator wiring;
- durable reconstruction after process termination;
- rollback failure/recovery UI on a genuinely failing volume;
- descriptor-relative no-follow race resistance;
- provider execution, cancellation, or model quality;
- user-project behavior;
- multi-file atomicity;
- enabled Swarm availability.
