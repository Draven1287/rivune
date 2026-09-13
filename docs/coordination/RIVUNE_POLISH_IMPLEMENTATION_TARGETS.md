# Rivune polish implementation targets

September 7, 2026 · Follow-on candidates for the native owner after the active 0620 release. No app source was edited.

The existing artifact card, visible file selection, and anchored account footer give this screen a clear structure. The next polish pass should reduce composer chrome and make everyday reading more consistent. Preserve the selected background and brightness, silver Rivune identity, real Mac window, account footer, and accepted Team sheet behavior.

## Evidence boundary

Visually inspected [selected continuation screenshot](/private/tmp/rivune-review-2026090620/continuation-selected.png) and [fallback-order screenshot](/private/tmp/rivune-review-2026090620/fallback-order.png). The first is explicitly a fictional QA result with no provider call; the second is a scrolled Team sheet. These support composition judgments, not measured usability, contrast ratios, or complete installed acceptance. The screenshot includes a context ring, while current source uses a selected-artifact icon in that state; do not use that image to assert current icon behavior.

Current Theme, Components, SidebarView, and WorkspaceView bytes matched `/private/tmp/rivune-review-2026090620/final-source/` at inspection. Additional artifact-card source was read in ProjectWorkspace. Numeric values below are source constants in SwiftUI points, not pixel measurements from resized screenshots. Semantic fonts such as `.caption` are reported by name rather than assigned an assumed size. Proposed tokens are new suggestions, not existing API.

### Added comparison evidence

Subsequently inspected root's [rendered Traycer public demo capture](../../qa-artifacts/traycer-comparison-20260907/traycer-public-demo.png). It visually groups composer controls into one row and separates navigation, conversation, and a result pane with dark reading surfaces. The three-column composition also produces small labels, truncated titles, and narrow prose. This supports candidate 1's control grouping and candidate 4's calm reading hierarchy; it does not justify copying the three-pane coding layout or shrinking Rivune's text. Preserve Rivune's chosen background around its reading surfaces. Its ResponseCard already uses a surface fill at opacity 0.97, so no additional global dimming is proposed. These are screenshot judgments; opacity and contrast were not measured for Traycer.

Root reports that installed Traycer 1.1.9 encountered a client/host mismatch and that its offered 1.2.0 update did not change the observed version/error. This review did not independently exercise those steps. The public demo is marketing evidence, not full workspace acceptance; its access label and usage display do not establish permissions or measured capacity that Rivune should adopt. The four candidates below remain unchanged in scope.

## 1. High impact — Use one composer configuration row

**Visual inference:** A separate Team button above the composer makes configuration look detached from the message. In the selected direct-chat screenshot, it also gives an unused team similar prominence to the active provider.

**Measured source:** [ComposerView](../../Rivune/Components.swift) starts with an unconditional macOS Team row, a 36-point `RivuneButtonStyle`, and a `.caption` orchestrator label only when a saved team exists. `ConfigurationMenu` separately opens the same Team editor in Council mode. Its visible pill is 32 points inside a 40-point target. Toolbar fallbacks already use `ViewThatFits`; icon targets are 38 points and Send is 40.

**Candidate:** Move team configuration into one prompt-adjacent row inside the composer. In Council, expose a compact Manager label and a single Team trigger; remove the duplicate Council-team trigger. Resolve the label from the same effective configuration used for the next request, including a suggested team. In direct chat, use the existing provider/model control in that position. Preserve existing workflow selection and every supported action; do not add Auto/Swarm execution or routing behavior. Keep attachment, permissions, context, voice, and Send reachable in the existing toolbar.

**Tokens/components:** Add `RivuneInterface.composerControlHeight = 36` and `composerControlGap = 8`; use them in ComposerView/ConfigurationMenu. Keep 40-point Send and current focus restoration. Reuse RivuneTeamEditor and RivuneActionMenu rather than creating new menus. Let the configuration row wrap intentionally at narrow widths.

**Acceptance:** At 920×680 (current source minimum) and 1280×900, one Team action is visible in Council, direct chat identifies its active provider, and the manager is readable without opening the sheet. A long member name does not push Send out of view. Tab, Return, Escape, app focus loss, Settings return, and generation-disabled states preserve existing behavior. No draft or selected-file change occurs when opening configuration.

## 2. High impact — Compact selected-file context without hiding consent information

**Visual inference:** The selected-files banner is almost as prominent as the prompt, with three lines of similarly weighted text. Its large inset adds another box inside the composer.

**Measured source:** The `draftArtifact` branch in ComposerView uses a three-line `.caption` stack with spacing 4, inner padding 12 and outer padding 10. The prompt separately adds 22-point horizontal padding, 21 top when no ordinary attachments are present, and a 64-point minimum height. The banner's remove button has no explicit minimum target frame.

**Candidate:** Use a compact selection header with file count, filenames on one subordinate line, and the existing removal action. Retain a visible short notice that the files accompany the next request even when conversation memory is off. Align this block with the draft text; reduce the nested padding rather than shrinking the type or hiding file selection. Long names can wrap to two lines.

**Tokens/components:** Extract a presentation-only selected-artifact block. Propose `composerContentInset = 16`, `contextInset = 10`, `contextLineGap = 4`, and `contextRemoveTarget = 32`. Use a 12-point regular supporting-text token and secondaryText; keep important inclusion text out of tertiaryText. Apply the same 16-point leading edge to the prompt.

**Acceptance:** At 920×680, two normal filenames, the inclusion notice, a one-line draft, and Send are visible together. A long filename does not overlap Remove. Removing the block clears only that selection, preserving draft, ordinary attachments, and memory setting. Large-result rejection and complete-file continuation semantics remain identical. Verify this after AO-05 acceptance; visual edits must not alter its request construction.

## 3. Medium impact — Give sidebar text a consistent, readable rhythm

**Visual inference:** The sidebar is recognizable but its small recent-chat labels and uneven gaps make scanning harder than necessary. Preserve its current account anchor and selection styling.

**Measured source:** [SidebarView](../../Rivune/SidebarView.swift) uses 12-point navigation/search/conversation text, a 9-point RECENT heading with tracking 1.3, navigation height 35, and conversation minimum height 32. Main section bottom gaps are 26, 17, 20, 15, 12, and 8. Horizontal outer padding is 14. The project container receives its 12-point bottom padding even when empty.

**Candidate:** Raise main sidebar labels to 13 points and the section heading to 11 with tracking 0.8. Use a common 36-point navigation/conversation row. Normalize the header/navigation/search section gaps to 16, keeping 8 between a heading and its list; omit an empty project's section gap. Keep the wordmark dimensions, sidebar width, background overlay, account footer, and action availability.

**Tokens/components:** Introduce `RivuneTypography.sidebarLabel` (13 regular; selected medium), `sectionLabel` (11 medium), and `RivuneInterface.sidebarRowHeight = 36`, `sidebarSectionGap = 16`. Apply locally to navigationRow, searchRow, workspaceHeading, conversationRow, and project labels. Do not globally change `secondaryText = white 0.70` or `tertiaryText = white 0.52` to compensate for a particular background.

**Acceptance:** At 920×680, Home through Connections, search, RECENT, at least four recent rows with no project entries, and the existing account footer remain reachable without footer overlap. Long titles truncate consistently and retain accessible names. Review four project entries and a long account name separately. Verify text contrast on the user's selected background and all offered presets before claiming a contrast pass.

## 4. Medium impact — Make artifact summaries read like answers

**Visual inference:** The selected-result screenshot emphasizes the file box more than the explanation of what was produced. Its Preview action and collapsed Original response already establish a useful hierarchy and should remain.

**Measured source:** [ResponseArtifactCard](../../Rivune/ProjectWorkspace.swift) renders `artifact.summary` without an explicit font or line spacing, with a four-line limit; the stack spacing is 14 and the file box padding is 16. In contrast, ResponseTextBlockView explicitly uses 15-point prose with line spacing 5. ResponseCard adds 20 horizontal / 18 vertical padding, a 14-point radius, and a surface fill at opacity 0.97.

**Candidate:** Give artifact summary prose the same type, line spacing, and ink as normal responses. Use 12-point supporting text for file counts, filenames, and helper copy; keep the existing Preview action prominent and Continue editing secondary. Preserve the four-line summary disclosure and original response. Do not change output parsing, saving, continuation, or receipts in this polish pass.

**Tokens/components:** Add `RivuneTypography.responseBody = system 15 regular` and `supporting = system 12 regular`; add `RivuneInterface.responseLineSpacing = 5`. Apply body style to artifact summaries and existing normal prose for consistency, leaving code monospace and table formatting intact. Reuse current primaryText and response-card surface; no background changes.

**Acceptance:** Compare the same paragraph in a normal answer and an artifact summary at both window sizes. Their text size and line rhythm agree; long summaries expand fully, selection/copy works, and filenames remain legible. Preview, Continue editing, and Original response stay distinct and keyboard reachable. Verify a long answer and a non-preview file artifact as well as the fictional two-file fixture.

## Implementation handoff

These are four bounded visual candidates, not an implemented or user-accepted redesign. Land the composer row and selected-context spacing together after release/continuation acceptance, then the sidebar and result typography. Capture matching native before/after states with the same background and window size. Use focused regression checks for the affected controls and existing release checks; no new product architecture, website prototype, public claim, or feature scope is proposed.
