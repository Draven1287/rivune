# ADR-002: Preserve native Mac Rivune and prototype a Tauri shell for Windows and Linux

**Status:** Proposed; isolated feasibility spike only  
**Date:** September 7, 2026  
**Deciders:** Product owner, native integrator, cross-platform owner

## Context

Rivune needs a credible path to macOS, Windows, and Linux at $0 infrastructure spend without weakening the current native Mac product or implying unverified parity. The saved checkout contains newer uncommitted source and remains owned by the native integrator; this spike therefore lives only in `qa-artifacts`.

Current repository evidence already establishes a useful separation:

- `docs/ADR-001-WEB-DESKTOP-RUNTIME.md` keeps SwiftUI as the Mac client, defines one versioned `Project` / `Conversation` / `Run` / `RunEvent` contract, and makes the local runner—not a renderer—the owner of provider processes and deduplication.
- `website/tests/workspace-contract.test.mjs` exercises schema-version rejection, real provider readiness, stable request IDs, and exactly one request on uncertain submission.
- The React/browser workspace and most current Swift source are macOS dataless placeholders in this checkout. They were not force-downloaded or copied into this artifact. The materialized tests and accepted ADR are the only reused source references.
- Local tool evidence: Node `22.23.1`, npm `10.9.8`, Xcode `27.0`, Apple Silicon; `cargo` and `rustc` are absent. No dependency or toolchain was installed.

The shell must never create a second conversation database, infer a running task, retry an uncertain model dispatch, read the clipboard, capture the screen, or call a provider directly.

## Decision

Keep the shipping macOS product in native SwiftUI. Use this Tauri 2 scaffold as the recommended **Windows/Linux shell direction**, contingent on an owner-approved Rust toolchain and native-host implementation. Share Rivune's versioned workspace contract, visual tokens, icons, terminology, and frontend interaction logic—not the SwiftUI view tree and not the Swift process runner.

The production boundary is:

```text
Rivune renderer -> versioned desktop-host adapter -> platform run service -> supported provider adapter
```

The renderer is unprivileged and truthful by default. With no injected host it says “Desktop host not connected,” disables submission, and holds no fallback task/conversation records. The host owns conversation state, task state, request reconciliation, filesystem scope, credentials, and provider dispatch.

Platform deliverables, after native validation:

| Platform | Product host | Artifact | Build host | $0 trust boundary |
|---|---|---|---|---|
| macOS | Existing SwiftUI app | DMG containing signed/notarized `.app` | macOS | A free Apple account can test-sign but cannot notarize; a browser-downloaded public build is therefore not a finished release at strict $0. |
| Windows | Tauri shell + new Windows host/runner | NSIS `setup.exe` first; MSI only if enterprise demand justifies it | Windows | Unsigned installers can run but trigger SmartScreen/untrusted warnings. Do not publish as finished without a suitable signing path. |
| Linux | Tauri shell + new Linux host/runner | AppImage for portable trial and `.deb` for Ubuntu/Debian | matching Linux distro/container | Package signatures and repository trust remain separate release work; local unsigned packages are test artifacts only. |

Product minimums proposed for the first validation matrix—not framework guarantees—are macOS 14+ for the existing app, Windows 10 1803+ with WebView2, and Ubuntu 22.04/24.04 x86_64. Tauri itself documents macOS 10.15+, Windows 7+, WebView2 on Windows, and distribution-specific WebKitGTK requirements on Linux. Each target package must be produced and exercised on its own OS before acceptance.

## Options Considered

### Option A — Native macOS plus Tauri 2 on Windows/Linux (selected)

| Dimension | Assessment |
|---|---|
| Existing Rivune reuse | Reuses web interaction logic and the versioned workspace contract; preserves SwiftUI investment. |
| Runtime | OS WebView: WKWebView, WebView2, WebKitGTK; Rust host. |
| Packaging | Official Tauri paths cover DMG, NSIS/MSI, AppImage, Debian and RPM. |
| Local readiness | Blocked for a desktop compile because Rust/Cargo is absent; dependency-free web core is executable now. |
| Main risk | WebView differences and a new Rust/platform run service require real Windows/Linux implementation and QA. |

Official evidence: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Windows installer](https://v2.tauri.app/distribute/windows-installer/), [DMG](https://v2.tauri.app/distribute/dmg/), [AppImage](https://v2.tauri.app/distribute/appimage/), [Debian](https://v2.tauri.app/distribute/debian/), [macOS signing](https://v2.tauri.app/distribute/sign/macos/), [Windows signing](https://v2.tauri.app/distribute/sign/windows/).

### Option B — Native macOS plus Electron/Forge on Windows/Linux

| Dimension | Assessment |
|---|---|
| Existing Rivune reuse | Reuses the same web interaction layer while preserving SwiftUI Mac; JavaScript can also carry more host/orchestration code if it is first extracted from Swift. |
| Runtime | Bundles Chromium and Node on Windows/Linux; simpler JavaScript host experiments but materially larger distribution/runtime footprint. |
| Packaging | Electron recommends Forge; Windows and Linux makers cover setup executables and packages such as `.deb`/RPM. The existing native Mac DMG lane remains separate. |
| Local readiness | Node exists, but Electron/Forge packages are not present; producing a binary still requires network dependency downloads and OS-specific makers. |
| Main risk | A privileged Node host is easier to overexpose to renderer content, increases footprint, and still requires a durable cross-platform runner/state extraction. |

Official evidence: [Electron distribution overview](https://www.electronjs.org/docs/latest/tutorial/distribution-overview), [Electron packaging tutorial](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging), [Electron application packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution), [Squirrel.Windows maker requirements](https://www.electronforge.io/config/makers/squirrel.windows).

## Trade-off Analysis

Both options now preserve the existing SwiftUI Mac product, so Mac preservation does not decide between them. Tauri remains the proposal because its smaller system-WebView runtime and explicit, narrow command surface better fit a utility that may remain open beside provider CLIs. Electron has a real countervailing advantage: JavaScript/Node could reuse more future orchestration code and the bundled Chromium renderer reduces WebView variation. That may lower initial Windows/Linux implementation cost. The owner should reverse this proposal if a bounded extraction proves that runner reuse is materially cheaper in Node without exposing broad Node authority to renderer content. Either option still needs the hard work of durable process/state ownership.

This is not a claim that Tauri is already integrated. The Rust compiler, Tauri CLI/crates, Windows build tools, Windows machine, Linux WebKitGTK toolchain, platform runners, icons, signatures, and notarization/trust inputs are all absent or unverified.

## Consequences

### Positive

- Native Mac behavior and the accepted Mac source remain untouched.
- Windows/Linux can reuse branded web presentation and shared data contracts.
- A strict renderer/host boundary prevents a second database and duplicate provider dispatch.
- Packaging intent is explicit per OS without publishing an unsigned artifact.

### Negative

- Rivune maintains Swift and Rust platform code plus web presentation code.
- Compared with Electron, Tauri requires a Rust implementation boundary and a currently absent toolchain.
- WebKitGTK/WebView2/WKWebView differences require platform-specific rendered QA.
- Strict $0 permits development artifacts, but not a polished trusted public macOS/Windows direct-download release under the documented signing constraints.

### Neutral

- Linux does not have one universal installer. AppImage plus Debian is a practical first pair; RPM can follow when Fedora is in the supported matrix.
- MSI is not the initial Windows choice. Tauri documents an extra VBSCRIPT requirement for MSI, while NSIS is adequate for the first consumer installer validation.

## Action Items

1. Owner approves or rejects Tauri as the Windows/Linux implementation stack. No toolchain installation is implied.
2. Create a clean Windows worktree and implement the desktop-host adapter against the shared schema; keep provider execution outside the renderer.
3. Add durable request reconciliation before connecting `submitRun`; test crash/relaunch and uncertain acknowledgement with the same request ID.
4. Build NSIS on Windows and test install, uninstall, upgrade, single-instance behavior, deep links, draft preservation, task-state streaming, and no duplicate dispatch.
5. Repeat on Ubuntu 22.04/24.04 for AppImage and `.deb`, including WebKitGTK availability and desktop integration.
6. Keep the existing native Mac DMG lane. The native integrator decides whether any renderer tokens/contracts are imported; do not replace the SwiftUI shell.
7. Before any public release, record signing/notarization/trust decisions and run architecture-specific package verification. Label unsigned outputs as internal test builds.
