# Integrated Rivune space design and startup readiness

September 5, 2026 — local, uncommitted implementation.

## Current identity

- Startup master: `brand-assets/explorations/rivune-saturn-cosmos.png` — silver R, broad-front oval ring, central luminous pearl, planets and galaxies.
- App interior master: `brand-assets/explorations/rivune-ribbon-r-icon.png` — silver ribbon R alone on black. Native `RivuneRibbonIdentity` and web `/brand/rivune-ribbon-r.png` use this asset.
- Both generated through the built-in image tool. Exact prompts and provenance are in `saturn-cosmos.md` and `ribbon-r-app-icon.md` alongside this file.
- The horizontal line was a compositing gap: the logo stopped at 68% of the image and the wordmark began at 71%. A separate lower horizon layer introduced another boundary. The lower reveal now covers 68–100%, meeting the upper image without a gap; the ghost fades out completely. The complete image receives a subtle outer fade.
- Rendered startup and workspace inspected after these changes. Seam absent; plain R visible in the corner and workspace. Prior exploration masters retained.

## Readiness and execution

- Mac startup concurrently checks Codex CLI sign-in, Claude Code CLI sign-in, OpenAI API model access, and Anthropic API model access.
- A ready CLI is preferred, with a ready API as fallback. One usable provider enables its direct chat mode; Together requires both providers.
- Progress reflects completed connection checks. Animation alone never grants readiness. Unavailable routes lead to connection setup.
- API credentials live in Keychain. Models are explicitly configured, provider endpoints are fixed, redirects rejected, timeouts/output bounded, and tool execution disabled for API text routes.
- Existing run coordinator and collaboration runner execute selected routes through a per-run route mapping. API configuration is locked during foreground, background, and paired-device tasks.
- Browser obtains readiness from authenticated Mac snapshots and can request refreshes. An unpaired browser cannot report providers ready and does not accept API keys.
- Startup checks sign-in/model metadata, not billable generation or quota. No live provider prompt was sent during validation.

## Verification

- 138 native Mac tests passed, including 15 API fixtures, 5 startup-route tests, and 3 API summary/configuration-lock tests.
- Final native source and asset builds succeeded for Mac and generic iOS Simulator.
- Web: 9 workspace contract tests, lint, TypeScript and production build passed. Final production build was repeated after the seam/icon changes and passed.
- Browser startup, interior, settings, disconnected state and narrow layouts checked; draft preservation and disabled disconnected sending verified. Latest seam/icon changes inspected in the normal browser viewport.
- Logs: `/private/tmp/rivune-space-mac-final-test.log`, `/private/tmp/rivune-space-mac-seam-build.log`, `/private/tmp/rivune-space-ios-seam-build.log`, `/private/tmp/rivune-web-final-build.log`.

## Remaining live verification

- The normal native app has not been manually launched for visual or live-provider review. Tests used isolated app hosts.
- Real Mac/browser pairing and live chat still require an end-to-end user session with a configured connection.
- iPhone receives readiness from the Mac but does not yet receive the selected API transport/model metadata, so remote configuration labels still need that bridge extension.
- Installed app and OS app icon unchanged. No deployment or commit made.
