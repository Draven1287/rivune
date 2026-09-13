# Rivune build 2026090623 local acceptance

## Installed review build

- Marketing version: `0.2`
- Build: `2026090623`
- Bundle identifier: `com.aaravshah.alloy.mac`
- Installation: `/Applications/Rivune.app`
- Installed binary SHA-256: `5880a08cb176567fcf2d8edd81ec7e37108d5073a90ef0f6d2ad551a299368cc`
- Local signature: ad hoc; deep strict verification passed
- Rollback: `/private/tmp/rivune-review-2026090623.RsHYt8/Rivune-restored-0622-before-approved-install.app`

## Accepted change

Phone requests now carry the exact admitted CLI or API route. The Mac rejects a missing, stale, changed, or fabricated route before provider execution, freezes the accepted route for the whole request, and strips CLI-only controls from API execution. CLI provenance labels model and reasoning as requested. API provenance says the response model is unavailable and labels prior readiness-probe metadata separately as a connection check. The optional Codex CLI receipt remains bounded, hash-based, in-memory, and excludes prompt, answer, raw diagnostics, and raw provider IDs.

## Verification

- Consolidated independent source review: accepted with no remaining P1 or P2 finding.
- Focused native tests: 40 passed, zero failed or skipped.
- Full native suite: 323 passed, zero failed or skipped.
- macOS Release build: passed.
- Generic iOS Simulator Release build: passed.
- Browser companion contracts: 47 passed.
- Installed plist reports build `2026090623`; installed binary matches the accepted signed candidate exactly; the app is running.
- Native accessibility inspection confirmed the main workspace, macOS close/minimize/full-screen controls, compact list with `Show all 24 conversations`, two saved projects, Council composer, ready Codex and Claude CLI status, the account/settings footer menu, and the Account settings screen.
- Project navigation was invoked, but the external Sky Computer Use inspection service crashed before returning the post-navigation accessibility tree. Rivune stayed running and produced no crash report. Project and complete-file continuation remain covered by the accepted native regression suite, but a post-navigation rendered capture was not obtained in this run.
- No AI provider request was sent.

## Data preservation

Canonical decoded JSON hashes match the pre-install snapshot for conversations, conversation backup, projects, drafts, and saved runs. Twenty-four conversations remain. Byte formatting may be rewritten by normal persistence, while decoded content stayed semantically equal. The before/after receipts and full file snapshots are retained in `/private/tmp/rivune-review-2026090623.RsHYt8`.

## Remaining limits

This is a local review build. It is not Developer ID signed, notarized, packaged into a release DMG, hosted, or App Store approved. Physical-iPhone pairing and reconnect continuity remain unverified. Google, Apple, and email account flows still need deployed provider configuration and end-to-end testing. No live CLI/API generation, provider request ID, resolved API response model, billing metadata, or model-quality comparison was verified.
