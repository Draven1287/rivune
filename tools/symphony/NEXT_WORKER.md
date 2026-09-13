# Versioned Constellation execution plan contract

Use only this issue workspace, initialized from reviewed local Rivune commit a52cde8f25d0af4fc57ebd42b858510ca69b6797. Do not access other workspaces, user data or installed applications. No source publication, push, merge, app launch, provider calls or lockfile changes.

Implement a proposed versioned typed execution-plan contract and pure validation for Constellation. Inspect existing team/run contracts first. Add files only under prototypes/ai-native-workspace/src/constellation-plan/ and a focused test in the frontend tests directory. Do not modify existing runtime, UI, manifests or locks. The sole app builder will review and integrate the patch; this does not itself implement Swarm execution.

Represent plan identity/version, lead/member references, bounded work items, dependencies and expected output descriptors. Validate unique IDs, existing dependency references, no self-dependencies/cycles and valid assigned participants. Preserve provider-default behavior. Return structured validation errors. Test cycles and a valid parallel-work-then-integration graph. Use existing tools without installing dependencies or copying caches; report unavailable tests honestly.

Write a local receipt with paths, checks and integration limits. Post only a non-sensitive summary on this issue via github_api; no source contents, private paths or artwork. Add symphony-review and remove symphony-ready when complete. Do not release other issues.
