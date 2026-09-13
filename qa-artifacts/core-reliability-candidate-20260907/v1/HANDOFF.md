# Core reliability candidate v1

This candidate composes three previously independently accepted corrections on the exact accepted 0623 native baseline:

- Council saved-appointment validation before provider work begins.
- Transcript wheel routing to the conversation scroll view while preserving composer focus/caret behavior.
- Terminal descriptor-local SIGPIPE handling and direct-child process cleanup.

## Owner validation

- Full native test suite: 326 passed, 0 failed, 0 skipped.
- macOS Release build: succeeded.
- Generic iOS Simulator Release build: succeeded.
- Patch dry-run against the shared accepted baseline: required before acceptance.

## Boundaries

This freeze does not apply changes to shared source, install the app, call live providers, or prove rendered native behavior. Phone durable-journal work, Swarm composition, menu work, and provider-experience work are excluded.
