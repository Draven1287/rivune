# Results pane copy — September 10, 2026

Status: implementation-ready copy proposal, not runtime acceptance. Based on DURABLE_RESULTS_PANE_INTERACTION_20260910.md and DURABLE_ARTIFACT_CONTRACT_20260910.md, read in full. Scope is saved run text only.

## Entry and navigation

| Element | Copy | Condition |
| --- | --- | --- |
| Header button | Results ({N}) | Count authoritative saved summaries, including unavailable and earlier versions; never streaming text. |
| Before compatible snapshot | Results | Disabled; supporting status: “Saved results are not available yet.” Do not invent a zero. |
| Pane heading | Results | Conversation-scoped. |
| Empty state | No saved results yet. | Supporting text: “Results will appear here after Rivune saves an answer or contribution.” |
| List instruction | Choose a saved result to inspect. | No automatic selection. |
| Inspector navigation | Back to results | Returns to list, not another conversation. |
| Close | Close results | Accessible name and visible label; never “Delete” or “Discard.” |
| Loading | Opening saved result… | Clear earlier text immediately. |

## Origin and version labels

Use the host display name as the title and the following as a separate origin line. These describe the saved slot and run status, not answer quality.

| Saved origin | Origin line |
| --- | --- |
| Completed direct final | Saved answer |
| Non-completed direct final | Saved partial answer |
| Completed Constellation final | Lead synthesis |
| Non-completed Constellation final | Partial lead synthesis |
| Retained member slot | Member contribution · {frozen member identity} |

For member records in queued/running/failed/cancelled runs, add “Run incomplete.” Do not say “Partial contribution”: the member's saved text may be complete even when the run is not. Never manufacture a synthesis label or row when no final artifact exists.

Use “Earlier saved version” only when an authoritative newer record references this record. Use “Newer saved version” only for a record with an authoritative supersedes link. Do not use “Latest answer,” “Corrected answer,” “Approved,” or “Verified.” A new version does not replace the selected earlier record.

## Frozen provenance and repeated providers

Show the frozen provider identity when recorded; otherwise “Provider not recorded.” Never substitute the currently configured provider, model, or team name. If only a provider ID is recorded, display it as “Provider ID: {recorded ID}.” Do not infer a model.

Same-provider member rows must include their distinct recorded member identities, even when title and text match. Example with fictional recorded identities: “Member contribution · member-1 · Provider ID: codex” and “Member contribution · member-2 · Provider ID: codex.” Do not assign display ordinals from current sorting and mistake them for saved identities.

Row accessible name: “{display name}, {origin}, {recorded provider or Provider not recorded}, saved {date and time}, {version status if any}, {availability or Run incomplete if applicable}.” Use the same provenance in the inspector. If rows remain indistinguishable, append their artifact IDs to the accessible names; never guess a role from their order.

Details disclosure labels: “Saved at”, “Run ID”, “Artifact ID”, “SHA-256”, “Size (UTF-8 bytes)”, and “Provider ID” when applicable. Show full artifact/run IDs and digest inside Details. Do not expose private invocation/attempt IDs, paths, receipts, or storage keys. Digest matching describes record integrity only, not factual correctness.

## Unavailable and recovery states

| State | Row status | Inspector message | Action |
| --- | --- | --- | --- |
| Missing | Missing | This saved result is missing. Its record is still available. | Retry inspection |
| Corrupt | Integrity check failed | This result did not match its saved integrity record. Content is unavailable. | Retry inspection |
| Unreadable | Cannot read | Rivune could not read this saved result. | Retry inspection |
| Transport/read failure | Preserve authoritative row status | Could not open this saved result. Try again. | Retry inspection |
| Response schema/identity mismatch | Do not invent an availability value | Rivune could not match the response to the selected saved record. Refresh saved status and try again. | Refresh saved status |
| Selected record disappears or identity/digest changes | Return to list | The selected result is no longer available in saved status. | Existing list actions |
| Host disconnect | Clear inspected text | Connection to Rivune’s desktop host was lost. Reconnect, then refresh saved status. | Refresh saved status when the existing host action is available |

“Retry inspection” reads the same saved record again. Supporting text, where clarification is useful: “This retries opening the saved text. It does not send another AI request.” Pending action: “Opening saved result…” with duplicate activation disabled. Back and Close remain usable. Never label this action simply “Retry” beside run controls.

The schema/identity-mismatch message deliberately replaces the interaction proposal's “could not be verified” wording: it names the record-binding failure without suggesting factual review. No content, stale text, or Copy action appears in any unavailable or mismatched state.

## Exact text and clipboard

Text region accessible label: “Saved result text”. Actions: “Copy saved text” and “Select all”. Copy pending: “Copying…”. Success: “Saved text copied.” Failure: “Could not copy. Select the saved text and copy it manually.” If the existing fallback actually selects the text, use “Could not copy. The saved text is selected; copy it manually.” Selection alone never produces a copied-success message.

Copy/status messages belong to the captured selected record and disappear on leaving or changing selection. Show exact saved text as inert text. No “Open file,” “Preview website,” “Run,” “Edit,” “Save as,” or “Export” actions belong in this slice.

## Evidence and next dependency

Reviewed the two named specifications in full; checked this wording against their final/member slot rules, immutable versions, exact identity binding, unavailable-state mapping, and no-managed-files boundary. No product source, build, server, native app, provider, publication, or private QA record was touched. Only this report was written. No rendered or clipboard behavior was tested.

Next dependency: the sole app builder must confirm the independently accepted bridge supplies the exact saved identities, availability states, frozen provenance, and immutable supersession links. Then implement this copy in the Results pane and verify the interaction specification's focused rendered cases. The copy proposal does not waive that bridge acceptance or authorize replacing the existing transcript inspector.
