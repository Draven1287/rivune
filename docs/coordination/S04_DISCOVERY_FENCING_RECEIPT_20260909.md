# S04 discovery cancellation and cleanup correction

Status: implemented and fixture-tested; ready for frozen read-only review. Supersedes the early-cancel and normal-return cleanup-reporting limitations in S04_CODEX_MODEL_DISCOVERY_RECEIPT_20260909.md. The original receipt remains historical.

Commit `1d789e5eab04eaa4d5157a4b7ef405e232f4cfe5`; parent `1a33f47e9e5193db9686f7c159dd998e5a3f91bf`; Git tree `79d2673334f517c1ff9a101922afcd12524af978`. Source manifest: 112 files, SHA-256 `b166c56fad958a50700183e09c9f5b3976e61940c96cb2c8f24df49161805c87`. Three-file delta: native codex_model_discovery.rs, frontend modelDiscovery.test.mjs, MODEL_DISCOVERY.md. Candidate clean, all committed blobs match the manifest, no remotes, root index untouched. Separate direct-user visual edits remain excluded.

## Corrections

Registration and cancellation share a mutex-protected identity registry. Cancellation before registration reserves a cancelled identity; cancellation during registration either wins registration or signals the same token. Drop releases the active slot while retaining the identity. Completed IDs cannot be reused. Unrelated cancellation does not affect active work.

Registry is bounded to 1,024 process-lifetime identities with no eviction or expiry. At capacity, unknown cancellation returns false and new registration returns DISCOVERY_IDENTITY_LIMIT. Host restart resets capacity. Fresh IDs are required for each attempt. This intentional fail-closed limit avoids resurrecting delayed requests; UI support for explaining exhaustion is not implemented.

Normal completion/error paths now explicitly attempt group kill, child kill/wait and scratch removal, then return DISCOVERY_CLEANUP_FAILED if cleanup fails. This code supersedes prior result/error, drops all models and leaves selectionEnabled=false. Paths, stderr and OS error messages are not exposed. Cleanup is not retried after reaping because the group identity may be recycled. Panic-unwind Drop remains best-effort; OS spawn/wait/removal still have no independent hard deadline.

## Deterministic synthetic evidence

11 native discovery tests passed (native-fencing-final.log): before/during/after registration, public lease cancellation, replay/capacity fences, pre-cancel prevents process launch, malformed protocol/output bounds, normal and output-error cleanup, active cancellation with child reaping, and injected scratch deletion failure. The deletion-failure fixture asserts child gone and scratch retained, checks the sanitized code, then explicitly removes its synthetic scratch. No test directories/children are intentionally left running.

12 exact staged frontend discovery/default-capability tests passed (staged-frontend-fencing.log), including cleanup-error metadata rejection when models or selection are attached. Nine stage-validator checks passed (stage-fencing.log); all 112 staged files match the isolated candidate. No new frontend implementation, bridge schema, dependencies, admission or UI selection changes.

Local evidence remains in qa-artifacts/s04-codex-discovery-20260909. No private QA was forwarded.

## Next-ready review and boundaries

Review this successor commit independently of frozen 1a33f47, especially identity exhaustion semantics, same-ID rejection and sanitized cleanup precedence. Real executable compatibility/isolation, hard OS lifecycle deadlines, authenticated entitlements, Windows transport and selection/admission remain unverified or unfinished. No real account/model query, inference, paid call, auth change, native app launch/install, provider server left running, Symphony mutation or held issue publication occurred.
