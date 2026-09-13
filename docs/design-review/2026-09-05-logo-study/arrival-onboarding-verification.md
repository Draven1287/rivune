# Enlarged arrival and account setup — September 5, 2026

The approved cosmic artwork now fills a dedicated arrival screen. Account and provider setup occupy the next screen, in the sequence Account → Connect AI → Ready. The browser opens with arrival after refresh. Native first-run presentation preserves the existing setup/history migration; returning users can restart setup from Settings.

## Rendered verification

Inspected the actual local browser workspace, including the installed account wrapper in its unconfigured state. Used an isolated loopback fixture for provider readiness, with no model generation or account request.

- The arrival shows the full approved R, ring, pearl, galaxy and wordmark without the former setup cards competing for space. At the 1024 × 576 viewport override, the browser's existing zoom produced an 819 × 461 CSS viewport and a 628 × 419 artwork frame. No horizontal overflow. The former short-height artwork rule capped width at 60vh (about 277 CSS pixels in that viewport).
- Account options for email, Google and Apple are visible and explicitly unavailable until configured. Continue locally is identified as local development and creates no account.
- CLI/API selection updates the provider labels and instructions. Browser pairing returns to the same setup step. API keys and CLI sign-in are configured in the native Mac app.
- Pairing with zero ready providers leaves Continue disabled. Updating fixture readiness enables the next step. Losing readiness while on Ready changes the page to reconnect guidance and disables Enter workspace.
- Completing the ready path enters the workspace and preserves the exact unsent draft. Settings → Open setup and Replay arrival also preserve it.
- Step transitions focus the new heading and reset the dialog scroll position. This fixes inheriting the previous step's bottom scroll position on short windows.
- Account and connection pages were checked at a 390 × 844 viewport override (312 × 675 CSS pixels with existing zoom). The account card fits, long steps scroll, and there is no horizontal overflow.
- Temporary test tab closed, viewport override reset, and fixture server stopped. The user's existing main tab displays the enlarged arrival and Continue setup.

## Automated verification and account boundary

- Native Mac: 150 tests passed, including four new first-run migration/completion/draft tests. Generic iOS build passed.
- Web account adapter: 17 fixture tests passed. Workspace contract suite: 12 tests passed. Final combined lint, TypeScript and production build are recorded in the companion web verification note.
- No normal native app launch, installation, live authentication, sign-in email, provider generation or publication occurred.

The web has a configuration-driven Supabase adapter for email OTP and Google/Apple PKCE. It remains inactive without an owner-controlled project and enabled methods. Native account login and account-bound cloud synchronization are still separate work. See [Account setup](../../ACCOUNT_SETUP.md) for configuration and exact limitations; UI fixture success does not verify external provider configuration.
