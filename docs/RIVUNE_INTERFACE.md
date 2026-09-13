# Rivune interior interface contract

The platform owns window chrome, file pickers, permissions, authentication sessions,
Keychain, notifications, and security confirmation. Rivune owns the workspace
inside it. No rendered Mac traffic lights belong in the browser or Windows.

## Tokens

Canonical native values are in `Rivune/Theme.swift`, mirrored in
`website/app/rivune-tokens.css`. Canvas #070a0e; surface #0d1117; raised #171e27;
control #121820; silver-blue accent #c0def3. Text opacity 94%, secondary 70%, muted
52%. Controls are at least 36 points tall, radius 10; panels radius 16; base gap
12. Use platform text rendering and meaningful text styles, silver wordmark only
for branding. Main reading surfaces use a strong scrim; galaxies remain peripheral.

## States and semantics

Selected: raised surface and checkmark, exposed to accessibility. Focus: visible
silver-blue outline independent of hover. Disabled: 50% opacity and disabled
semantic state; hide actions with no valid target. Errors include a recovery
action and never imply successful auth or a saved file. Motion is decorative,
optional, and disabled with Reduce Motion. Keep original files intact when a
reference is removed.

`RivuneButtonStyle`, `RivuneSelect`, `RivuneActionMenu`, `RivuneCardStyle`, and
`RivuneCheckmarkStyle` are the first native component set. Selects support arrow
keys, Return/Space, Escape, scrolling, and accessible selected values. System
confirmation remains for destructive actions. Settings > About > Interface
preview exposes the initial component gallery. This is an initial set, not a
claim that every legacy control has been converted or audited.

## Projects

Same concept across platforms: name, instructions, selected file references,
chats, assistant defaults. Local Mac bookmarks supply access; Rivune account
supplies identity; connected AI supplies answers. File inclusion in a project is
separate from explicit approval in the composer for each request. Approved context
is included as attached text, goes to the displayed providers, and becomes part of
that conversation. Earlier shared context can remain in history. Changed/missing
files block sending until refreshed and selected again. Context is bounded to the
existing 20 KB budget with no silent truncation.

Browser parity is a follow-up after native verification: use the shared CSS tokens
and semantic HTML controls; do not pretend web file permissions equal Mac bookmarks.
No new web Projects implementation or cross-platform visual equivalence is claimed
by this first native pass.
