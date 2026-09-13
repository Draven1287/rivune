# Verification

The package uses Foundation, CryptoKit, Swift Concurrency, and injected fakes. It performs no shell/network operation and writes no project files.

## Clean run

- Clean metadata-free copy: `/private/tmp/rivune-swarm-final.bcuOQp`
- Command: `swift test --package-path /private/tmp/rivune-swarm-final.bcuOQp`
- Result: 10 tests passed, 0 failures.
- Compiler diagnostics: no warnings or errors.
- Swift Testing platform: `arm64e-apple-macos14.0`.

## Covered behavior

- distinct lead/worker identity and two-worker parallel dispatch;
- bounded task graph, depth, dependencies, and planned ownership conflicts;
- hash-only dependency handoff;
- target base-hash and case-equivalent conflict detection;
- one-task repair without peer rerun;
- cancellation during worker execution and during verification;
- unowned/malformed output rejection;
- incomplete or failing check evidence cannot produce completion;
- receipt omits approved context, staged bytes, and raw check evidence;
- receipt integrity succeeds for the original and rejects a changed terminal state.

## Frozen SHA-256

- `Package.swift`: `f09a84b73724de03848c0ec39bbf86c22327effd12bf9a8b60db120793bdd233`
- `Sources/SwarmExecutionCandidate/SwarmExecutionCandidate.swift`: `2efef25e4fd2531be28ebf1f064db44dd4f0d497d661f5cbab4cddb7334c4b71`
- `Tests/SwarmExecutionCandidateTests/SwarmExecutionCandidateTests.swift`: `202b93d24048343180e93925f65e3954538c2ebfe1b6e6214fca39d40983ddae`
- `AUDIT.md`: `e68a9f327fbc7e6db12b5ba845056475148e2ce1eed5c1fd96703e53cecb8032`
- `INTEGRATION_CONTRACT.md`: `5c17ed995c93c30b60869009bf1e49b17b8530b52ca4066118b0962364d372cf`
