# Durable Results pane interaction — September 10, 2026

Status: proposed interaction specification; no product implementation or runtime acceptance claimed.

Basis: DURABLE_ARTIFACT_CONTRACT_20260910.md, current HostWorkspace.tsx and accepted reading-surface direction at candidate 5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b. The sole builder is implementing the host foundation first. Implement this pane only after independent acceptance of the actual bridge contract. Resolve historical retry-content immutability in that foundation; UI must not conceal an overwritten result by treating its replacement as the same item.

## Smallest useful slice and placement

Add one `Results (N)` button to the current conversation header, immediately before Refresh. Count only host-issued artifact summaries for the active conversation, including unavailable and superseded records. Do not count attachments, draft text, Markdown fences, in-memory streaming output, or demo artifacts. With an active conversation and zero records, keep the button enabled so the empty state is discoverable. Before a compatible snapshot is available, disable it rather than showing a fabricated zero.

The pane starts closed on load and never opens on run completion, refresh, retry, cancellation, or incoming output. Clicking Results opens the list without selecting or inspecting an item. An explicit row activation selects the exact conversation/request/artifact/digest tuple and requests its content. Opening this surface performs no save, send, configuration change, or reviewed-state mutation.

Keep the existing transcript SavedResult dialog and Inspect actions unchanged throughout this slice. Do not redirect them to the pane until their exact artifact mapping and replacement interaction have independent acceptance. The first slice therefore adds a header entry point, list and inert inspector only. No file tree, editor, terminal, preview execution, export, OS reveal, search, sorting controls, tabs per result or drag/drop.

## List and provenance

Use a plain list of buttons, not a tree or custom arrow-key widget. Each row contains a wrapping host display name, origin description, run date/time and a compact status line. Indicate selection with aria-current and a visible border/background, not color alone. Accessible names include enough provenance to distinguish repeated names. Order newest createdAt first, artifactID as deterministic tie-breaker; preserve keyed rows and scroll position when new items arrive. Never auto-select the new row.

Use only frozen run/member provenance joined by authoritative identity:

- Direct final slot: `Saved answer` when its saved run is completed, otherwise `Saved partial answer`.
- Constellation final slot: `Lead synthesis` when completed, otherwise `Partial lead synthesis`.
- Member slot: `Member contribution · {frozen member identity}`. Add `Run incomplete` for queued/running/failed/cancelled runs; that does not assert the individual contribution itself was truncated.
- Missing historical provider: `Provider not recorded`. A provider ID may be shown as recorded; do not substitute the current connection label. For identical labels, include member identity so contributions remain distinct.
- Unavailable state: `Missing`, `Integrity check failed`, or `Cannot read`, corresponding respectively to missing/corrupt/unreadable. Keep the row selectable.
- A referenced older record: `Earlier saved version`. Its replacement may show `Newer saved version`; neither silently replaces an open selection. Do not label either as verified, accepted, consensus or current model output.

Show the run identifier and full artifact identifier in a compact inspection Details disclosure, alongside digest, byte count and saved timestamp. Keep technical identifiers out of the primary title except when needed to disambiguate. Retrying a failed run may append new records; preserve existing selected identity and text only while still valid. Do not infer final output from the last member answer or create a final row for a cancelled run with no final artifact.

## Inspector and truthful states

The same pane switches between list and inspection, using `Back to results` above the selected name; no additional nested side column. Keep a visible `Close results` button throughout. Header and controls remain reachable while the content region scrolls.

| State | Content and actions |
| --- | --- |
| Compatible snapshot, no results | `No saved results yet. Results will appear here after the host saves an answer or contribution.` No spinner or provider claim. |
| List open, none selected | List and `Choose a saved result to inspect.` No content request until selection. |
| Loading selected item | Clear prior content immediately; show selected metadata and `Opening saved result…` with polite status. Back and Close work. Copy/Select all absent. |
| Available, validated response | Read-only, whitespace-preserving text area using the SavedResult presentation conventions; `Copy saved text` and `Select all`. Show exact saved text, including Markdown/JSON/source as source. No navigation, execution, remote fetch or formatting that changes copied bytes. |
| Missing | `This saved result is missing. Its record is still available.` No text or copy. Offer `Retry inspection`. |
| Corrupt | `This result did not match its saved integrity record. Content is unavailable.` No stale text or copy. Offer `Retry inspection`. |
| Unreadable | `Rivune could not read this saved result.` No text or copy. Offer `Retry inspection`. |
| Transport/read failure | `Could not open this saved result. Try again.` Keep metadata and offer `Retry inspection`. Never regenerate or replay the prompt. |
| Incompatible response or identity mismatch | `This result could not be verified for the selected record. Refresh saved status and try again.` No preview, old text or fallback item. Refresh uses the existing host refresh action. |
| Selected summary disappears or changes identity/digest | Clear text and selection; return to list with `The selected result is no longer available in saved status.` Do not choose a similarly named result. |

Each open/retry has a local request generation as well as the exact tuple. Discard responses after Back, Close, conversation switch, newer selection or a newer retry, even if an older request used the same tuple. Retry has a pending duplicate guard and acts on the captured tuple only. A host disconnect clears content and exposes a reconnect/refresh message; compatible recovery does not silently reopen an item. Ordinary refresh with identical validated identity need not erase a currently inspected result, but any newly unavailable metadata does.

Reuse the existing copy behavior: explicit user activation, exact captured text, disabled duplicate pending copy, truthful success/failure, selection fallback on failure and stale-completion suppression after leaving. A copy operation never reports completion for a different item. Do not infer clipboard success from selecting text.

## Layout and visual direction

At viewport widths of 1100 CSS px and above, use the existing Conversations column, a chat column with at least 480px available, and a right Results pane nominally 320px wide. If the actual sidebar, gaps and minimum chat width cannot fit, use the narrow mode instead of shrinking chat. Results gets a thin divider and the accepted calm opaque reading surface. Reuse current type, controls, borders and silver accents. Galaxy texture remains at the accepted desktop perimeter/subdued navigation; never behind result text. No blur layer.

Below that fit threshold, Results occupies the chat region in place of the transcript/composer while open, not a floating overlay. Keep the chat subtree mounted but hidden/inert so draft value, selection and transcript scroll survive. Close returns to Chat. On intermediate desktop sizes the existing Conversations sidebar remains usable. At 320px and 390px, retain the existing Conversations/Chat navigation; Chat explicitly closes Results. Do not add a cramped third persistent navigation tab. Results header shows Back when inspecting and a visible Close control; wrap controls to a second line when necessary.

At 320×568 and 390×844 CSS px, rows and labels wrap, controls have at least 44px targets, and the document has no horizontal scroll. The exact-text area may scroll horizontally internally for long code lines. Give its scroll region min-height:0 so header/actions do not escape the viewport. Opening Results may temporarily replace the composer on narrow screens; it must never permanently cover or resize its stored draft. Test 200% zoom using the resulting CSS viewport and the same fit rule.

## Keyboard, focus and navigation

Results is a named complementary region, not a modal dialog. No focus trap and no global interception of typing shortcuts. Header activation focuses the Results heading (tabindex -1). Rows activate with native Enter/Space. Selecting a row moves focus to the inspector heading; async content arrival does not move focus again. Back restores focus to the exact list row, or the list heading if that row disappeared. Close or Escape while focus is within Results restores focus to the header Results button; if no longer present, use the current chat heading. Escape in the composer must not unexpectedly close a desktop pane.

Tab follows visible controls and never enters hidden Chat or hidden list content. On desktop, both chat and Results remain keyboard reachable. Only the active modal handles Escape: if Settings or existing SavedResult is open, it closes/restores its own focus first and leaves Results alone. Visible text Close remains present even when an icon is also used.

Only a successful active-conversation change closes the pane, clears its tuple and invalidates requests; returning later starts closed. A failed draft-save/conversation-open attempt leaves the current conversation and result intact. Do not add an extra draft save as part of pane cleanup. Reuse existing successful navigation focus behavior: mobile opens Chat and focuses Message. New conversation follows the same successful-change rule. A resize changes presentation only, preserving selected tuple and focus when still visible.

## Concrete acceptance before calling the pane ready

1. Header entry point and zero state match host metadata; save uncertainty produces no invented result. No pane opens automatically when output arrives.
2. Same-name/same-text records across conversations and same-provider members open their own exact tuples; row/detail provenance remains frozen after composer/team changes.
3. Select A then B with A returning late; close/reopen A with the first A response late; retry twice; switch conversations during a read. No stale content, copy status or focus change survives.
4. All unavailable states retain selectable rows and show no stale bytes. Retry performs inspection only. Invalid response schema/identity/hash binding never displays content.
5. Partial/cancelled Constellation retains member rows without invented synthesis; retry appends distinct historical output and does not replace a selected older result.
6. At desktop, 320×568, 390×844 and 200% zoom, close/back/actions stay reachable, names wrap, text scroll remains internal and Chat is recoverable in one action. Opening/closing preserves draft, text selection and transcript scroll.
7. Keyboard-only open/select/back/Escape/close works with precise focus return, visible focus and no hidden tab stops. Existing SavedResult focus trap/copy and Settings behavior remain intact.
8. Plain text, script/HTML/SVG, Markdown links and misleading filenames remain inert. Exact Unicode/whitespace copy uses a stubbed clipboard for fixture proof; actual OS clipboard remains a separately stated verification boundary.
9. Failed conversation navigation retains the current pane; successful navigation clears it. Opening/closing/selecting issues no save/send/configuration commands.
10. Independently verify rendered behavior against the accepted host bridge before replacing any transcript Inspect dialog. Synthetic browser acceptance alone does not establish native restart, provider execution, managed files or release.

This report changes documentation only. Host/storage/parser implementation, rendered pane behavior and native operation remain unproven by this document.
