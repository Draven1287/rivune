# Startup Handoff QA — independent identity PASS

2026-09-10. Bounded artifact/source identity acceptance only. Reproducible read-only checks: `node qa-artifacts/startup-handoff-native-build-20260910/independent-review/verify.mjs` from repository root. Executed successfully; no compile, rebuild, app launch, process operation, provider, installed change or publication.

All 148 candidate files and accepted Git blobs match manifest. HEAD `2ea834a1e2385c34b8f516854b5317c6a08a0607`, tree `9da0c197e0b5d81a0ee96398eda787984f0150fe`, recomputed aggregate `171ccf39b8cbee0189968505950f1085e12d5b261ecfeb61813e2e878d2c7f28`. Before/after source receipts match. Tracked state is clean with the two recorded untracked node_modules/gen entries.

Actual Mach-O arm64 executable hashes to `37c8751c631631477579ce848c90620d375495181394471a3214fe07be261c86`. Exact three bundle files and seven frontend files match receipt hashes and path sets. Info.plist correctly identifies executable rivune, icon.icns, com.rivune.desktop.qa.startuphandoff20260910, build 2026091006, and the distinct absolute profile-reserved-not-launched path, which remains absent. Profile environment delivery is not proven by plist inspection.

HTML references desktop-entry.mjs and index-DmKHPYWG.css; entry imports desktop-host.mjs before index-BYxvQFus.js. Bridge bytes equal accepted native web bridge. Recorded native dependencies reference all seven exact isolated frontend paths; effective QA override targets this directory and distinct identity/main title. Builder logs record successful frontend/native dev build with existing warnings. This proves consistency of recorded compiler inputs and staged artifacts, not extraction of embedded bytes or live webview response identity.

Corrected main input is present (preflight before app.run, complete_startup_setup controlled exit, admission dispatcher), matching previously closed main hash `cd29d3fa5d7f5aa0bd467b47b35af3fa9e42dffaaa07b21e5a969657c339cd1d`. Accepted ProviderSetup handoff-confirmed Continue to chat input is present and covered by the 148-file/blob identity check. No behavioral re-audit of handoff was performed.

All 525 captured preservation entries/path keys match before/after, and current bytes match those hashes. This is file preservation, not process preservation; no process inventory was taken or retried. No mismatches found. Unlaunched/debug status is builder-reported; hashes and absent profile cannot prove absence of every historical launch.

Runtime startup/exit, duplicate-window suppression, provider/handoff behavior and rendered acceptance remain separate authorized gates. This is not a signed installer/release or permission to replace installed Rivune.
