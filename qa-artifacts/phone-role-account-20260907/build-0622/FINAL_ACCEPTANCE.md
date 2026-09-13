# Rivune build 2026090622 local acceptance

## Installed review build

- Marketing version: `0.2`
- Build: `2026090622`
- Bundle identifier: `com.aaravshah.alloy.mac`
- Installation: `/Applications/Rivune.app`
- Local signature: ad hoc; deep strict verification passed after local signing
- Rollback copy: `/private/tmp/rivune-review-2026090622/Rivune-replaced-0621.app`

## Verified behavior

- The Mac test suite passed 309 of 309 tests with no failures or skips.
- The Mac Release build completed successfully.
- The iPhone Simulator build completed successfully.
- The browser companion contract suites passed 47 of 47 tests.
- The installed app launched and exposed build 2026090622.
- Accessibility inspection confirmed a visible macOS close button, the compact conversation list with `Show all 24 conversations`, the Council composer, and ready Codex CLI and Claude Code CLI status.
- No provider prompt or model-generation request was sent during installation or acceptance.
- Conversation, project, and draft data remained semantically equal to the retained pre-0621 baseline. The backup conversation file retains the one previously accepted `togetherTrace.sharedPlan` value difference.

## New boundaries in this build

- Phone requests require versioned role-aware context. Legacy flat context, malformed attachments, oversized context, empty prompts, and conflicting reuse of a request ID are rejected before provider dispatch.
- Matching duplicate phone requests reuse the same in-flight or cached result within the running host process.
- User and assistant history remain typed; assistant text never becomes an instruction channel. Approved project instructions are separate from selected documents.
- Direct selected-file continuation keeps the exact immutable revision and complete-file JSON manifest contract on both provider routes.
- Failed account sign-out remains a visible local-session-removal recovery state. The UI states that this does not revoke a remote Rivune account or an AI-provider account.
- Browser account state uses tab-scoped session storage and rotates its storage key when a cloned fixture has a different tab owner.

## Limits still requiring release or device work

- The installed build is locally ad hoc signed. It is not Developer ID signed, notarized, packaged as a release DMG, hosted, or App Store approved.
- Physical iPhone pairing and disconnect/reconnect continuity were not exercised in this acceptance run.
- Phone duplicate caching is memory-bound and process-local; it is not durable across app restart, reconnect, or cache eviction.
- Google, Apple, and email account flows still require deployed provider configuration and end-to-end tests with the Rivune Supabase project.
- No live CLI or API generation was used to validate model quality, billing metadata, or provider-side request identifiers.
