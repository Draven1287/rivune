# Rivune native Settings integration — build 2026090619

Installed and opened `/Applications/Rivune.app`, version 0.2 build2026090619. Accepted executable SHA256: `c7e880b9f770a8dbe2e7f1dd35bba0d15ef012156eda406c476d5d7468c5128b`. Strict deep signature verification passed for this local ad-hoc build. This is not a notarized/public/App Store release.

## Delivered

Settings now opens inside the main window from the account footer, app menu/Command-comma, workspace context actions and explicit `rivune://settings/<section>` links. Back to workspace returns to the mounted conversation/project view. The separate Settings window scene is removed. Last selected Settings section is remembered during the process.

The workspace remains mounted while covered, retaining its draft and scroll position. Covered workspace children are hidden from accessibility navigation. Returning from Settings restores the previous composer focus and cursor/selection, only when its original window is still key and the app is active. No other window or application is activated by restoration.

The sidebar has one compact account/footer menu. Account identity requires verified account state, separate from provider CLI readiness. Existing Google/Apple/email account flows remain unchanged; this update did not activate them.

Appearance adds Graphite, Orbit and Cosmos. Missing/invalid preset values preserve the exact previous galaxy/stars/brightness composition. Preset customization uses separate keys. Backgrounds are static and use existing assets/procedural drawing.

## Validation

- Final-source native suite: **278 passed, zero failed/skipped**. `test-summary.json` comes from the final caret build's test run, `/private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_22-33-48--0600.xcresult`.
- Meaningful settings tests preserve an unsent draft, selected conversation/project and synthetic pending run across Settings entry/close. Completion while Settings is open retains the exact single response and call count; closing preserves it. Strict deep-link admission and all section mappings are tested. No live provider requests.
- Full universal Release succeeded. `source-manifest.json` records the final44 source/project/configuration files, matching the working source and build mirror. Immutable accepted snapshot: `/private/tmp/rivune-review-2026090619/accepted-source`. The older `/source` directory, `initial-source-manifest.json` and initial staging files deliberately preserve the earlier checkpoint and are not the accepted candidate.
- Rendered isolated final candidate: Settings in mainwindow, Command-comma, remembered Appearance section, Account footer route, explicit account deep link, Back/Escape and return to Projects all passed. No separate Settings window appeared.
- Draft/caret proof: `Draft before Settings. Continued safely.` after entering Settings search, Escape and typing without clicking the composer. Existing chat similarly retained/appended its draft. Chat vertical scroll position remained exactly `0.8461538461538461` before/after Settings.
- Initial QA exposed focus loss, macOS select-all on focus return, unknown preset button roles and hidden workspace AX children. Those were corrected and the final capture confirms composer focus/caret, button/selected roles, and only Settings content in the accessibility tree.
- Graphite/Orbit/Cosmos pointer selection and readability inspected. Orbit and its preset customization persisted across isolated relaunches. Customizing Cosmos stars/brightness then Use previous appearance restored original stars on/65% brightness in the isolated profile. Keyboard preset traversal is not claimed: a Tab/Space attempt activated Back rather than the intended next card. Brightness exposes adjustable increment/decrement actions; comprehensive VoiceOver/keyboard traversal remains a broader audit task.
- Account footer popover dismissed on app hide. Root independently inspected `chat-account-footer.png`, `settings-appearance.png`, `orbit-workspace.png` and accepted the bounded visual layout. Installed smaller window also rendered all three Appearance cards cleanly (`installed-settings.png`). No actual user appearance preferences were changed.
- Normal installed startup restored all24 conversations and the previously selected chat; both registered CLI connections reported ready. Settings showed four discovered executable tools, two with supported signed-in routes and Gemini/Ollama labelled adapter needed. This is readiness/discovery evidence, not live generation acceptance. The prior bottom scroll position was restored using Scroll to latest after relaunch; cross-launch scroll persistence is not claimed.

## Installation and preservation

The old app quit normally through its save-admission guard. All four conversation/run/draft/project JSON files are semantically unchanged against the post-quit snapshot after installation and normal startup, recorded in `history-verification.json`. Pre-quit and post-quit snapshots are retained in the review directory. Rollback app: `/private/tmp/rivune-review-2026090619/Rivune-replaced-0618.app`.

The QA clone uses `RivuneUIPreview=true` and distinct bundle ID `com.aaravshah.rivune.qa0619`, isolating both history/provider activity and Appearance defaults. Installed app has no preview flag and matches the accepted production binary.

## Limits

This bounded acceptance does not establish the whole-app audit matrix, live account sign-in, account verified/attention rendered states, App Store readiness, arbitrary CLI support, Swarm/Auto, output-quality superiority or generated-file continuation. Provider failure recovery and immutable artifact continuation remain separate next increments. No new sign-in, paid provider workload, publishing, deployment or cloud execution was performed.
