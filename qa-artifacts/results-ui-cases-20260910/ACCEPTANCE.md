# Results interaction fixtures

Synthetic data and deterministic proposed UI acceptance, not a production test run. Only this directory was written. No server, browser, native app or provider was used.

## Inputs and integration

`dto-fixtures.json` contains three triplets with the actual current TypeScript names HostArtifactRequest, HostArtifactSummary and HostArtifactInspection. A and B belong to conversation-a; C belongs to conversation-b and deliberately has identical bytes/hash to A. Names also collide. Request payloads contain exactly four keys. Byte lengths and SHA-256 values are computed from exact UTF-8 text, including a final newline. `source-baseline.json` identifies the inspected source bytes; these may change while the builder works.

These are artifact DTOs, **not complete HostSnapshots**. The builder must join them into its existing valid fake-host snapshot: conversations conversation-a/conversation-b and runs run-a/run-b/run-c with their indicated conversationID and frozen admitted.provider.id = provider-a. Use completed direct runs with answer equal to the corresponding inspection text. Do not pass skeletal invented runs through the real snapshot parser. Current parser requires displayName `Final answer`, available/plainText/null languageHint, and provider identity matching the admitted run. Fixture artifact IDs are valid synthetic public IDs, not evidence that native host issuance produced them.

`provisional-unavailable.json` deliberately separates future missing/corrupt/unreadable metadata from current valid DTOs. Current parser must reject each as incompatible. The proposed HostArtifactSummaryV1/HostArtifactInspectionV1 names in the contract are not current exported names. Future unavailable inspection text omission/nullability and structured transport error shape remain unspecified. No fixture should cast these to the current type or claim an unavailable-content response has passed validation. Current transport failures can exercise recoverable error UI without widening DTOs.

## Deterministic runner protocol

Consume interaction-cases.json as event scripts. Use manually controlled promises named a1/a2/b1, no timers or sleeps. Before each case reset selection, pane, pending promises, focus, call log, clipboard stub and draft; active conversation starts at conversation-a. `select A` means opening Results first if needed, then activating the A row. Flush the application's settled render after each event. Assert intermediate loading has zero text from any previous selection and zero copy controls. Assert outcomes again after the last late completion.

Capture the inspection call log and compare each payload exactly with the referenced HostArtifactRequest. a1/a2 are runner-local handles, never DTO fields. The UI request generation, focus target names, selected state and expected outcome properties are acceptance vocabulary only. They are not additions to the bridge. Record zero pane-induced save, submit, retry-invocation, configuration, URL-open or filesystem calls for every case; navigation may perform its existing authorized draft save, counted separately.

For retry-duplicate, keep the Retry button while pending but move focus synchronously to inspector-heading:A before disabling it. Expected final focus is therefore exactly inspector-heading:A; asynchronous success does not move it. The same-tuple race uses close/reopen because normal duplicate retry is blocked: old and new requests share all four payload fields but only a2 belongs to the current generation.

## Exact focus targets

Bind these logical handles to real nodes in the later UI fixture; do not add test IDs to production merely to satisfy this document:

| Handle | Required target |
| --- | --- |
| results-button | Current conversation header button with visible Results count |
| results-heading | Visible Results heading, tabindex -1 |
| result-row:A | Native list button bound to artifact-a; distinguish by tuple, not title |
| inspector-heading:A/B | Visible selected-item heading, tabindex -1, bound to that exact artifact |
| conversation-button:conversation-b | Existing Conversations list button for conversation-b |
| Message | Existing textarea with accessible name Message |
| chat-heading | Current conversation h1, programmatically focusable fallback |

For failed-navigation, activate the conversation button with keyboard focus on that button. Failure retains focus there unless an existing modal deliberately owns it; test without a modal. Successful-navigation case is specifically narrow mode and must end at Message after each successful navigation. Back with removed row goes to results-heading. A snapshot that removes the current selection while focus was in its inspector synchronously moves focus to results-heading. Close with missing Results opener goes to chat-heading. Escape outside Results does nothing. An open Settings/SavedResult modal owns Escape first; do not bubble it into pane close.

## Rendered completion criteria

Run every script at 1280×800 and 390×844; repeat focus/back/close, unavailable and successful-navigation cases at 320×568. Narrow mode replaces the chat region while keeping its draft/transcript mounted and inert. Assert no hidden chat tab stops, no page horizontal overflow, internal long-text scrolling, reachable Back/Close controls and unchanged draft/transcript scroll after closing. Desktop keeps Chat keyboard-reachable. Focus assertions compare document.activeElement to the bound node, not merely existence or label text.

The future unavailable-state UI cases must each start with available A displayed, then select a separate unavailable record: clear A immediately, retain the unavailable row, show its exact state message, omit copy/text, and inspect only on explicit retry. Until the DTO expands, run these as parser rejection cases and mark the rendered state coverage deferred. Never report those future cases as current UI passes.

## Evidence and next dependency

Generated data integrity checks verify JSON, UTF-8 byte count, SHA-256, exact request keys and matching triplet identities. They do not verify production parser acceptance or browser interaction. Next dependency: builder's independently accepted artifact bridge plus Results UI/controlled fake-host fixture. At that point bind these scripts to real nodes/promises and record actual pass/fail results. Preserve the existing SavedResult dialog until replacement is independently proven.
