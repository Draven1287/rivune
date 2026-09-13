# Verification — composition candidate v1

Exact accepted dependency sources plus candidate package/source/tests were copied with their relative package layout to:

`/private/tmp/rivune-swarm-composition.5FWLAo`

Command:

```sh
swift test --package-path /private/tmp/rivune-swarm-composition.5FWLAo/composition-v1
```

Result: 5 tests passed, 0 failures, no compiler warnings on `arm64e-apple-macos14.0`.

Covered: successful reviewed stage/apply, worker failure, cancellation, post-review project conflict, recoveryRequired propagation, user-edit preservation, artifact retention, and automatic-retry rejection.

Not covered: real providers, native wiring/UI, live project permissions, durable crash recovery, descriptor-relative syscall hardening, multi-file atomicity, or enabled Swarm.
