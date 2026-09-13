# S04 provider-enforceable team configuration boundary

## Finding and implementation

Current model catalog discovery deliberately returns unknown/empty models. The adapters' lower-level CLI argument support does not establish verified model/account choices: existing host admission rejects explicit model/effort IDs and resolves defaults with effective IDs left null. Existing TeamSelection/ModelSelection v1 already persist members, leadIndex, requested selection and admitted run choices. This slice therefore implements the requested unavailable-capability branch, not invented model selectors.

Six-file delta in successor **`e0c19ec8f01316e1f7535dbd6e3f4bbfe2a1b995`**, parent **`ad4d37273e09be94b673432214bf78aac5b61772`** preserved; Git tree **`cc7f44ce582f229b194710ae039f7ab89534d147`**, source SHA-256 **`06a61e27ca034c2deed55406d8a9dc7c174ecd0ef9ba9b672b35beb6235b2db6`**, **108 files**:

- Native host: typed SelectionCapabilities v1 with unsupported model/effort overrides and ADAPTER_DISCOVERY_UNAVAILABLE reason, serialized per catalog provider and included in catalog revision hashing. Admission uses this capability validator and preserves deterministic existing errors/default resolution.
- Native save boundary: a changed team/selection is validated against current catalog before persistence. Unsupported explicit overrides, stale revisions and unavailable routes cannot become a newly accepted configuration. Unchanged legacy/stale selection may accompany draft preservation, with dispatch still rejected until review; mutation replay handling remains ahead of this check.
- Frontend catalog parser: accepts the additive versioned field, rejects future/malformed/unknown claims. Legacy v1 catalogs lacking the field remain readable with conservative CAPABILITY_NOT_REPORTED defaults-only semantics.
- Frontend saved-team validation consumes the typed boundary and retains existing stale/removed-provider guards. Team UI explicitly states model/reasoning overrides are unavailable. No unsupported selector is introduced.
- New focused frontend tests and source MODEL_CONFIGURATION.md document compatibility and enforcement.

No schema migration silently rewrites a selected model, member order or lead. Catalog revision changes require explicit review of saved defaults. Native reopening tests preserve the old team/draft, reject an attempted unsupported changed member, and accept explicit current-default review while retaining the second member as lead. Existing frozen run/retry records are not rewritten.

## Validation

- **123 frontend unit tests passed**, including 5 new capability/legacy/stale/removed-provider tests and existing retry/controller contracts.
- Desktop web typecheck/build passed.
- **2 new Rust library tests passed**: exact capability response and default-only resolution; legacy-team preservation/reopen, invalid configuration rejection and explicit reviewed save.
- **2 existing Rust library regressions passed**: identity-bound persistent/admitted selection; stale/unverified/unavailable team choices fail closed.
- **9 stage-validator tests passed**; all source/candidate committed blobs match the refreshed allowlist/manifest.

Rust checks used the existing Cargo/rustup/shared target with --locked --offline --lib and exact focused test filters. This compiled/executed library unit tests only; no application launch, live provider invocation, paid call, native install or packaged runtime check. Local logs and exact revision are under `qa-artifacts/s04-model-capabilities-20260909/`.

## Review handoff and remaining scope

Independent reviewer: compare ad4d372..e0c19ec, inspect additive catalog capability compatibility, changed-configuration rejection versus unchanged-draft preservation, and verify lead/revision persistence. Focused source tests can be rerun without provider execution. The stage/import candidate was synchronized only after source tests/build passed; broad workspace index untouched and historical commits preserved.

This completes the safe capability/validation slice of S04. Real discovered model/effort options remain unavailable until adapters supply a verified discovery/admission contract; authentication/entitlements remain unknown and no model list was invented. Default team and preferred lead behavior remains functional within current host limits. Notice/resource publication holds are unchanged and were not researched further.

No push/publication, Symphony worker/issue, pending NEXT_WORKER assignment, N5 or private evidence forwarding was changed. Next-ready assignment is independent review of this frozen capability boundary; subsequent model-choice work must start from actual adapter discovery support, not guessed IDs.
