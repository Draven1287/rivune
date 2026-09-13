# Rivune React workspace acceptance ledger

Authority: docs/coordination/AI_WORKSPACE_FRONTEND_BRIEF_20260908.md, read in full. New frontend work only; prior desktop builds/signing/launch/install/cleanup and automated continuation remain paused. Technical coordinator owns common path/file releases; frontend owns integration. This ledger assigns no code leases.

## Deliverables and observable acceptance

| ID | Requirement | Review action / required evidence | Owner from brief | Current disposition |
|---|---|---|---|---|
| D1 | Structured TypeScript file tree | Published actual paths include sidebar/editor/chat/hooks; imports resolve and no second app tree is presented as delivered. | Frontend/runtime | Pending common directory |
| D2 | App.tsx Tailwind Grid/Flexbox/resizable layout | Inspect source; render four regions; pointer and keyboard resizing obey minimum bounds; resize persists across reload with safe malformed-storage fallback. | Frontend | Pending integrated source |
| D3 | Typed parallel agent/artifact schema | Strict TypeScript passes; IDs link messages, agent, run, artifact version and events; seeded mock fixture drives all views consistently. | Runtime | Pending shared contract |
| N1 | Sidebar file explorer | Expand/collapse tree, select file to open correct editor, visibly identify active file; keyboard focus stays visible. | Menu/frontend | Pending |
| N2 | Active agents | Select lead/member; see role, assigned task, observable phase and related output; same state reflected in chat/timeline. | Menu/runtime | Pending |
| N3 | Terminal sessions | Select session and show its corresponding labelled mock output in bottom shelf; no command execution implied. | Menu/frontend | Pending |
| N4 | Environment variables | Synthetic values only, secrets always masked; no reveal of real machine environment, credentials or paths. | Menu/runtime | Pending |
| C1 | Readable agent chat | Prose/code hierarchy, speaker/status attribution, long text wraps, final answer visually primary. | Frontend/runtime | Pending |
| C2 | Inline token streaming/skeleton | Deterministic mock stream, loading before first chunk, amber active indicator; stream stops cleanly on cancellation/unmount; no stale completion contaminates next request. | Frontend/runtime | Pending |
| C3 | Slash menu | Slash opens, Arrow keys navigate, Enter chooses, Escape dismisses, mouse works, screen-reader expanded/active state; ordinary Enter sends only outside menu, IME composition does not send. | Menu/frontend | Pending |
| C4 | Rich status banners | Loading/error/blocked/complete states labelled; errors have useful retry/control, do not fabricate success; updates announced without per-token screen-reader spam. | Frontend/runtime | Pending |
| E1 | Split file editor | Open/select multiple files, edit fixture buffer, preserve unsaved content when switching panes; no disk-save claim without host adapter. | Support/frontend | Pending |
| E2 | Inline diffs | Original/proposed text, line numbers, +/− signs and green/red backgrounds; additions/deletions distinct without color, insertion/deletion/replacement/empty cases accurate. | Support | Pending |
| E3 | Interactive execution results | Select result/step to inspect actual fixture input/output/status and associated artifact; attribution remains correct after selection. | Support/runtime | Pending |
| E4 | Live web canvas | Preview explicitly identified as sandboxed fixture; source edits update supported HTML preview; no Node/IPC/network privileges, external navigation or arbitrary code execution. TypeScript code shows code unless explicit supported renderer exists. | Support | Pending |
| T1 | Collapsible terminal shelf | Collapse/reopen, keyboard control, restore selected tab/height; transition respects reduced motion; composer remains usable. | Frontend | Pending |
| T2 | Performance/token burn rate | Every value labelled simulated or unavailable; units clear (tokens/s versus money); no fabricated actual cost or host memory claim. | Runtime/frontend | Pending |
| T3 | Model activity visualization | Planning/executing/reviewing/done public phases and summaries only; no fabricated private reasoning. | Runtime/frontend | Pending |
| T4 | Timeline/state inspection/data flow | Select ordered step, inspect input/output snapshot, dependencies/agent attribution visible; failure and cancellation represented; fixture source conspicuous. | Support/frontend/runtime | Pending |
| V1 | Premium dark palette | Slate/Zinc calm surfaces, emerald active/amber streaming, contrast checked; approved Rivune identity retained, no screenshot-as-interface. | Frontend/reviewer | Pending |
| V2 | Typography and hierarchy | Sans prose/interface, monospace code; comfortable reading line length, active/secondary states clear at normal/minimum widths. | Frontend/reviewer | Pending |
| V3 | Responsive panels/focus | Test wide1440, medium1024 and narrow390 layouts; auxiliary regions collapse or switch accessibly; no page overflow, inaccessible controls or trapped focus. | Frontend/reviewer | Pending |
| V4 | Smooth motion/resizing | Pointer cancel/release cleans handlers; keyboard min/max bounds announced; reduced-motion disables nonessential animation; layout persists without storing secrets or conversations. | Frontend/reviewer | Pending |
| H1 | One Tauri-compatible React frontend | One agreed directory/browser preview; host adapter boundary documented; existing Rust/app/website untouched; no Electron migration or new desktop binary. | Coordinator/frontend | Pending common directory |
| H2 | Production-oriented structure | Strict types/build pass with pinned reusable dependencies; error boundary/empty states; cleanup of timers/listeners; tests exercise user failure boundaries rather than echo implementation. | Frontend/runtime/packaging | Pending |
| H3 | Honest delivery | Report implemented vs integrated vs tested vs native/installed/released separately; browser mock is not finished AI runtime. Publish concrete integration gaps and test limitations. | PM/reviewer | Active rule |

## Source ownership reconciliation

Before receiving the shared brief, PM created only prototypes/ai-native-workspace/package.json, tsconfig.json, vite.config.ts, index.html, src/types.ts and src/data/mockWorkspace.ts plus empty directories. No App.tsx, Electron wrapper, build, dependency installation, server, desktop launch or existing-app mutation occurred. Those files are held for coordinator reuse/transfer and are not the accepted shared implementation. PM stopped implementation edits on receiving the brief. Do not delete/rebuild/copy them merely to reconcile ownership; coordinator can choose the directory and transfer leases explicitly.

## First combined review run

1. Packaging runs strict type/build check in the single agreed source directory, records dependency/runtime versions and exact source hashes; no desktop packaging.
2. Frontend serves one loopback browser preview. Reviewer records exact route, viewport and source checkpoint; no competing native operator.
3. Reviewer follows a single scenario: select project/file → choose agent → slash directive → mock stream/stop/follow-up → inspect code/diff/preview → select timeline input/output → switch terminal → resize/collapse/reload.
4. Run focused failure variants: stale stream after cancel/new request; malformed persisted layout; empty/long files; HTML injection shown only in sandbox; missing artifact; narrow viewport/keyboard/IME/reduced motion.
5. PM marks each row only from its evidence. Owner-reported tests stay attributed; screenshot-only evidence cannot prove keyboard or state behavior. Missing rows remain pending, not silently removed.

## Current decisions and boundaries

Tauri retained per user-delegated shell decision in shared brief. Tracer/Traycer inspiration is research-led and not a service integration. No real provider calls, money, secrets, application installation or publication. No new agents or automatic fan-out from this ledger. No further product-owner question is necessary to begin the agreed one-preview work.
