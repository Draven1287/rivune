# Lantern redesign: actual Together run and rendered review

September 6, 2026. This is the existing Together workflow, not Council or Swarm. The user rejected the earlier baseline; this record does not imply user approval of the redesign.

## Execution and output

- Installed Rivune 0.2, build 2026090613. Native owner reported 238 passing tests; root independently exercised the installed app.
- Conversation: `F81C6BC8-16FF-47FA-9F52-2DB664AA9F80`.
- Successful retry turn: `786738B4-AAB0-4FC8-A2F4-F75C45B9AB1C`.
- Providers: Codex CLI with GPT-5.6 Sol / High; Claude Code CLI with account default / Automatic. Exact Claude model was not reported to the app.
- App-reported elapsed time: 1111.1 seconds. Both contributions and partner reviews completed; Codex integrated the result. No provider errors remained.
- Raw contribution sizes: 21,728 and 25,143 UTF-8 bytes. Final response: 36,300 bytes. Full selected-turn evidence is in `attempt-02/`.
- Final files were applied through Rivune's actual Save to folder → Review save → Apply reviewed changes flow. Root did not write or alter the generated website source.
- `index.html`: 19,351 bytes; SHA-256 `eb05a7778f2cc5aa020d9fa9c5acfd8e378a0dbd297ae8c215db861265dc76bd`.
- `styles.css`: 15,142 bytes; SHA-256 `a3352a569ab019573d63188649905213bae5bf5be1a5f7ffa563bd37202501b9`.
- `attempt-02/status.json` independently confirms both disk files exactly match the final response.

The first attempt's plan failure remains archived in `attempt-01-failed-plan/`. The successful retry appended a new turn and retained the failure. Its prior context includes the failed turn; it is the same user brief but not an identical complete provider request.

## Verified app behavior

The final answer displays a readable summary, a two-file artifact card, measured byte count, Preview, filenames, and collapsed original response. JSON is no longer the primary presentation.

On this successful result, the first native preview immediately painted and exposed its WebArea. Native Questions navigation changed the fragment, and the first FAQ expanded with the correct answer. Save review showed the correct isolated destination, and Apply produced an actual Changes applied receipt with Revert last save available.

After returning to the earlier conversation, its artifact still showed the original title, original 11,900-byte count, original section IDs, and distinct staged answer ID. Returning to the new conversation restored its 34,493-byte artifact and summary. This navigation check did not relaunch the app; restart persistence is not claimed from it.

## Rendered browser checks

The exact saved files are served locally at `http://127.0.0.1:60333/`. This is a local preview, not a published site.

- 1280×900 and 390×844 viewport checks: no horizontal overflow. The document width excludes the browser's scrollbar; viewport sizes are recorded in the DOM receipts.
- One h1, no duplicate IDs, all internal anchors resolve, four FAQ disclosures, no scripts or remote assets.
- Desktop primary action, shelf, and evening links navigated to the intended sections. The featured cover and copy render side by side at desktop.
- Phone Questions link and FAQ disclosure work, and answer text remains readable.
- A keyboard-focused skip link becomes visible with an outline; Enter moves focus to `main-content`. Natural first-Tab traversal was not established by the background CUA key call, so that broader check remains unverified.
- Rendered footer focus outline: `#8c3c10` against `#efe5d2`, computed contrast 6.07:1. Skip focus outline against its ink background: 6.71:1. These are selected color checks, not a complete accessibility audit.
- Book notes now render at 16px without uppercase transformation. The partner-identified CSS specificity and feature-layout problems were corrected in integration.

Screenshots and DOM/keyboard receipts are in `attempt-02/`: desktop hero, gathering, shelf, evening, phone hero, first native preview, native artifact result, and older artifact after the new result.

## Visual judgment and remaining work

The redesign substantially improves the rejected baseline: a substantial reading-room illustration replaces the empty hero field, original covers supply a visual subject, the featured gathering is editorially composed, and the dark evening section changes the page rhythm. This is an audit judgment, not user acceptance or evidence of superiority over a single model.

Two refinements remain:

1. On the third shelf cover, the top leaf overlaps the “to Quiet Things” title line. The title is repeated legibly outside the cover, but the artwork itself needs a small layout correction. Source-only partner review did not catch it.
2. Rivune's approximately 780-point preview sheet triggers the site's stacked layout. The illustration is below the hero text at that width. A larger/resizable preview would make desktop composition easier to inspect. After saving, the app also retains “Review ... before applying” helper copy next to the applied receipt; that status copy should be conditional.

The original generated bytes are preserved so these findings cannot disappear behind an unrecorded manual edit. The new Council/Swarm implementation and its live acceptance are separate work. Swarm must eventually run real workers and rendered checks rather than relying only on text-level reviews.
