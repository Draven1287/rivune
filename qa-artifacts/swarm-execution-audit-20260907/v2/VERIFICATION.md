# Verification — candidate v2

The package uses Foundation, CryptoKit, Swift Concurrency, and injected fakes. It performs no shell/network operation and writes no project files.

## Clean run

- Clean metadata-free copy: `/private/tmp/rivune-swarm-v2.SwUiqd`
- Command: `swift test --package-path /private/tmp/rivune-swarm-v2.SwUiqd`
- Result: 14 tests passed, 0 failures.
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
- reviewer probe replay: colon-shifted provider/adapter identity fails the unchanged receipt digest;
- reviewer probe replay: nil effort and literal `default` remain distinct;
- reviewer probe replay: target ancestors, descendants, case variants, and Unicode-normalized equivalents conflict before verification;
- reviewer probe replay: cancelling the public run task cancels an active verifier without requiring explicit session Stop.

## Frozen SHA-256

- `Package.swift`: `f09a84b73724de03848c0ec39bbf86c22327effd12bf9a8b60db120793bdd233`
- `Sources/SwarmExecutionCandidate/SwarmExecutionCandidate.swift`: `dc3b6595754f9f5a39d2f37891de520da7b71989dfad2cfbc5b4c57094b2a78c`
- `Tests/SwarmExecutionCandidateTests/SwarmExecutionCandidateTests.swift`: `f9ef10247c8443caffb202afac44836959d18bcf470107cd4f78d247f21d40ec`

- `AUDIT.md`: `db31f5f929c9f2acde7000c9d5f79cd7573e58628ee03e090736cfe1842e557b`
- `INTEGRATION_CONTRACT.md`: `4dc5438847281dd3e5d77a1caf73db2ec66c8c270c976717ea586b1e63c06909`
