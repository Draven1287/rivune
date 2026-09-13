# Rivune Constellation workspace

Current build and release guide: [One interface, SwiftUI and Tauri](docs/shared-build-and-updates.md). Use `npm run build:desktop -- swift|tauri|both` after changing shared UI. Stillwater is the current environment. The historical initial-prototype notes below are retained for context and are not current readiness claims.


Product target: [everyday usefulness and premium quality](docs/product-quality-direction.md). Current preview status: [Quiet workspace and shared macOS preview](docs/quiet-preview.md).

Local Tauri frontend continuation. Run `npm ci`, then `npm run dev` for the browser preview at http://127.0.0.1:1420. Run `npm run tauri dev` for the native development window on a machine with Tauri prerequisites.

`npm run build` checks TypeScript and builds the frontend. `npm test` checks routing and persisted-record validation.

This slice saves up to 50 prompt requests in localStorage and displays the planned Council or Swarm workflow. The primary choice is Single AI or Constellation Engine. Single AI saves the selected provider; Constellation Engine leaves strategy pending until a real team can make a decision. No keyword router is used. Search, reopen, JSON export, and confirmed clear are available. Enter saves a request; Shift+Enter inserts a newline. Cmd/Ctrl+K searches and Cmd/Ctrl+N starts a new request.

Connections are not implemented: no CLI, model, API key, provider execution, synthesis, or peer review is invoked. Each saved request is a separate local conversation, not a multi-turn AI session. Prompts are unencrypted local browser/profile data. File attachments, voice, real projects, video backgrounds, and Orbit mode remain future work. Settings control CSS star motion; system reduced-motion preferences override animations.

Verification: frontend build and two focused tests passed. Browser checks covered automatic build routing, save/reload, search/reopen, connection status, settings, and a 390px layout. Native compilation, provider integration, export download, and storage-failure browser scenarios were not verified in this pass.

## Product hierarchy

Rivune is the app. Constellation Engine is the complete space-and-team experience: environment/background and its visual elements, conversation, lead and members, and Council/Swarm strategies. Orbit is a future visual presentation inside the engine, not a third execution strategy. See CONSTELLATION_ENGINE_DIRECTION.md for the folder-derived product brief and source map.

The former keyword heuristic has been removed. The intended connected product uses a chosen lead to select supported strategies with runtime validation. Decorative orbit marks do not indicate connected providers or live work.

## Selected identity

The exact source matching the user screenshot is `brand-assets/explorations/2026-09-10-premium-refinements/orbit.png` in the parent project. `public/rivune-selected-identity.png` preserves that board unchanged. CSS displays its silver app-icon region. The monochrome mark on the right is the selected macOS menu-bar design. It remains a raster-board reference; standalone transparent template assets and native Tauri tray integration are not completed in this pass.
