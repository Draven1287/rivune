# R5 provider, model and reasoning contract — proposed, not implemented

Scope: restore catalog-driven setup and per-draft selection within the existing Rivune app. No current vendor/model availability is asserted; all accompanying provider/model IDs are synthetic. R4 host correction remains higher priority. No live CLI/account/secret calls, canonical edits, builds or UI were performed for this contract.

## Current seam

PARITY_CHAT_SETUP identifies hard-coded two-provider setup and free-text model override as missing parity. Current host ProviderConfig has id/kind/executable_path/model/timeout_ms; ProviderDiscovery separately reports installed/authentication/tested. AdmittedRequest freezes provider + approved_context + attachments + retry_of. Extend these existing admission and R4 rich-draft semantics rather than create another configuration store or dispatch path. Treat the source observations as a moving R4 implementation snapshot, not a new source freeze.

## Public catalog DTO

`get_model_catalog({})` / getModelCatalog() returns host-cached metadata only:

```
Catalog { schemaVersion:1, revision:string, providers:Provider[] }
Provider { id, label, transport:'cli'|'api', adapterState:'supported'|'unsupported'|'unavailable', installation:'installed'|'missing'|'notApplicable'|'unknown', authentication:'authenticated'|'authNeeded'|'unknown', responseTest:'passed'|'failed'|'notTested', catalogState:'available'|'unknown'|'unavailable'|'stale', models:Model[], defaults:{modelID:string|null,effortID:string|null}, supportsProviderDefault:boolean, errorCode:string|null }
Model { id, label, availability:'available'|'unavailable'|'unknown', effortState:'supported'|'unsupported'|'unknown', efforts:[{id,label}], supportsDefaultEffort:boolean }
```

IDs are opaque and scoped: model ID belongs to provider, effort ID to model. Do not interpret or rank names. Max 32 providers, 128 models/provider, 16 effort choices/model; IDs nonempty <=128 UTF-8 bytes, labels <=256 bytes. Catalog revision is opaque <=128 bytes and changes whenever admission-relevant capabilities change. Host rejects duplicates and invalid default references; public parser also rejects malformed catalog. Never expose secret values/references, CLI environment, executable arguments or credential-store handles in this DTO. API route may appear unavailable before an adapter/secure setup exists; its appearance is not support.

`refresh_model_catalog({providerId:string|null})` / refreshModelCatalog(providerID=null) is an explicit refresh action. It may use only a supported adapter's bounded, documented discovery capability; never infer capabilities from arbitrary executable names, scrape provider secrets, submit a prompt, spend model tokens, install/update tools or spawn agents. Cache-only retrieval is the default. Discovery requiring a new network/account action must be separately supported and surfaced rather than silently added here. Return the same DTO with per-provider unavailable/error state; failure must not erase a draft's saved selection or relabel cached data as fresh. Cached stale catalogs are display-only until host verifies selected options at admission; failed refresh never silently changes them.

## Selection and defaults

```
Selection {schemaVersion:1,providerID:string,modelID:string|null,effortID:string|null,catalogRevision:string}
```

Null model means provider default, not the first item or a guessed flagship. At admission, null model is allowed only if supportsProviderDefault is true, including when the catalog is available; false requires an explicitly available model ID. Null effort means provider/model default, not zero reasoning. For a concrete model, null effort is allowed only if that model supportsDefaultEffort is true, even when effortState is supported. A false flag requires an explicit advertised effort ID; do not replace omission with a recommended default. For provider-default model selection, null effort represents the supported whole provider-default route, so supportsProviderDefault must attest to that omission combination. A non-null effort requires a concrete model and an exact advertised effort ID. Never translate one vendor's High/Max/Ultra into another's enum. Unsupported effort shows no configurable reasoning control. A model with effortState unsupported and supportsDefaultEffort false has no valid execution configuration: show unavailable configuration and reject admission, without inventing an effort parameter. With effortState unknown and supportsDefaultEffort false, likewise block until capabilities become known. Preserve structurally valid draft choices for correction instead of discarding text/files. Unknown effort supports only null if adapter explicitly supports omission. A provider-default model supports only null effort in this first slice.

Default model/effort IDs are host-known recommendations, not automatic substitutions: stored null remains null until admission resolution. Provider change requires deliberate model/effort selection or explicit reset to supported defaults. A saved unavailable choice stays visible with “Choose another model”; it must not silently fall back. Default selected provider may initialize a brand-new draft only; existing drafts retain their own choice. No automatic “smartest model” ranking or team selection in R5.

## Exact mutation and submission seam

Add defaulted `Conversation.richDraft.selection: Selection|null`; revision covers text + ordered attachment IDs + selection atomically. Extend R4 `save_rich_draft` args with `selection`; all R5 callers send it explicitly (null means deliberately unconfigured). Full immutable mutation payload identity includes selection. Legacy decoding retains missing selection as null; no newly released writer may omit selection and accidentally overwrite it. The R4 structured durable/rejected/uncertain receipt adds the exact saved selection. Same mutation ID/different selection rejects. Precommit/postrename/lost-response distinctions remain unchanged; readback does not prove durability.

Extend rich shutdown flush likewise with selection and exact receipt echo. Null-conversation sentinel requires selection null. Per-conversation queued writes and navigation guards must retain newer choice/text/attachments after older acknowledgements. Uncertain saves replay their original complete payload before another edit. A catalog mismatch may prevent sending but does not prohibit saving a draft with a now-unavailable choice, provided its structural identity is valid. This preserves work across capability changes.

On Send the request references acknowledged richDraftRevision. Host resolves the selection from that persisted revision; renderer-supplied provider/model/effort overrides must not bypass it. Validate route adapter, installation when applicable, authNeeded, catalog/availability and supported effort at admission. `unknown` authentication is not “signed in”: a configured supported route may be attempted only through normal explicit Send with honest unverified status; no readiness success is implied. Known authNeeded blocks with a sign-in action. Unsupported/missing adapter blocks. Unknown/stale model catalog permits only provider default when supportsProviderDefault is explicitly true and no effort override is requested; concrete stale/unknown choices require fresh adapter verification or reject. Known unavailable choices reject without dispatch.

Freeze defaulted `AdmittedRequest.modelSelection`:

```
{requested:Selection, effectiveModelID:string|null, effectiveEffortID:string|null, resolution:'explicit'|'adapterResolvedDefault'|'providerManagedDefault', adapterRevision:string}
```

Effective IDs may be filled only from trustworthy adapter resolution; never fabricate effective defaults. Freeze the actual validated provider route and exact argument/parameter mapping internally, with secrets stored only in OS credential storage and referred to privately. No secret bytes in workspace snapshots, logs, receipts or run metadata. Credential refresh must not switch provider/account identity silently. An API credential entry workflow is host-owned and outside this contract's implementation slice.

Exact retry reuses original admitted prompt, project instructions, attachment snapshots, provider route, selection and reasoning mapping, without consulting current draft/project/default selections or refreshing a catalog. Revalidate that the adapter can execute the frozen mapping; unsupported retired model/adapter must fail explicitly, not switch. For providerManagedDefault the effective model/effort remain unknown: the retry is the same requested settings, not a guarantee of the same underlying model. Surface that limitation in run details; do not label it exact-model replay. No automatic provider/model fallback after rate limits, auth errors or unknown outcomes. Existing mutation/admission/retry ancestry and duplicate-dispatch guards remain.

## Renderer behavior

Connections lists actual catalog entries, transport and separate setup/status details. A missing CLI offers setup guidance; unsupported adapter is labelled “Adapter needed”; authentication unknown is “Sign-in not verified”; catalog failure is “Models unavailable” with explicit refresh. “Tested” is never derived from discovery or local install. A passed response test is historical, not a promise about this request.

Composer shows provider, model/default and reasoning/default in Rivune-styled accessible selectors. Group choices by provider and preserve keyboard focus, Escape dismissal, text and attachments. Save failure leaves dirty selection visible and Send disabled; retry saves the same immutable edit first. Active run header uses admitted selection, while composer may edit settings for the next message. A new choice never changes a running task. Imported read-only chats remain inert. Multi-model lead/Council/Swarm is a later runtime slice; R5 does not add decorative modes or fake live teamwork.

## Handoff and acceptance

Runtime owns private adapter catalog, cached discovery, capability validation, rich mutation/schema/shutdown and admission mapping. Renderer owns dynamic setup/selectors using agreed DTO and strict bridge validation. Existing provider configure path may seed the catalog internally but must not independently mutate a draft's selection. First integrate fixture-backed actual-host tests, then rendered states with the same DTO. No canonical implementation until named release.

Fixtures include four synthetic providers with mixed transports and distinct effort capabilities; unknown/unavailable/auth-needed/unsupported/stale states; saved and admitted selections and immutable retry cases. CASES.json supplies expected outcomes. MANIFEST.json binds exact artifact bytes. Fixture validation confirms JSON references and hashes only, not R5 product behavior, CLI support or current model availability.
