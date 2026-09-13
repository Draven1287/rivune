# Rivune account status — September 6, 2026

Installed native review 0.2 (2026090606) has account services disabled. Historical
backend setup and SDK implementation do not prove working sign-in in this build.
See [activation notes](ACCOUNT_SERVICE_SETUP.md) and [current review](ACCOUNT_LIFECYCLE_0606.md).

Native uses Supabase Swift with explicit-action lazy client creation and a stable
Developer ID gate. Observer/reverification, failed-sign-out retry, and stale-result guards are
fixture-tested in0606. Live SDK/OAuth cleanup remains unverified; cold email
continuation, account deletion and complete export remain unimplemented.
Launch and Settings must not access account Keychain automatically.

The legacy browser implementation uses localStorage and PKCE callback exchange,
including email links. It is development history, not the public product path:
the public site presents the native app and its download status. Earlier claims
about sessionStorage, same-tab-only storage and email-link support below are
historical and superseded. Neither current native nor browser implementation is
proof of live OAuth, email delivery, session revocation, or complete lifecycle QA.

## Historical implementation record

# Rivune account setup

Status: integration code is present; the account service is **not configured or activated**. No project was created, no sign-in email was sent, and no Google or Apple login was performed while implementing this change.

The website includes an inactive Supabase Auth adapter following [ADR-001](ADR-001-WEB-DESKTOP-RUNTIME.md). It supports email verification codes and Google/Apple OAuth with PKCE. The setup UI receives only the identity verified by `auth.getUser()`. Entering an email, sending a code, receiving an OAuth callback, or reading a cached session does not mark an account as signed in. [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)

## Owner configuration

1. Select the owner-controlled Supabase project. Add its public URL and **publishable** key using [the public configuration example](../website/config/account.env.example). The adapter rejects service-role/secret keys, insecure remote endpoints, and project URLs containing credentials, paths, queries or fragments. Do not place OAuth secrets in public build variables.
2. Configure allowed website URLs in Supabase. The fixed callback is `<website-origin>/workspace?account_callback=1`. For this local preview it is `http://localhost:3187/workspace?account_callback=1` (add the separate `127.0.0.1` origin only if it will be used). The adapter never uses a caller-provided `next` destination. PKCE login must return to the same browser tab that initiated it. [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
3. Enable only the methods configured at the Auth service, then enable the corresponding public feature flags. Set `NEXT_PUBLIC_RIVUNE_AUTH_ENABLED=true` last and rebuild/restart the website. Missing project settings, invalid public configuration, or no enabled methods leave all methods inactive without contacting Supabase.

### Email

Enable email sign-in and configure the Supabase Magic Link email template to include `{{ .Token }}` as a verification code. The website uses `signInWithOtp`, then `verifyOtp({ email, token, type: 'email' })`; it does not implement a magic-link confirmation page. Set up approved delivery/SMTP and rate limits for real users. Requests can create a new user, but that user is not accepted in the UI until code verification and `getUser` succeed. [Email OTP setup](https://supabase.com/docs/guides/auth/auth-email-passwordless)

### Google

Configure the owner's Google OAuth client, consent screen, allowed audience, website origins, and Supabase provider callback. Save the Google client secret **in the Auth service**, never in this repository or a public environment variable. Enable the Google feature flag only after that configuration works. [Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)

### Apple

Configure an Apple Developer App ID, web Services ID, website domain and Supabase callback. Store Apple's signing key and generated OAuth secret only in the Auth service. Apple's web OAuth secret requires scheduled renewal; follow the provider documentation. The adapter does not create Apple capabilities or implement native Sign in with Apple. [Apple sign-in](https://supabase.com/docs/guides/auth/social-login/auth-apple)

## Session behavior and boundaries

- Supabase SDK handles PKCE, token exchange and token refresh. The website stores its account session and verifier in **tab-scoped sessionStorage**, separately from the in-memory local Mac pairing token. Browser storage must be available. Closing the tab requires signing in again; no native session is copied.
- Every accepted identity comes from the Auth server's `getUser` result. Expiry removes the displayed account before rechecking. SDK sign-out events remove identity, and explicit sign-out prevents a delayed refresh/verification response from restoring it. Sign-out is scoped to this browser session, not all devices.
- If sign-out fails or rejects, the account remains locked in this tab. Setup and Settings expose a **Retry sign-out** action even after the displayed identity has been cleared. New sign-in is blocked until the retry succeeds. The message describes an unconfirmed service sign-out; it does not assume that every SDK error left local tokens in storage or revoked remote access.
- Account requests have a 15-second transport timeout. Errors shown in UI are authored messages; raw SDK error details, tokens, callback codes, and OAuth error descriptions are not logged or rendered.
- This is client-side account UI/session integration. It is **not** server authorization for a cloud workspace. Future hosted data routes must independently authenticate requests and enforce database row-level policies.
- Signing into Rivune does not connect an AI provider or register a remote execution device. An independently paired browser can discover CLI executables, register an additional executable, and save a supported provider's API key and model to Mac Keychain through the authenticated loopback bridge. API keys are cleared from the form on submission and are never returned by the settings API or saved to browser storage. CLI sign-in still happens in the Mac app; discovery does not execute a command or grant chat support to an unknown tool. See [AI connections](SETTINGS_AND_PROVIDER_CONNECTIONS.md).
- A locally labeled development workspace creates no account. It must never be represented as verified sign-in. The existing provider readiness, Rivune consent, request deduplication, and draft/receipt guards continue to govern real requests.
- Account sign-out does not terminate an already accepted Mac run. The local bridge is separately authorized; the current setup UI blocks new account-required submissions after account loss. Account-bound device registration, per-user local history ownership, remote revocation, cloud synchronization and native account login are separate work.

## Local verification

Run `npm run test:account` in `website`. Tests use fixture Auth methods and do not make external account or model requests. They cover disabled configuration, constrained callback destinations, email verification boundaries, rejected/anonymous identities, expiry, sanitized errors and sign-out races. The website must also pass its workspace contract tests, TypeScript check, lint and production build.

September 5 activation check: no account environment file or matching process configuration was present in the repository or active web build mirror. The owner's Supabase dashboard opened to its sign-in page; activation is waiting for the owner to sign in and identify the Rivune project. The Google and Apple flows, email verification, and failed sign-out retry are covered by 18 local Auth tests. These are fixture results, not completed provider registrations or live logins.

Before enabling for users, exercise real email delivery and verification, Google/Apple cancellation and callbacks, expired/revoked sessions, storage-denied browsers, account switching and sign-out on the owner's configured project. Fixture tests and a successful website build do not prove live identity integration.

Local Supabase is an alternative development backend, but it requires Supabase CLI and a Docker-compatible runtime, which were not available on PATH during this audit. No local stack was installed or started. Google and Apple still require their registered OAuth configuration. [Local development](https://supabase.com/docs/guides/local-development)
