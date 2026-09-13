> Current review build remains disabled. Activation steps below are conditional, not instructions to enable local review auth. Native lifecycle fixes and a stable signed test build are prerequisites. Public website scope is presentation/DMG; browser callback notes describe legacy local development only. See [current account status](ACCOUNT_SETUP.md).

# Rivune account activation

Native account UI uses the official Supabase Swift Auth SDK (pinned to 2.55.1). The web companion uses Supabase JS. Both must point at the same project. CLI/API provider sign-ins remain independent of the Rivune account. No conversation sync is implemented by this account feature.

## Owner setup

1. Create a project in https://supabase.com/dashboard using an account you own. Choose your project name, database password, and region there. Do not share the database password.
2. Copy the project URL and **publishable** key from the project settings. The native configuration accepts `https://<project>.supabase.co` and `sb_publishable_...`. These public values can be bundled in the app. Never bundle a service-role or secret key.
3. In Authentication → URL Configuration, allow `rivune://auth/callback` for native sign-in and `http://localhost:3187/workspace?account_callback=1` for this local web preview. Add the production web callback separately when a domain is chosen; avoid wildcard redirects.
4. Enable Email authentication. Configure the email template to display `{{ .Token }}` for the code-entry flow. Configure your own email delivery service before public use. Test delivery to a real address; an API success does not prove delivery.
5. Enable Google in Supabase. Create the Google OAuth client in your Google Cloud project and put its client ID and secret into Supabase. Use Supabase's displayed callback URL in Google Cloud. Do not put the Google client secret in Rivune.
6. Enable Apple in Supabase only once the Apple Services ID and signing credentials are configured in your Apple developer account. Use the callback URL shown by Supabase. Apple OAuth credentials have an expiry and need maintenance. Do not bundle Apple's signing key in Rivune.

References: https://supabase.com/docs/guides/auth/social-login/auth-google ; https://supabase.com/docs/guides/auth/social-login/auth-apple ; https://supabase.com/docs/guides/auth/auth-email-passwordless

## Public configuration

In both `Rivune/Info-Mac.plist` and `Rivune/Info-iOS.plist`, fill the `RivuneAccount` dictionary:

- `Enabled`: true after the service is configured
- `URL`: project URL
- `PublishableKey`: public publishable key
- `email`, `google`, `apple`: enable each only after that provider is configured and tested

Mirror those values into `website/.env.local` using the variable names in `website/config/account.env.example`. Restart the web server and rebuild the native app. Do not turn on methods that are not configured in Supabase.

## Verification before claiming sign-in is live

- Email: request a code, verify it, reject a wrong/expired code, and request a replacement.
- Google and Apple: complete system browser sign-in and test cancellation.
- Quit/reopen: verify the saved session against the service before showing the identity.
- Offline/revoked session: account verification fails visibly while the local workspace remains usable.
- Sign out/reopen: old identity must not return, even if sign-out happened offline.
- Confirm CLI/API connections and local conversation history remain unchanged.

Build 2026090504 connects to owner project `tbiviqglzozlyijrhbug`. Its public Auth settings endpoint confirmed email enabled and Google/Apple disabled. Native and localhost callback URLs were saved in the dashboard. The default email uses a magic link, which both clients now accept; code entry remains an optional fallback. Browser account storage now persists across same-origin tabs to retain PKCE state when an email link opens a new tab. Native sessions use Keychain. Default Supabase email delivery is limited to organization team members; configure SMTP before public signups. Native and web account flows compile, but real email delivery, completed sign-in, OAuth, persistence, and revocation still require live acceptance checks. No sign-in email has been sent by this task. The account panel does not imply cloud backup, billing, or conversation sync.
