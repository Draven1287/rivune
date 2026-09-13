# Rivune complete product experience

Source: user pasted feedback and screenshots at 20:51–20:52 on September 7. This extends the existing Tauri replacement objective; it is not a record of implemented features.

Original complete user request, reread in full: `/Users/Aaravshah/.codex/attachments/ffcb7110-bab9-4faf-980e-98e283f0fafb/pasted-text.txt`. The following coverage ledger prevents the later requirements being lost while immediate stability work proceeds. Assigned means requested from the task, not implemented or accepted.

## Full request coverage

September 8 final user clarification: Traycer is design, documentation and planning inspiration only. Literal Traycer account, task handoff, status or result integration is outside current scope. APP_GROUP_MILESTONE_20260908.md supersedes the earlier interpretation; prioritize the actual Rivune app.

| User requirement | Completion evidence required | Coordination lane |
| --- | --- | --- |
| Replace old Swift app with properly branded Tauri | Installed Rivune name/icon, correct executable, preserved data and rollback, verified launch | Runtime and packaging |
| Website to platform installer to usable app | Real platform artifact links and tested install/open flow; DMG only on macOS | Packaging and website |
| Cannot type/send; basic Hello must work | Usable composer, clear missing-connection action, actual provider response without false tool-use errors | Runtime |
| Categorized Settings | Keyboard-accessible categories with working settings, no long undifferentiated form | Frontend |
| Guided first launch | Explanation, provider detection/setup, lead selection, successful first conversation | Frontend and runtime |
| Single AI and Constellation | One selectable AI or one lead coordinating Council/Swarm strategies in the same conversation | Runtime and team engine |
| One final website/result from several AIs | Scoped parallel assignments, checked integration and one actual final deliverable | Team engine |
| CLI detection/install/sign-in guidance | Detection and authentication distinguished, supported install instructions/actions, manual path under Advanced | Runtime |
| API connection with protected keys | Host secret storage and redaction tests; real inference separately verified when a key and funded access are available | Runtime and independent review |
| Optional paid plans later | Real entitlement/payment design and implementation before presenting working purchases | Later commercial work; not dropped |
| Premium typography and smooth interaction | Approved galaxy identity, readable prose/code, responsive input and formatted output, rendered review | Frontend |
| Graphite color controls | Saved color choices with usable contrast and reset | Appearance slice |
| Animated Orbit and slow Galaxy panorama | Actual motion with reduced-motion/pause behavior and stable reading surfaces | Appearance slice |
| Custom image or bounded video background | Local selection, supported formats/size/duration, safe persistence, no repeated media copies | Appearance slice |
| Fast provider/model/reasoning/lead selection | Actual available choices, user-confirmed preferred lead and saved per-run settings | Runtime and frontend |
| Approval controls supported by each CLI | Adapter-enforced permissions with explicit unsupported states and tested boundaries | Provider capability review and runtime |
| Microphone dictation | Permission, start/stop, transcription into draft, error handling and processing disclosure | Voice slice |
| Menu-bar/tray access and Review | Correct platform icon and tested open/status behavior; New conversation preserves drafts; explicitly supplied Review text appends to a selected editable draft only after successful save, with no automatic dispatch | Packaging/platform and runtime slice |
| Folders, code, terminal and browser panels | Real project/file operations and supported host panels/tools with permissions | Workspace slice |
| Parallel agents and broad provider/model support | Real supported adapter capability matrix, concurrent execution bounds, actual model availability | Team engine and capability review |
| Learn from Traycer open source | Verified source/license and scope, attribution for reused code, no assumption unavailable backend is open | Capability/source review |

The current app is not complete merely because its shell, source tests or isolated native smoke pass. No row is implicitly marked done by this ledger. Keep these requirements within the overall objective; implement them in coordinated slices rather than silently omitting them.

## Naming decision

User subsequently confirmed keeping **Rivune** and instructed continuation of the complete implementation. The dictated word Reviewing in that confirmation refers to Rivune; it is not a requested new brand name.

User refined the selected feature name to **Constellation Engine — Your AI team, working together.** Explain independent perspectives and delegated work in plain language; Council and Swarm are internal strategies, not required jargon before sending a message. Single AI remains the other primary experience. Rivune remains the app name unless the user explicitly chooses a replacement; the user's question about Reviewing is not a confirmed rename.

The user explicitly requests implementation of the entire product experience in the actual app now. The document is an implementation contract, not a substitute for integration. Coordinate bounded file ownership and ship working integrated slices without marking the complete objective done early.

Routine implementation reports, test receipts, ownership questions and progress acknowledgments must go to **Audit Rivune project updates** (`01a07cde-764e-7551-92bc-b518107e2137`), which is the implementation coordinator. This task, **Review chat activity**, is reserved for the user's direct product conversation. Do not send routine task notifications here. Escalate here only a necessary user decision or a concrete result ready for the user's review; combine related items. No recurring automation is requested or needed for this routing change.

## Product flow

Website offers the appropriate platform installer: macOS DMG, Windows installer, Linux supported packages. GitHub Pages can present download links to release assets. The installed app uses the Rivune name and icon throughout, including Dock/taskbar and tray/menu bar. Replace the old Swift application after the existing data-preservation and installation gates; do not delete conversation data or rollback material.

First launch explains Rivune briefly, detects supported installed providers, guides missing installation/authentication, offers CLI or API connections, lets the user choose a lead, and reaches a usable composer. Detection must not claim authentication or working inference from executable presence. Manual executable paths belong in Advanced, not the normal setup path. Installation actions and account sign-in require deliberate user interaction; no surprise package installation.

Two primary experiences: Single AI and Constellation. The lead selects independent Council perspectives, scoped parallel Swarm workers, or a sequence of both. Preserve independence where required; review and integrate work into one answer or deliverable. Real worker ownership, limits, cancellation, recovery and attribution are required. Two unrelated generated websites do not satisfy one integrated website request.

## Interface

Settings uses clear categories: General, Connections, Models & Team, Permissions, Appearance, Voice, and About. Categories must not pretend unavailable capabilities work. Preserve a simple composer with quick provider/model/reasoning selection, readable formatted responses, projects/folders, code, artifacts, and later real terminal/browser panels.

Approved galaxy and Rivune identity remain. Use readable sans-serif for prose and restrained monospace for code/technical accents. Graphite supports colors. Orbit must depict a larger central lead AI and smaller AI members following complete 360-degree orbital paths; do not crop the orbit to a half-circle. Give it visual depth and deliberate motion while keeping the composer and responses readable. An aesthetic orbit must not masquerade as live worker status; any live state must come from actual engine events. Galaxy can pan slowly. Respect reduced motion, pause when hidden, and keep reading surfaces steady. Custom local image/video backgrounds need explicit size/duration/type limits; do not duplicate large media across QA copies.

Voice means microphone dictation with explicit permission and a truthful local/provider processing boundary. Tray/menu bar presence should use platform-supported behavior, not copied macOS-only controls on all systems.

## Provider and permission contract

Discover model and reasoning choices from supported provider interfaces and actual account capabilities. User preference determines the lead; there is no invented universal smartest-model score. User examples of model names are preferences to resolve against availability, not hard-coded universal catalogs.

CLI capabilities must be verified independently of the Codex/Claude desktop UI. Approval modes may only be exposed when the adapter can enforce their semantics. Never map an unsupported mode to unrestricted execution. Browser, terminal, remote control and subagent capabilities require real implementation, not a claim that desktop parity follows from CLI presence.

API key entry must use a host-owned secret store appropriate to each OS. Do not write keys to plain JSON, localStorage, renderer snapshots, logs, crash evidence, or artifacts. Test failure paths and secret redaction with fake credentials before any real provider call. User has no API key and retains the $0 development constraint; paid live verification is not authorized.

Paid plans are a later commercial milestone, not a fake payment step in current onboarding. Preserve the whole product scope without gating basic usability behind unfinished billing.

## Work and acceptance

1. Fix provider greeting/protocol failures and make setup usable; package correct name/icon.
2. Integrate onboarding/settings and current migration preservation fixes into the canonical app with explicit file ownership.
3. Implement unified Team execution with actual Council and Swarm behavior and one checked final output.
4. Verify permission adapters, secret storage, model discovery and cross-platform packaging.
5. Add appearance, voice and workspace extensions in bounded integrated slices.

One shared Rust target directory only. Small manifests and receipts rather than duplicate compiled targets. Keep user source/history and previous installed app safe until the verified replacement. Test the actual combined app, not only isolated frontend fixtures.
