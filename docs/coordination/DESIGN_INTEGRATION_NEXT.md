# Design-generated React integration into Rivune

Source inspection: current working prototypes/ai-native-workspace and matching Tauri configuration, September 10, 2026. Feasibility review only; no app/preview/server launch, build, dependency installation or product edits. Claude Design itself was not inspected in this assignment.

## Feasible integration boundary

Use generated React as presentation for the existing connected workspace, not as a replacement application. Keep Tauri, silver-orbit assets, galaxy at the periphery, dark readable chat surfaces and real Constellation output. RIVUNE APP BUILDER owns integration and preview/native execution. Existing paid Claude access does not authorize extra purchases or paid dependencies.

Current frontend is React 19.2.6, TypeScript 5.9.3, Vite 8.0.13 and Tailwind 4.2.1. Installed component dependencies include Radix Dialog/Dropdown/Slot, lucide-react, clsx, class-variance-authority and tailwind-merge. Plain React components, local CSS and these existing primitives can be integrated without another framework or runtime. A generated Next.js project, server actions, external auth/database scaffolding, Tailwind v3 configuration or imports of absent shadcn components cannot simply replace this entrypoint. Extract the visual components instead; review any genuinely necessary new dependency and its license before adding it.

## Components and behavior to preserve

- App.tsx selects HostWorkspace for a desktop marker, and fails closed if the bridge is missing. DemoWorkspace uses synthetic useWorkspaceDemo, separate draft storage and demo editor. Do not copy demo messages, agent progress or editor actions into connected state.
- HostWorkspace.tsx owns controller/lifecycle subscriptions, startup and recovery UI, draft state, settings, configuration review and result selection. Preserve its state machine; introduce small presentation components with explicit props/callbacks rather than moving logic into a generated global store.
- ConversationList, ComposerExecutionControl, ConversationConnection and ProviderSetup are integration points for navigation, model/team selection and connection configuration. Retain existing disabled/pending/uncertain/review states and explicit user actions. Present capability/authentication/response testing separately.
- Constellation, ResultsPane, useHostResults, inspectionSession and SavedResult must keep host-derived result identity and inert inspection. No generated fake file tree, editing/saving/export controls, autoplay preview or browser-inferred files. Show only implemented capabilities.
- workspaceController, contracts, tauriAdapter, durableRecovery, configurationRecovery and lifecycle remain behavior owners. Visual changes must not auto-submit, bypass save/conflict checks, reset drafts on remount, repeat discovery on every render or clear a recovery fence.
- Duplicate-looking filenames such as HostWorkspace 2.tsx and ProviderSetup 2.tsx exist in the working tree. Follow actual imports from App.tsx/HostWorkspace.tsx; do not merge alternate copies or delete them as part of design work.

## Packaging constraints

build:desktop invokes scripts/build-desktop.mjs: typecheck, Vite dist-desktop, then a desktop-entry module importing the matching desktop-host.mjs before React. Keep that order and the configured frontendDist. Browser index HTML is transformed for Tauri's CSP; do not replace the transform with a remote page or permissive CSP.

Current native CSP permits self-hosted scripts/styles/images and IPC connections only, with data images allowed. Remote fonts/CDNs, analytics, fetch-based demo content, iframes and inline script/style requirements cannot be assumed to work. Prefer bundled assets and CSS classes. Do not relax policy to accommodate a generated prototype. Audit runtime styling/portals against the existing webview rather than treating successful browser rendering as native proof.

## Accessibility and performance risks

Keep real native window controls; do not draw duplicate red/yellow/green controls. In-app menus and settings should remain contained to the workspace. Preserve accessible names, visible keyboard focus, Escape, dialog focus containment and return-to-opener behavior. Portal/nested-dialog combinations must not leave an invisible overlay blocking chat. Conversation changes and result changes must dismiss stale inspection without losing composer focus or draft.

Verify normal-text contrast against final composited surfaces, not palette swatches alone. Keep galaxy out of reading surfaces; avoid a full-window animated blur/particle layer. Use existing images/icons, bounded transitions and reduced-motion support. Avoid rerendering the full transcript on every keystroke or animation frame. Do not add virtualization unless measurements justify it and keyboard/selection behavior is preserved. Long unbroken output, zoom, long conversation labels and loading/error notices need real layout tests.

Native config currently starts at 1120×760 with minimum 760×560. Check both plus a wider split-pane layout. Host results logic has a 1200px breakpoint; test both sides to prevent trapped or duplicated panels. 390px/320px may be useful future responsive checks, but are not evidence of a delivered phone app.

## Minimal builder verification

1. Review generated files and asset/dependency inventory before integration. Keep stateful host changes out of the first presentation patch. Capture a baseline screenshot and agreed component list; design-tool output remains a proposal until reviewed in the actual connected layout.
2. Typecheck and run affected existing controller/renderer tests: conversation switching/draft retention, execution controls, settings focus, uncertain configuration recovery, results inspection and stale-result dismissal. Only repeat native persistence tests if native behavior changes.
3. Render the same integrated components with isolated host fixtures for empty, long answer, streaming, failed/cancelled, unavailable connection, recovery and open-results states. Verify keyboard-only navigation, 200% zoom, minimum native dimensions and both sides of the results breakpoint. Inspect for clipping, occlusion and horizontal overflow.
4. Builder alone performs the existing desktop build and authorized matching native preview check: bundled assets load under CSP, Settings closes cleanly, composer remains usable, host results remain real, and demo fallback cannot appear. Record source/build identity and distinguish fixture UI from actual provider execution.

Next dependency: obtain Claude Design's exported React/CSS/assets (or selected visual direction) and hand them to the builder with this boundary. Integrate one coherent chat/sidebar/composer treatment first, then settings/results, preserving the agreed brand. This review does not claim visual approval, measured performance, current Claude export capabilities or native runtime acceptance.
