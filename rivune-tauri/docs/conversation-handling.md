# Conversation handling

The shared UI now keeps independent, session-only reading positions for up to 50 conversations. Switching chats does not carry the previous chat's scroll offset into the next one. A reader following the bottom stays with new output; a reader reviewing earlier text keeps their place through response updates and completion formatting. Positions are intentionally not persisted across app restarts.

Conversation actions offers **Jump to message** when there are multiple prompts. It opens an anchored outline, moves the selected prompt into view, and places keyboard focus on it. The existing Latest control now describes messages rather than claiming there is an AI reply in a saved-only conversation. Its placement follows composer resizing.

Each user prompt has a small actions menu for copying or reusing it. Reuse opens a draft; it never sends a request. Existing new-conversation draft text is preserved and the menu says **Add to new conversation draft** when applicable. Real replies, simulated replies and the Council example offer consistent Copy reply feedback. Clipboard failure reports a manual-copy fallback; this does not introduce a native clipboard bridge.

Small-height windows retain a proportional silver R. Scrollbars, code blocks, focus rings and touch-visible prompt menus keep their existing behavior.

Validation: 82 tests passed, including independent reading positions, bottom-following during content growth, hidden-layout protection, clamping and deletion cleanup. Browser checks used one local-only QA conversation: navigation to its second message, switching away and restoring within one pixel, Copy prompt feedback, and reuse preserving an existing draft. No AI provider was contacted. QA conversation archived after checks; test draft cleared.
