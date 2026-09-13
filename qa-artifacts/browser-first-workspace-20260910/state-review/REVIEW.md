# Browser-first workspace — source/state review

**CHANGES REQUESTED — P2 stale sample-copy feedback.** Draft switching/restoration checks passed within the isolated preview-store scope. No real or simulated send was found on the new entry path.

## P2: copy completion is not bound to the selected result

BrowserWorkspace's Copy sample text handler captures result A, awaits clipboard.writeText, then sets shared copyStatus without a selection/lifetime check. A user can select All results and open B before A completes; B then announces “Copied sample text” even though the operation copied A. Rejection can similarly publish stale failure. Closing/reopening or another pending copy has the same missing invalidation boundary.

Bind feedback to a conversation/result/open generation and invalidate it on back, close, selection change and unmount. Prevent duplicate pending copies or account for their ordering. The already-issued clipboard write cannot be cancelled; the correction should suppress stale status rather than claim to undo it. The existing host saved-result copy helper provides a separately reviewed pattern, but do not bypass its identity assumptions when reusing it.

[check.cjs](check.cjs) reproduces this using the actual captured BrowserWorkspace with hook/element stubs and a deferred synthetic clipboard. Result B is displayed when A's completion publishes success. [check.log](check.log) records the reproduction. No OS clipboard write or browser interaction occurred.

## Routing, storage and provenance

All three receipt hashes match current source, captured beside this report:

- App.tsx: `73ff1f366a55d7d5e42302e6155c1199642e7d564e5e3c92d3008580a5aed5da`
- BrowserWorkspace.tsx: `f539eea295b162a36cf7d693f09a611ffcca41252fbb223865137cec8e018598`
- browser-workspace.css: `097e6405c1bbddb1f5166132839d90b8a53068300ac0d55679fbf6adeb1a8d2c`

Unmarked browsers route to BrowserWorkspace. Desktop markers with absent/null/primitive/accessor bridge still produce the unavailable fallback without invoking an accessor. An object bridge routes to HostWorkspace and existing adapter validation, including partial objects. The browser path does not substitute for desktop failure.

BrowserWorkspace calls the existing preview hook for history/new/select and the existing draft store for exact per-conversation text. The form submit only opens Connections. It does not call sendDemoMessage, create a canned answer, save a host draft, configure a provider or claim a response. Search filters title rows only; it does not mutate the active ID, transcript or draft. New/select clear local result selection and request composer focus, leaving the prior conversation draft keyed in the store.

An independent deterministic check runs the actual useWorkspaceDemo and createDraftStore with private Map-backed session storage. New chat starts with its own empty draft; switching back restores exact original text; fresh hook/store instances restore the active ID and both drafts. This simulates reload storage reconstruction, not a browser reload, storage quota, focus, or React scheduling test. Preview history remains tab-local and storage failures retain existing in-memory notices; reload persistence is conditional on successful session writes.

Results are limited to sample artifacts referenced by current conversation messages. Their contents originate from the fixed demo data, not host artifact inspection or generated provider output. Sample workspace/answer/result labels and demonstration-role disclaimer preserve that boundary. The hardcoded “3 sample participants” label assumes the seed roster even though restored preview history can contain another valid agent count; derive that count from the displayed roster before broadening this sample surface. Existing interrupted-demo history may retain old “send again” text; that is historical sample content, not an executable action on this entry.

## Safe shared-presentation boundary

Extract stateless sidebar/search, transcript rows, composer layout, connection-status layout and result list/detail layout behind explicit props and callbacks. Keep routing, useWorkspaceDemo/session persistence and browserDraftStore in the browser adapter. Keep host controller, durable admission/configuration recovery, shutdown and artifact inspection in the host adapter. Do not move demo send/history semantics into HostWorkspace.

The shared result model must carry an explicit sample-versus-verified provenance and stable identity; host rows additionally require conversation/request/artifact/digest binding and stale-result invalidation. Composer props need exact text, edit callback, submission capability/reason and confirmation/recovery state, not a generic send callback that always succeeds. Connection handoff and Results focus/lifetime remain owner-managed; presentation extraction must preserve mounted ProviderSetup and draft nodes.

UI reviewer owns direct root-route interaction and focus checks. This review did not operate the harness or root browser route, mutate production storage, write production/candidate source, or perform native/server/cloud/Claude/provider actions. No mounted/browser or native acceptance is claimed.
