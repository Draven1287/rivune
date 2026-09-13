# R5 implementation mapping — no source release yet

Use CONTRACT.md unchanged pending runtime/reviewer decisions. MANIFEST.json binds that contract and fixtures; this mapping is additive planning, not a second specification.

| Existing file / owner | Required integrated change | Acceptance dependency |
| --- | --- | --- |
| src-tauri/src/host.rs — runtime | Host-owned cached provider/model/effort catalog; preserve installation/auth/test distinctions; enrich private admitted selection; validate selected capability without secrets in public view | Accepted DTO, adapter provenance, explicit/default/unknown validation fixtures |
| Rust persistence and shutdown — runtime | Add selection to existing rich draft and mutation canonical payload/receipt; preserve defaulted legacy decode and R4 CAS/durability semantics | R4 integration boundary and exact same-ID/different-selection tests |
| src-tauri/src/main.rs — runtime | Register catalog cache/refresh commands through existing host lifecycle gate | No prompt-generating discovery; bounded adapter implementation |
| web/desktop-host.mjs — renderer after lease | Add getModelCatalog/refreshModelCatalog bridge; extend rich save/shutdown selection fields; no secret/path controls | Exact runtime command and receipt names frozen |
| web/core.mjs — renderer after lease | Validate catalog IDs, limits, provider-model-effort relationships; carry selection in rich draft receipts and existing submit path | Shared actual wire fixture and malformed catalog rejection |
| web/app.mjs — renderer after lease | Use per-conversation saved selection; atomic text/files/selection writes; show admitted selection for active runs; preserve dirty choices on failure/restart | R4 durable writer and old-ACK clearing guards must incorporate selection identity |
| web/index.html + styles.css — renderer after lease | Replace hard-coded provider/model override controls with catalog-backed Rivune selectors, clear setup states and default choices | Approved design, keyboard/focus/draft preservation and empty/error states |
| web/chrome.mjs / onboarding.mjs — lease required | Update setup selection entry points only where current hard-coded routing would bypass catalog | Explicit named-file release; no independent redesign |
| Renderer tests — renderer after lease | Four-provider fixture rendering; scoped reasoning; unknown/stale/auth states; atomic save/ack/restart/shutdown preservation | Same accepted DTO as real host; no fabricated readiness |

Implementation order: runtime accepts DTO and records R4 integration boundary; owners receive named leases; runtime exposes catalog/selection schema; renderer wires existing setup/composer to that schema; independent reviewer checks current frozen diff and failure cases; runtime owns combined build. No work in this mapping authorizes build, native launch, publication, API credential entry or actual model calls.

Important integration checkpoint: R4 acknowledgement cleanup must compare the submitted selection identity as well as rich revision and ordered attachment IDs when R5 is implemented. Current r10/r11 protection must not regress for same-text selection changes. Add selection-change immediate/restart cases to the existing targeted suite rather than a standalone UI harness.
