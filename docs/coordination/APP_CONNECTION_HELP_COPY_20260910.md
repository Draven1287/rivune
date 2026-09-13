# Rivune app connection help copy

September 10, 2026. Bounded copy and contract review for the accepted Tauri source. This document proposes implementation text only; it does not change the app, configure a provider, inspect credentials, start a provider process, or establish a successful response.

## Product contract the copy must preserve

Rivune currently supports locally discovered **Codex CLI** and **Claude CLI** routes. `Find installed providers` scans at most 32 absolute directories from `PATH`, `/opt/homebrew/bin`, `/usr/local/bin`, and `~/.local/bin`; it accepts the first executable `codex` and `claude` route it finds. On Unix the file must have an executable bit. Windows requires a direct `.exe` or `.com`, but provider execution remains unavailable there until owned process-tree termination is implemented. Discovery checks files and canonical path identity. It does not run the CLI, authenticate an account, inspect entitlements, test a response, or prove the executable is compatible.

`Save as workspace default` durably stores the selected discovered route when its identity and saved-state guard still match. It does not change an already pinned conversation or Constellation team, sign in, discover an entitled model, or send a prompt. The current native catalog reports authentication as `unknown`, response test as `notTested`, and model catalog as `unknown` for saved Codex/Claude routes. A saved route therefore remains **configured but untested** in the current runtime.

The first real readiness check is an explicit conversation send. Codex runs through its read-only, ephemeral execution adapter; Claude runs through its restricted, no-session-persistence adapter. A completed saved answer is response evidence for that request only. A path, saved configuration, past result, or provider-managed default must not be described as a currently signed-in or live connection.

## Recommended state copy

Use the state heading, body, and action together. Do not combine states into a green “Connected” badge.

| State | Heading | Body | Available action |
| --- | --- | --- | --- |
| Desktop host disconnected | **Rivune can’t reach the desktop host** | Your workspace is not connected to Rivune’s local desktop service. Close and reopen Rivune before editing or sending. | Text instruction only. The current disconnected surface has no safe reconnect command. |
| Supported executable missing | **{Provider} CLI wasn’t found** | Install the {Provider} command-line app using its official instructions. Then return here and ask Rivune to look again. Installation and sign-in happen outside Rivune. | **Find installed providers** |
| Configured but untested | **Saved, response not verified** | Rivune saved this CLI as the workspace default. It has not confirmed sign-in or received a successful response. Pinned conversations and Constellation teams keep their saved routes. | Close Settings, enter a short message, then **Send**. |
| Authentication required or provider rejects the request | **{Provider} needs attention** | The provider did not accept this request. Open its own command-line app and check the account or sign-in state. Rivune cannot sign in for you. Your draft remains available. | After checking the provider, return to the same conversation and explicitly choose **Send** again. Never retry automatically. |
| Ready for first prompt | **Try your first message** | Sending starts a real request through the selected CLI. It is the response check; Rivune does not run a hidden test. Start with a short, low-stakes message. | Suggested prompt: **Reply with one sentence: Hello from Rivune.** Then choose **Send**. |

After the first completed answer, use: **“Response received previously”** and **“Rivune received and saved an answer from this route before. This does not re-check current sign-in or availability.”** Keep **Send** as an explicit new request.

## Copy by existing contract value

These strings can replace `connectionGuidance` without adding capabilities:

| Existing condition | Proposed guidance |
| --- | --- |
| `adapterState !== supported` | This route is not available in this desktop host. Choose another supported saved route. |
| `installation === missing` | The saved executable is no longer available. Install the provider CLI, then choose **Find installed providers** to look again. |
| `installation === unknown` | Rivune has not confirmed this executable. Choose **Find installed providers** before trying a conversation. |
| `authentication === authNeeded` | The provider reports that sign-in is required. Complete sign-in in the provider’s own command-line app, then return and explicitly send again. Rivune cannot sign in for you. |
| `authentication === unknown` | Sign-in has not been verified. A found executable or saved route does not confirm account access. The first explicit send may still fail. |
| `responseTest === failed` | The previous request failed. Check the provider’s CLI and account state, then explicitly send again. Your draft remains available; Rivune will not retry automatically. |
| `catalogState !== available` | Model access is not verified. Rivune can use only the provider-managed default on this route; a successful response has not been established. |
| `supportsProviderDefault === false` | This route cannot use a provider-managed default, and Rivune has no verified model override for it. Choose another supported route. |
| `responseTest === notTested` | No successful response is recorded. Close Settings and explicitly send a short message; that send is a real provider request, not a hidden test. |
| historical `responseTest === passed` | Rivune received a response from this route before. Current sign-in and availability have not been rechecked. |

## Confusing current text and exact source locations

1. `prototypes/ai-native-workspace/src/host/connectionGuidance.ts:6` says “configure its executable in the desktop host.” The current UI has no manual path field. It discovers supported routes with **Find installed providers** and allows an explicit save. Name that action instead.
2. `connectionGuidance.ts:9` says a previous response does not confirm current access, but the native catalog currently always emits `authentication: unknown` and `responseTest: notTested` for saved routes (`qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/src/host.rs:3001-3003`). The UI should present this as an unverified state, not an implied failed check.
3. `connectionGuidance.ts:10` combines “connection and account status” under a failed response. The runtime may know only that a request failed. Use “provider’s CLI and account state” as troubleshooting guidance and avoid diagnosing authentication unless the host explicitly reports `authNeeded`.
4. `connectionGuidance.ts:13` says to send a short message but does not say that this is a real provider request. Add that disclosure beside the first-prompt action.
5. `ProviderSetup.tsx:38` says “Install a supported CLI,” but only Codex and Claude routes are discoverable (`host.rs:2886-2916`, `4000-4029`). Say “Install Codex CLI or Claude CLI” so “supported” is concrete.
6. `ProviderSetup.tsx:46` correctly says sign-in and response are unverified after save, but the next action is missing. Add “Close Settings and explicitly send a short message when ready.”
7. `HostWorkspace.tsx:130` permanently labels the workspace “provider readiness unverified.” That is honest today, but too broad after a saved completed response and too subtle during first setup. Keep it until the host supplies current readiness; pair it with the state-specific Settings copy rather than changing it to “Connected.”
8. `HostWorkspace.tsx:144` reduces the disconnected empty state to “Desktop host unavailable,” while lines 74 and 89 provide more actionable reopening guidance. Reuse the same explanation in the transcript so the user does not have to discover the alert above it.
9. `HostWorkspace.tsx:171` labels `authenticated` as “Host reports signed in” and `passed` as “Previously passed.” Those are appropriate contract labels, but current native discovery emits `unknown` and `false` (`host.rs:4027-4028`) and the model catalog emits unknown/not-tested. Do not surface the stronger labels until an authoritative host path actually supplies them.

## Placement and behavior

- Put the state heading and one-sentence body inside each provider card under Installation, Sign-in, and Response test. Keep those three facts visible; the guidance interprets them rather than replacing them.
- After a durable route save, keep the status in the existing `role="status"` region and add the first-prompt sentence there. Do not open a terminal, close Settings, focus Send, or submit automatically.
- In the composer, show the first-prompt helper only when the selected route is saved, not explicitly `authNeeded`, not explicitly failed, and has no successful response. This is an invitation to try, not a ready badge.
- If the host is disconnected, suppress provider setup actions. Preserve the draft and use the existing reopen instruction. Do not offer a reconnect button until a reconnect command exists.
- If a send fails, retain the existing saved failure and draft behavior. The retry wording must require another explicit Send and must not imply the same provider state was rechecked.
- Keep provider names transport-specific: **Codex CLI** and **Claude CLI**. Do not call these the ChatGPT or Claude consumer apps, import their histories, or imply subscription feature parity.

## Acceptance checks for the app builder

1. Render each of the five states with a synthetic bridge and assert the exact heading, body, and available action.
2. Viewing help performs zero discovery, configuration, authentication, model-discovery, save, or send calls.
3. Missing executable offers only the existing **Find installed providers** action; it does not expose a nonexistent manual-path field or installation button.
4. Durable save changes the copy to configured-but-untested and preserves draft text. It does not mark sign-in, response, or model access as verified.
5. First-prompt helper appears only for an eligible saved route, explains that Send is real, and disappears after a host-reported completed response. Rendering it performs zero calls.
6. Auth-required and failed-response cases preserve the draft and require a deliberate retry. No automatic retry or sign-in action occurs.
7. Disconnected rendering contains the reopen guidance in both the alert and empty transcript, with setup and Send unavailable.
8. Labels remain readable at 320 px, keyboard focus returns after closing Settings, and the live region announces state changes once without repeating every provider fact.

## Evidence and next dependency

Inspected current workspace files match the accepted staged copies for `connectionGuidance.ts`, `ProviderSetup.tsx`, and `HostWorkspace.tsx`. Key hashes at review time:

- `connectionGuidance.ts`: `59970e52d3ca3935540d83a085329d10f97b3cd78b8c9d3af51d86f6ad9c4b49`
- `ProviderSetup.tsx`: `c5cca56159b32dad13575dc9e82b7746bae2ce40e4d6b376088abbbc5820b595`
- `HostWorkspace.tsx`: `a36af0125c132b46c74437208790a1cfb141de07668073fd1f111a6389482214`
- `workspaceAdapter.ts`: `0b8d8756ad7c0109974e89da40a74744ef0d63a25f90aa596ad772301b50fbb8`
- native `host.rs`: `6540006813844f12b0cc745a6c1817d9d8273deb5dc5c6af802449ba341f2ce1`

The exact next dependency is an app-builder implementation against the current accepted source, followed by isolated renderer checks for these five states. A separately authorized real-provider run is still required to establish actual sign-in behavior and the first successful answer; fixture copy checks cannot establish either.
