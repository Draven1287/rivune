# Account, provider onboarding, and finished-output product audit

Date: 2026-09-06
Owner: independent account/output reviewer; decisions go to Audit Rivune native app.
Scope: current native source inspection only. No app/UI control, account activation, provider requests, implementation edits, or CP4 retest. Findings are source-supported product gaps, not reproduced runtime failures. Rendered interaction acceptance belongs to the independent UI reviewer.

## Verdict

Useful foundations exist, but provider choice still changes the experience substantially. The next increment should make connection recovery and continued work predictable before adding more provider names. “Installed,” “signed in,” “model advertised,” and “successful request” must remain distinct. None proves the others.

## Existing capabilities to preserve

- Account independence: `RivuneAccount.swift:283,326,377` explicitly preserves local conversations/provider connections on account sign-out or unconfigured account services. `SettingsView.swift:2231` offers local use. Actual OAuth configuration and callbacks were not exercised.
- Bounded CLI detection: `ProviderRegistry.swift:333–365,500–564` searches conventional locations, including bounded nvm/Volta paths in the inventory, and accepts manually registered executable locations without sourcing shell startup files. `TerminalAIService.swift:386` uses the expanded inventory directories for its built-in runtime resolver. Do not report the earlier narrow-path mismatch as a current runtime defect.
- Honest installed-versus-supported state: `ProviderRegistry.swift:433–442` marks installed CLIs without executable adapters as adapter-required. Custom registration does not itself enable execution (`:541–564`). This is a safety boundary, not a reason to launch arbitrary CLIs automatically.
- Provider-managed authentication: `TerminalAIService.swift:163–196` checks login status, not Rivune account identity; `StartupReadiness.swift:124–129` says model access/limits are confirmed on send. CLI-first/API fallback and route freezing already exist (`StartupReadiness.swift:30–61,185–192`).
- Usable static artifacts: `ProjectWorkspace.swift:17–81,1307–1485` validates immutable manifests, stages separate files, offers Preview/Open files, Save to folder, reviewed apply and revert. Path/size validation and explicit replacement review must remain. Preview explicitly blocks JavaScript/network requests and reports structural-only checks, not functional website verification.
- Continuation/recovery foundations: Council retries preserve their recorded workflow (`RivuneStore.swift:1274–1287`); normal chat has bounded history (`:1996–2031`). Universal API chat persists before sending and preserves visible unsaved answers with a warning (`UniversalAPI.swift:316–339`). These paths were inspected, not rerun.

## Five prioritized improvements

### AO-01 — P1: Give extra API providers the same output and conversation experience

**Evidence:** `UniversalAPIView.swift:116–141` renders answers with `Text(.init(answer))`; it does not use the primary artifact card in `Components.swift:327–334`. Its transcript and connection-keyed exchanges live in a separate `UniversalAPIWorkspaceStore` (`UniversalAPI.swift:232,316–339`). Startup routing remains the four built-in routes (`StartupReadiness.swift:124–150`).

**Impact:** Connecting another provider is not yet equivalent to using it in the main workspace. The same generated-file response can be a usable preview/save card in one route and raw response text in another. API availability does not establish Council membership.

**Proposed improvement:** Reuse a common response/artifact presentation and conversation identity contract for direct providers first. Show explicit “Direct chat only” capability where team execution is not supported; do not silently promote the connection into Council.

**Acceptance:** A synthetic identical manifest from built-in and extra-API routes exposes the same file preview/save actions; malformed manifests get the same recovery. Switching connections preserves each draft/history intentionally. Unsupported team membership is visibly unavailable before send. No credential or endpoint changes are implicit.

### AO-02 — P1: Turn provider failures into one specific recovery action

**Evidence:** `TerminalAIService.swift:183–192` maps nonzero authentication checks to signed-out. `:112–115,363–365,425–440` collapses several execution failures into broad process/provider errors. Setup offers general “Sign-in help” plus copy-login and manual refresh (`SettingsView.swift:2398–2487`).

**Impact:** A network problem, incompatible CLI version, unavailable model, or account limit can send the user toward sign-in or repeated retries without explaining which action can help. Login status is correctly not represented as proof of model access, but recovery remains generic.

**Proposed improvement:** Add sanitized, typed recovery categories where the adapter has reliable evidence: sign-in required, executable missing, unsupported CLI/version, model unavailable, limit reached, network failure, unknown. Pair each with one primary action (open provider setup, select supported model, refresh, or retry). Preserve an unknown fallback; do not infer account quotas from arbitrary text.

**Acceptance:** Fixture responses for each category yield distinct actionable copy; unknown failures remain unknown. A blocked request preserves its prompt/files and never auto-switches provider, incurs another call, or exposes raw credential-bearing output. Retrying uses the corrected configuration explicitly.

### AO-03 — P2: Make discovery and setup a single capability-led journey

**Evidence:** Inventory can list multiple CLIs/custom paths (`ProviderRegistry.swift:500–564`), while first-run CLI setup embeds inventory and then separately renders fixed ChatGPT/Claude rows (`SettingsView.swift:2299–2326`). Unsupported installed providers stop at “reviewed runtime adapter required” (`:1139–1143`).

**Impact:** Users can reasonably interpret “found” or “added” as “connected,” then discover there is no usable route. Duplicated inventory and built-in setup concepts also require users to work out which status matters.

**Proposed improvement:** One connection row per provider/route with explicit states: Found → Adapter supported → Signed in → Request verified. For an unsupported CLI, offer a clear capability explanation and a separately confirmed API setup path if applicable. Never present importing an executable as integration completion.

**Acceptance:** Fixtures for absent, found/unsupported, signed-out, signed-in/not-request-tested, and failed-request states have accurate labels and one next step. Local workspace remains available without a Rivune account. Custom executable registration cannot replace a reviewed built-in adapter. User-facing copy does not promise arbitrary CLI support.

### AO-04 — P1: Repair unusable file output without making users invent a prompt

**Evidence:** `Components.swift:327–334` detects an invalid apparent manifest but only says to ask for complete safe files. `ProjectWorkspace.swift:26–57` requires one strict summary/files manifest; `:103,152–156` bounds the workflow to static supported file types and size limits. The viewer has a useful save path; it is not a general app build/runtime verifier.

**Impact:** A coding answer may be readable but unusable as files, and the user must diagnose the formatting failure. Requests for package-based websites or other languages exceed the current file workflow even if the model produces plausible code.

**Proposed improvement:** Add an explicit “Repair file format” action preserving the original response and request, with a bounded additional call and revalidation. Explain unsupported project types before promising a preview; expose original code for manual use. Keep static preview labeled as static.

**Acceptance:** Invalid JSON, duplicate/traversal paths, oversized and unsupported files never write. Repair requires user action, has a clear failure result, and leaves original output accessible. A valid result offers Preview/Open files then reviewed Save. No “working website” claim follows structural checks alone.

### AO-05 — P1: Bind follow-up edits to the actual artifact or project snapshot

**Evidence:** `RivuneStore.swift:1996–2031` limits history to eight turns/12,000 bytes and may clip the newest entry; generated code may therefore not be fully present in a subsequent request. `ProjectWorkspace.swift:720–723` supports manually attaching a snapshot, but artifact viewer controls (`:1353–1485`) do not bind a follow-up to an artifact revision. Extra API history instead accumulates completed exchanges until a 256,000-byte rejection (`UniversalAPI.swift:168–180`).

**Impact:** “Change this website” can refer to a visible full artifact while the model receives incomplete code. Another route eventually rejects accumulated history. Users must understand hidden context rules to continue reliably.

**Proposed improvement:** Offer “Continue editing these files” tied to an immutable artifact revision or freshly consented project snapshot. Report files included/omitted and context limits before send. Provide a safe context-summary/new-conversation handoff for long API chats, not silent truncation.

**Acceptance:** After restart and with an artifact larger than the chat history budget, a follow-up receives the selected full supported files or is blocked with an explicit selection action. External edits require a refreshed snapshot; existing conflict checks remain. No stale artifact overwrites newer files. Long API chat recovery preserves the original transcript and identifies what carries forward.

## Verification boundary and coordination

Source presence is verified; live onboarding, account auth, real provider failure taxonomy, actual artifact rendering/save/reopen, and continuation quality remain unverified in this audit. No closed CP4 claims are reopened. The independent UI reviewer owns rendered findings; share these identifiers to avoid duplicate implementation work.

Recommended root order: AO-02 + AO-05 first, AO-04 next, then AO-01/AO-03 as the provider experience is unified. This is a recommendation, not authorization to expand adapter or account capabilities.

## Source fingerprints at inspection

The worktree is active. Line references apply to these inspected contents; recheck before implementation.

```text
e1f7c0c3fe4b9540ffe82145c09fed0c7c0a6ba4b60095557a8fedbf38d8cf8e Rivune/StartupReadiness.swift
ab730234fe612e160fda358234a6c3982bdb3557e19bb6b4592f1d103744b98f Rivune/ProviderRegistry.swift
b78b67ffd65d15173674f61caf8668f0177d634b92b898af82f6719f66d00e31 Rivune/TerminalAIService.swift
c2de24e51fd62545d117819893736fc592f6ae860fc2885088827f91665b145b Rivune/RivuneAccount.swift
75d30a0d41a017a65da15a773822be726b4d5d789419cf1cc7f94e43718e39f9 Rivune/SettingsView.swift
0000336b232893d25153272bb47428ef4dab5f6b0c5663c6c9a1f7212e108bc7 Rivune/UniversalAPI.swift
b49cd48fc479232bafaa6112340db37390c3f30f658a0e3aa29ebe03f944fc7a Rivune/UniversalAPIView.swift
2b56b6da1811ce9a95b17112a3a3d9366434dbc225cb95be7bd1ee8ae1a078b8 Rivune/ProjectWorkspace.swift
14eeed4b6c6a6bca3d30b4f056def596b2b54c68d672a1a5a5f40796f041c3ce Rivune/RivuneStore.swift
fb5c30af7174d41d0b994de89cc03face5c37daedcabd4a62010dba557f69d84 Rivune/Components.swift
```
