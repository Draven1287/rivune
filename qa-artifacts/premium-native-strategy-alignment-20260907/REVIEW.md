# Premium native presentation alignment — one Rivune team

Date: 2026-09-07

## Product rule

Rivune presents one conversation, one reusable team, one composer, and one lead. Council and Swarm describe how that team worked on a request. They are not separate products and should not be mandatory choices before the user can type.

The target default is **Auto** after both Council and real Swarm qualify. Until then, the interface must show Council as the only available automatic team strategy and keep Auto and Swarm explicitly unavailable. The app must never label ordinary Council execution as Swarm or claim that a missing strategy ran.

## Current presentation conflicts

### P0 — Home makes execution strategies and individual providers look like peer products

`Rivune/WelcomeView.swift:42-45` places `modeChoices` directly above the only composer. `Rivune/WelcomeView.swift:83-100` renders Council, Swarm, ChatGPT, and Claude as equal segmented choices and labels the group `Choose your assistant`. This asks the user to choose Rivune's internal execution strategy before writing the request.

Target presentation:

- Keep one normal composer.
- Make the primary compact row read `Lead · <name>`, `Team · <count>`, and `Workflow · Council` while Council is the only qualified team strategy.
- When Auto is qualified, make it the default label: `Workflow · Auto`.
- Put optional manual choices inside the Workflow control: `Auto`, `Council`, and `Swarm`. Disabled choices include a short reason.
- Move ChatGPT-only and Claude-only execution into a secondary `Ask one member directly` action. They remain useful capabilities, but should not compete with Rivune as separate top-level products.
- Replace `Choose your assistant` with `Rivune team controls` for accessibility.

No display-only patch is supplied for this change because it depends on the lead decision contract and workflow availability state owned by the native implementation lane. Re-labeling the current mode binding alone would create a false Auto experience.

### P0 — The team editor is framed as Council setup

`Rivune/Components.swift:3542-3549` currently says `Council · independent answers, one reviewed result`. A reusable Rivune team must survive strategy changes and combined Council-to-Swarm sequences.

Use this copy:

- Title: `Your Rivune team`
- Subtitle: `One lead and the members available for this conversation`
- Lead helper: `The lead proposes a workflow, coordinates the team, and owns the final answer or deliverable.`
- Footer: `Team changes apply to new requests. Workflow can remain automatic or be overridden per request.`

Keep provider, model, effort, fallback, availability, and capacity controls in this sheet. Do not require the sheet before every prompt.

### P1 — Strategy evidence should appear after routing, with the lead's reason

`Rivune/WorkspaceView.swift:491-528` branches on saved modes and `Rivune/WorkspaceView.swift:887-956` presents the Council run record. Those internal branches can remain for compatibility, but the visible record should explain what the lead chose for this request.

Recommended completed-run header:

`Strategy · Council`  
`Chosen by <lead> because independent answers were useful for this request.`

Recommended automatic sequence header:

`Strategy · Council → Swarm`  
`<Lead> gathered independent approaches, then assigned bounded implementation work.`

The stored decision view should expose:

1. chosen strategy or ordered sequence;
2. concise lead-authored reason;
3. runtime validation result for capabilities, permissions, team capacity, and work budget;
4. any unsupported requested strategy and the supported alternative offered to the user;
5. the actual phase transition and final result owner.

Do not infer these fields from prompt keywords in presentation code.

### P1 — Unavailable workflow copy needs a reason and must avoid silent substitution

The accepted frozen `swarm-home-availability.patch` remains a valid interim honesty fix if the current Home strategy pill remains: it changes the disabled state from the misleading `Connection required` to `Not available in this build`.

For the target Workflow menu, use:

- `Auto — unavailable until Council and Swarm are ready`
- `Council — available`
- `Swarm — unavailable; real worker execution is not ready`

If a manual or lead-selected strategy fails runtime validation, use:

`Swarm is unavailable for this request because <validated reason>. Council is available. Choose Council or change the team/permissions.`

Never automatically run Council and label it Swarm. Never say Swarm ran when the result only contains text that describes worker tasks.

### P1 — Progress should describe team work, not a product switch

The existing final-answer-first layout and structured progress components should remain. Map progress copy to the routed strategy:

- Council: `Independent answers` → `Lead review` → `Final answer`
- Swarm: `Task plan` → `Assigned work` → `Review` → `Deliverable`
- Sequence: `Independent answers` → `Lead decision` → `Assigned work` → `Review` → `Final deliverable`

Keep detailed member IDs, fallback order, event logs, process limits, and diagnostics in the secondary decision record. The primary conversation should show the lead, active phase, concise reason, and final output.

## What remains correct

- The premium dark/space interior, selected backgrounds, reading surfaces, chat typography, and composer geometry remain accepted.
- In-app Settings, the bottom account footer, Rivune-owned menus, and native macOS dialogs remain the correct platform split.
- Frozen Council and Swarm evidence remains historical evidence of the strategy implemented in that build.
- Internal serialized `IntelligenceMode` cases may remain for history and routing compatibility. The presentation change does not require deleting them.
- The configured manager and the actual fallback synthesis lead can differ. The run record must identify the actual appointed lead rather than applying a blanket terminology replacement.
- Requested model and confirmed resolved model remain distinct; unknown resolved identity stays unknown.

## Acceptance criteria for the next native candidate

1. A fresh user can type and send through the single Rivune composer without first selecting Council or Swarm.
2. The composer exposes Lead, Team, and one compact Workflow control; detailed setup remains optional.
3. Auto is not enabled until both underlying execution paths and runtime validation are implemented.
4. Swarm remains visibly unavailable until real bounded worker execution exists.
5. Manual override wins when valid; invalid overrides produce a clear reason and no silent substitution.
6. A completed run shows the actual strategy, the lead's reason, validation outcome, phase transitions, and one lead-owned final answer or deliverable.
7. Direct ChatGPT or Claude use is still reachable as a secondary action without presenting separate products.
8. Existing backgrounds, composer draft behavior, account footer, Settings, native dialogs, and saved-history compatibility remain intact.

## Evidence boundary

This is a presentation and copy review of the clarified product contract in `docs/AI_TEAM_DIRECTION.md:6-12` and current Swift source. It does not claim Auto or Swarm implementation, does not change shared source, and does not add provider, account, deployment, or publication behavior. New rendered states remain pending a native candidate.
