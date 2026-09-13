# iPhone remote-control audit — 2026-09-07

**Result: a native iOS target and encrypted local pairing exist, but the phone is not yet a remote for the current Mac workspace.** It can submit legacy direct/Together text requests while connected. Current Council, saved Team/manager, Mac project/history browsing, selected generated-file continuation, durable reconnect/resume, and away-from-home access are missing. Do not describe the simulator build as a working phone companion.

This is a read-only source audit, with no app launch, pairing, keychain changes, network listeners, provider calls, or physical-device test. The native owner retains control of the running app and the 0621 crash repair. Twelve source/build/document files were copied into `qa-artifacts/phone-remote-audit-20260907/source/`; `source-manifest.json` records hashes and capture time. Line references below refer to that snapshot, not a claim that the changing worktree or installed app has the same bytes.

## What exists and what survives

| User expectation | Current source behavior | Evidence |
| --- | --- | --- |
| Install a real iPhone app | Shared SwiftUI iOS target, iOS 26 minimum, pairing URL and camera scanner. Distribution/install acceptance is separate. | `RivuneApp.swift:227–243`; `Info-iOS.plist`; `project.pbxproj:618–628,656–666` |
| Pair with Mac | Temporary QR/manual credential, 120-second expiry; encrypted reconnect credential retained in Keychain. One paired-phone slot. | `PeerBridge.swift:44–55,103–160,473–569`; `SettingsView.swift:615–806` |
| Same local network | Bonjour discovery and TLS 1.2 PSK with AES-GCM; peer-to-peer network option enabled. No internet relay discovery/addressing protocol. | `PeerBridge.swift:293–396,723–743`; README:76–83 |
| Exact direct model/effort | Legacy Codex/Claude fields are serialized and used for CLI options. They are not an authoritative cross-device execution descriptor; Mac route mapping can select its configured API and ignore those options. | `Models.swift:1163–1207`; `RivuneStore.swift:891–914,1501–1514`; `StartupReadiness.swift:55–64`; `APIRuntimeService.swift:392–395` |
| Saved Team, manager, repeated members | Not carried. Optional `providerPlan` is the older `AICouncilConfiguration`, not the currently executed Team run snapshot; sender omits it and remote executor never reads it. | `Models.swift:1178–1181`; `RivuneStore.swift:1501–1514,870–967` |
| Council | Deliberately unavailable on iOS and rejected on Mac. Legacy Together uses a different runner and must not be presented as current Council. | `RivuneStore.swift:531–561,808–814,941–958` |
| Swarm | Unavailable. No remote swarm workers are executed. | `RivuneStore.swift:559–561,808–814` |
| Ordinary attached text | Attachments travel inline with request; iPhone retains its original attachments when update fitting omits their echo. No arbitrary Mac file access is exposed. | `Models.swift:1170`; `RivuneStore.swift:1470,1507,1107–1109` |
| Project instructions/files | Phone request has no Mac project ID, context-approval binding, file manifest, or project enumeration. Mac send gathers approved project context; iOS send does not. | `Models.swift:1163–1207`; `RivuneStore.swift:1446–1474` |
| Continue editing generated files | iOS explicitly rejects a selected artifact. No selection snapshot exists on the request wire. | `RivuneStore.swift:1468`; `Models.swift:1163–1207` |
| Progress | Direct request sends asking + final result; legacy Together emits phase snapshots. Not token streaming, not an arbitrary-run subscription. Phone accepts only its currently active request ID. | `RivuneStore.swift:725–743,884–888,932–958` |
| Stop | Phone sends cancel; Mac cancels in-memory task. Phone immediately marks cancelled; no durable cancellation acknowledgement. | `RivuneStore.swift:745–750,1609–1638` |
| Reconnect and resume | Transport reconnects; execution does not resume. Link loss cancels all remote Mac tasks and marks phone turn failed. Watchdog cancels stalled requests. | `PeerBridge.swift:639–655`; `RivuneStore.swift:688–698,765–805` |
| Switch conversation while work continues | Selecting another conversation or New Chat cancels iOS generation. This differs from the Mac app coordinator. | `RivuneStore.swift:1186–1195,1207–1218`; `RivuneRunCoordinator.swift:34–36` |
| Mac/phone history sync | None in the message schema. Remote execution creates a temporary turn and stores only a 32-item process-memory result cache. iPhone stores its own received turns locally. It does not select/continue the Mac conversation. | `Models.swift:1223–1231`; `RivuneStore.swift:728–735,870–984,985–991,1483–1498` |
| Full completed artifacts | Small answer text can render using shared UI. Direct bridge answers clip at 240,000 UTF-8 bytes. Oversized frames can shorten prose; a legacy artifact-shaped result is preserved but then causes disconnect if too large. No chunked/hash-verified artifact fetch or full-result retrieval. | `RivuneStore.swift:1009–1085`; `PeerBridge.swift:251–258` |
| Phone locked/backgrounded | No durable resume protocol. iOS scene activation only restores the account. README correctly requires foreground use today. Background/suspension behavior is untested here. | `RivuneApp.swift:237–241`; README:78–83 |
| Mac asleep/offline/quit | Mac must stay awake, online and Rivune open. No sleeping-Mac helper or cloud executor. Local coordinator restores interrupted work rather than silently rerunning it. | README:78–83; `RivuneRunCoordinator.swift:34–36` |

## Concrete release-blocking gaps for the requested remote experience

### PR-01 — Current Team/Council has no remote execution contract (P1 feature gap)

The user cannot get the same team from the phone. The current guard correctly prevents unsupported execution, but the generic iOS Council connection message says to review Team/connect CLIs even though no connection could enable it (`RivuneStore.swift:595`). Keep it unavailable until the real coordinator contract is shared; replace that dead-end explanation with the actual Mac-only boundary meanwhile.

Acceptance: a phone-selected immutable Team run configuration reaches the same Mac `RivuneRunCoordinator`/Council admission path with identical participant IDs, manager/fallback order, exact model/effort and approved context. A recording adapter proves every Council phase receives that descriptor. A mismatched or missing capability produces a pre-send explanation with zero provider calls. Never convert Council into legacy Together silently.

### PR-02 — Route/model presentation can disagree across devices (P1 correctness)

Readiness sends only two booleans/statuses and the legacy workflow version (`Models.swift:1147–1160`). It does not say that the Mac selected a configured API route or which exact model/capabilities are available. `RouteMappedTextRunner` can resolve a nominal CLI request onto that API and discard phone model/effort (`StartupReadiness.swift:55–64`). Even for a CLI execution, the provenance is derived from the Mac's current local model setting (`RivuneStore.swift:900–901`; `StartupReadiness.swift:94–100`), while execution options came from the phone.

Acceptance: handshake advertises available route/model/effort tuples; request names one admitted tuple or an explicitly resolved default; response reports requested and actual tuple separately. Recording test: phone model B, Mac local model A, verify execution and receipt both B for CLI. Mac API route C must be shown before send and must not pretend B ran. Unknown or unavailable options fail before calling the provider; no implicit paid API fallback.

### PR-03 — Disconnect and navigation destroy run continuity (P1 durability)

Transport auto-reconnect is not run resume. `remoteGenerationTasks` is outside the durable coordinator; link loss cancels it, navigation cancels it, and `activeRequestID` is cleared. Only that active ID is allowed to accept updates. Cache deduplication lasts only until process exit/eviction and has no request-content conflict check. A retry creates a new ID and can repeat provider work after an ambiguous connection loss. The current behavior is documented, but cannot satisfy reliable remote control.

Acceptance: remote commands attach to durable coordinator IDs. Submit has a client idempotency key plus immutable request fingerprint; duplicate matching submit returns the same run, conflicting submit is rejected, and reconnect never resubmits automatically. Phone navigation/brief disconnection detaches observation without cancelling Mac work; explicit Stop owns cancellation. Resume fetches state from a revision/cursor, including completed output. Mac restart reports interrupted state and requires an explicit new attempt. Tests cover dropped submit acknowledgement, duplicate submit, lost progress, disconnect during each phase, completed-before-reconnect, app restart, cancel/complete race and cancellation acknowledgement.

### PR-04 — File/context and result delivery are incomplete (P1 integrity)

No project/selected-artifact contract is transmitted; the iOS guard honestly rejects selected-artifact sends. Prose clipping and the oversized legacy artifact disconnect cannot deliver a complete website reliably. Additionally, Mac remote direct execution invokes `independentPrompt` without a host-side document admission check; invalid/oversized document context becomes `[]` (`RivuneStore.swift:904–909,1722–1731,2139–2153`). Normal phone add-attachment UI validates, but a malformed or stale peer request should be rejected at the receiving boundary, not lose the document silently.

Acceptance: Mac validates prompt size, attachment count/encoded size, immutable approved project context and selected artifact IDs/digests before execution. Invalid context means zero calls and an explicit error. Remote artifact catalogue carries path/byte count/digest and bounded content chunks; phone verifies complete digest before save/preview/continuation. A 33,001-byte generated-file fixture and Unicode filenames round-trip byte-for-byte; oversized packages produce a truthful retrieval/size state, not success with truncated code. Never transfer Mac security-scoped bookmarks as usable phone permissions.

### PR-05 — Protocol version mismatch disappears silently (P2 diagnostic)

The outer envelope version is exactly 1. Frames with a different version are ignored in `PeerBridge.parseFrames` (`PeerBridge.swift:612–615`) with no actionable negotiation result. The separate Together version gate protects only legacy workflow. A new phone can appear connected and then wait until watchdog timeout.

Acceptance: explicit compatible version/capability handshake before enabling send. Unsupported version shows which device needs updating and does not enqueue provider work. Malformed authenticated messages fail closed with a clear link error. Test old/new protocol pairs, missing capabilities and unsupported action versions.

## Smallest native companion increment

Build one **Mac workspace remote**, using the existing local encrypted link first. Do not build a second independent chat engine or assume a new cloud account is required for local pairing.

1. Define transport-independent command/result types around existing durable workspace operations: capability handshake; list/read permitted conversations and projects; submit a run; subscribe/read run revisions; cancel with acknowledgement; fetch a completed artifact. Each command includes version, run/conversation identity, idempotency/fingerprint where relevant, and the exact admitted execution/context descriptor. Reuse existing coordinator validation and storage rather than the `remoteGenerationTasks` parallel executor.
2. Make iPhone show the Mac's workspace and current Team/model/effort, with draft composition, progress, Stop, completed answer, and file preview/share. Initially expose only supported actions. File inclusion stays explicit and scoped to paired access; opening a project does not authorize sending every file to models.
3. Persist the phone's pending observation IDs and last accepted revisions. Navigation and disconnection do not imply cancellation. On foreground/reconnect, refresh capabilities and authoritative run state. Keep stale/offline state obvious. Do not advertise background notifications, remote wake, or access from cellular yet.
4. Only after deterministic and physical LAN acceptance, scope away-from-home access as a separate encrypted-relay capability. Preserve the same command contract and peer authorization. The relay should not need provider credentials or plaintext content; authenticate devices, support revocation/replay protection and bounded buffering, and evaluate operating cost separately. No port forwarding, public Mac listener, new account backend or cloud relay has been implemented by this audit.

This creates the same Rivune workspace on phone, which is a meaningful promise we can test. It does not establish identical answers or all proprietary ChatGPT/Claude consumer-interface features; route, prompt/context, tools and available capabilities still determine behavior.

## Required validation and current evidence limits

Existing deterministic tests cover update fitting/attachment echo removal/longer answer merging (`RivuneDeterministicTests.swift:6–185`) and legacy workflow/optional-provider-plan encoding (`1327–1435`). The provider-plan round-trip test proves serialization only, not that a selected team executes. No new tests were run in this audit. No new claim is made about the current iOS binary.

The next owner should add an injected transport plus recording adapter to exercise the command contract without sockets or credentials. Keep tests for the defects above meaningful: assert actual call arguments/counts and durable state across disconnect/restart, not merely that a request can encode. Run Mac tests and iOS compile against a frozen candidate, then conduct a physical Mac+iPhone session with both exact build IDs recorded.

Physical acceptance must include QR/manual expiry and revocation; same-Wi-Fi discovery with permissions allowed/denied; current Team and direct-model fidelity; phone lock/unlock; app background/foreground; conversation switching; Wi-Fi loss/restoration; Mac sleep/wake and app restart; stop/complete races; reconnect to completed work; large generated artifacts and project context approval. Use synthetic data and bounded provider calls. Test cellular/away-from-home only when that transport actually exists. A simulator screenshot or passing unit suite cannot substitute for these checks.

Native iPhone distribution, device provisioning/TestFlight and public release logistics belong to the launch owner. The source currently targets iOS 26, so minimum supported device/OS and actual installation path must be verified before telling the user they can install it. Keep the current Mac stable while preparing this isolated increment.
