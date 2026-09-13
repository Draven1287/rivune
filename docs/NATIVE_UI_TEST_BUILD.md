# Rivune native UI test build

**Newer implementation:** See [Connected workspace build](CONNECTED_WORKSPACE_BUILD.md) for the subsequent local browser connection, independent run ownership and reviewed static project changes. The 81-test result below describes this earlier UI milestone.

Updated September 4, 2026. The user explicitly requested implementing a better native UI and a testable app, then added new conversation/provider icons and first-run CLI/API/account setup. This authorizes this local native UI implementation and supersedes the earlier design-only pause for this scope. Publishing and account-backed model benchmarks remain separate.

## What changed

- Original Rivune silver mark and near-black surfaces retained, with restrained lavender controls.
- Permanent Rivune sidebar branding, readable conversation groups, code/chat icons, and a Connections entry.
- Compact native model/reasoning popover with collaboration and direct-provider selection.
- Optional Workbench: actual request activity and reviews, final-answer code blocks with copy/save, and current/request attachment inspection.
- First-run account/connections sheet and real CLI readiness refresh.
- A separate isolated UI-preview mode with fictional conversations and no model calls, history migration, credential reads, or bridge activity.

## Current integration boundary

This is still the existing CLI-backed conversation engine. It returns text/code and keeps collaboration records. It does not edit repositories, execute generated code, run project checks, or publish a website. Code saved through Workbench is explicitly saved by the user, and is not evidence of an agent build.

Google sign-in is the intended public account requirement. It is not active: a Rivune authentication project/OAuth client has not been supplied or configured. The local development build remains usable with existing CLI sign-ins. API transport rows are unavailable because no API execution adapter is connected. No credentials are collected by placeholder UI.

To complete account authentication: establish the owner-controlled auth project and registered Google OAuth client, implement system-browser authorization with PKCE and validated session handling, then enforce the account gate and cover cancellation, expiration, and account removal. Google desktop guidance: https://developers.google.com/identity/protocols/oauth2/native-app

## Build and validation

Builds use Xcode Beta with a temporary derived-data folder to avoid iCloud Finder metadata interfering with ad-hoc signing. UI-preview bundles have a separate bundle identifier and `RivuneUIPreview=true`; normal bundles do not carry that key. Hosted XCTest startup is also isolated.

## Verified results

- Xcode native Mac build succeeded; all 81 deterministic tests passed with 0 failures.
- Generic iOS Simulator build succeeded for the shared SwiftUI changes.
- Native visual QA checked first-run account and connection steps, welcome/sidebar, sample conversation, Activity/Code inspector, copying a code snippet, and switching collaboration to direct Claude in the compact configuration popover.
- The suite exposed an existing provider-catalog bug: reviewed custom execution adapters advertised model controls without Settings bindings. The capability flag now only advertises controls actually implemented. A stale package-manager discovery test was also updated to use the current resolver and no longer falsely claims runtime path parity.
- No live model benchmark was run. UI tests used isolated fictional data.

Normal test app: `/Users/Aaravshah/Applications/Rivune Test.app`.
Isolated visual-review app: `/private/tmp/RivuneNativeReview/Rivune-UI-Preview.app`.

The normal test app is a local ad-hoc development build. It uses the existing Rivune preference/history identity and provider connections. Use one normal Rivune instance at a time. Google OAuth and API transports remain unconfigured/unimplemented as described above.
