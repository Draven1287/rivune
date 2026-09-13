# Rivune product overview

One place to see what Rivune is meant to be, what actually exists in this
repository, and how far each capability has actually been proven. It is written
to be reconciled against source, not against memory.

This document is the source of record when the README, the marketing site, or a
verbal handoff disagree with each other.

## 1. What Rivune is

Rivune is an app for using your chosen AIs individually, or bringing them
together to do work in one shared conversation.

The problem: different AIs are good at different things, so real work means
switching apps, re-pasting context, re-explaining the same task, comparing
answers by hand, and carrying feedback between models yourself.

Rivune takes over that coordination. You give it a task and pick one AI or a
team. A lead AI plans the work, brings in other participants when useful,
divides and reviews the work, and returns one result — while you stay in a
single conversation and can inspect contributions, change direction, or stop.

Two principles constrain the design:

- **Agreement is not correctness.** For practical work the team must verify
  through evidence — tests, sources, a working preview — not consensus.
- **Nothing may be presented as working when it is not.** An unavailable
  capability is shown as unavailable rather than simulated. This already holds
  in the shipping source and must survive the platform change.

### Terminology

| Term | Meaning |
| --- | --- |
| **Rivune** | The app. |
| **Constellation Engine** | The whole experience: conversation, participants, collaboration, visual environment. |
| **Council** | Internal strategy for independent perspectives, debate, critique, synthesis. |
| **Swarm** | Internal strategy for dividing execution and coordinating review. |
| **Single AI** | Working with one provider directly. |

Council and Swarm are *internal* strategies. A user should be able to describe a
desired outcome without learning this vocabulary first.

**Terminology is currently inconsistent across the repo** — see §5.

### How it should feel

Premium, calm, chat-first. The conversation and the result are central; team
contributions, project files, previews, and review detail appear when useful and
otherwise stay out of the way. Dark graphite, strong typography, restrained
glass, subtle atmosphere — backgrounds must stay comfortable behind long answers
and code. Composer, model selection, Connections, history search, and recovery
must be easy to find. Preserving drafts, context, history, and work across
sessions is essential, not a later feature.

## 2. Maturity ladder

Every claim below is graded on one ladder. Mixing these rungs is how a project
starts believing its own marketing.

| Rung | Means |
| --- | --- |
| **Designed** | Specified in prose or UI only. No executing implementation. |
| **Simulated** | Runs, but on scripted or sample content, and is labeled as such. |
| **Browser-tested** | Real behavior, verified in a browser or local web preview. |
| **Working native** | Real behavior in the native app, covered by tests and CI. |
| **Released** | Signed, distributable, and actually available to users. |

## 3. What is in this repository

`Draven1287/rivune` contains exactly two implementations:

| Path | What it is | Rung |
| --- | --- | --- |
| `Rivune/` + `Rivune.xcodeproj` | SwiftUI macOS/iOS client. 29 Swift source files, ~4,800 lines of tests, CI builds and tests both targets on `macos-26`. | Working native |
| `pages-site/` | Marketing site and an interactive design preview. | Simulated / browser-tested |

`docs/ARCHITECTURE.md` describes the SwiftUI client in detail and is accurate to
that source. `scripts/` holds a deterministic source exporter and a macOS DMG
packaging path that fails closed without Developer ID signing and notarization.

### Capability status

Evidence is cited so each row can be re-checked rather than trusted.

| Capability | Rung | Evidence / caveat |
| --- | --- | --- |
| Single-provider chat via Codex CLI and Claude Code CLI | Working native | `TerminalAIService.swift`; `ProviderRegistry.swift` grants execution only through a reviewed `executionRoute`. |
| OpenAI / Anthropic API transports, compatible-endpoint API workspace | Working native | `APIRuntimeService.swift`, `UniversalAPI.swift`, `UniversalAPITests.swift`. |
| Multi-model collaboration: plan → contribute → review → integrate | Working native | `RivuneCollaborationRunner.swift` is a real phase machine with cancellation, per-phase failure, and retained partial contributions. **Two providers only** (Codex + Claude). |
| Local history, projects, search, snapshot recovery after interrupted writes | Working native | `RivuneStore.swift`, `ProjectWorkspace.swift`, revisioned primary/recovery snapshots. |
| Blind Evaluation Lab (Codex vs Claude vs Rivune, shuffled) | Working native | `EvaluationLab.swift`. A preference aid, not an objective judge. |
| Provider discovery that never launches a CLI; honest "Adapter needed" state | Working native | `ProviderRegistry.swift`; covered by `RivuneDeterministicTests.swift`. |
| Mac↔iPhone bridge over TLS-PSK, QR/manual pairing, credential rotation | Working native (partial) | `PeerBridge.swift`, `LocalWorkspaceServer.swift`. **Relay to a physical iPhone remains unverified** — the test device was offline during the recorded run. |
| Interactive app preview (`pages-site/app.html`) | Simulated | Labeled in-page: "Sample content, no AI requests." Drafts clear on reload. Correctly honest. |
| Constellation Engine as a named, shipped experience | Designed | Appears only in `pages-site/`. No occurrence anywhere in Swift source. |
| Council and Swarm as distinct selectable strategies | Designed | The site describes both; source implements one fixed workflow. |
| Auto strategy selection with validation before dispatch | Designed | `council-vs-swarm.html` states Auto is "the target default after both execution paths qualify." |
| Teams beyond two providers | Designed | The catalog models arbitrary participants; only Codex and Claude execute. |
| Project execution — building a site, running tests, working preview | Designed | Not implemented. README lists repository editing, shell commands, and autonomous tools as explicit non-features. |
| Tauri desktop for macOS / Windows / Linux | Designed | Named only on the marketing site. No Tauri code in this repository. |
| Any signed, downloadable build | **Not released** | `pages-site/release.json` is `{"status": "coming-soon"}`. Only a source preview (`v0.2.0-source-preview.4`) exists. |

## 4. What the handoff referenced and is not here

The following were cited as starting points. None exist in this repository, on
any branch, and `Draven1287/rivune` is the only repository this session can
reach:

- `rivune-tauri/` — the TypeScript/Vite workspace
- `rivune-tauri/docs/product-quality-direction.md`
- `rivune-tauri/docs/quiet-preview.md`
- `rivune-tauri/docs/claude-local-chat.md`
- `prototypes/ai-native-workspace/` — the React prototype
- The separate macOS preview
- The 12 September development checkpoint

That checkpoint is the sole reported evidence for real Claude replies and a
remembered follow-up in the local Vite preview. Because neither the code nor the
checkpoint is present, **the Tauri line of work is unverifiable from here** and
is recorded above as *Designed* — not as a judgment about the work, only about
what can be checked.

If that workspace lives in another repository or locally, it needs to be
attached before anyone can reconcile it. Until then, the SwiftUI client is the
only Rivune implementation with evidence behind it.

## 5. Reconciliation findings

Three real contradictions, in priority order.

### 5.1 The site and the app disagree about what Rivune is

`pages-site/download.html` describes the SwiftUI client as "the **legacy**
SwiftUI Mac code… not the forthcoming Tauri app," and
`council-vs-swarm.html` states "Connected AI features are not available yet" and
"Single-AI chat is being built first."

`README.md` describes that same client under **"Working now"**, with live Codex
and Claude runs, a seven-request collaboration workflow, and 67/67 passing tests.

Both are in `main`. The site is the newer commit. So the public position has
already re-baselined Rivune onto Tauri and demoted the only working
implementation to legacy — while the README still presents it as the product.
Whichever is true, one of them is currently misleading a reader.

**Decision needed:** is the SwiftUI client the product, a reference
implementation for the Tauri app, or deprecated? Everything downstream — the
README, the download page, the release gate, where effort goes — follows from
that answer and cannot be settled inside this document.

### 5.2 Three vocabularies for one idea

| Source | Vocabulary |
| --- | --- |
| Swift source | "Rivune mode"; `council` as an internal participant array; legacy `Together` values kept for serialization compatibility |
| Marketing site | "Constellation" used for *both* independent perspectives and divided work |
| This handoff | "Constellation Engine" as the whole experience, with **Council** and **Swarm** as its two internal strategies |

The handoff's model is the clearest and should win. The site's single
"Constellation" for both behaviors is the drift most worth correcting, since it
collapses the one distinction that matters. Serialized `Together` and `Alloy`
values must stay as compatibility identifiers — renaming them breaks saved
history.

### 5.3 Verification is dated and should be labeled as such

README's detailed results are headed "Historical verification — 2026-09-02" and
the README itself says they describe an earlier checkout and are "not acceptance
of the current source candidate." That honesty is correct and should be kept.
The risk is that a reader skims the "Working now" section and treats those
numbers as current. Re-running the documented checks against the exact extracted
archive is what converts them back into present-tense claims.

## 6. What to do next

Make the basic loop dependable before extending it: **connect an AI, send a
prompt, get a real answer, continue the conversation, keep the work, and recover
cleanly from an interruption.** Verified collaboration and real project
execution build on that, not beside it.

1. **Settle §5.1.** Pick the platform of record. This unblocks everything else.
2. **Attach or locate the Tauri workspace.** Nothing about it can be verified,
   preserved, or reconciled while it is outside this repository.
3. **Re-run the SwiftUI verification** against the current candidate and
   re-date it, so the README states present-tense facts.
4. **Align the site with the ladder in §2.** The app preview is already labeled
   honestly; the download and strategy pages should distinguish designed from
   working just as clearly.
5. **Adopt one vocabulary** (§5.2) across README, site, and new source, leaving
   legacy serialized identifiers untouched.
6. **Then extend:** real Council and Swarm as distinct validated strategies,
   participants beyond two providers, and evidence-based verification —
   tests, sources, a working preview — so that a result is trusted because it
   was checked, not because the models agreed.

## 7. Rules this project holds itself to

- An unavailable capability is displayed as unavailable, never simulated.
- A simulation is labeled a simulation, in the product and in the docs.
- Verification carries the date and the checkout it was performed against.
- Drafts, context, history, and completed work survive restarts and crashes.
- Crossing a provider boundary is disclosed before it happens.
- Model agreement is never offered as evidence of correctness.
