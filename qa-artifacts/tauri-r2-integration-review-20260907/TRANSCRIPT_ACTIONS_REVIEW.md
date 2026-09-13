# Conversation action gaps in the current desktop source

Scope: bounded read-only audit of the canonical Tauri transcript. No native build acceptance, provider calls, clipboard writes, external URL launches or canonical edits. Exact source hashes and browser reproduction output are in TRANSCRIPT_ACTIONS_REVIEW.json; reproduction is transcript-actions-review.cjs.

## P2 — Code copying and response links are never connected

The app calls createTranscript with container, scroller and onStatus only (`web/app.mjs`, current line26). The renderer supports copyText/openExternal callbacks, but neither reaches it. markdown.mjs creates Copy code only when copyText is a function and emits plain spans for links when openExternal is absent. The current desktop-host.mjs exposes neither capability.

Actual canonical transcript reproduction with the same callback configuration produced one rendered JavaScript code block, zero Copy code buttons, and zero actionable links. The documentation label and URL remained plain text. This affects normal AI outputs, not just unusual markdown.

Required fix: wire explicit clipboard-write and validated external-browser actions through the real supported app capability boundary. Keep actions user-triggered. Do not navigate the app WebView to a provider-supplied URL; accept supported HTTP(S) links only, reject credentials/control characters and other schemes again at the host boundary. Clipboard must write only the selected code or answer, never silently read clipboard contents. Show success only after acknowledgement, and a recoverable error on failure. If a platform capability is unavailable, provide a clear selectable-text fallback rather than implying the action exists.

## P2 product gap — No whole-response Copy action

transcript.mjs creates the response footer with only a retry note. There is no action to copy an entire answer, even once the code-block callback is wired. Browser reproduction confirmed zero Copy answer/Copy response buttons.

Required fix: provide an accessible Copy response action for nonempty complete and partial answers, preserving exact source text and labeling partial output truthfully. A stale asynchronous acknowledgement must not report success for the wrong conversation after navigation. Retain keyboard focus and stable controls during polling and appended chunks. Do not copy hidden provider configuration or private context.

## Acceptance

- In the integrated native app, copy a code block and a full answer containing Unicode/newlines; verify exact expected clipboard content from the user-triggered write in an isolated QA context.
- Simulate a denied/failed clipboard action and confirm error feedback, text selection, and no false success.
- Click a valid HTTPS response link: the intended external browser opens while the app retains its conversation/draft. Reject javascript/file/custom schemes, embedded credentials and control-character input at both renderer and host boundaries.
- Repeat during partial response updates, navigation and reload; avoid lost focus, accidental repeated writes, and stale success announcements.
- Re-run transcript rendering and relevant host adapter checks after the wiring lands. These gaps are not resolved by a pure markdown callback test alone.
