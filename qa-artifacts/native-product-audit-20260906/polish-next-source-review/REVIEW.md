# Rivune four-file polish source review

Verdict: **bounded source acceptance; proceed to integration and rendered QA.** No actionable source defect was found in the four presentation changes. This does not approve installation or claim that the layouts have rendered correctly.

Reviewed `/private/tmp/rivune-polish-next/review/polish.patch` at SHA-256 `acfff3042c472bb47687e2e1a834070890917e8a612266aa91419c7b729c4b2a` against the installed-0620 final source. The four candidate hashes match the supplied manifest:

- `Rivune/Theme.swift`: `0d19c76135a24e76f1272973901428d4ab4295b5e561455c1d17da6c73cfa7a2`
- `Rivune/Components.swift`: `55c51ceee1796eca85731c5423e99e510613e75c6b6a4b4d151b1f021c86ae06`
- `Rivune/SidebarView.swift`: `6a9d28997354bd50d65348b1b4e6fa4a920f1da027393ff9fdbc563a572ac09f`
- `Rivune/ProjectWorkspace.swift`: `9b250637650ea4d989a2d7bb2b1e43376421d0a3e142768a07676dfacb7a0598`

The supplied unsigned Debug Mac compile passed. This reviewer did not build, launch, install, control UI, or call providers.

## Findings

No blocking correctness, security, or state-management issue was found.

- Council exposes one Team button, still opening the existing `RivuneTeamEditor`. A saved team reports its actual manager name and requested model/effort. Without a saved team, `Manager · Set in Team` accurately avoids claiming that the suggested runtime pair has already appointed a manager. `Team · 2` remains consistent with the two-member suggested/default runtime. Team edits continue to describe themselves as applying to new requests; existing run snapshots are untouched.
- Direct ChatGPT, Claude, and legacy Together retain the existing configuration menu and active-run lock. Council's separate Team editor remains editable for future requests, as before. Focus-loss, Escape dismissal, composer focus restoration, Send/Stop behavior, attachment selection, permissions, context accounting, voice input, and request admission code are unchanged.
- The selected-artifact card still reports the exact frozen file count and memory-off inclusion. Its remove action clears only the selected generated revision, preserving typed text and ordinary attachments. The 0620 mixed-file permission/footer and remove-all behavior are outside the changed region and remain byte-identical.
- Sidebar actions, account projection/footer, project actions, search behavior, conversation menus, background, width, and storage are unchanged. The visible-project extraction removes only the empty-section gap and reuses the same filter and four-project cap.
- Artifact parsing, preview, continuation, save, receipts, code/table rendering, and normal-answer parsing are unchanged. The new typography tokens only replace equivalent prose sizes and enlarge supporting artifact text.
- No auth, provider, filesystem, network, budget, schema, project-consent, or live-run capability changed.

## Rendered acceptance still required

At 920×680 and 1280×900, check Council with no saved team, ordinary saved labels, and long manager/model/effort labels; direct ChatGPT/Claude and legacy Together; Home and embedded composers; selected artifacts with long paths; mixed ordinary/generated files; an active project; and long plain and artifact answers. Confirm one reachable Team trigger, no Send clipping, keyboard Tab/Return/Escape, focus-loss dismissal, run locks, exact selection/draft preservation, and the account footer with four projects and long chat names.

The `ViewThatFits` fallback intentionally allows a long manager description to wrap. Whether that remains readable without making the composer too tall is a visual question, not established by the successful compile. Shared typography/context styles also require the normal iOS integration compile/render check even though the iOS toolbar branch did not change.
