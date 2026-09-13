# Frontend ownership and continuation backlog

Authority: [AI_WORKSPACE_FRONTEND_BRIEF_20260908.md](AI_WORKSPACE_FRONTEND_BRIEF_20260908.md) and the released [implementation contract](AI_WORKSPACE_FRONTEND_CONTRACT_20260908.md). This is the continuous dispatcher's planning deliverable, not an additional file lease or dispatch instruction. Shared source is `prototypes/ai-native-workspace`; reuse that scaffold only. The contract controls exact file ownership and exports. Automatic fan-out remains paused.

The old R6 build/native acceptance queue is suspended for this scoped frontend work. Preserve its artifacts and dependencies; do not resume desktop builds, signing, installation, launches, cleanup, or host edits. One shared browser preview is the reviewable outcome.

| Owner | Current scoped outcome | Next eligible work | Dependency / evidence |
| --- | --- | --- | --- |
| Coordinator 01a07cde-764e | Directory and file contract released; maintain contract and queue | Resolve interface conflicts and route concrete defects | No competing shared-file writers; frontend is sole integrator |
| Frontend 01a074a4 | App.tsx, main.tsx, styles.css, ChatPanel.tsx, TelemetryShelf.tsx and ResizableLayout.tsx at contract paths | Integrate accepted components and correct rendered layout defects | Owns composer/stream/status and sole browser server control; keyboard/pointer resizing, persistence, narrow layout and reduced-motion evidence |
| Runtime 01a051fa | types.ts, hooks/adapter boundary, deterministic synthetic fixtures | Correct schema/fixture issues exposed by integration | No Rust host changes; demo labels, unavailable real metrics, observable activity only |
| Support 01a08294 | Editor, artifact, diff and preview components | Correct specific integrated diff/preview defects | Released files and types; additions/deletions indicated beyond color, safe demonstrative preview |
| Menu 01a07cde-0293 | Sidebar and slash-command components | Correct concrete keyboard/navigation defects | Released files and command callbacks; keyboard selection, Escape and masked synthetic environment values |
| Reviewer 01a08293 | Independently inspect integrated browser interactions | Recheck corrected findings against identified source checkpoint | Preview ready; report keyboard, resize, streaming scroll, diff and accessibility evidence separately from untested behavior |
| Packaging 01a07831 | Frontend dependency and build portability check | Recheck dependency/build corrections when inputs change | Exact shared directory and package manager; frontend-only checks, no desktop packaging or duplicate caches |
| PM 01a07f0d | Requirement acceptance ledger | Reconcile evidence and remaining integration gaps | Distinguish implemented, rendered/verified and host-unwired; deduplicate findings |
| Product direction 01a06efc | Source-backed read-only UX comparison | Clarify specific reference questions for current layout | Separate observed Codex/Traycer/Claude behavior from proposed Rivune behavior |
| Continuous dispatcher 01a0845a | Maintain this aligned backlog and ownership/dependency map | Reconcile coordinator changes on explicit handoff | No worker fan-out or automation restart |

## Review gates

1. Directory and file ownership release is complete in the implementation contract. Runtime publishes exact shared interfaces before authors integrate; this release alone does not establish implementation or build success.
2. Types and component boundaries agree; frontend integrates into one App.tsx. The previous chat/composer/stream/status and telemetry ownership gap is closed by frontend's explicit ChatPanel.tsx and TelemetryShelf.tsx leases. Slash-command focus/key routing is agreed directly with Menu; demo hook shape is agreed directly with Runtime.
3. Frontend typing/build checks pass, then independent rendered checks cover keyboard and pointer resize, persisted layout, narrow windows, slash commands, scroll intent, reduced motion, visible focus and non-color diff meaning.
4. Deliver one browser preview, TypeScript tree, acceptance ledger and explicit host gaps. Demo terminal, token/performance telemetry, preview and cancellation must accurately state their synthetic or unwired status.

Completion receipts should include assignment, exact files, source checkpoint, evidence, limitations and released ownership. Next-work entries above are eligibility guidance; they do not grant file leases or restart recurring dispatch. Blocked work names its dependency rather than generating activity for its own sake.
