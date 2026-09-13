# Rivune SwiftUI host

`RivuneApp.swift` owns the native SwiftUI window, menu commands and Settings shortcut. `SharedWorkspace` embeds WKWebView through `NSViewRepresentable`, using the same verified Vite output as Tauri. The current approved interface is not duplicated in Swift views. Native controls are SwiftUI; in-workspace glass remains shared CSS.

From `rivune-tauri`:

```sh
npm run build:desktop -- swift
```

This builds one shared interface, hashes its assets, builds SwiftPM, embeds Sparkle, packages and verifies an ad hoc signed app in `/private/tmp/rivune-sharedpreview.XXXXXX/Rivune Preview.app`. The launch alias is `macos-preview/build/Rivune Preview.app`; `verified-app-path.txt` contains the resolved artifact. Temporary output is not a public installer.

`bash macos-preview/script/build.sh --skip-web-build` checks that `dist` matches current source before using it. Missing, stale or modified bundles fail instead of shipping a separate frontend copy. The host checks the bundle manifest/version before rendering too.

For Swift tests: `bash macos-preview/script/test.sh`. It stages tests outside Documents to avoid file-provider metadata breaking test-bundle signing.

The bundle ID remains `com.rivune.sharedpreview` and storage remains WebKit's default store at `rivune://app`. Existing shared-preview chats are preserved. Browser localhost, Tauri and the historical Swift product each have separate stores; this is not a migration of those stores.

The host handshake supports protocol 1 and only `host.info` and `updates.check`, from the main bundled frame. It does not accept URLs, paths, shell commands or credentials. Unsupported methods are rejected. The shared app identifies this as runtime `swift` and does not use browser-development connection endpoints.

Sparkle 2 is embedded and pinned in Package.resolved. A native Check for Updates command and shared Settings → Updates are present. Checks stay disabled until the real HTTPS feed and public signing key are configured. Signed release builds and distribution are separate from these development previews. See [shared builds and releases](../docs/shared-build-and-updates.md).

The host has native file selection and standard editing/menu behavior. Native provider execution, original Swift-store migration, web download/export bridging, OAuth, dictation, and public release acceptance remain separate work. External navigation stays blocked. No installer or paid model call is triggered by a development build.
