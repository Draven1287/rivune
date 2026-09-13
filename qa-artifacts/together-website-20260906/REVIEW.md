# Together mode: Lantern Pages live project test

Rivune produced and applied a real website, but its partnership workflow needs correction. This single run demonstrates artifact generation and useful reciprocal review. It does not establish that Together is better than either model alone.

## What actually ran

- Installed Rivune 0.2, build 2026090609.
- GPT-5.6 Sol / High through Codex CLI; Claude / Account default / Automatic through Claude Code CLI. Both used existing provider-managed sign-ins.
- Conversation `92CCDD8C-1A3E-4CF9-B924-A80017B0C01C`, turn `40E56999-E6B7-42B4-BAF1-50EC60E526B8`.
- One live Together request. App-reported completion time: 819.1 seconds (13 minutes 39 seconds). Final answer attributed to Codex CLI.
- The test asked for a fictional book-club site with exactly `index.html` and `styles.css`, no JavaScript or external resources, a mobile layout, native HTML FAQ disclosures, and real section links.
- Rivune selected complementary workstreams. Its plan assigned HTML/content to Codex and CSS/design to Claude.
- Through Rivune's UI, selected the empty `site` folder, prepared the proposal, reviewed the two new files, and applied them. Rivune's structural file/reference checks passed and Revert became available.
- No website code was written or corrected by the audit task. Applied files exactly match the final generated manifest. The audit task served those files on localhost only and tested them in the in-app browser.

## File receipt

| File | UTF-8 bytes | SHA-256 |
| --- | ---: | --- |
| index.html | 5,141 | `492d236b9b6b11d11030136bf98ea9d0a54e7ebc465c663eba88af5119b937cc` |
| styles.css | 6,759 | `5446562f82086919c2c6ce733c7336a0491c03fbc1591bc08d08f2f523b705d0` |

Total: 11,900 bytes. This passes the user's 15 KB ceiling. It exceeds the plan's self-imposed 6,000-byte CSS allocation. The final model estimate of approximately 5.3 KB for CSS was inaccurate; use measured sizes.

## Rendered and interaction results

| Check | Result |
| --- | --- |
| Exactly one valid final JSON manifest and two complete files | Pass |
| Applied files match final output | Pass, byte for byte |
| 1280 × 900 desktop | Pass for inspected layout; three reading cards in one row |
| 390 × 844 mobile | Pass for inspected layout; reading cards stack in one column |
| Horizontal overflow | None at either width; document widths 1265 and 375 account for the 15-pixel browser scrollbar |
| Navigation | All eight links have existing fragment targets; main CTA and reading/FAQ links navigated correctly |
| Semantic structure | One main, one nav, one h1; three reading cards and four FAQ items |
| Keyboard skip link | First Tab reveals it; Enter moves focus to main |
| Keyboard FAQ | Enter opened and closed “What does it cost?” |
| External resources and executable content | No script, image, iframe, or form nodes; local stylesheet only |
| Text contrast, sampled palette pairs | Ink on cream 14.94:1; secondary ink on cream 7.55:1; button text on terracotta 5.86:1 |
| Footer keyboard focus | Needs correction: dark terracotta outline on dark ink footer measures 1.83:1. The outline exists and is keyboard-visible, but needs a lighter color on the dark surface |
| Rivune's built-in static preview | Fail: blank white after several minutes, despite successful file/reference checks. The same applied files render in the browser |

Visual judgment: a coherent, readable small editorial site with a framed book-like hero, clear meeting information, and consistent cards. It is a useful prototype, not proof of best-in-class design or a full accessibility certification. Safari, Firefox, zoom, screen-reader behavior, and a comparative single-model run were not tested.

## Partnership findings

1. **Ownership was not followed.** Both providers produced entire competing websites despite complementary file assignments. Both cross-reviews explicitly admitted this duplication. The user's final two-file output format appears to have overridden the intermediate role boundaries.
2. **The shared contract was cut off.** The saved/executed plan contains `[truncated]` in shared requirements, including the palette. Claude's review explicitly says it cannot determine the frozen terracotta value because the plan is truncated. Each model invented a different palette after the missing point.
3. **Saved evidence is incomplete.** Codex and Claude contributions end mid-JSON at 7,994 and 7,981 characters respectively; Claude's stored review ends before its resolution section at 5,984 characters. Source inspection confirms byte clipping in plan, contribution, review, and downstream prompt preparation. Display collapsing must be separate from durable content.
4. **The plan misdescribes orchestration.** It says Claude integrates after Codex signs off. The actual runner integrates with Codex first and uses Claude only as a bounded fallback.
5. **The reviews nevertheless helped.** Claude identified the tag styling/layout seam and corrected an assumption about footer selector specificity. Codex acknowledged its duplicated CSS and unsupported size/contrast claims. The final result combines Claude's reading-list material and palette with Codex's framed hero and some copy/semantic details. It fixes the tag presentation and avoids competing meeting details.
6. **Progress needs specificity.** The top-level status stayed generic for long stretches. The expanded collaboration view showed stages, but did not identify the active individual planning call or a completed individual contribution while waiting for its partner.

## Required next behavior

Use one shared goal and acceptance contract, explicit file ownership, compatible parallel contributions, partner review of actual artifacts, a recorded resolution for each material finding, and automated checks on the assembled artifact. Preserve good work and allow supported disagreement; do not reward argument or force agreement. Plans must describe the runner that actually executes them. Full contracts, files, reviews, and provenance must survive persistence.

These findings and source-level corrections were assigned to **Update Rivune product direction**. The task acknowledged the clipping defects and is preparing bounded changes and regression fixtures. Its fixes were not installed or retested as part of this baseline run.

## Evidence

`evidence/prompt.txt`, `conversation.json`, `sharedPlan.md`, `chatGPTAnswer.md`, `claudeAnswer.md`, `chatGPTReview.md`, `claudeReview.md`, and `combinedAnswer.md` preserve the test as saved by Rivune, including its truncation. `site/` contains the exact applied artifact. Browser measurements and viewport screenshots are in `evidence/` when copied successfully; an independent local copy is retained in `/private/tmp/rivune-together-website-20260906/` because cloud-synced workspace I/O intermittently stalled.

## Antigravity follow-up

The user's newly installed `~/.local/bin/agy` returned version **1.1.27**. Process-name inspection did not find a named `agy` or Antigravity process. Terminal UI access was blocked by the computer-use tool, so the displayed terminal state and account authentication were not verified. No Antigravity model request, account change, or install was performed. Google's official headless-mode documentation describes programmatic use with provider-managed cached authentication: https://antigravity.google/docs/cli/headless/ . A Rivune adapter is separate work from detecting an installed command.
