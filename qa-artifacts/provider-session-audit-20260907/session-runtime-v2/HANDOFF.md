# Conversation session runtime v2 — isolated integration foundation

Status: independently ACCEPTED for bounded kernel/private-persistence integration. Root22 tests passed; independent22 plus two original ownership regression tests passed (24 total), no compiler warnings. See INDEPENDENT_REVIEW.md. No live adapters, native Store integration, app install or provider calls. Frozen path and exact hashes are in MANIFEST.json. V1 rejected evidence remains next door.

## What changed

Typed per-turn input carries the current user message, newly selected documents, exact artifact bytes, and approved project instructions/version on every request. Only a new binding accepts a bounded role-aware history seed; subsequent turns carry no duplicate rolling history. The fixture suite records12 sequential turns and verifies their inputs/session identity. It does not establish whether a real model obeys an old constraint or rejects malicious document content.

An actor persists each run reservation before returning a launch effect. Its local run ID is a Stop target before provider acknowledgement. A late acknowledgement after Stop yields an interrupt effect with exact provider IDs. Completed, interrupted, failed and unknown outcomes remain distinct. Provider completion racing Stop is preserved as completion with stopWasRequested, rather than falsely rewriting provider history. A final save failure cannot publish a completed answer. Failed active state is recovered as unknown, with no automatic resubmission.

One active run per conversation/route binding; duplicate IDs return existing results; conflicting content fails. Explicit reset archives the provider binding and permits a new seed while retaining every consumed run ID. Provider session IDs are exclusive per route across active and archived bindings, so another conversation or reset cannot silently adopt earlier provider context. File persistence uses a separate OS lock plus token-owned runtime lease, private0600 temporary files and atomic rename. The journal is bounded and refuses new work when full; it never silently removes consumed IDs.

## Integration contract

- The host must convert an already admitted ApprovedPromptContext into ApprovedTurnInput. Retain the native artifact validation and user/project permission checks. User history and approved project instructions are distinct from document/artifact references. Never treat these value types as a replacement authorization decision.
- The transport driver registers a cancellable operation under localRunID before acting on a launch effect. Interrupt can arrive before provider IDs exist. The driver must remember cancellation, prevent a not-yet-started process from launching, and terminate/interrupt an owned operation. This kernel emits effects; it does not itself launch, terminate or prove cancellation of a CLI process.
- Call receive only with allowlisted, bounded and identity-correlated provider events. Deltas are preview; completed carries authoritative final text. On EOF/lost acknowledgement invoke lostTransport, preserve uncertainty and do not retry automatically. Map provider failures and parsing/size violations to explicit cleanup plus terminal/unknown state.
- Versioned Codex/Claude process adapters must verify installed capabilities, requested model/effort and effective tool configuration before launch. This candidate's effort vocabulary is deliberately limited. Unsupported existing settings must reject or remain on the user's existing route; never silently reduce effort or replace the requested model.
- Tools are off in this contract. A future adapter must enforce that before execution; the enum alone is not a provider permission boundary. No read-only project, shell, web, agent or write capability is enabled by this candidate.
- Private journal data includes session IDs, preview and answer text. It is NOT a shareable execution receipt. Keep it in the app's protected local-data boundary. Integrating with workspace history requires a documented single-writer/commit/recovery relationship; no cross-file atomicity is claimed. Explicit reset does not delete provider-owned history or make a model forget previously sent files.
- Supply one stable lease key per durable store. Bound process concurrency in the existing host coordinator. Current file replacement supports app restart recovery; directory fsync/power-loss guarantees and live-provider exactly-once side effects are not claimed.
- Preserve native source ownership and premium UI. Do not activate routes or display 'same as ChatGPT/Claude' based on these fixture results.

## Verification

Root ran22 tests with no compiler warnings. Coverage: persisted-before-launch, write failures,12-turn input continuation, duplicates/conflicts, per-binding concurrency, Stop before acknowledgement, late acknowledgement, completion/Stop ordering, pending and completed restarts, final-save failure, foreign/out-of-order/late events, reseeding rejection, corrupt state, file ownership/0600, bounds, explicit reset, changed saved identities, full consumed-ID journal, cross-conversation/reset session rejection, loaded duplicate identity, route-scoped opaque IDs and combined context budget.

Next: the native owner can integrate this accepted foundation in an isolated provider-adapter candidate after the active phone checkpoint. Real CLI streaming/parsing, provider termination/resume, requested/effective model receipts and live conversation quality remain separate acceptance work. Existing user authorization applies; no new permission gate is created.
