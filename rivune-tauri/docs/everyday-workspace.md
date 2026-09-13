# Rivune: a workspace people return to

Rivune aims for the clarity, care, responsiveness, and accessibility people expect from excellent Apple, Tesla, OpenAI, and Anthropic products. That is a product quality target, not a claim of endorsement, equivalence, an award, or release readiness. The goal is a useful everyday AI workspace for people with different levels of experience.

## Product direction

Start something, continue a conversation, and find your work. Those three activities determine the main screen. Quiet remains the default: graphite surfaces, restrained cosmic atmosphere, and the silver R. Decoration must support reading and orientation. Avoid duplicate controls and permanent setup explanations. Show advanced actions when a person needs them.

Constellation Engine combines perspectives through Council and Swarm. Single AI is a direct conversation with one provider. Keep both discoverable in one AI menu; expose provider-specific model choices only when usable. Always distinguish connection checks, authored examples, simulated replies, and real execution.

## Simple outside, capable underneath

The interface should let someone express an intention without first understanding agents, CLIs, context windows, or orchestration. Put the common action first; reveal expert controls in context without removing user control. Use familiar language, stable placement, clear feedback, and a recoverable next step when work fails.

Rivune keeps its own identity: the silver orbital R, quiet cosmic depth, restrained materials, and perspectives coming together in useful answers. Apple and Tesla are quality references, while Rivune owns its typography, interaction patterns, and visual character.

For everyday readiness, evaluate these requirements rather than assuming visual polish proves them:

- A newcomer can start a supported conversation without coaching or technical vocabulary.
- A returning user can find prior work and resume it without losing their draft.
- Available, working, waiting, stopped, and failed states are distinguishable; unavailable integrations never look ready.
- Keyboard navigation, readable text, assistive technology, reduced motion, and smaller windows remain first-class paths.
- Interrupted work preserves what was entered and offers a clear recovery action. Offline behavior must state what remains available.
- Common actions stay visible and consistent; complex capabilities appear only where they help the current task.

These are acceptance criteria, not a claim that all capabilities or universal availability have been achieved.

## Implemented September 12, 2026

- One hierarchy for the sidebar, welcome, composer, and conversation. Shared layout styles are in `src/styles/everyday-workspace.css`.
- One AI experience menu, contextual team/model controls, and a Message options menu for templates, permissions, usage, dictation help, appearance, and simulation.
- A compact growing composer. Its status and keyboard hint distinguish sending from saving locally.
- Completed Claude replies render a safe subset of Markdown: paragraphs, emphasis, headings, lists, quotes, links, and code blocks with Copy. Raw HTML remains text and unsafe links are rejected. Nested lists, tables, and syntax highlighting are not implemented.
- Adjustable conversation text sizes, a latest-reply navigation button, answer-content search, and keyboard-accessible search actions. Command/Control-comma opens settings.
- Main sidebar prioritizes new conversations, search, projects, recent chats, and archives. Account and settings share one entry. Connections remain in the top menu and the contextual composer shortcut.

## Verified

Production build and all 67 automated tests pass, including six answer-format tests. Browser checks confirmed AI switching, smaller desktop layout at 760 by 720 without horizontal page overflow, answer-content search with Enter to open the result, Command-comma settings, default 17px and large 19px reply text, and latest-reply navigation. Existing real Claude replies retain their text and render emphasis correctly.

The updated shared UI was packaged and rendered in the Swift/AppKit Mac preview. All 20 bundled files match the web build and the development ad hoc signature verifies. Native browser storage preserved its existing authored Council example.

## Product gaps and next acceptance criteria

- Real Claude text chat is available only through the local Vite development adapter. The native host still needs the provider bridge. Other real provider adapters and live Council/Swarm remain unfinished.
- Native Liquid Glass, production account sign-in, installer distribution, notarization, and signed updates remain unfinished. Shared CSS materials do not constitute native Liquid Glass.
- Test with people unfamiliar with Rivune: can they connect a supported AI, send a first message, find a previous answer, and resume a project without coaching? Record completion, errors, and time before claiming usability gains.
- Extend accessibility verification beyond the current keyboard, text-size, reduced-motion, and reduced-transparency support. Check VoiceOver, contrast, zoom, focus restoration, and full keyboard operation across every menu.
- Test long answers, long-running work, failure recovery, and restoration before release. A beautiful starting screen must lead to useful, reliable results.
