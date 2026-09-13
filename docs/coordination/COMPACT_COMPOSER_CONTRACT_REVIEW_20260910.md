# Compact composer contract review — September 10, 2026

Scope: read-only contract review for product slice 3 in
`NEXT_PRODUCT_SLICES_20260910.md`. This reviews the current mounted React
composer and the canonical Tauri host. It does not implement the compact
control, alter a provider/model/strategy, run a provider, build or launch the
app, or dispatch work.

## Verdict

The two stacked composer disclosures can become one compact **Single AI /
Constellation** control without changing the Rust admission schema. The current
host already has the necessary durable state:

- `Conversation.richDraft.selection` is the optional pinned Single AI route;
- `Conversation.richDraft.team` is the saved Constellation team;
- `WorkspaceSnapshot.selectedProviderID` is the workspace default inherited
  only when the conversation selection is null;
- a team stores its ordered members and `leadIndex`; and
- every admitted run stores the frozen mode, provider and team separately from
  later composer state.

The consolidation must be a view and controller refactor, not a new execution
mode. Keep the current Council-only boundary. Do not add Auto, Swarm, named
model or reasoning choices.

## Current source contract

### Why the current composer feels duplicated

`HostWorkspace.tsx:156-160` mounts `ConstellationConfiguration` and
`ConversationConnection` as two consecutive `<details>` blocks above the same
message field, then prints a third provider summary in the action row.

- `Constellation.tsx:23-35` owns Direct/Constellation choice, member selection,
  lead selection and the save-without-send disclosure.
- `ConversationConnection.tsx:14-23` owns workspace-default versus pinned
  Single AI routing and repeats another save-without-send disclosure.
- `HostWorkspace.tsx:105,160` derives the action-row provider from the saved
  lead/pin or workspace default, but it does not identify the mode, member
  count, or whether that route is inherited.

One disclosure may replace those three presentations. The underlying saved
state and controller operations should remain authoritative.

### Authoritative resting summary

The compact summary must be derived from the latest validated host snapshot,
not from unsaved checkbox/select state inside the open sheet.

| Displayed value | Authoritative source | Presentation-only source | Do not use |
| --- | --- | --- | --- |
| Single AI versus Constellation | `conversation.richDraft.team`: null means Single AI; non-null means Constellation | none | local sheet mode before a durable save |
| Single AI connection | `richDraft.selection.providerID` when pinned; otherwise current `snapshot.selectedProviderID` | current catalog label for the authoritative provider ID, falling back to the ID | a pending `<select>` choice or an old label |
| Inherited versus pinned | `richDraft.selection === null` means workspace default; non-null means pinned | copy such as “Workspace default” or “Pinned” inside the sheet | presence of a catalog entry alone |
| Constellation member count | `richDraft.team.members.length` | none | count of locally checked, unsaved boxes |
| Constellation lead | `richDraft.team.members[richDraft.team.leadIndex].providerID` | current catalog label, falling back to the saved ID | the sheet's unsaved `lead` state |
| Model/reasoning | every currently supported selection is saved with `modelID:null`, `effortID:null`; host admission resolves both effective IDs to null | the exact text below | `HostProviderConfig.model`, guessed catalog defaults, product names or account entitlements |

Required resting labels:

- `Single AI · [connection]`
- `Constellation · [N] members · Lead: [connection]`

The open sheet should additionally distinguish `Workspace default` from
`Pinned to this conversation`. A catalog label is useful human-readable copy,
but the provider ID remains the saved identity and should be the fallback if the
catalog entry disappears.

### Honest provider-default wording

Use exactly:

> Provider default · exact model not reported

This is supported by both sides of the contract:

- `workspaceAdapter.ts:9-16,18-28,64-108` permits no model or effort override in
  the current catalog contract.
- `teamConfiguration.ts:13-18` constructs every supported team member with null
  model and effort IDs.
- `host.rs:3013-3050` resolves current selections to
  `providerManagedDefault`, sets the executable provider's model to null and
  records no effective model or effort ID.

Do not shorten this to a model name. Do not say “automatic best model,”
“latest,” “GPT,” “Claude,” or any exact reasoning level unless a future admitted
run reports that exact identity through a separately accepted contract.

### Availability is not verified readiness

Avoid the label **ready connections** in this control. The current route filter
in `teamConfiguration.ts:4-10` accepts a supported, installed,
provider-default-capable route unless authentication is explicitly
`authNeeded` or its response test explicitly failed. Therefore `unknown`
authentication and `notTested` response state remain admissible to the form.

The host capability in `host.rs:3675-3704` likewise counts supported, installed,
provider-default routes; it does not prove authentication or a successful
response. Call these **available connections** or **currently admissible
connections**. Keep the existing Settings copy that installation and
availability do not verify sign-in or a response.

## Save-without-send contract

Changing mode, member, lead, pin, or default-following behavior is a rich-draft
save, never a run submission.

Current guarantees to preserve:

1. `workspaceController.ts:150-170` creates one mutation identity, preserves the
   current draft and attachments, uses the exact expected rich-draft revision,
   and accepts only a matching durable receipt.
2. `workspaceController.ts:264-294` blocks configuration changes while a run or
   submission is unresolved, revalidates current routes/catalog revisions, and
   calls the save path with `forSend=false`.
3. `host.rs:4549-4651` validates team structure, mutation reuse, revision CAS,
   current route enforceability and active-run exclusion.
4. `host.rs:4675-4710` durably stores the new revision, unchanged draft,
   attachment IDs, selection and team as one mutation.
5. Existing tests confirm that team save and conversation pin/follow-default
   preserve the draft and make no submit call
   (`hostController.test.mjs:219-245,262` and
   `hostRenderer.test.tsx:556-565`).

While the sheet is dirty, its choices are a **draft configuration**. They may be
previewed inside the sheet with an explicit “Not saved” state, but must not alter
the resting summary. Close/Escape must discard or retain that local editing
state without implying it is active. The resting summary changes only after the
matching durable receipt and refreshed snapshot.

Preserve the existing external-change behavior from `Constellation.tsx:10-19,
26-33`: if the saved revision/team changes while the sheet has local edits,
block overwrite and require an explicit **Load saved configuration** or **Keep
my choices** decision before Save.

## Mode-switch issue the consolidated control must resolve

Current `configureTeam(..., null)` keeps `c.richDraft.selection`
(`workspaceController.ts:285-295`). Because a Constellation team's selection is
required to equal its lead (`contracts.ts:68-83`; `host.rs:2930-2960`), **Use
direct chat currently turns the former lead into the pinned Single AI route**.
It does not automatically follow the workspace default.

That behavior is safe but must not be hidden. The compact sheet should make the
Single AI target explicit when changing modes:

- `Workspace default: [connection]`, saved as `team:null, selection:null`; or
- `Pin to: [connection]`, saved as `team:null, selection:{provider-default
  selection}`.

Do not implement a mode switch as `configureTeam(null)` followed by a second
connection save. Two saves can leave an unintended former-lead pin if the second
save fails. Add one controller-level configuration action that reuses the
existing `save(...)` path and writes the chosen `selection` and `team` in one
CAS mutation. This is a frontend/controller change only; `SaveRichDraftRequest`
already supports the atomic pair (`tauriAdapter.ts:15-23`; `host.rs:685-717`).

The reverse switch is already atomic: a Constellation save writes the selected
team and its lead selection together.

## Team and lead invariants

The consolidated sheet must preserve all of these before enabling Save:

- Constellation host capability is reported `available`.
- 2–6 distinct member selections.
- Every selected provider is in the current admissible route set.
- `leadIndex` is within the members array and the chosen lead is one of them.
- The top-level selection exactly equals the team member at `leadIndex`.
- Every member carries the current catalog revision.
- Current behavior permits provider-default selections only: null model and
  effort IDs.
- A stale catalog, removed route, explicitly required authentication, failed
  response test, duplicate member or unknown lead blocks Save/Send rather than
  silently substituting a connection.

The React checks are in `teamConfiguration.ts:13-28`; the public snapshot parser
fails closed in `contracts.ts:61-83`; the command bridge repeats the constraints
in `tauriAdapter.ts:63-90`; and the host enforces them again in
`host.rs:2911-2960,3013-3050`.

If Constellation is unavailable, keep Single AI usable and show **Review
connections**. Do not clear an already saved unavailable team automatically;
show its saved provider IDs, require review, and block Send until the user
explicitly saves a current configuration.

## Send, freeze, retry and cancellation invariants

The compact control configures **future sends only**. It must never become the
source of truth for an existing run.

### Admission

- On Send, `workspaceController.ts:296-323` first saves the exact current draft
  and execution configuration, validates the saved team/default route, derives
  mode from the refreshed saved team, writes the durable request identity, then
  submits the request with that saved rich-draft revision.
- `host.rs:4952-5009,5029-5091` rejects a mode/team mismatch, stale route,
  prompt/revision mismatch or unavailable team member and copies the saved team
  into `AdmittedRequest`.
- Past-run labels must always use `run.admitted.team`, `run.admitted.provider`
  and the recorded request identity—not the current composer summary. Later
  composer changes affect only later requests.

### Retry and cancellation

- Leave **Retry failed step**, **Check retry status**, **Cancel**, and **Cancel
  recovery** with the run card. Do not move them into the compact composer
  sheet.
- Retry must use the exact saved triple `requestID + failedInvocationID +
  failedAttemptID`; the public parser requires both failure IDs together for a
  Constellation run (`contracts.ts:120-135`).
- `workspaceController.ts:326-361` refuses stale or mismatched retry identities,
  never replays the prompt, and requires changed saved state before claiming an
  accepted retry.
- `workspaceController.ts:363-385` allows cancellation only for the exact active
  run or its failed recovery and cross-checks the pending request/retry identity.
  `host.rs:5635-5706` cancels or retries that saved Constellation session.
- A configuration edit must remain disabled while any run, pending submission,
  or retry is active. It must not clear retained member results, run recovery
  state, or saved-result actions after a terminal partial failure.

## Actionable integration shape

1. Replace the two mounted disclosures with one `ComposerExecutionControl`.
2. Give it the current `HostSnapshot`, `ModelCatalog`, conversation ID and the
   existing disabled predicate. Derive its resting summary with a pure helper
   from saved snapshot data only.
3. Use one sheet/disclosure with two sections:
   - **Single AI:** workspace default or explicit pin; and
   - **Constellation:** 2–6 members and one lead.
4. Add one controller action that accepts the complete intended pair
   `{selection, team}` and calls the existing revision-checked `save(...)` once.
   Keep current validation helpers; do not bypass them or write host state from
   React.
5. After a matching durable receipt and refresh, close the sheet and return
   focus to its summary button. On rejection/uncertainty, leave the draft and
   local choices visible, keep Send blocked as today, and expose existing
   conflict/recovery actions.
6. Keep one persistent sublabel in the sheet: **Provider default · exact model
   not reported**. Do not add a model menu.
7. Keep run status, retry, cancellation and saved-result controls in the
   transcript. They are bound to frozen admitted runs, not to the composer.

## Acceptance checklist for the builder

- Resting summaries cover inherited Single AI, pinned Single AI and saved
  Constellation with member count and lead.
- Unsaved sheet edits never change the resting summary and never call Submit.
- One Save preserves the exact draft and attachments and changes selection/team
  atomically; a failed or uncertain save cannot leave a misleading summary.
- Switching Constellation to Single AI explicitly tests both follow-default and
  former-lead/other-route pin behavior.
- External revision/catalog/team changes trigger explicit conflict resolution.
- Constellation rejects fewer than 2, more than 6, duplicates, missing lead,
  stale catalog and unavailable member routes.
- Unknown authentication/not-tested response is not described as verified or
  ready; actual `authNeeded` and failed response routes remain unavailable.
- Send uses the durably saved mode/team and exact revision once.
- A past run keeps its admitted lead/team labels after later composer edits.
- Partial failure retains member results; retry sends the exact three saved IDs;
  cancellation targets the exact run; no prompt replay occurs.
- Keyboard: summary is reachable and operable, Escape closes and returns focus,
  focus order reaches mode, route/members, lead, Review connections, Save and
  Cancel without a trap.
- At 320px and 390px, the closed control remains one compact row; the open sheet
  stays within the viewport, does not cover the message field, and does not
  force the transcript beneath a permanently expanded configuration panel.

## Evidence boundary

This review is based on current source and existing synthetic/controller
acceptance tests. It establishes the contract and a bounded integration path.
It does not establish rendered approval, native inclusion, provider-backed
execution, restart behavior of the future compact control, or release readiness.
