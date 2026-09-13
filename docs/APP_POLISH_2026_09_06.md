# Mac workspace polish — September 6, 2026

The installed native Mac app now reserves a standard title bar for window controls. Recent chats show eight compact rows, with an explicit show-all control; search continues to cover the full list. No conversations were deleted or summarized. Settings uses a branded focus outline and an inline default-mode selector. Existing native menus do not require Apple Developer membership.

Appearance offers independent galaxy/stars toggles and background brightness, saved locally. Web appearance and compact-history behavior match these controls. Google and Apple account configuration is unchanged.

More API providers opens the existing API connection workspace. Scan Mac reports completion and found-tool count; discovered executables without adapters are not represented as usable chat providers. This SwiftUI build does not support Windows scanning.

Pairing QR codes now use rivune://pair?code=...; the iOS app accepts this deep link as well as the existing raw code through its scanner/paste flow. Existing credential validation, expiration, encrypted transport and credential rotation remain in place. Install Rivune on iPhone before scanning; both devices must share a network. No real-phone pairing has been verified in this pass.

Validation: Mac Release and iOS Simulator Release builds passed; four WorkspaceConnectionSettingsTests passed, including executable discovery without execution and active-work guards. Web TypeScript and 27 workspace tests passed. Installed app is locally ad-hoc signed, not a public App Store release.

App Store distribution needs Developer Program enrollment, signing, and review. This Mac target currently lacks App Sandbox; its external CLI access must be evaluated for a separate App Store distribution design. Enrollment alone does not resolve that requirement. See https://developer.apple.com/app-store/review/guidelines/ section 2.4.5.

## Reading and collaboration follow-up

Primary responses now use an almost-opaque dark panel with padding and a subtle border. Saved long-form business prose was visually inspected in the running Mac app. The space theme remains around the answer. Collaboration records expose a contributions/reviews button without first expanding the receipt; the button was exercised against saved history and opened the existing details sheet. Direct-response receipts use the simpler Response details title. A keyboard-accessible label was added to the new button after accessibility inspection. The web reading surface and activity-link wording were updated; TypeScript passed. No new AI request was submitted. A full responsive/table/code visual audit remains outstanding.

The concrete next project milestone and current execution boundaries are in PROJECT_WORKFLOW_ACCEPTANCE.md. That document is a plan, not a completed live website run.

## Native chat usability verification

Added per-code-block Copy code, preserved horizontal code layout, exposed markdown headings as accessibility headings, and added Escape dismissal to collaboration details. Narrow QA revealed overlapping table rows: the table container and each row now use their full intrinsic vertical size. Rechecked the fictional fixture at 920-by-680 after the fix: the long cell wraps without overlapping the following row, and horizontal scrolling remains available. Also inspected code/table layout at 1260-by-840 before the narrow correction. Mac Release build succeeded; local signature verified and installed. Isolated QA used a separate temporary bundle with RivuneUIPreview enabled and fictional conversations, not personal history or provider requests. Copy control is present; clipboard contents were not changed during QA. The old website workflow document is explicitly superseded by the native-app direction.

### Native conversation controls follow-up

- Removed the duplicate contributions/reviews action inside the expanded collaboration receipt; the always-visible action remains with an accessibility hint.
- Removed the sidebar Browser workspace shortcut to match the desktop-app product direction.
- Verified a saved long answer can scroll to its end with final text and collaboration controls above the composer; no AI request was sent.
- Release Mac build passed and the ad-hoc signed app was installed at /Applications/Rivune.app. Previous app retained in /private/tmp/rivune-controls-checked/Rivune-previous.app.
