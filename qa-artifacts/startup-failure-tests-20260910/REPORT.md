# Startup failure regression contribution

Five new deterministic tests pass against the captured actual current controller. Two existing missing-bridge/unreadable-journal tests also pass. No implementation failure was reproduced in these controller cases.

New cases cover initial snapshot rejection with and without retained recovery identity; late hydration resolution and rejection after disposal and a fresh controller start; and disposal while subscription is pending. They assert no save, submission, configuration, journal write/clear, or reconciliation replay. Rejected hydration retains the journal, exposes no private failure text, and supplies no fabricated snapshot/draft. Old completion cannot publish to the disposed controller or alter the replacement; late subscriptions are released.

Existing coverage already tests a null bridge without reading the journal or running work, and unreadable recovery storage blocking admission. Those tests were reused instead of duplicated. Existing mounted tests also cover rejected startup status and recovery, but were not run here.

## Integration

[integration.patch](integration.patch) adds only five cases and two small helpers to `prototypes/ai-native-workspace/tests/hostController.test.mjs`. It depends on that file's existing fixture. [base-hashes.json](base-hashes.json) records the target test and actual controller/runtime imports; captured copies are under `snapshot/`. The sole builder should check these bases before integration. No live or candidate file was changed.

Run the isolated contribution from the workspace root:

```sh
node --experimental-strip-types --test qa-artifacts/startup-failure-tests-20260910/snapshot/tests/startupFailure.test.mjs
```

Results: [tests.log](tests.log), 5/5; [existing-tests.log](existing-tests.log), 2/2. This uses actual started controllers and synthetic bridge/journal implementations, without React mounting or native execution.

## Boot/UI coordination and limits

The UI owner was informed that controller.start catches initial snapshot failure into error/uncertain with a null snapshot. A render ErrorBoundary or module import catch alone will not catch that resolved failure state. The desktop diagnosis owner was informed of the separate startup-status, lifecycle/controller, and bridge-import ordering boundaries. No known deterministic loader exception was claimed.

The UI owner's proposed dynamic App import catch and StartupBoundary were inspected only as an evolving interface; they were not integrated or tested here. Pending startup-status replacement, React fallback rendering, module-loading failures and native blank-window causes remain separate from these controller tests. These tests make no claim about actual provider execution, storage durability, process startup or profile safety.

No server, native launch/build, provider/process/profile action, or dependency installation occurred.
