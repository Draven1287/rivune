# Mac first-session readiness review — 2026-09-07

Scope: resident core-only source used for installed 0.2 (2026090724), installed receipts, supplied 12:29:14 screenshot, and existing RIVUNE_PILOT_KIT_20260907.md. Source hashes accompany this report. Read-only central review; no provider execution, credential reads, fresh-profile reset, native UI operation, or repeated full suite. Native owner remains sole implementation/build/UI operator. Later candidates require separate review.

## Readiness

| Step | Current evidence | Remaining acceptance |
|---|---|---|
| First launch/setup | RootView gates app behind startup/setup; SettingsView provides Account, Connect AI, Ready stages. Owner observed existing-profile Loading4% → Home. | Fresh-profile path remains untested; use a disposable app-data fixture, never reset the user's profile. Keyboard-only route and compact900x650 must reach usable workspace with honest unavailable state. |
| Connection/readiness | Owner saw four detected tools, two ready, Gemini/Ollama adapter-needed. Store guards sending; Composer has a Connections action and disabled Send for unavailable selection. | Detected, signed-in and usable execution remain distinct. Test no-provider and one-provider fixtures, preserve typed draft through Connections, do not switch route silently. Real provider first request unverified. |
| Prompt preservation | Source clears composer only after successful Mac admission; starter prompts append. | Existing PE01 provider-choice loss remains assigned. New retry overwrite finding below. Verify text/files/artifact/selection across Settings, navigation and relaunch. |
| Council first submission | send() explicitly gates Council through sharing alert. | FS01: alert describes legacy collaboration, not selected Council workflow. Correct before first pilot. |
| Answer/readability | Owner rendered existing fictional Council headings/table, scrolled and returned to latest. User screenshot shows response behind cluttered team form. | No new first answer or measured response timing in this audit. Check truthful working/reviewing/completed/partial/failed labels, long prose/table/code at minimum window. Team polish is already assigned; user visual approval pending. |
| Stop/error/retry | Store and Composer have Stop; retry eligibility exists for Council. | Stop not exercised on installed0724. Controlled dummy worker must prove cancellation, partial-output retention, no late success, no auto-retry. FS02 covers single-provider draft overwrite. |
| Save/reopen | Immediate installation preserved file hashes. Owner reports post-launch24 conversation IDs/27turns retained, projects/journal unchanged; existing conversation reopened. | A newly completed fictional pilot answer, reload/relaunch and editable export are unverified. No export success inferred from saved history. |
| Distribution | Installed executable independently matched reviewed Release; ad-hoc verification passes. | No valid signing identity visible. Signed/notarized public DMG blocked. Windows/Linux planned; independent prototypes/CI eligibility under review, strict $0. |

## New actionable findings

### FS01 — Council sharing disclosure describes a different workflow (P2, source-confirmed)

RivuneStore.swift:1720 gates both together and council on showTogetherPrivacyPrompt. RootView.swift:112–124 uses a single 'Use Rivune mode?' alert describing a shared work plan, coordinated roles, final ChatGPT integration and seven/eight requests. Council supports configured team members and a selected reviewing lead; this description can misstate recipients and behavior before first send.

Minimal correction: select disclosure from the actual mode and frozen proposed team; explain independent answers followed by selected lead review, selected provider routes and supplied context. Do not assert a fixed request count or guaranteed truth. Preserve legacy Together description where it still applies. Inspect persisted sharing approval semantics so an approval for an old workflow is not silently treated as consent to newly described recipients.

Acceptance: fixture Council with Claude lead, same-provider members, and a changed team; displayed recipients/lead must agree with request admission. Cancel preserves complete draft and dispatches zero calls. Allow once admits exactly once; unavailable team remains blocked. Legacy Together must retain its own accurate disclosure. No real provider call needed for these checks.

### FS02 — Single-provider retry replaces an unsent draft (P2, source-confirmed; UI reproduction pending)

RivuneStore.swift:1634–1656: non-Council retry sets mode, composerText, draftAttachments and draftArtifact directly from the old turn, then calls send(). A user can already have a different unsent draft. If admission is unavailable, send() returns and leaves the old turn in the composer; the original unsent draft has already been replaced. Successful retry clears those fields after admission. No preservation/confirmation exists in this branch. This is separate from PE01 navigation restoration.

Minimal correction: retry from the immutable prior-turn payload through admission without using the visible composer as scratch storage, or explicitly preserve and restore the current draft on every success/failure path. Preserve existing retry context semantics and block duplicates; no silent dispatch expansion.

Acceptance: failed single-provider answer plus distinct unsent text, attachment, artifact and selected mode; invoke Retry with unavailable route, rejected admission and successful injected admission. The original draft remains intact in all three cases and after navigation/relaunch. Council retry remains on its coordinator path. Count zero calls for rejected attempts and one for admitted retry.

### FS03 — Team close control has inaccurate accessible name (P3, source-confirmed)

Components.swift:3551 uses ModelPickerCloseButton to dismiss the team editor; shared implementation at2960 labels it 'Close model configuration'. It should announce 'Close team' here, preserving Cancel-like no-save dismissal. Source specifies xmark; the unusual glyph/focus appearance in the supplied screenshot still needs native AX/render verification, not guessed overlay removal.

## Repeatable fictional first-session script

Run under native owner's disposable fixture and retain exact build/source hash. Keep real-provider mode unexecuted while no-live-call constraint applies. A deterministic injected result must be labeled test output, never model-produced evidence.

1. Launch a fresh isolated data profile with no providers. Record visible setup steps, keyboard focus and no-provider explanation. Enter 'PILOT DRAFT — preserve me' when composer available; open Connections and return. No credentials or account settings changed.
2. Set injected readiness to one supported route, choose it explicitly, then two routes/Council. Confirm defaults/lead/routes and unavailable alternatives are honest. Append the Pine & Paper brief from existing pilot kit; attach a small fictional text file if needed. Navigate away/back and relaunch: exact text/file/artifact/provider intent retained.
3. Open Team, inspect compact summary and advanced options; change then Cancel, reopen and verify no save. Save one intentional fixture change and verify it persists. Check900x650 and1280x800, keyboard/Escape; record screenshots for user review.
4. Invoke Council send with sharing unapproved. Compare disclosure to actual fixture team. Cancel once (zero dispatch, intact draft), then allow one injected run. Verify a single admitted run, independent member records, selected lead review, and clear completion only after terminal success.
5. Inspect structured fixture answer and source brief side by side: five pages, two revision rounds, $2,200 total/$1,100 installments, three weeks after materials, exclusions and service/launch dependencies. Model-generated factual quality remains unverified until an authorized real run; manually authored fixture content cannot establish it.
6. With a second slow dummy run, Stop. Confirm task becomes stopped, any partial output remains available, no late completion or background child remains. Inject recoverable failure, then test retry while a distinct draft exists (FS02). Verify explicit status and one intentional retry only.
7. Reopen the completed fixture conversation, navigate, quit/relaunch, compare prompt/answer/team provenance. If editable export exists, save to disposable location, reopen and compare complete content; otherwise mark missing. Record actual elapsed times only, no invented performance figures.

Outcome now: suitable for continued supervised local QA; first-session end-to-end acceptance remains pending the above specific checks. Existing pilot kit recruitment/contact sections are outside this audit; no outreach performed.
