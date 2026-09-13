# One Rivune product, shared across runtimes

Current implementation: [shared SwiftUI/Tauri build and update pipeline](shared-build-and-updates.md). The historical proposal/status below predates this host; use the linked guide for current build commands and remaining release gates.


## Ownership

Rivune uses vanilla TypeScript and Vite inside a browser or a Tauri webview. There is one shell, one conversation controller, one set of feature models and one stylesheet. No Mac/Windows/Linux page copies are needed. The surrounding repository's historical Swift application and website are outside this migration.

- `src/main.ts`: initializes the platform and loads the shared application.
- `src/app/app-shell/index.ts`: shared markup, with navigation, toolbar and content presentation slots. `platform.presentShell` receives these elements after mounting. The current adapters leave presentation unchanged; an OS adapter can enhance chrome without replacing product content.
- `src/app/workspaceApp.ts`: existing shared conversation and UI controller. Further extraction can be incremental; it is deliberately not rewritten in a new framework.
- `src/features/conversations`: parsing, draft merging, export/delete UI.
- `src/features/projects`, `onboarding`, `agents`: shared feature implementations. The agent queue is a scheduling foundation, not live provider execution.
- `src/components/shared/popover.ts`: shared anchored menus and keyboard dismissal.
- `src/services/api`: mock provider and development connection-check transport.
- `src/services/storage`: key/value boundary and browser download fallback. Keys, serialized formats, conflict detection and exception behavior are unchanged. Credentials are not migrated into this store.
- `src/services/native`: the only TypeScript boundary importing Tauri. It validates native command responses.
- `src/platform`: runtime selection, capabilities and small adapters. Detection uses the native `runtime_info` command, not browser user-agent guessing.
- `src/styles/tokens.css`: shared typography, spacing, radius, surfaces, text, borders, elevation, motion and widths. Existing styling consumes tokens incrementally. Platform material overrides should override a small set of these tokens, not fork the stylesheet.
- `src-tauri/src/lib.rs`: native commands and OS operations. Existing connection detection is macOS-specific; other desktop adapters explicitly report it unavailable.

The old root-level feature files remain compatibility exports. New code should import the canonical feature/service path. There is no new URL router or user-data migration.

## Capabilities and fallbacks

`platform.initialize()` selects browser, macOS, Windows, Linux or unknown. Failed native detection fails closed. Shared features use capabilities and service methods; they do not inspect the OS.

Connection checking is available in the macOS adapter and in the local development browser through the existing dev endpoint. Production browser builds do not expose the development check. Native sharing, notifications, menus and Liquid Glass remain false. CSS translucency does not establish native Liquid Glass support.

Browser-compatible DOM dialogs, file selection, downloads, media preferences and keyboard handlers remain shared. Unsupported integrations must disclose their state and preserve local work. Do not silently route an unavailable subscription connection to a paid API.

## Adding a native feature

1. Define a typed operation and capability in `platform/types.ts`. Only advertise support after implementing it.
2. Put command invocation and response validation in `services/native`; implement the OS operation in Rust with the required Tauri permissions.
3. Wire the appropriate adapter. Supply a meaningful browser fallback or an explicit unsupported error.
4. Consume the capability and method from the shared feature. For chrome/material changes, implement the adapter's `presentShell` hook and limited platform style overrides. Do not replace the conversation page.
5. Test supported, unavailable, rejected and malformed-response cases through injected dependencies. Validate the native behavior on its target OS separately.

Authentication and real provider execution, when implemented, belong in shared services with secure credential storage behind a native boundary. They are not separate platform product implementations.

## Validation and migration status

The audit and ordered file plan are in `platform-migration-audit.md`. Phases 1–6 establish the shared foundation and presentation extension points. Phase 7 is intentionally a future native enhancement: this change preserves visual behavior. Phase 8 has local web evidence, not a completed native release matrix.

Commands:

```sh
npm run typecheck
npm run build
npm test
npm run test:architecture
npm run tauri -- build --no-bundle
```

Architecture checks reject Tauri imports outside the native boundary, scattered runtime detection and raw localStorage access outside storage. Unit and local protocol tests cover existing conversation/draft behavior, mock streaming/errors, storage failures, runtime selection and unavailable capabilities. Loopback protocol tests require local listening permission.

This migration passed the web build and 42 tests. Browser reload retained the four existing recent chats, and anchored menus were checked. The macOS Tauri build was attempted but Cargo is missing. Windows/Linux builds and native launches are not verified on this host. No paid model calls were made. Real authentication, provider execution, signed installers and native Liquid Glass are not proven by these web checks.

The 95%+ shared-code figure is a design target, not a measured or certified claim. Ordinary features have one shared implementation; future platform integrations should remain small and independently testable.
