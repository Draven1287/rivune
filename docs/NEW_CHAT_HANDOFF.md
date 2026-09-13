> Current status — September 6, 2026: the later user instructions authorize native-app implementation and review. The September 4 pause below is historical. The product is the native Mac app; the public website presents/downloads it. See [current account/build review](ACCOUNT_LIFECYCLE_0606.md) for installed0606 and fixture-tested lifecycle fixes; [0605 review](LOCAL_REVIEW_2026090605.md) preserves earlier rendered evidence. Live auth, deletion/export, signed updates and remaining visual checks are incomplete. No public release or account activation is authorized by this note.

# Rivune reset — start the next chat here

The user paused implementation on September 4, 2026 because incremental changes were not producing the intended product or visual design. This is a planning/design reset, not authorization to delete the existing project or immediately rewrite it.

Read `docs/RIVUNE_RESET_PLAN.md` first. It is a proposed plan awaiting user approval, not a completed implementation spec.

## Product

Rivune is a premium native workspace where users connect their chosen supported AI CLI tools or API accounts. Models form a team, choose appropriate responsibilities, divide real projects, challenge plans, execute work, check each other's concrete outputs, revise, verify, and deliver one clear result. Users can also ask one provider directly. Team work and evidence belong in an optional side panel, not giant permanent transcript cards.

Important examples: build and run a website; fix an existing project; judge business ideas honestly without constantly inventing supposedly better alternatives. Multi-model agreement is not proof, and “best” must not become an unsupported guarantee.

## Start with design

Show one recommended high-fidelity direction using realistic content: empty chat, in-progress team, completed answer, project files/diff/preview, provider connection, Settings, and errors. Match a website concept to the actual approved app. Get visual approval before resuming production implementation.

Keep Rivune's application logo everywhere. Use calm graphite, native behavior, strong readable typography, controlled glass, and a small purple accent. The provisional layout is chat-first with an optional project/review panel; the user may prefer project-first. Avoid a vendor-specific top tab bar, generic sparkle branding, dense process dashboards, and unsupported controls.

## Technical facts and gaps

- `Rivune/Models.swift` hard-codes model choices; GPT-6 Astra is not in the current Codex picker. Official docs list `gpt-6-astra`, but account access was not live-tested in the reset pass. Use runtime/provider discovery with a safe stale-cache fallback, not another permanent hand-maintained enum.
- `Rivune/ProviderRegistry.swift` provides a useful exact-route adapter boundary; currently included executable implementations are Codex and Claude Code.
- `Rivune/RivuneCollaborationRunner.swift` still assigns named Codex/Claude routes. Configurable catalog data does not make arbitrary teams operational.
- `Rivune/TerminalAIService.swift` disables tool surfaces and works in text-only/read-only mode. Real file editing, tools, isolated parallel work, tests, and previews are a necessary next product layer, not already working because a CLI is present.
- Preserve useful native UI, persistence/migration, evaluation, and security foundations. Review before reusing; do not assume a full rewrite is necessary.
- `website` is a separate Sites-managed project with a prewritten demo. No public API keys or private account data belong there. Public DMG and source ZIP are distinct deliverables; the installer remains behind signing/notarization verification.

## Boundaries

Repository: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI`.

The root checkout contains substantial untracked work; website has its own Git state. Preserve both. Earlier edits and test reports predate this planning freeze; inspect the current tree before claiming any build or installed app contains them. Do not pick up an interrupted packaging/install/deploy step automatically.

No code edits, model calls, test builds, installs, or deployments were performed during the reset planning pass. Only planning documents were added. The user's high usage tolerance supports a quality-first future preset, but this pause does not request live account consumption. Public users need configurable usage controls. Broad project goals do not authorize unrequested publishing, purchases, destructive actions, or secret access.

Use one personal/public codebase with private configuration, not copied forks. “Any AI” means extensible supported integrations; never promise automatic safe operation of every arbitrary CLI or consumer-app feature.

## First message to use

> Read `docs/RIVUNE_RESET_PLAN.md` and `docs/NEW_CHAT_HANDOFF.md`. We are resetting Rivune around a premium native multi-AI workspace, not continuing the previous patch list. First help me approve the complete product and screen designs: chat, AI team panel, real coding preview, connections, Settings, and matching website. Preserve existing work. Do not implement, install, publish, or run live model tests until we agree on that direction. After visual approval, follow the phased plan and prove one real website build end to end before expanding.
