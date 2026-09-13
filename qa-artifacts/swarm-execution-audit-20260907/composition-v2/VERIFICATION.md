# Verification — composition v2

Exact accepted dependency sources plus v2 package/source/tests were copied to `/private/tmp/rivune-swarm-composition-v2.dQQ7p1` and run with:

```sh
swift test --package-path /private/tmp/rivune-swarm-composition-v2.dQQ7p1/composition-v2
```

Result: 8 tests passed, 0 failures, no compiler warnings on `arm64e-apple-macos14.0`.

The five v1 owner tests remain green. Added regressions prove: one team dispatch for concurrent matching execute; conflicting context returns busy; already-cancelled apply performs no write and leaves stage usable; overlapping apply observes one reserved operation and the project is written once by that operation.

Not proven: native wiring/UI, durable crash recovery, real providers, live permissions/project, descriptor-relative hardening, multi-file atomicity, installation, or Swarm availability.
