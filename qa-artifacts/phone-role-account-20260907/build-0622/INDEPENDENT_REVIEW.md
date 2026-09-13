# Independent review — Rivune build 2026090622

Status: **accepted for continued native integration and local review.** No P1 finding was identified. This is not physical-phone, live-provider, model-quality, signed-release, or deployed-account acceptance.

## Exact reviewed identity

- The installed executable at `/Applications/Rivune.app/Contents/MacOS/Rivune` has SHA-256 `8c541ff94c8662117d4c4e4763d3c9a0f648411ae8fa220dbdda3a68becfc8eb`, matching `source-manifest.json` and `ROOT_IDENTITY_RECEIPT.json`.
- The installed bundle was previously verified in this independent review as version `0.2`, build `2026090622`; `codesign --verify --deep --strict` passed. It remains locally ad hoc signed.
- All 16 workspace files listed by `source-manifest.json` were independently hashed and matched their recorded values. The reviewed phone, role-aware context, artifact, Council, native account, browser account, and test files therefore belong to the recorded candidate.

## Phone host admission and request reuse

The actual Mac host path in `RivuneStore.handleRemoteRequest` checks cached and in-flight request fingerprints before doing new work, performs semantic admission before provider task creation, rejects unsupported or incompatible workflows, requires the current role-aware context version, and allows at most two remote generations.

The request fingerprint is SHA-256 over the sorted-key JSON encoding of the entire `BridgePromptRequest`. It therefore binds the request ID and turn ID as well as prompt content, attachments, role-aware and legacy context fields, mode/workflow values, model choices, and effort choices. A matching in-flight request reuses the active run; a matching completed request replays the cached update; different encoded content under the same request ID is rejected as `requestIDConflict` without another provider dispatch.

Semantic admission rejects an empty prompt, a prompt above 16 KiB, legacy context above 12,000 UTF-8 bytes, more than six attachments, malformed attachment names or byte counts, and an attachment payload that cannot be encoded within the 20,000-byte context limit. The integration tests assert zero recorded provider calls for the invalid cases and for the typed legacy-format rejection. Matching in-flight/cached reuse and conflicting-ID rejection are exercised through `handleRemoteRequest` with the provider runner held and counted.

This closes the requested source-level and recorded-test checks for semantic admission, typed legacy rejection, zero-call invalid inputs, matching reuse, and conflicting request IDs. The cache is intentionally bounded to 32 entries and exists only in the running Mac process. It does not provide idempotency after restart, reconnect, or eviction.

## Role, project, and artifact authority

The V3 contract survived the merge:

- Conversation history is encoded as typed user and assistant messages. The generated provider instructions grant authority only to explicit user-role messages and treat assistant text, documents, artifacts, provider drafts, and legacy reference text as quoted data.
- Approved project instructions occupy a separate typed field. Attachment names cannot create that authority.
- Phone requests must provide structurally valid role-aware context, must carry exactly the request attachments as selected documents, must not use the legacy-untrusted state, and cannot inject a selected artifact reference.
- Direct ChatGPT and Claude continuation prompts include `ArtifactContinuation.instructions` and the immutable selected-artifact manifest in the encoded payload. Council draft, synthesis, and repair prompts keep the same complete-file JSON contract, and the persisted Council record retains the frozen typed context and artifact selection.

The production-entry tests cover direct provider paths, Council persistence/resume behavior, role order and size bounds, memory-off and legacy handling, and the separation of approved project instructions from attachments. Prior V3 independent evidence also ran the six-test role/artifact class four consecutive times (24/24 passes) against the frozen candidate before this merge.

## Account and credential boundaries

Native account restoration remains disabled for an ad hoc or isolated build. Production restore requires an explicitly enabled Developer ID bundle whose signing team satisfies the configured code requirement. User sessions use Keychain-backed local storage only after a user account action creates the backend.

Native sign-out uses local scope. It immediately invalidates visible identity and refresh authority, persists `localSessionRemovalPending` if local removal fails, avoids session access on restart while recovery is pending, blocks new sign-in, and exposes a retry that clears the persisted state only after success. This removes the local session; it does not revoke a remote Rivune account or an AI-provider account.

The browser creates Supabase only when public account configuration is explicitly enabled. It uses PKCE and `sessionStorage`, scopes the SDK storage key to the configured project and a per-browsing-context owner stored in `window.name`, and rotates a copied storage key when the owner differs. Tests prove reload stability, project separation, cloned-fixture rotation, failed-sign-out recovery, stale identity suppression, server `getUser` verification, bounded callbacks, exact redirect validation, and local-scope sign-out. Real browser duplicate-tab behavior and deployed OAuth callbacks still require rendered end-to-end testing.

## Independent execution and supplied receipts

- Independently executed browser contracts: `npm run test:workspace` passed 27/27 and `npm run test:account` passed 20/20, for 47/47 total.
- `native-test-summary.json` is a structured Xcode result summary for the exact candidate: result `Passed`, 309 passed, zero failed, zero skipped, on arm64 macOS 27.0.
- A new focused native run for `RemoteRequestAdmissionTests`, `RoleAwareProductionEntryPathTests`, and `AccountLifecycleTests` was started with Xcode/Swift cache access. It produced no test output for several minutes and was manually interrupted with exit 130. That rerun is inconclusive and is not counted as a pass. No failure was emitted before interruption.
- The artifact directory does not contain raw Mac Release, iPhone Simulator build, or browser test logs. Their successful exits remain owner-recorded except for the independently repeated 47 browser contracts above. The installed executable identity, exact source manifest, structured 309-test result, and static path review provide the bounded basis for this acceptance.

## Integration decision and remaining proof

Native integration can proceed from build `2026090622`. The host admission order, request identity rules, V3 authority contract, local sign-out recovery, and browser account isolation are coherent in the exact merged source, and the available tests show no regression.

The next acceptance work that matters to the user's priorities is a physical-iPhone pairing/reconnect run and controlled live-provider comparisons using the same prompts and explicit provider metadata. Those are required to establish reliable phone control across real transport interruptions and comparable AI conversation quality. Also still unproven are durable duplicate suppression across Mac restart, deployed Google/Apple/email account flows, Developer ID signing, notarization, release packaging, hosting, and provider-side request identifiers or billing metadata.

No source, UI, provider, account, deployment, or release mutation was performed by this review. This file is the only workspace change made by the reviewer.
