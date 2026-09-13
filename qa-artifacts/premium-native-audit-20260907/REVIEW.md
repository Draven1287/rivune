# Premium native UI audit — 2026-09-07

## Verdict

The current native source and accepted captures preserve Rivune's premium graphite/space identity. The main workspace keeps the selected background visible around a dark reading surface, the composer and response cards remain quiet and legible, Settings stays inside the Rivune window, and the account entry remains anchored at the bottom of the sidebar. No broad visual replacement is warranted.

This pass found one implementation-ready Swarm correction and two Council clarity refinements. The isolated Swarm patch is supplied but was not applied to shared source. New rendered acceptance was unavailable because the native owner's external inspection service had already exhausted its bounded recovery attempt.

## Prioritized findings

### P1 — Swarm's Home status implies that a connection can enable it

Evidence:

- `Rivune/WelcomeView.swift:103-133` disables Swarm, but gives every non-ready mode the accessibility value `Connection required`.
- The same control displays only `Swarm` with a muted status dot, so its unavailable state is not explicit in the visible label.
- `Rivune/Models.swift:539-545` and `Rivune/Models.swift:561-571` correctly describe Swarm as unavailable.
- `Rivune/Components.swift:3591-3592` also states that Swarm is not available in this build.

Correction:

- Display `Swarm · unavailable` in the Home mode control.
- Expose `Not available in this build` as its accessibility value and explain that it cannot be selected in this build.
- Keep it visible and disabled so the product direction remains legible without promising runtime availability.

Artifact: `swarm-home-availability.patch`. It applies cleanly to the captured source and changes only `WelcomeView.swift` display text and accessibility metadata.

### P2 — Council uses three user-facing names for the same role

Evidence:

- The composer says `Manager · Automatic` or `Manager · …` at `Rivune/Components.swift:2054-2073`.
- The Team editor labels the role `Orchestrator` at `Rivune/Components.swift:3555-3559`, `3564-3568`, and `3618`.
- The saved-run disclosure calls the appointed role `Lead` at `Rivune/WorkspaceView.swift:899-904`, while frozen members can carry an `Orchestrator` suffix at `893-897`.
- Build 2026090621 acceptance explicitly accepted `Manager · Automatic`, so that is the safest current product term to preserve.

Correction:

- Use **Manager** throughout the visible Team editor and saved Council disclosure.
- Keep internal names such as `orchestratorMemberID` unchanged.
- Suggested copy: `Manager`, `If the manager fails`, `Manager: <name>`, and member suffix `· Manager`.
- Preserve the existing explanation that this member contributes first and reviews in a separate session.

This is intentionally left as an implementation request rather than a second patch because `Components.swift` and Council implementation are active shared-owner surfaces.

### P2 — Member readiness can be read as resolved model readiness

Evidence:

- `Rivune/Components.swift:3636-3638` shows `Connection ready · requested options` when admission evidence accepts a member.
- The necessary caveat that account capacity and the resolved model remain unknown until the provider reports them appears much farther away at `Rivune/Components.swift:3589-3590`.

Correction:

- Replace the ready row with `Eligible for the next request · provider resolves the model at run time`.
- Keep the unavailable row as written.
- Place the concurrency/capacity note directly below the member list so it reads as a qualification of those statuses.

## What should be preserved

### App interior and backgrounds

- `Rivune/Theme.swift:35-226` keeps Graphite, Orbit, and Cosmos as user choices and retains independent brightness/star settings.
- `Rivune/SettingsView.swift:913-965` explains that reading surfaces remain consistent and provides `Use previous appearance`; it does not overwrite the user's earlier composition.
- `home-wide.png`, `home-compact.png`, `chat-account-footer.png`, and `settings-appearance.png` show the same restrained dark surfaces, thin borders, muted blue accents, and space identity across Home, chat, and Settings.

### Settings and account footer

- `Rivune/SettingsView.swift:180-192` renders Settings inside Rivune's main window.
- `Rivune/SidebarView.swift:358-438` keeps a single compact account/footer menu with separate Rivune Account and Settings actions.
- `Rivune/RivuneAccount.swift:305-391` clearly separates Rivune account state from AI provider accounts and honestly keeps local-only behavior visible when account services are not configured.
- Build 2026090623's owner receipt records successful inspection of the main workspace, account/footer popover, and Account settings before the external inspection service failed.

### Rivune controls and native system surfaces

- `Rivune/Theme.swift:409-434` and `497-590` define Rivune-owned selects and action menus with keyboard focus, selection state, Escape dismissal, and disabled actions.
- The app still delegates file export to SwiftUI's native file exporter at `Rivune/SettingsView.swift:161-164`. No replacement of macOS window controls, file dialogs, security prompts, or authentication sessions is proposed.

### Chat typography and composer

- User prompts use a readable 15-point face, restrained raised surface, and 680-point maximum width at `Rivune/WorkspaceView.swift:476-487`.
- Response cards use a stable reading surface with 20-point horizontal padding and restrained metadata/actions at `Rivune/Components.swift:194-315`.
- The composer uses body text, an eight-line expansion limit, 64/78-point minimum body height, a subtle focus border, and preserved settings-return focus handling at `Rivune/Components.swift:1739-1820` and `1885-1937`.
- `final-mixed.png` confirms that selected generated files, an ordinary attachment, draft text, model selection, voice, and send controls remain readable without replacing the premium composer.

### Council answer, progress, and work record

- `Rivune/WorkspaceView.swift:516-565` keeps the final answer first, with progress/errors in that stable card and the Council record beneath it.
- `Rivune/WorkspaceView.swift:887-956` keeps members, appointed lead/manager evidence, independent results, failed attempts, output receipts, and activity inside a collapsed disclosure.
- `Rivune/Components.swift:557-677` and `878-1055` provide the stronger Rivune progress and decision-record patterns used by collaboration views. Reuse those patterns if the Council disclosure is polished; do not expose backend event prose as the primary experience.
- The retained Council screenshots show final-answer-first hierarchy and a collapsed record. Expanded current Council details were not rendered in this pass.

## Screenshot and receipt evidence

| Artifact | SHA-256 | What it supports |
|---|---|---|
| `qa-artifacts/native-product-audit-20260906/build-0621/home-wide.png` | `3daf5f332aab38892f475b4b63c149d46c59633adaf4df32c9513e9e4cb1b10e` | Wide premium Home hierarchy |
| `qa-artifacts/native-product-audit-20260906/build-0621/home-compact.png` | `2c38b6b4742c5c78d690aacaa74ae22810316667f455723a9954e04f5ab83727` | Compact native Home hierarchy |
| `qa-artifacts/native-settings-20260906/build-0619/chat-account-footer.png` | `a599d4521aaacee1b044681c8530804a44b507e5576c85eb12a24b7e5523a9d9` | Bottom account control and chat composer |
| `qa-artifacts/native-settings-20260906/build-0619/settings-appearance.png` | `acbdc723819bf4da721f6be396803ff8fbb9a0cc7c291162749e62e8cb3c6724` | In-app Settings and background choices |
| `qa-artifacts/native-product-audit-20260906/build-0620/final-mixed.png` | `6c98f05029c7e1633f5e63d40be46862bbf1c502d9c42afebe978eceae78bf42` | Dense composer state remains usable |
| `qa-artifacts/council-20260906/code-review.png` | `848a857d55a696232f4396c6b09f1ef88ad945d7cde96248dbeaa31e4fd99b50` | Council final answer and collapsed run record |
| `qa-artifacts/council-20260906/decision-fixed-0615.png` | `a29fc247c48132f7628fc8e9ef01fa1f4ea5c2622dde701b13c7e44eaa14ee8b` | Final-answer typography after Markdown repair |
| `qa-artifacts/council-grounding-20260906/evidence-decision.png` | `32f6fc6a1c0a086a2484b6da1a425868606cb9a4b34b36bff8922c1fdcb4ba0b` | Grounded Council answer hierarchy |

There is no screenshot named `accepted0623` in the workspace. The build-0623 evidence used here is `qa-artifacts/phone-execution-contract-20260907/build-0623/UI_INSPECTION_LIMIT.md` and `ROOT_INSTALLED_REVIEW.json`; they explicitly leave the later project post-navigation state unverified after the external inspection-service crash.

## Patch verification

- Shared source at capture: `Rivune/WelcomeView.swift` SHA-256 `f8c754f22e757946ff2f52ec293cc73ac3e43f23dda04b38d5218a2cd54316cd`.
- Isolated candidate: `candidate/Rivune/WelcomeView.swift` SHA-256 `086f1c37f87562a4b177875698e83de382ee9bba738b45b56357d8e49bcca5d5`.
- Patch: `swarm-home-availability.patch` SHA-256 `efbff7bfb2f8dbe28bb01a1f699a314286d28625079ad54ff518e71034f5a4cd`.
- `git apply --check` passed against the captured shared source.
- `xcrun swiftc -parse candidate/Rivune/WelcomeView.swift` passed.
- No build, UI launch, provider request, account mutation, installation, publication, or shared-source edit was performed.

## Unverified states

- The isolated Swarm label at compact and wide widths.
- VoiceOver output after applying the Swarm patch.
- Expanded current Council run details.
- Team editor with six members, long member names, unavailable saved model/effort values, and ordered fallbacks.
- Verified, busy, verification-failed, and sign-out-pending account-footer states in build 0623.
- Any runtime state after the native owner's external inspection service failed.
