# Rivune working app UI — September 5, 2026

## Scope

The actual `/workspace` now opens the large identity arrival, followed by distinct Account → Connect AI → Ready setup. **Replay arrival** remains in the sidebar, and **Open setup** is available in Settings. Existing readiness checks continue to gate requests.

The app has labeled Home, Conversations, and Connections navigation, a distinct recent-conversation list, a compact Mac connection card, and a settings footer. Home uses a restrained heading, an integrated Rivune / ChatGPT / Claude mode selector, and Think / Build / Review cards that populate a real draft. Conversations retain their dedicated transcript and bottom composer.

Connections shows separate ChatGPT and Claude cards with their CLI and API check states. It uses the existing Mac pairing flow, exposes actual diagnostics, and explains that verification checks sign-in or model access without submitting a chat. API secrets remain in the Mac app.

The interior combines dark glass surfaces, a small plain silver R, static stars, and the separate `rivune-workspace-cosmos.png` backdrop. The backdrop contains no startup logo or wordmark. Content panels keep their own dark backgrounds.

## Files

- `website/app/workspace/workspace-client.tsx`
- `website/app/workspace/workbench.css`
- Parent-generated asset: `website/public/brand/rivune-workspace-cosmos.png`

The client and CSS are synchronized to the existing local preview mirror at `/private/tmp/rivune-final-ui-web`. No separate server, commit, deployment, native launch, or provider request was made for this UI work.

## Verification

Using the mirror's installed dependencies:

- `npm run test:workspace` — 9/9 passed.
- `npm run lint` — passed without warnings.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed all five vinext build phases.

These checks ran after the initial cosmos integration and unused-variable cleanup. Parent rendered QA found the layout cohesive and requested more readable small text and full-frame galaxies. CSS now uses 11px minimum small labels, 12px ordinary controls, 13px sidebar navigation, brighter supporting text, and a full-panel cosmos backdrop at 90% opacity. A targeted build verifies those CSS-only refinements. Parent agent is performing desktop/mobile and fixture-based interaction QA; the checks above do not claim real provider generation.

## Preserved behavior

- Drafts remain keyed by conversation and survive in-app navigation.
- Rivune mode requires both providers and explicit sharing consent.
- Single-provider modes still require their actual ready route.
- Pending request identity, uncertain-submission handling, receipt reconciliation, and cancellation semantics are unchanged.
- Browser credentials are not persisted. No API-key input, cloud account, attachment, or tool capability was added.

## Models and reasoning follow-up

The sidebar now includes separate ChatGPT and Claude disclosure rows with a current model/effort summary. Each opens an anchored two-column Models / Reasoning panel, with a bottom dialog on mobile. Unpaired browsers show the panel structure and explain that available options come from the connected Mac; no model list is invented.

The new optional `modelControls` snapshot metadata is validated. Model choices are local to the browser workspace and are sent as optional `modelSelections` on the next request, scoped to its active provider(s). They never update native global preferences. Unsupported reasoning options are disabled, model changes choose a supported effort and explain the adjustment, and stale explicit selections produce a visible warning when Mac metadata invalidates them. API configuration remains read-only with provider-managed reasoning. Pending or running requests lock edits.

Additional files: `website/app/workspace/client-contract.ts` and `website/tests/workspace-contract.test.mjs`.

Verification: 12/12 contract tests passed, lint and TypeScript passed cleanly, and production build passed. Focused new tests cover optional/invalid metadata, supported reasoning fallback, provider scoping, immutable request selections, stale options, and omitted selections for managed API or legacy Mac routes. Parent rendered QA confirmed model and effort selection, compatible effort fallback, read-only API columns, correct fixture dispatch, and active-request locking. This used a fictional local bridge rather than a provider. Mobile QA is handled by the parent agent.

A peer review of request/reconciliation code found no regression. Both peer and rendered review identified a footer-copy edge case for locked explicit selections; that now says **Workspace selection**, preserving its distinction from Mac defaults.

## Arrival and account/provider setup follow-up

The approved 3:2 startup image now occupies about 800px of width in a 1024×576 viewport, with a minimal status/Continue footer. Provider configuration details moved to the following full-screen setup page. No image asset was regenerated.

New `setup.tsx` and `setup.css` provide separate Account, Connect AI, and Ready steps. Google, Apple, and email choices use a configuration-driven `AccountAccess` seam. Unconfigured methods are visibly unavailable; only local development hosts offer explicit **Continue locally** and **Preview workspace**, without inventing an account. Email challenge codes live only in component memory, and verification/account identity comes from the independent auth adapter. Configured identity loss or loading reopens setup and gates new sends, while existing request receipt and cancellation remain intact.

CLI/API cards use real Mac connection checks. Keys and CLI sign-ins are configured on the Mac; the browser accepts only its existing pairing code. Ready entry requires an online usable selected route. One provider is sufficient, and the model mode falls back to that ready provider. Readiness checks never claim paid generation or usage-limit validation.

Step changes focus the new heading and reset the setup page scroll. Opening/closing the separate pairing dialog preserves the setup step. Replaying arrival or reopening setup does not remount WorkspaceClient or reset its draft, connection, or model-choice state.

Final combined verification against the synchronized preview mirror: 29/29 fixture tests passed (12 workspace and 17 account), full ESLint passed, TypeScript passed, and the production build passed all five phases with the final Supabase adapter/wrapper. Parent rendered QA passed desktop and mobile, including no overflow at 312px; Account-to-Connections focus/scroll reset; disabled Continue with zero ready routes; enabled Continue with a ready route; disabled Enter and reconnect copy when readiness is lost; and retained drafts after entry, Settings/Open setup, and replay. These local checks do not activate a Supabase project, send account emails, or invoke a model.

## Comprehensive Settings follow-up

Settings now has its own component and responsive navigation: Account, General, AI Connections, Models & reasoning, Appearance, Data & privacy, Devices, and About & shortcuts. Search returns matching sections. The chat remains mounted underneath Settings, so navigating these sections does not reset a draft, pending request, conversation selection, or model preference.

AI Connections renders the Mac's optional provider catalog instead of a hardcoded two-card inventory. Before pairing, two explanatory CLI/API method cards remain visible. Paired cards show each reported transport, truthful readiness, the automatic CLI-first/API-fallback policy, and the active route/model. Unsupported adapters appear in a collapsed searchable catalog and cannot become chat modes. Older Macs fall back to only their actual reported routes; API previews and unknown providers are not promoted to supported runtime adapters.

Open connection settings and device/model actions use the authenticated, capability-gated `/v1/settings/open` action. They send only an allowlisted section to the current paired Mac, block duplicate clicks while in flight, validate the acknowledgment, and suppress stale success notices after disconnect. No API keys or CLI login forms were added to the browser.

Browser-local preferences now control stars, the galaxy backdrop, reduced motion, text size, and Enter versus Command/Ctrl+Enter submission. Their storage format allowlists only those non-sensitive values. Corrupt storage falls back to defaults; blocked storage keeps changes in page memory with an explanatory notice. Shift+Enter and IME composition remain safe. Provider credentials, prompt drafts, account details, and pairing tokens are not written into preference storage.

Local model choices are invalidated when the active transport changes, even if CLI and API happen to use the same model/effort identifiers. The pending submission retains its original immutable model selection and request identity. API models remain read-only with provider-managed reasoning.

Source changes: `settings.tsx`, `settings.css`, `workspace-icon.tsx`, `preferences-contract.ts`, `preferences-client.ts`, `workspace-client.tsx`, and `client-contract.ts`; tests in `workspace-contract.test.mjs` and `preferences-contract.test.mjs`. The existing `test:workspace` script now includes preference tests.

Final frozen-source verification: 36/36 combined tests passed (16 workspace, 3 preferences, and 17 account); full ESLint, TypeScript, and production build passed. Ten owned source/mirror files compared byte-for-byte without differences. A peer audit found no remaining concrete account/send-gate, transport-reconciliation, or native-action regression.

Parent rendered QA passed the default 893×789 split viewport, compact 819×461, and mobile 312×675 with Larger text and no overflow. A fixture CLI-to-API change updated the open model dialog, sidebar summary, and provider card to the configured API model with read-only provider-managed reasoning, clearing the old override. Native settings navigation sent the expected connections action to the fictional bridge. API-only discovery entries remained unsupported, Settings search/no-results recovery worked, and stars/backdrop/text/motion preferences applied. Success notices now clear between categories and delayed native acknowledgments are ignored after a category change. The parent is completing wide/account/privacy and preference persistence/reset checks. No check calls a real provider or activates account sign-in.

## Home screen decluttering — September 5, 2026

The crowded home screenshot prompted a focused web UI revision:

- Removed the duplicate Home navigation row, disconnected device card, per-provider sidebar rows, and large empty-history card. The logo and New conversation still return home.
- Kept Models & reasoning as one sidebar trigger for the existing two-column provider dialog. Connections and Settings remain plain, consistent navigation rows.
- Centered a shorter heading and the composer; moved provider choice into its bottom bar. Removed duplicate connection/tool notices and retained one actionable disconnected helper.
- Replaced the three large starter cards with compact shortcuts. They disappear once a draft exists so they cannot overwrite writing.
- Kept explicit sharing consent before team submission, showing it when a Rivune draft is nonempty. Mode/context navigation clears consent; existing request gating and receipt reconciliation are unchanged.
- Reduced galaxy contrast behind the working surface while retaining the stars and silver identity.

Verified in the localhost preview at actual CSS viewports 1024x576, 893x789, 819x461, and 312x675. No horizontal page overflow in compact/mobile layouts. Verified provider dialog access, mode switching clearing sharing consent, Settings round-trip preserving the draft, and connection access with a collapsed sidebar. Browser checks used an unpaired local preview; no AI request was sent.

Full web lint, TypeScript checking, 36 existing contract tests, and the production build passed. Only website UI source/CSS and the existing local preview mirror were updated; no native launch, installation, commit, or deployment.

### Follow-up: model controls at the composer

Moved the Models & reasoning trigger from the sidebar into the composer beside provider choices. It opens the existing provider-specific two-column dialog, aligns to the composer on desktop, and uses a compact second control row plus bottom-sheet layout on mobile. The selected chat provider determines which settings tab opens; inspecting the other provider does not silently change the chat mode. Drafts and focus return correctly after dismissing the picker.

Standardized the website header, favicon/Apple icon, workspace, and older introduction mark references on the existing silver `/brand/rivune-ribbon-r.png`; ChatGPT and Claude retain their provider marks and startup space artwork is unchanged. No legacy `/rivune-icon.png` references remain in website/app.

Verified desktop rendering, Claude/ChatGPT picker tabs, draft preservation and return focus, and 312x675 mobile controls/picker without horizontal overflow. Full web lint, TypeScript check, and production build passed. No provider requests, account actions, native changes, or image regeneration.
