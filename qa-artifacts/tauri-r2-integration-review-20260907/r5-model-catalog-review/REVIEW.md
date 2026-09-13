# R5 bounded contract review

One P2 specification gap; no implementation defect or provider capability claim.

## Explicitly enforce default-omission capability flags

The DTO exposes supportsProviderDefault and supportsDefaultEffort. The selection section defines null as default and restricts unknown effort/catalog behavior, but admission's general validation list does not explicitly require supportsProviderDefault for null-model selection under an available catalog, nor supportsDefaultEffort for null effort on a supported concrete model. General null-default copy could therefore allow a required parameter to be omitted despite a false capability flag.

The supplied catalog has supportsDefaultEffort=true on every model; its only supportsProviderDefault=false provider is already unsupported. Thus the 28 cases do not disambiguate a runnable explicit-model-only provider or a runnable model requiring an explicit effort.

Correction requested: state admission rules for both flags independent of catalog freshness/effortState. Null model requires supportsProviderDefault=true; null effort on a concrete model requires supportsDefaultEffort=true. A false flag must require an explicit supported choice or reject without dispatch, never silently insert a recommended default. Preserve structurally valid unavailable saved selections rather than turning admission rejection into draft loss. Add a supported available provider with default-model omission forbidden and a supported model with default-effort omission forbidden; assert null rejects and valid explicit choice succeeds. Resolve inconsistent unsupported-effort/omission-false combinations explicitly.

This is a contract ambiguity with fixture coverage evidence, not an executed dispatch failure. CONTRACT.md hash c2d7c04aaf9d8f48e1a7fe25b3f424dcf344e861d53dc9fafc198ca87f0e83e1; RECEIPT.json binds the reviewed manifest.

No additional actionable issue established in the scoped review: provider/model/effort IDs are scoped, readiness states separate, stale concrete choices need verification, rich mutations/shutdown echo selection, retry freezes mappings and discloses provider-managed-default limitations, and API credential setup remains outside the slice. IMPLEMENTATION_MAP preserves R4 acknowledgement cleanup identity.

Independently verified all five manifest-bound files' lengths/hashes and 28 unique case IDs. No live provider discovery, API/CLI/account actions, implementation tests, canonical edits, build or UI work. R4 actual-host correction remains the higher-priority implementation-review dependency.
