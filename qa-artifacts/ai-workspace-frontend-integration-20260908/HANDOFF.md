# Rivune frontend integration checkpoint

One browser-only preview: http://127.0.0.1:4317/ . Source: prototypes/ai-native-workspace. The existing desktop app and Rust host remain unchanged and paused.

Implemented shared React/TypeScript/Tailwind shell, resizable persisted panels, calm default and optional approved Orbit assets, responsive context/conversation/editor views, draft-safe keyboard slash menu, scroll-intent-aware demo chat, local Stop control, collapsible terminal/metrics, and keyboard-selectable execution timeline with inputs, outputs, dependency links and artifact association. Short windows use an app-rendered HTML modal inspector rather than shrinking the transcript. The browser provides modal focus containment; Escape returns to the opener.

## File tree

```text
src/
  App.tsx
  main.tsx
  styles.css
  types.ts
  assets/{rivune-icon-128.png,rivune-workspace-milky-way.png}
  data/demo.ts
  hooks/{useWorkspaceDemo.ts,workspaceAdapter.ts}
  components/
    ResizableLayout.tsx
    TelemetryShelf.tsx
    sidebar/Sidebar.tsx
    chat/{ChatPanel.tsx,SlashCommandMenu.tsx}
    editor/{EditorPanel.tsx,DiffView.tsx,ArtifactPreview.tsx}
```

The pre-contract data/mockWorkspace.ts remains preserved and unused. Exact two asset source copies came from qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/assets. No artwork transformation was performed.

## Verification and limits

Own actual-browser checks and exact owned-file hashes: FRONTEND_CHECKPOINT.json. Packaging independently reports strict typecheck and production build passing. Support independently checked editor draft switching, keyboard tabs, added/removed diff labels, JSON-driven preview, malformed JSON recovery, text-safe script strings and discard. The final reviewer short-window/timeline recheck is pending; earlier broad review found the short-window issue corrected here.

This is a synthetic-data UI demonstration, not a working AI runtime. Adapter contracts are not connected to Tauri IPC, providers, real terminals, filesystem writes, cloud accounts or real cancellation. Usage values remain unavailable. Preview canvas accepts a limited JSON configuration and does not execute arbitrary HTML/JavaScript. Model phases are observable demo activity, not private reasoning. Optional galaxy asset is about2.73MB and dominates output size. Do not call the preview production-ready or an installed app.
