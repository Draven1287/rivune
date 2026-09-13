# S04 Codex model discovery completion receipt — 2026-09-09

Status: bounded source implementation and synthetic validation complete; ready for read-only review. Real discovery, entitlement and selection integration remain unverified/unimplemented. Local only, no publication.

## Recovery of incomplete handoff

The previous discovery work had completed its focused fixtures and command-registration compile but ended before source reconciliation and receipt creation. The subsequent user turn handled visual placement, so the discovery manifest remained at e0c19ec8. No final build blocker remains: native-command-registration.log ends with a successful no-run compile. Earlier retained logs record a Tauri async command return-type compile error (fixed to Result) and a synthetic cancellation fixture startup race (fixed by waiting for its marker before cancellation).

## Implemented

Native isolated stdio transport, paginated parser and request-bound lifecycle; two registered Tauri commands; optional typed frontend adapter and cancellation; sanitized structured reports preserving picker ID, wire model and advertised effort strings. All reports have selectionEnabled=false. Existing provider-default catalog and admission logic remain unchanged. No UI auto-query or model selection was connected.

Protocol basis and exact lifecycle limits are in prototypes/ai-native-workspace/MODEL_DISCOVERY.md. Installed CLI 0.153.4 help and generated schemas were inspected; only synthetic peers exercised discovery. initialize → initialized → account/read(refreshToken=false) → model/list is the complete method allowlist. A non-null account or server request aborts. Metadata may require network refresh if this capability is later invoked; it is not an offline guarantee.

Native session deadline: 8 seconds after spawn/setup; frontend timeout: 10 seconds. One active request; four pages, 32 entries/page, 128 entries total; 1 MiB output and 256 KiB pending buffer; 16 efforts/model. Group kill, child wait and scratch deletion run on drop. Spawn/cleanup are not independently deadline-bounded, cleanup errors are ignored, and cancellation before native registration can miss registration (native deadline remains fallback). Process environment isolation is fixture-tested, not a hard OS sandbox or a real Codex isolation proof.

## Validation

- Resumed native discovery fixtures: 8 passed (native-resumed.log).
- Exact staged frontend discovery and defaults-only capability tests: 11 passed (staged-frontend-tests.log).
- Stage validator tests: 9 passed (stage-tests.log).
- Native command registration: cargo test --bin rivune --no-run passed; no binary execution.
- Earlier discovery-stage frontend suite: 129 passed; desktop build passed (frontend-unit.log, frontend-build.log). Those are historical results from before the separate visual-placement edits, not a fresh full-suite run on those edits.
- Current static validator: all 112 staged files match the isolated candidate, literal dependencies/lock integrity/native output wiring pass. Committed blobs independently hashed against manifest; candidate clean, no remotes.

Local evidence directory: qa-artifacts/s04-codex-discovery-20260909. Evidence is retained locally and has not been forwarded.

## Source reconciliation

Commit: 1a33f47e9e5193db9686f7c159dd998e5a3f91bf
Parent: e0c19ec8f01316e1f7535dbd6e3f4bbfe2a1b995
Git tree: 2c67c0f3810fff2dbb7d136606839111e9fc08ec
Manifest SHA-256: 89cd66870ecad47d9b7ff72e50c27060890f914fa5441591db5b1a015e85c3e7
112 allowlisted files; nine-file discovery delta. Exact inventory: tools/symphony/source-stage/GIT_IMPORT_CANDIDATE.json. Root Git index untouched; no push.

The current workspace also contains subsequent visual edits to ChatPanel.tsx, Sidebar.tsx and styles.css. These three files intentionally retain their e0c19ec8 baseline in this bounded discovery export; stage is not represented as byte-identical to the entire current workspace. Their separate visual snapshot/checks are outside this handoff.

## Unfinished and next-ready review

Real app-server compatibility/isolation, authenticated entitlement mapping, executable-version negotiation, Windows transport, UI discovery controls and selection/admission remain unfinished. Review the command boundary, lifecycle limits, cancel-before-registration race and cleanup reporting next. Do not enable selection without identity/admission proof. No live discovery/inference, paid calls, authentication changes, native app launch/install or new provider server left running occurred. Pending public issue, artwork and notice publication holds remain unchanged; no Symphony mutation or private QA forwarding.
