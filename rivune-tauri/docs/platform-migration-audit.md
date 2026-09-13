# Rivune architecture audit and migration plan

Scope: the current rivune-tauri application serving port 1420. The enclosing project also contains a Swift application, website, prototypes and QA snapshots; these are separate historical surfaces, not OS variants of this product. They will not be merged or deleted. Latest user instruction authorizes incremental migration of this Tauri application.

## Phase 1: current architecture

Vanilla TypeScript with Vite 6 and Tauri 2. No React, component framework, URL router, or external state library. main.ts mounts the shell as HTML and implements conversation navigation through currentId, route and provider state. LocalStorage holds versioned conversations, drafts, project metadata, preferences and onboarding. Existing storage events and baseline guards protect stale-window edits. workspace.ts and drafts.ts contain pure recovery/merge rules. providers.ts implements an in-memory mock stream; scripts/mock-api.mjs provides a separate loopback HTTP fixture. Real model replies, account authentication, native sharing and native Liquid Glass are not implemented. agentQueue.ts is a pure scheduling foundation, not a live dispatcher.

onboarding.ts, projects.ts and conversationActions.ts are shared DOM components. style.css is one cumulative stylesheet; public assets are shared. lib.rs contains fixed CLI sign-in checks. main.ts directly imports Tauri invoke/isTauri and mixes dev fetch with UI rendering. Browser APIs include localStorage, DOM dialogs, File input, Blob downloads, media queries, visibility events and animation. No duplicate OS-specific product routes were found in this target.

## Exact architectural obstacles

1. Monolithic main.ts mixes shell markup, UI effects, feature controllers, persistence and integration calls.
2. No runtime/capability interface; Tauri presence is currently treated as enough to offer native connection checks.
3. Native Rust checks and development Node checks embed macOS paths; Windows executable suffixes and unsupported native capabilities are not explicit.
4. Storage and downloads are invoked directly from UI; error semantics must survive extraction.
5. Styling lacks tokens; material effects are CSS and cannot truthfully claim native Liquid Glass.
6. No architecture-boundary tests. Native builds have not been verified; cargo is unavailable on this host.

## Phase 2: migration order and file decisions

Preserve package dependencies, Tauri configuration and public visual assets. Keep compatibility exports for moved modules so existing tests and consumers retain their imports. Preserve all storage keys, parsing schemas and error behavior; no user-data migration.

1. Add platform/types, capabilities, detection and browser/macOS/Windows/Linux adapters, with dependency-injected tests. Add a native runtime-info command; unsupported capabilities remain false.
2. Move Tauri imports to services/native and dev HTTP checks to services/api. UI calls platform methods only.
3. Extract app/app-shell markup unchanged; main.ts becomes a small bootstrap; current controller lives in app/workspaceApp.ts for subsequent bounded feature extractions.
4. Move pure conversation, drafts, provider simulation and queue code into actual feature/service folders. Move onboarding/projects/actions with compatibility re-exports. Centralize storage access and downloads without changing persistence semantics.
5. Add shared design tokens plus small platform presentation modules, with no visual redesign. Native material capability stays false until implemented and validated.
6. Validate browser build, typecheck, existing tests, platform capability tests and import-boundary tests. Attempt native build only where toolchains exist; clearly record missing Windows/Linux/native runtime evidence.

## Target tree

src/app/{app-shell,workspaceApp.ts}; src/features/{conversations,projects,onboarding,agents}; src/services/{api,storage,native}; src/components/shared; src/platform/{types.ts,capabilities.ts,detect.ts,index.ts,browser,macos,windows,linux}; src/styles/tokens.css; existing style.css; src-tauri/src/lib.rs.

No empty reviews/ratings/catalog modules will be invented: Rivune is a unified AI workspace. New ordinary product features belong in shared features; only OS integrations belong in adapters.

## Risks and acceptance

DOM extraction can alter initialization order, relative imports or selector behavior. Adapter startup must settle before mounting without blocking browser startup on native IPC failure. Native detection must fail closed to unknown, never guess from browser user-agent. Storage wrappers must continue throwing errors so existing recovery messages work. Tests must not fabricate native support. Cross-platform compile is separate from actual launch, provider execution and visual acceptance. Shared code percentage is a target, not a measured claim.
