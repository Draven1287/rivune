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

As of the 2026-09-13 source sync (`0228885`), the repository holds several
distinct implementations. Identify the right one before changing anything.

| Path | What it is | Files | Rung |
| --- | --- | --- | --- |
| `rivune-tauri/` | Shared TypeScript/Vite workspace; Tauri is the cross-platform desktop direction. **The README names this the current workspace.** | 166 | Browser-tested / designed |
| `Rivune/` + `Rivune.xcodeproj` | SwiftUI macOS/iOS client, retained as a separate implementation. | 65 | Working native |
| `rivune-tauri/macos-preview/` | Swift-wrapped WebKit shell around the same frontend. Own bundle ID and data store; ad hoc signed. | 16 | Working native (preview) |
| `prototypes/ai-native-workspace/` | React prototype. Its desktop build references a historical Tauri runtime under `qa-artifacts/`. | 109 | Prototype |
| `website/` | Marketing site plus `/workspace`, a browser client for the local Mac app. | 69 | Browser-tested |
| `pages-site/` | Older marketing site. Still present and still calls the SwiftUI client "legacy". | 26 | Superseded — see §5.1 |
| `qa-artifacts/` | Historical source and captured evidence. | 2,503 | Archive |

### Capability status

Evidence is cited so each row can be re-checked rather than trusted.

**The central fact:** real multi-model orchestration runs only in the Swift
client; real provider chat in the new workspace runs only in a browser dev
server. Neither line currently has both. That gap is the project's actual
position, and closing it is what §6 is about.

| Capability | Rung | Evidence / caveat |
| --- | --- | --- |
| Claude subscription chat — real streamed replies, model and usage reported | Browser-tested | `rivune-tauri/docs/claude-local-chat.md`. Verified 2026-09-12: two live account requests, a remembered `observatory` follow-up. **Vite dev server on loopback 1420 only** — not a native bridge, not packaged, not an API-key path. |
| Continuation that sends only completed *real* exchanges, never simulated ones | Browser-tested | Same adapter. Rebuilds explicit history each request; does not resume a CLI session. |
| Hardened local adapter: allowlisted env, no tools/MCP/skills, temp cwd, 3-min deadline, single global request | Browser-tested | Same doc. Refuses detected managed/enterprise policy rather than bypassing it. |
| Council example in the shared workspace | Simulated | `rivune-tauri/docs/quiet-preview.md`. Authored, streams locally, explicitly labeled; no provider is represented as having answered. |
| Council / Swarm as live orchestration in the new workspace | Designed | `CONSTELLATION_ENGINE_DIRECTION.md` defines them; the checkpoint lists live orchestration as future work. |
| Packaged desktop provider execution (Tauri) | Designed | Listed as remaining in the 2026-09-12 checkpoint. |
| Multi-model collaboration: plan → contribute → review → integrate | Working native (Swift only) | `RivuneCollaborationRunner.swift` is a real phase machine with cancellation, per-phase failure, and retained partial contributions. **Two providers only** (Codex + Claude). |
| Single-provider chat via Codex CLI and Claude Code CLI | Working native (Swift only) | `TerminalAIService.swift`; `ProviderRegistry.swift` grants execution only through a reviewed `executionRoute`. |
| OpenAI / Anthropic API transports, compatible-endpoint API workspace | Working native (Swift only) | `APIRuntimeService.swift`, `UniversalAPI.swift`. |
| Local history, projects, search, snapshot recovery | Working native (Swift) / browser-tested (Tauri) | `RivuneStore.swift`; `rivune-tauri/src/services/storage/`, covered by `storage.test.mjs`. |
| Blind Evaluation Lab (Codex vs Claude vs Rivune) | Working native (Swift only) | `EvaluationLab.swift`. A preference aid, not an objective judge. |
| Mac↔iPhone bridge over TLS-PSK | Working native (partial) | `PeerBridge.swift`. **Relay to a physical iPhone remains unverified** — the test device was offline during the recorded run. |
| Windows / Linux packaging | Designed | The checkpoint states it was not executed. |
| Any signed, downloadable build | **Not released** | `pages-site/release.json` is `coming-soon`. Only a source preview exists; `macos-preview` is ad hoc signed and explicitly not for publication. |

## 4. Verification performed for this document

Run here on 2026-09-13 against merge head, not quoted from a checkpoint:

- `npm ci && npm test` in `rivune-tauri/` → **88/88 pass**, three consecutive
  runs, ~800 ms each. All fixtures; no model or paid API calls.
- `npm run typecheck` → clean.
- `python3 scripts/test_source_export.py` → 20/20.
- Swift CI (`build-and-test`) → green on `macos-26` under Xcode 26.6: export
  test, `Rivune Mac` build, `Rivune Mac` tests, `Rivune iOS` build.

A cold-start defect surfaced during that verification and is fixed in this
change. The **first** `npm test` after `npm ci` took 3 m 2 s and failed 2 of 88.
It was not a timing-sensitive assertion, as it first appeared, but a race with a
real consequence, in `rivune-tauri/tests/local-claude.test.mjs`:

- The concurrency test waited for the spawned child by draining a fixed **100
  microtask ticks**. Spawning awaits `locate`, `readiness` and a real `mkdtemp`,
  so on a cold machine those ticks drain long before the filesystem replies and
  `assert.ok(child)` fails.
- That failure abandoned the in-flight handler, which holds the **module-global
  single-flight lock** (`scripts/local-claude.mjs:11`). The next test then got
  `409 Busy` where it expected `503 Unready` — a second, purely cascading failure.
- The abandoned handler also kept its **three-minute deadline timer** alive, which
  is what held the run open for 180 s.

The fix bounds the wait by wall-clock instead of tick count, and ends the request
in a `finally` so a failure cannot leak the lock. Verified: cold runs now pass
88/88 in about 2 s instead of failing 2 of 88 in 3 m 2 s, including under 12x CPU
oversubscription. A genuinely missing child still fails — confirmed by injecting
one — now in 10 s, reporting only the test that actually broke instead of two.

## 5. Reconciliation findings

### 5.1 The platform question is now answered — the artifacts have not caught up

The README added by `0228885` states it plainly: `rivune-tauri/` is the current
shared workspace, Tauri is the cross-platform desktop direction, and the SwiftUI
client is "retained as a separate implementation." That resolves the question
this document previously recorded as open.

What has not caught up:

- **Two marketing sites now coexist.** `website/` and `pages-site/` are both
  present. `pages-site/` still calls the SwiftUI client "legacy… not the
  forthcoming Tauri app" and still gates downloads on `release.json`. One of
  them should be retired or clearly marked historical.
- **The README describes both implementations in the present tense**, with the
  Swift client's "Working now" section intact below the new preamble. That
  section is accurate about the Swift app — but a reader arriving at a
  Tauri-first project will read Swift capabilities as the product's.

Neither is a code defect. Both are the kind of drift this document exists to
catch.

### 5.2 Vocabulary now has one authority, and it should be used

`rivune-tauri/CONSTELLATION_ENGINE_DIRECTION.md` settles it: Constellation
Engine is the whole experience; Council is the independent-perspectives
strategy; Swarm is the build-and-review strategy; Orbit and backgrounds are
visual presentation, not strategies. This matches the product brief.

Remaining drift is outside that document: `pages-site/council-vs-swarm.html`
uses "Constellation" for *both* perspectives and divided work, collapsing the
one distinction that matters. Swift source uses "Rivune mode" and an internal
`council`; serialized `Together` and `Alloy` values must stay untouched as
compatibility identifiers — renaming them breaks saved history.

### 5.3 Two different things are dated together, and should be separated

- **Automated checks are current.** Both suites pass today (§4).
- **Live provider runs are not, and differ per implementation.** The Tauri
  Claude chat was verified 2026-09-12 in a browser dev server. The Swift
  client's live Codex/Claude runs, timings, adversarial tool-disable check and
  pairing exercise date to 2026-09-02 and need signed-in CLIs on a real Mac, so
  neither CI nor this session can reproduce them.

A passing frontend build is not release acceptance, and the checkpoint says so
itself. That discipline should survive contact with a shipping deadline.

## 6. What to do next

Make the basic loop dependable before extending it: **connect an AI, send a
prompt, get a real answer, continue the conversation, keep the work, and recover
cleanly from an interruption.** Verified collaboration and real project
execution build on that, not beside it.

The single most valuable next step is the one the checkpoint already names:
**get the Claude adapter out of the Vite dev server and into the packaged
app.** Today the only real provider chat in the new workspace depends on a
loopback development server. Until that runs packaged, the Tauri line has no
end-to-end story, and the honest status of the desktop product stays
*designed*.

In order:

1. **Packaged desktop provider execution.** Port the hardened local adapter to
   the Tauri runtime, keeping its guarantees intact — allowlisted environment,
   no tools or MCP, temp working directory, bounded output, single in-flight
   request, managed-policy refusal. These are the properties that make it safe
   to ship, not incidental details.
2. **Retire or mark `pages-site/`** (§5.1) so one site describes the product,
   and align its claims with the ladder in §2.
3. **Re-run and re-date the Swift live verification**, or state plainly that
   the Swift client is frozen and its results are historical. Either is fine;
   leaving it ambiguous is not.
4. **Carry `CONSTELLATION_ENGINE_DIRECTION.md` vocabulary** into the site and
   any new UI, leaving serialized identifiers untouched.
5. **Then extend:** real Council and Swarm as distinct validated strategies,
   participants beyond two providers, and evidence-based verification — tests,
   sources, a working preview — so a result is trusted because it was checked,
   not because the models agreed.

The Swift client already proves the hard part is achievable: a real
plan/contribute/review/integrate cycle with failure states that hold. Treat it
as the reference the new orchestration must match, not as code to leave behind
unread.

## 7. Rules this project holds itself to

- An unavailable capability is displayed as unavailable, never simulated.
- A simulation is labeled a simulation, in the product and in the docs.
- Verification carries the date and the checkout it was performed against.
- Drafts, context, history, and completed work survive restarts and crashes.
- Crossing a provider boundary is disclosed before it happens.
- Model agreement is never offered as evidence of correctness.
