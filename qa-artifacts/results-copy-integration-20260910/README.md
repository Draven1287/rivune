# Results copy integration proposal — September 10, 2026

Proposal only. Available/plainText saved results only. No production edits or runtime validation.

## Concrete findings

1. HostWorkspace uses `saved answer` / `saved partial answer` for Constellation final slots as well as direct slots. This is not a false durability claim, but obscures the origin when the pane calls the same slot Lead synthesis. The proposed patch changes only Constellation final-slot labels to `lead synthesis` / `partial lead synthesis`; direct labels stay unchanged. The existing Inspect prefix and captured dialog title continue working.
2. Constellation participantLabel omits memberID when saved team metadata exists. Two non-lead members from the same provider can therefore have identical contribution inspector names. The proposed patch appends the frozen `memberID` to the mapped label. The fallback already includes memberID and stays unchanged. Keep the host-shortened suffix; shortening is different from run incompleteness.

Exact existing source hashes are in source-hashes.json. copy-only-proposal.patch was generated against those bytes, with each replacement required to occur exactly once. Builder must recheck hashes before applying; do not overwrite newer source. No component code is duplicated here.

## Shared pane labels — retain existing dialog wording

| Element | Exact shared string |
| --- | --- |
| Text region accessible name | Saved result text |
| Copy action | Copy saved text |
| Pending copy | Copying… |
| Successful copy | Copied saved text. |
| Manual selection | Select all text |
| Failed copy | Clipboard access failed. Select the text below and copy it manually. |

The existing copy helper emits success only after awaited clipboard completion for the active captured generation. It suppresses completion after close/new selection and guards duplicate pending copy. No copy-success mismatch was found; no helper or dialog copy changes proposed. Pane adoption must preserve these semantics; selecting text alone is not successful copying. These exact existing strings supersede cosmetic variants in APP_RESULTS_COPY_20260910.md for this integration.

Pane origin lines: `Saved answer`, `Saved partial answer`, `Lead synthesis`, `Partial lead synthesis`, or `Member contribution · {frozen memberID}` with recorded provider identity alongside. Capitalization may follow sentence position; meanings stay identical. A lead member contribution is not the final synthesis. `Run incomplete` describes the run, not whether an individual retained contribution is shortened. Only authoritative truncation metadata permits `shortened by host`; do not infer it from run status or text length.

## Version and captured-text meaning

Existing dialog says exactly: `Saved text captured when you opened this result. Content is displayed as text and is not executed.` This accurately describes its capture behavior; retain it. It does not promise immutable artifact-version navigation. Do not add Earlier saved version or Newer saved version to this dialog: its props are text/label, not an artifact/supersession binding.

Pane may use `Earlier saved version` / `Newer saved version` only from accepted authoritative supersession metadata. Without it, show neither. Never infer versions from equal text, repeated titles, timestamps, current team settings, or the selected transcript answer. The pane and transcript dialog remain separate entry points until their exact mapping is accepted. No factual verification, consensus, file features, future unavailable-state messages, or redesigned controls are proposed.

## Evidence and dependency

Read current SavedResult.tsx, savedResultCopy.ts, Constellation.tsx and the HostWorkspace SavedResult caller; compared with the two durable-results specifications and APP_RESULTS_COPY_20260910.md. Validation here is source inspection and exact replacement matching only, not rendered, native, or clipboard acceptance.

Next: Review app UI progress owns the isolated pane proposal and should adopt the shared strings/provenance rules without modifying the existing dialog. Sole production builder decides whether to apply this two-label patch after checking source hashes and accepted identity contract. Focused acceptance: same-provider non-lead names are distinct, final and partial Constellation titles agree across surfaces, and copy success remains bound to the selected captured text. No source/build/server/provider/private-QA operations performed.
