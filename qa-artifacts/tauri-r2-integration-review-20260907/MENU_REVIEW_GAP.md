# Menu-bar Review remains incomplete in Tauri

The current Tauri tray installs Status, Open Rivune, Settings and Quit Rivune. It has no New conversation action and no explicit Review text entry or add-to-draft path. main.rs and desktop-host.mjs expose no Review command/event. These are verified source gaps, not claims based on the tray icon's appearance. Exact source hashes are in MENU_REVIEW_GAP.json.

The referenced task Build Rivune menu-bar Review was reread. Its superseding coordination message resolves the original question: quick access/status plus explicitly supplied text into the existing draft is the accepted scope. Its historical Swift source is available at qa-artifacts/menu-bar-review-20260907/candidate2/source/RivuneMenuBar.swift, including RivuneReviewDraftPolicy and an Add to draft action. That implementation is reference material, not part of the current cross-platform app, and its old build/test reports cannot accept Tauri behavior.

Required next implementation after the current native freeze:

- Add New conversation and Review text access from the tray. Keep the main window authoritative; a Rivune-designed Review surface must dismiss cleanly and never remain above unrelated apps.
- The user types or pastes the text explicitly. No clipboard reads, screen capture, background monitoring, or model request occurs merely by opening Review.
- Add to draft must preserve the existing draft, append the reviewed text under a clear delimiter, and persist through the same host draft API. If the active conversation is read-only or unavailable, require an explicit new/editable conversation choice rather than overwriting imported records or silently redirecting input.
- Keep Review text available until the exact host save succeeds. If it fails, both old draft and proposed text remain recoverable. A changed active conversation during submission cannot redirect the pending merge.
- The user reviews the normal composer and explicitly sends through the existing supported provider/team pipeline. Do not create a separate model session, pretend Constellation is active, or add automatic dispatch.
- New conversation must persist the current draft before changing selection and show actionable failure without losing it.

Acceptance must cover native tray routing, outside-click/Escape dismissal, existing/empty/oversized/read-only drafts, failed save and changed selection, restart preservation and zero automatic dispatch. Current tray lifecycle tests prove only their existing four action/status hooks. The full Review requirement remains open even if basic tray Open/Settings/Quit passes M1.

This report adds no product scope, code or build. Native UI testing remains paused only while conflicting user interaction is being resolved.
