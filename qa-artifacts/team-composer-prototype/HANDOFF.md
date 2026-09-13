# Team composer prototype

Local interactive design prototype. Open http://127.0.0.1:4192/ while the local server is running, or open index.html directly. No dependencies or network resources. To restart: from this folder run `python3 -m http.server 4192 --bind 127.0.0.1`.

Scope is confined to this folder. Based on docs/AI_TEAM_DIRECTION.md and docs/AI_TEAM_IMPLEMENTATION_SLICE.md. No pages-site, native source, settings, history, real team storage, or provider configuration was modified. The sample catalog deliberately uses illustrative Atlas, Swift, and Lyra labels, not real adapter identifiers. Provider labels describe intended routes; no account discovery or execution occurred.

## Interactions

- One prompt box and compact Team control. Council selected; Auto/Swarm disabled. Future behaviors are explicitly described as design only.
- Three initial members, with two distinct entries on Codex CLI. Model/reasoning changes preserve member identity. Added members receive new demo IDs. Two-to-six member bounds are enforced.
- Per-member provider, model and reasoning controls. Unsupported options stay disabled; account defaults remain unresolved. Sample scenarios show signed-out providers and a removed model without silently replacing that selection.
- Choose a team member as orchestrator. They contribute an independent draft before a separate review step. Choose stop or ordered fallback; reorder eligible member IDs. Changing the orchestrator removes it from fallback candidates.
- Save updates in-memory reusable team only. Cancel discards member edits. The capability scenario is a global demo environment control; it is independent of saved-team edits.
- Simulate freezes a deep copy of the saved team and prompt. Editing the team during the simulation does not change the displayed task snapshot. Failure simulation follows only its frozen stop/order policy. Ordered fallback assumes successful independent drafts, explicitly labeled; it produces no fake answers. Reload resets everything.

## Minimal native UI handoff

Keep one composer with a Team summary control and inline selected orchestrator summary. Present a native sheet/popover using existing Rivune controls, not a browser shell replacement. Put the orchestrator picker and its independent-draft/review explanation first in the sheet, above member cards. Keep advanced fallback and prototype scenario controls collapsed below the members. Primary row labels use member names, provider, model, and reasoning; put technical IDs in an optional details disclosure. A member row binds internally to TeamMemberConfiguration.memberID, not transportID. Provider/model/effort pickers consume real adapter capability evidence; preserve unsupported saved selections visibly and block admission rather than substituting defaults. Use requestedModelID/requestedEffort nil for explicitly selected unresolved account defaults only.

Bind saved-team edits to a separate draft. Save validates and persists SavedTeamConfiguration; Cancel discards draft. Actual IDs must be UUIDs, unlike short demo IDs. Orchestrator binds to orchestratorMemberID. Ordered fallback stores unique non-orchestrator member IDs with accessible move-earlier/later actions. Preserve the configured conservative limits; display account usage as unknown unless actual evidence exists.

Submit creates immutable TeamRunConfiguration before run publication. Run disclosure reads that snapshot, never current composer state. Keep actual appointed fallback and reason in the execution receipt; original requested orchestrator remains inspectable. Recheck readiness at admission and actual fallback, while preserving frozen requested options. Enable Council only after runtime admission/recovery tests pass. Auto/Swarm remain unavailable. This prototype supplies no runtime or live acceptance evidence.

Keyboard: focus enters the close control; Tab/Shift-Tab wrap within editor; Escape/Cancel/Save return to Team. Every picker has a distinct member label. The body scrolls independently with persistent footer actions. Reopening begins at the top.

## Verification performed

JavaScript syntax check passed. Browser console returned no error entries. At 1280×900 and 390×844: no horizontal page overflow; mobile dialog also has no horizontal overflow. Inspected desktop and mobile screenshots. Tested:

1. Distinct same-route members and per-member model/reasoning edits.
2. Orchestrator selection, fallback reorder, and saved order excluding the orchestrator.
3. Frozen task content unchanged after editing model, effort, orchestrator and fallback in saved team.
4. Ordered fallback appointed Member 3 then Member 1 and stopped on exhaustion; a later task with stop policy stopped immediately.
5. Signed-out sample route blocks submission; removed sample model remains visibly unavailable; unsupported effort and adapter options disabled.
6. Add capped at six distinct member IDs; remove disabled at two; Cancel discards member edits.
7. Keyboard wrap in both directions, Escape focus return, and editor scroll reset.

Screenshots: composer-desktop.png, team-desktop.png, composer-mobile.png, team-mobile.png, fallback-mobile.png. Checks are UI simulations, not real provider execution, persistence/restart, VoiceOver, or native-app acceptance.

## Independent-review refinements

Moved orchestrator choice above member cards and placed advanced fallback plus sample scenario controls in secondary disclosures. Member IDs now appear only inside details; the primary provider label no longer says route. Concurrency wording is “Up to 2 calls at once, and 1 per provider connection.” Unknown account capacity appears once in the team limit note. These are simultaneous-call limits, not a two-call task budget. Keyboard containment includes disclosure summaries.
