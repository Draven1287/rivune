# Native local review 2026090607

Installed Mac version 0.2 (2026090607) after Release success and 209 tests passed,
0 failed, 0 skipped. Saved result:
/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_14-41-00--0600.xcresult.
Logs: /private/tmp/rivune-0607-full-tests-fixed.log and /private/tmp/rivune-0607-build.log.

Changes:
- Prevent project creation/edits/deletion when the local library cannot be read;
  show an unavailable state instead of implying a writable empty library.
- Reject new chats in archived or deleted projects at the store boundary.
- File/folder import shares a tested bounded implementation. Canonical paths
  prevent duplicate references through macOS /tmp and /private/tmp aliases.
- Native window toolbar uses the app canvas color, preserving system controls.

New isolated fixtures verify archive/restore/recreation, retaining linked chats
and original files after project deletion, approval reset on chat switches and
instruction changes, malformed-library preservation, hidden/binary/symlink and
duplicate import handling, opt-in context and missing-file failure. No live AI
calls, real account operations or Keychain changes were made.

Project detail diagnostic NSHostingView images at 620 and 980 pixels rendered
without an app crash. These offscreen images are not installed-window visual or
VoiceOver approval. The computer-use helper previously crashed while traversing
Project detail; that installed accessibility path remains unverified.

Installed 0606 was also inspected before replacement: native full-screen Home,
a saved long answer at its end with composer clear, model accessibility groups,
and Escape closing model configuration. No new prompt was sent.

0607 installed at /Applications/Rivune.app with deep strict ad-hoc signature
verification. Account Enabled remains false. Previous 0606 app retained at
/private/tmp/rivune-review-2026090607/Rivune-previous.app. Rollback not exercised.
Observed initial startup at 6% after installation.

Release prerequisites remain separate: real signed account flows, physical iPhone
pairing, full VoiceOver testing, and signed/notarized distribution are unproven.

Post-install native inspection: loading completed to the restored conversation
with Ready state; dark toolbar rendered above the unobscured Rivune wordmark.
Command-comma opened Settings. Account showed Local workspace and explicitly
unconfigured account services; no Keychain authorization dialog appeared.
The system screen-sharing indicator may occupy the native window-control area;
it is macOS UI, not an app-drawn logo or control.
