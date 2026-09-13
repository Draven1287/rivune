# Native local review — 0.2 (2026090604)

Installed at /Applications/Rivune.app on September 6, 2026.
Previous working 2026090603 preserved at
/private/tmp/rivune-review-2026090604/Rivune-previous.app.

## Verified

- Release build succeeded; 11 focused tests passed (draft persistence, project
  storage/membership/context approval, account launch policy).
- Installed bundle version is 2026090604; deep strict ad-hoc signature verified;
  app launched and remained running. This is a local review, not a public release.
- Account Enabled=false. Account client is lazy and created only by an explicit
  account action after the trusted Developer ID gate. Launch/Settings initialization
  construct no client. Restore/monitor return before session access unless such an
  action occurred. No existing Keychain entries were read, changed, or removed by
  this verification. Google/Apple/email are not activated in this review build.
- Local preview executable has no Sparkle load command. Runtime library validation
  was not weakened. Public update path remains separately gated.
- Official Sparkle file-based signature check accepted a disposable archive and
  rejected tampering; no production key, feed publication, or update installation.

## Rendered verification boundary

Native computer-use repeatedly failed with “Sky Computer Use native pipe closed
before response,” also independently reported by the coordinating task. Therefore
0604 visual QA, including absence of a visible Keychain dialog, is UNVERIFIED.
Source tests and a live process do not prove rendered behavior.

Earlier 0603 inspection reached Home/Ready, Projects and the new-project dialog.
Whitespace-only Create was disabled. A synthetic QA project was persisted when the
inspection connection failed. Do not interpret that as complete project UI QA.

## Next visual pass

1. Cold open and Settings navigation: no Keychain prompt; startup wordmark clears
   traffic lights; normal/compact/full-screen Home remains centered.
2. Long conversation: last answer and collaboration controls clear the composer;
   drafts restore after switching chats, quitting, and relaunching.
3. Projects: create/rename/archive/unarchive/delete a disposable project, move a
   synthetic chat, search/filter; delete must retain chat and original files.
4. Import disposable UTF-8 files/folder: changed/missing files show useful errors;
   no file content sent until explicit per-request approval. Keyboard/VoiceOver
   traverse controls; popovers fit small windows and Escape closes them.
5. Account: honest local status, no placeholder success or automatic credential
   access. Production OAuth requires a separate explicitly configured test.
6. Software updates: local build clearly unavailable; real signed update testing
   still requires identity/feed/notarization, including offline/tampered/skip/later,
   active-run deferral and persistence across relaunch.

No claim of App Store readiness, Windows support, live account sign-in, cloud
project sync, public update delivery, or complete website parity is made.
