# Transcript action implementation handoff

Only web/transcript.mjs was edited, under the exclusive central lease. Exact final source hash and executed18 browser checks are in TRANSCRIPT_ACTIONS_SOURCE_RECEIPT.json and TRANSCRIPT_ACTIONS_BROWSER.json.

Copy response is available when createTranscript receives a copyText callback and the response is nonempty. It copies exact raw answer text only, preserving Markdown, Unicode and newlines. It captures the answer when clicked, prevents duplicate pending calls, retains a stable keyboard-focusable button during polling, and announces success only after the callback resolves. Partial output is identified in the completion announcement. Failure leaves the answer intact and gives manual-copy guidance.

Late whole-response copy, code-copy and external-link error announcements are suppressed after the entry is removed or navigation switches to another conversation. Existing code/link rendering uses the same injected callbacks. No silent navigator.clipboard fallback or browser navigation was added; missing capabilities stay noninteractive.

Runtime integration still required:

```js
createTranscript({
  container: transcriptElement,
  scroller: document.querySelector('.response-scroll'),
  copyText: host.copyText, // Only when a supported acknowledged host capability exists.
  openExternal: host.openExternal, // Validated HTTP(S), explicit user activation.
  onStatus: message => { contentStatus.textContent = message; }
});
```

Use the actual adapter method names and binding needed by the runtime. Optional capabilities must not make an otherwise valid provider host fail parsing. Revalidate URL schemes/credentials/control characters at the host boundary. Clipboard writes are user-triggered and must not read clipboard contents implicitly. No response content may execute as HTML or shell commands.

Tests used actual canonical transcript/Markdown DOM with explicit callback doubles, not real clipboard or external-browser operations. They prove exact answer/code payloads, valid link callback, failure text, duplicate guard, pending/switch races, stable focus, partial output, invalid URLs, no remote image loading and unavailable actions. Independent read-only review found no concrete P1/P2 in this slice.

Run the native acceptance documented in TRANSCRIPT_ACTIONS_REVIEW.md after real capability integration. This handoff does not resolve native clipboard/opening by itself, and does not establish provider parity or release readiness.
