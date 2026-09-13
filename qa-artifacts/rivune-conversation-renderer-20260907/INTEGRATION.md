# Real conversation history and formatted responses

## Runtime owner integration contract

This is an isolated implementation candidate. Candidate4 and R2 remain owned by the runtime task. Copy only web/transcript.mjs, web/markdown.mjs, web/transcript.css and web/vendor/* after reviewing this contract. The remaining web files are a browser test harness and frozen visual reference: do not copy index.html, harness.mjs, rust-wire.json or styles.css into production.

Import createTranscript from transcript.mjs. Create one controller with the actual conversation container and response scroller. Pass copyText using the app's authorized clipboard path, openExternal using the host's verified external-browser opener, and onStatus using a concise dedicated live region. No callback means no corresponding interactive control. The Markdown module only accepts absolute HTTP(S) links without credentials. External image references are text/link affordances, never automatically loaded.

At the existing app.mjs render boundary, after snapshot validation and selection, call controller.render(snapshot, selectedConversationID). Catch a projection error and show a visible unavailable-history state without claiming a new answer. Remove the old latest-answer textContent assignment and old #answer observer; set welcome.hidden according to returned rows.length instead. Do not modify the composer, draft revision, submit gate, cancellation or retry handling. Update the conversation title from returned title. Call dispose on actual view teardown, not on each poll.

## Actual data binding

Current R2 source uses schemaVersion=1, run.conversationID and admitted.requestID/conversationID. Each visible user message is exactly admitted.prompt. Its response is run.answer; run.error remains independently visible. Codex/Claude labels and optional model come from admitted.provider, not the currently selected provider. Completed without answer, queued, running, failed, cancelled and partial output have distinct labels. Retried runs display their own admitted prompt/answer plus a retry note; no hidden deduplication or invented user messages occurs.

The current Rust host appends records with candidate.runs.push; this module preserves that array order. It deliberately never sorts by updatedAt, which is a completion timestamp and can change. The runtime owner was asked to confirm this ordering contract. If the host introduces paging/reordering, provide explicit admission order and a completeness contract before integration; do not pass partial snapshots that would masquerade as a complete conversation.

The projection rejects duplicate IDs, mismatched admission/run/conversation IDs and invalid response/status types before mutating the visible history. It excludes executable paths and approved private context from the UI projection. Unsupported app modes, cloud account sign-in, tools, agent delegation and artifact execution are not implemented by this renderer.

## Rendering and behavior

The vendored MIT-licensed Marked 17.0.5 lexer produces tokens; explicit DOM creation handles headings, emphasis, lists, task markers, quotes, tables, fenced and inline code, and callback-driven links. HTML is shown literally. No AI-produced HTML is injected, no code is executed, and no network request is made by formatting. Code copy preserves exact fenced contents. Code spans preserve literal entities. See VENDOR.json and retained license.

Unchanged polling preserves row/content DOM. Partial appends preserve identical earlier blocks, focused controls and selected text in growing plain-text nodes. Necessary structural changes can replace changed nodes; a changed code/link block restores a semantically matching focused control with preventScroll or moves focus to the stable response container when the original target is gone. This is not a claim that arbitrary Markdown rewrites preserve every text selection. Earlier reading positions are kept when the user is scrolled away from the bottom, and per-conversation positions are restored.

Responses above 250,000 characters remain complete selectable plain text to avoid expensive Markdown formatting. Math notation and syntax highlighting remain plain text; no claim of full feature parity with ChatGPT or Claude is made. The renderer currently receives snapshots; true token streaming requires the host transport.

## Evidence and limits

The browser suite begins with JSON generated from exact R2 serde definitions in tauri-wire-contract-r2-review-20260907; other cases explicitly mutate synthetic data. No provider, native app, credentials or user history is invoked. Test callbacks capture copy/open operations without changing the system clipboard or navigating externally. Tests cover actual DTO projection, formatted output, prompt/answer correspondence, states/partial errors, request ordering, corruption preservation, unsafe output, focus/selection, reading position, narrow layouts and complete large-output fallback. Visual evidence is marked synthetic.

Native webview behavior, external opener/clipboard implementations, runtime integration, complete supported conversation workflows and installed replacement remain acceptance gates.

Final rendered verification: 31/31 checks passed. See evidence/REVIEW.json and evidence/INDEPENDENT_REVIEW.md.
