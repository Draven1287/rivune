# Provider experience matrix — 2026-09-07

**Rivune currently connects to provider execution routes, not to the complete ChatGPT or Claude consumer applications.** The main workspace supports Codex CLI, Claude Code CLI, OpenAI Responses API and Anthropic Messages API. It preserves Rivune conversations and explicit context, but deliberately disables CLI tools and does not resume/import consumer conversations, memory, connectors or app-specific features. A similar chat experience is achievable; identical outputs or complete feature parity are not established.

This is a bounded, read-only source audit. No credential, authentication, provider configuration or user-history files were read; no provider or discovery command was invoked. No native UI, shared source or connection setting changed. The only execution was a synthetic Swift state-transition reproduction with inert storage/execution doubles.

## Source and installed identity

Read the authoritative `qa-artifacts/phone-execution-contract-20260907/build-0623/FINAL_ACCEPTANCE.md`, `source-manifest.json` and `installed-manifest.json`.

- Accepted installed review build: **2026090623**, binary SHA-256 `5880a08cb176567fcf2d8edd81ec7e37108d5073a90ef0f6d2ad551a299368cc`, local ad-hoc signature. This is the recorded installation identity, not a new binary/signature inspection in this audit.
- Its eight manifest-listed source/build/test files independently match their recorded hashes in `/private/tmp/rivune-phone-descriptor-0623.bXGPu5`.
- All **17 source files scoped by this audit** currently match that staging tree byte-for-byte. Both sets were copied into `qa-artifacts/provider-experience-audit-20260907/{current,installed0623source}/`. `source-manifest.json` gives every SHA-256 and capture time; `installed-source-verification.json` records the eight authoritative comparisons.
- The 0623 acceptance receipt reports 323 native tests, macOS/iOS compilation and bounded native inspection. It explicitly does **not** prove a live generation, resolved response model/billing metadata or physical iPhone session. These prior checks were not rerun here.

Line locations below refer to the captured current source. Old phone audit findings must not override 0623: it now admits and freezes explicit remote routes and labels requested CLI provenance honestly. Durable phone workspace resume remains a separate unfinished increment.

## Actual routes and user-facing meaning

| Route | Actual main-workspace execution | What the labels should mean |
| --- | --- | --- |
| `openai.codex-cli` / adapter `alloy.terminal.codex` | Codex `exec`, JSON output, ephemeral read-only temporary workspace. Explicit model and reasoning configuration when chosen. User config/rules and tools are disabled. | “ChatGPT · Codex CLI” means the provider-managed Codex sign-in is used. It is not the ChatGPT website, its conversation store, memory, browser tools or subscription feature bundle. |
| `anthropic.claude-code-cli` / adapter `alloy.terminal.claude` | Claude Code `-p`, text input/JSON result, no session persistence, empty tool list, safe mode, no Chrome/slash commands. Explicit model/effort when chosen. | “Claude · Claude Code CLI” means Claude Code supplies the response. Rivune does not embed the Claude consumer app or carry its saved projects/conversations into the request. |
| `openai.responses-api` / adapter `rivune.api.openai.responses` | Text POST to OpenAI Responses using separately configured API model/key. `store=false`, `stream=false`, 8,192 output-token request cap. CLI options are removed. | Label “OpenAI API”, configured model, and separate API billing. A consumer subscription/sign-in must not be presented as supplying this API route. |
| `anthropic.messages-api` / adapter `rivune.api.anthropic.messages` | Text POST to Anthropic Messages using separately configured model/key. A user message carries Rivune's prepared prompt, `stream=false`, 8,192 output-token request cap. CLI effort is not forwarded. | Label “Anthropic API”, configured model, provider-managed reasoning and separate billing. |
| Additional API workspace | `UniversalAPIWorkspaceView` has its **own store, conversations and runtime**. Presets include Gemini and xAI/Grok and supported API formats, not their consumer sign-ins. | An endpoint preset is not proof of usable account/model access, main-workspace Council membership or equivalent free consumer-account access. Clearly identify this separate API workspace until it is integrated. |
| Other CLI names/catalog entries | Catalog/discovery can describe installed tools; only reviewed registered adapters are executable. Main runtime registry contains the four routes above. | Do not call another detected CLI “connected”, Council-ready or tested merely because its executable is found. |

Source: `ProviderRegistry.swift:8–40,119–141`; `TerminalAIService.swift:573–677`; `APIRuntimeService.swift:266–291,392–418`; `UniversalAPI.swift:5–43`; `UniversalAPIView.swift:3–5,20–38` (view file read for the separate-surface distinction; the principal runtime file is in the hashed snapshot).

Settings explains CLI-first routing with checked API fallback and separate API billing (`SettingsView.swift:380–411`). `StartupReadinessPolicy.route` chooses CLI if ready, otherwise a checked API (`StartupReadiness.swift:30–35`). A task freezes that route, so a connection refresh cannot change transport midway. This is automatic route selection before a task, not a user choice between simultaneous ready CLI/API connections. No API cost or current external entitlement was researched or asserted by this source audit.

## Preserved and missing experience

| Experience | Preserved in this source / installed-source match | Limit or required follow-up |
| --- | --- | --- |
| CLI model and effort | Discovered capability metadata with labeled compiled fallbacks; selected values become CLI arguments. Model/effort controls lock while tasks run. | “Requested” is not “resolved”. No live account entitlement or quality proof. Model/effort defaults are global, not per-conversation. |
| API model and reasoning | Configured API model shown separately; CLI aliases/efforts cannot override it. | Reasoning is provider-managed; no reasoning override sent. Current result type does not retain actual API response-model identity. |
| Conversation continuity | Mac/native and browser submissions build role-aware history from up to eight recent turns within 12 KB. Current user instructions, previous user instructions, approved project instructions and untrusted reference data have distinct prompt channels. | This is a bounded history encoding inside a new request, not a resumed provider session. Earlier turns outside the bound are absent; a large newest turn can be shortened. No consumer memory/history import. |
| Switching providers in one conversation | Existing turns remain. New request selects an appropriate saved answer as context; ordinary draft text, attachments and selected artifact survive navigation. | **Unsent provider choice is lost on conversation navigation; reproduced below.** Legacy Together history can also choose a provider contribution instead of the combined answer when the next provider changes; add a contract test before promising identical seen-history continuity. |
| Draft configuration | Draft stores text, attachment records and selected-artifact snapshot; conversation stores its last sent mode. | Draft has no mode/model/effort/Team snapshot. Switching to another chat does not restore that chat's distinct model settings because those are global. Direct “Ask again” also uses current settings, not a saved exact original direct-run descriptor. |
| Explicit files/projects | Native gathers approved project instructions and selected documents; approval resets after send. Six-document and 20 KB document admission; project instructions also bounded. Selected generated files are a separately validated complete snapshot and can survive memory-off/navigation. | Plain text/code/JSON/CSV input, not arbitrary image/PDF/audio understanding. Prior attachments are not automatically reattached just because the old turn is remembered. Mac security-scoped bookmarks are local permissions, not portable provider access. |
| Generated deliverables | Shared rendering recognizes structured response artifacts for preview/save/continuation. | Models output file content; they are not executing an actual coding-agent project workflow. Invalid or truncated output is not a validated working project. Direct displayed answers are capped at 240,000 characters in the coordinator; no general unlimited artifact guarantee. |
| Council | Two to six configured CLI members, including multiple entries for a provider; requested models/efforts, chosen manager/fallbacks and per-route concurrency limits are recorded and admitted. Independent contributions followed by manager synthesis. | Team route validation currently allows Codex/Claude CLIs only. API presets and newly discovered CLIs do not automatically enter Council. Swarm remains unavailable. Review means model review/synthesis, not independent executable tests or guaranteed correctness. |
| Responsiveness and streaming | Status/phase updates, stop, errors, completed answer rendering, copy and repeat actions exist. Mac coordinator runs independently of selected conversation. | Provider streams are buffered into final results; no token-by-token prose stream. A phase label is not a live token stream. Human-rated latency/smoothness equivalence remains unverified. |
| Execution receipts | Optional Codex observer can produce bounded hash-based event/token metadata without retaining raw prompt/answer/diagnostics. | Observer defaults to nil; receipts are not automatically attached to every saved answer. Claude lacks equivalent receipt support here. Resolved model, provider request ID, tier and billing remain nil rather than invented. |
| Phone | 0623 has exact remote route admission, frozen execution route and requested CLI provenance. | Current Council/Team remote control, Mac history/project sync, durable reconnect/resume and physical-device acceptance remain incomplete. See phone audit plus 0623 corrections. |

Locations: `RivuneStore.swift:148–196,216,1467–1532,1634–1655,1730–1744,2408–2481`; `RivuneWebWorkspace.swift:160–221,227–280`; `Components.swift:1822–1837,2770–2915`; `ProjectWorkspace.swift:1073–1084`; `RivuneRunCoordinator.swift:198–273,380–388`; `TeamConfiguration.swift:11–13,17–26,36–73`; `Models.swift:818–838,1078–1159`; `TerminalAIService.swift:90–129,305–343,455–465,702–719`.

## Reproduced defect PE-01: an unsent provider change does not survive navigation (P1 routing UX)

Sequence: open a conversation last sent with ChatGPT; choose Claude for the next message; type a draft and select attachments/artifact; navigate to another conversation and back. The text and context remain, but the selected provider becomes ChatGPT again. Sending without noticing can use a different provider than the one the user chose for this draft.

Cause: `ComposerDraft` contains only text/attachments/artifact (`RivuneStore.swift:216`); `saveDraft` does not capture `mode` (`1523–1525`); `selectConversation` restores text then unconditionally assigns `conversation.mode` (`1499–1510`). A provider toggle itself changes `store.mode` without saving a conversation draft configuration (`Components.swift:1822–1825`).

Executed a minimal Swift harness containing the exact extracted `selectConversation`, `saveDraft` and `restoreDraft` methods, with inert storage/coordinator/value-type doubles. It did not construct the live store, access Keychain, read user data or call a provider. Compilation/execution exit 0 produced:

```
requestedProviderBeforeNavigation=claude
restoredProvider=chatGPT
draftPreserved=true
attachmentsPreserved=true
artifactPreserved=true
```

Evidence: `qa-artifacts/provider-experience-audit-20260907/draft-provider-reproduction.swift` and `.log`. This proves the source state transition, not a rendered native interaction.

Minimal patch suggestion: add an optional draft mode for backward decoding; apply the conversation/default fallback first, then a saved draft mode. Merely restoring mode inside `restoreDraft` is insufficient because the later assignment overwrites it. Persist explicit user provider changes as draft intent while excluding restoration transitions. Do not silently change global default mode, run a provider or erase context. Keep larger per-conversation model/Team configuration work a deliberate follow-up.

Acceptance: unsent ChatGPT→Claude and Claude→ChatGPT changes survive navigation and relaunch; old drafts without mode still fall back compatibly; empty drafts with explicit provider choice persist; source attachments/artifact/text remain identical; stale/unavailable chosen provider remains visibly unavailable rather than silently rerouted; restoring mode makes zero provider calls. Re-run actual store tests with isolated storage, then inspect the rendered composer.

## Additional precise corrections and checks

- **PE-02, naming (P2):** `providerConnectionSummary` returns “ChatGPT API” for `.openAIResponsesAPI` (`RivuneStore.swift:730–742`). Use “OpenAI API” for that transport, keep Codex CLI explicit for subscription access, and test both ready and unavailable labels. The full Settings billing explanation is good; the footer should carry the same distinction.
- **PE-03, requested-vs-resolved copy (P2):** the browser model-override branch still formats `Codex CLI · model · effort` and `Claude Code CLI · model · effort` without “requested” (`RivuneWebWorkspace.swift:210–218`), while the native/phone route text was corrected. Reuse the honest provenance formatter and assert all entry surfaces label requested parameters consistently. Do not treat account-default or display aliases as a measured resolved model.
- **Context contract check:** both legacy and role-aware history choose an answer according to the *next request's mode* (`RivuneStore.swift:2419–2428,2451–2454`). For an old Together turn with two drafts and one final combined answer, changing next provider can substitute a draft for the final answer the user read. Prefer a stable visible-answer selection per historical turn, or explicitly distinguish contribution history from final-answer history. Fixture should contain three clearly different texts and assert follow-up provider switches preserve the intended final answer. Current Council stores its final in `combinedAnswer`, so this concern is specifically the multi-answer legacy turn shape.

## Acceptance needed before promising a ChatGPT/Claude-quality experience

1. Recording-adapter tests for exact chosen route/model/effort and immutable configuration across refresh/navigation; no hidden API switch during a running task or false requested/resolved claims.
2. Real store draft/provider regression above plus intentional per-conversation model/Team behavior. Model changes in chat B must not surprise the user returning to chat A; choose and document the product contract.
3. Context fixtures for instructions across provider switches, large recent history, previous final-vs-contribution selection, memory off, explicit project approval, complete selected artifacts and no accidental prior-file reattachment.
4. Structured receipts for both providers, preserving actual metadata only when returned. Unknown cost/quota/model remains unknown. Add durable per-run requested descriptors before “repeat the same request” claims.
5. Bounded live synthetic comparisons on the exact model/effort and tools-off surface. Measure answer correctness, instruction retention, output usability, latency and recoverability. Test consumer-app-only features separately; a common model name cannot establish feature or answer equivalence.

No external entitlement/pricing facts were assumed. Browser/consumer histories, provider credentials and account configuration remained untouched. Route/core source equivalence is verified; live user-experience equivalence is not.
