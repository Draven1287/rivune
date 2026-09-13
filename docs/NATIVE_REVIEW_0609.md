# Installed review build 2026090609

Reviewed September 6, 2026, after the implementation task handed off the installed app.

## Verified installed artifact

- `/Applications/Rivune.app`, version 0.2, build 2026090609.
- Executable SHA-256: `f544dd3ba777d1bbfbf085612edcb9a25c437b7f218bd6ed3dac5793b55275d4`.
- Deep, strict bundle signature verification passed. This is an ad-hoc local review build, not a notarized public installer.
- Account `Enabled` is false. No update feed or update signing public key is configured. The final local compiler configuration excludes `DIRECT_UPDATES`.
- All 70 files in `/private/tmp/rivune-review-2026090609/source-final-manifest.json` matched both the frozen source and shared workspace at inspection.
- Installation receipt and the previous 0608 app are retained in `/private/tmp/rivune-review-2026090609/`.

## Observed native interface

Using native computer control, opened Settings with Command-comma, inspected Account and General, then returned to Home with Done. Rendered screenshots and accessibility trees were inspected during this audit.

- Main window exposes native close, minimize, and full-screen/zoom controls.
- Home has an assistant selector, composer, attachment/model/permission controls, project navigation, and 16 existing conversations. The two existing QA projects remain visible.
- Account is an actual Settings destination. It clearly says account services are not configured and distinguishes local Rivune data from provider accounts.
- General displays version 0.2 (2026090609) and the local-preview update limitation.
- No account sign-in, provider message, preference change, or update request was performed. The app was left at Home.

This was a targeted rendered smoke check. It does not establish every window lifecycle, project-file workflow, VoiceOver behavior, live authentication, or signed upgrade path.

## Validation and remaining release work

The final xcresult at `/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_16-53-56--0600.xcresult` independently reports 224 passed, zero failed, zero skipped. The final updater-enabled and dormant Release builds both succeeded. See [updater implementation](UPDATER_LIFECYCLE_FIX.md), [independent updater review](UPDATER_RECOVERY_REVIEW.md), and [account cancellation review](ACCOUNT_CANCELLATION_REVIEW.md).

Live account services still need configuration and end-to-end acceptance. Public Mac distribution still needs Developer ID signing/notarization and a real upgrade between two signed builds. The website's prepared package requires access to its configured Sites project before deployment. These are separate from the passing local review build.
