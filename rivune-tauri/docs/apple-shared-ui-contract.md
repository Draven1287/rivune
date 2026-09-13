# Apple host and shared product UI contract

Current implementation: [shared SwiftUI/Tauri build and update pipeline](shared-build-and-updates.md). The historical proposal/status below predates this host; use the linked guide for current build commands and remaining release gates.


Status: proposed integration contract, September 12, 2026. This document does not implement or verify a Swift host. The existing Swift app does not automatically receive the current TypeScript changes.

## Verified source boundaries

The canonical product UI being developed is `rivune-tauri/src`: `app/app-shell/index.ts`, `app/workspaceApp.ts`, `features`, `components`, `styles`, and the assets in `public`. Vite produces `dist`. `src-tauri/tauri.conf.json` runs `npm run build` and packages `../dist` into Tauri. This is already the same frontend source for Tauri on macOS, Windows, and Linux, although native builds must be verified separately.

The neighboring `Rivune/RivuneApp.swift` mounts `RootView`; `Rivune/RootView.swift` mounts the Swift `WorkspaceView`. `Rivune.xcodeproj/project.pbxproj` lists these Swift sources. Inspection found no build phase referring to `rivune-tauri` or its `dist`. `Rivune/RivuneWebWorkspace.swift` contains request/catalog/model contracts and `RivuneStore` extensions, not a shared-UI WebKit host. `Rivune/LocalWorkspaceServer.swift` exposes workspace/connection endpoints and a localhost workspace link; it is not evidence that the current Vite UI is packaged in the Swift app. The WebKit view in `Rivune/ProjectWorkspace.swift` previews generated project HTML and must not be repurposed casually as the application shell.

These files were inspected under `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/`. They are evidence of two existing product presentations, not an automatic synchronization pipeline.

## Target pipeline: edit once, package the same product

1. Keep conversation layout, menus, onboarding, projects, motion, artwork, and feature logic in the shared TypeScript tree. Do not manually recreate each feature in SwiftUI.
2. Run the shared typecheck, unit/protocol tests, and Vite build once per release revision. Produce a manifest containing product version, source revision, bridge protocol version, and hashes for every frontend asset.
3. Tauri Windows/Linux (and Tauri Mac while retained) consumes that exact built bundle through `frontendDist`. A future Swift Mac host copies the same bundle into its application resources during its build. The Xcode build must fail if resources or their manifest are missing or stale. It must not silently ship a separately maintained HTML copy.
4. Implement a dedicated Swift WebKit application host, separate from the project-preview webview. Load only bundled product content through a controlled local origin/scheme. The host owns the window and approved native chrome; the web UI owns the product experience.
5. Add a `swift` runtime and a typed native bridge in `src/services/native`, with version negotiation and validated request/reply envelopes. Detect it through a host handshake, not the user agent. Keep runtime detection in `src/platform`. Today's runtime type supports only `browser` and `tauri`, so this step is required before claiming Swift compatibility.
6. Expose capabilities only after the host confirms working implementations. Keep credentials and native file grants in the host. Pass scoped operation requests, statuses, and opaque handles over the bridge, never unrestricted shell strings or credential contents. Preserve the current explicit mock mode and avoid automatic paid-API fallback.
7. Test the identical product build in browser, Swift Mac host, and Tauri Windows/Linux. Package and sign each host separately from the same release revision. Verify install, launch, bridge handshake, data continuity, and rollback before distributing updates.

A source edit is therefore shared at build time. Delivery to already installed apps is a separate updater/release pipeline; it does not happen merely because a source file changed. There is no automatic TypeScript-to-Swift translation in this proposal.

## Native material ownership

The shared `ShellSlots` currently exposes navigation, toolbar, and content elements. `presentShell` is currently a no-op and the `liquidGlass` capability is literally false. Those are extension points, not a working native material bridge.

For the proposed Apple host, native SwiftUI/AppKit chrome should surround or back the shared web content where practical. Native host presentation must remain OS-availability-gated with an ordinary material fallback. Material choices should respect accessibility preferences, including reduced transparency and increased contrast. Decorative effects must not reduce text legibility or obstruct pointer/keyboard interaction.

A DOM oval with blur remains CSS glass. A DMG does not install Liquid Glass. Do not flip `liquidGlass` to true because the operating system is Apple, or because a CSS style resembles it. Native material implementation requires selecting supported APIs against the actual deployment target, validating the native hierarchy, and testing on the target Mac. Avoid double toolbars, overlapping hit regions, and native/web focus traps. Small native chrome token values can be generated from shared design tokens; product content stays shared.

## Data continuity and acceptance gates

The shared app currently uses a storage service wrapping browser localStorage. Swift uses its own `RivuneStore` and related models. Do not assume these stores or conversation IDs are interchangeable. A future migration needs an explicit versioned importer/exporter, backup, conflict policy, and validation for conversations, archives, projects, provider preferences, and drafts. A new webview origin can have a different localStorage partition; test this before moving any user.

Before enabling a Swift-host release, require:

- Matching frontend asset manifests across host packages.
- Bridge contract tests for unsupported methods, malformed data, cancellation, timeout, and host mismatch.
- Preserved recent/archive behavior, drafts, keyboard shortcuts, and multi-turn history.
- Verified native material appearance and accessibility fallback on supported and older deployment targets.
- Native smoke tests for each advertised operating system, plus update/rollback checks using signed artifacts.

## Remaining implementation gaps

No Swift application web host, Swift bridge, Xcode frontend packaging phase, cross-store migration, native Liquid Glass integration, or signed multi-platform updater was added by this contract. Existing Swift behavior is unchanged. The Tauri shared frontend foundation is useful immediately, but does not establish native Mac/Windows/Linux execution or delivery evidence by itself.
