# Native project workflow review — September 6, 2026

## Current changes

- Project file actions now use the same RivuneActionMenu as project actions,
  replacing the isolated stock Menu. The native macOS window controls and native
  file picker are preserved.
- Added a synthetic workflow test: create project, import a file, select context,
  require approval, submit through a fake provider, verify the reply stays in the
  project-linked conversation, and reject a later changed-file reference.
- Added populated project-detail rendering fixtures at 560 and 920 points with
  a long title, instructions, selected Markdown file and linked chat. Both were
  visually inspected: title wraps, actions/files/chats remain visible and clear.

## Evidence and limitations

Native UI on installed 0607 created “Rivune QA — Project workflow”. A read-only
check of the local project library confirmed it was saved. This clearly named
QA project is retained for manual inspection; existing projects/chats/files were
not deleted or rewritten. A disposable file is at
/private/tmp/rivune-project-native-check/notes.md; it was not sent to a provider.

SkyComputerUseService closes its pipe when inspecting project detail, including
the screenshot-only path; Rivune itself remains running. Project list and create
alert are inspectable, but installed project detail and actual file-picker
completion remain unverified. This is not being counted as a successful rendered
installed-app or VoiceOver acceptance check.

The populated render images are isolated NSHostingView fixtures, not captures
of the installed user workspace:
/private/tmp/rivune-project-render-review/populated-project-560.png
/private/tmp/rivune-project-render-review/populated-project-920.png

Focused project fixtures passed. Full suite: 211 passed, 0 failed, 0 skipped:
/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_16-13-38--0600.xcresult.
Log: /private/tmp/rivune-0608-tests.log. Fake provider execution is deliberately
not a claim of live provider or real account success. No Keychain edits or live
model requests were made.

Current shared RivuneStore.swift matches the build mirror, preserving the public
Swift 6 explicit-capture correction. The public source preview is separate from
this local native review and its published assets have not been changed here.

Installed local Mac 0.2 (2026090608) after Release succeeded:
/private/tmp/rivune-0608-build.log. Deep strict ad-hoc signature verification
passed. Account Enabled=false. Previous0607 retained at
/private/tmp/rivune-review-2026090608/Rivune-previous.app (rollback not exercised).
Observed new process startup at 6% with the native close/full-screen/minimize
controls exposed. No DMG was created or published in this pass.

Post-install0608 inspection passed: startup→Home/Ready, saved QA project visible
in sidebar, Command-comma opens native Settings, Account renders Local workspace
with explicitly unconfigured services, and Done returns to Home. No account
Keychain authorization dialog appeared. Window close/minimize/full-screen controls
remain exposed. This does not close project-detail/helper or physical pairing gates.
