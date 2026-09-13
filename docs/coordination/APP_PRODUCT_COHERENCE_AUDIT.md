# Rivune app product-coherence audit

Date: September 9, 2026  
Scope: read-only review of `prototypes/ai-native-workspace` and the existing browser preview at `http://127.0.0.1:4317/`. No provider, host, terminal, filesystem, desktop, packaging, or publication operation was performed.

## What works now

The chat-first revision follows the current direction much more closely than the earlier dense workspace. Conversation is the primary surface, files and artifacts open alongside it, New conversation is immediate, and the preview repeatedly identifies synthetic data and the absence of a connected AI. The empty conversation, seeded example, artifact entry point, draft preservation, and collapsible secondary areas form a coherent browser demonstration.

## Highest-impact gaps

### P1 — First launch identifies the blocker but offers no next action

**Observed:** The header says “Design preview · no AI connected,” the composer says “Local simulation · no AI connected,” and Settings repeats that no providers are connected. The composer still occupies the primary action area and can produce a fixed simulated answer. There is no Connect provider action in the workspace or Settings.

**Reproduction:** Open the preview, choose **New conversation**, then open **Settings**. The empty conversation invites a demanding task, while Settings only describes the fixed demonstration.

**Source evidence:** `src/App.tsx:26-35`; `src/components/chat/ChatPanel.tsx:41-58`; `src/hooks/useWorkspaceDemo.ts:101-155`.

**Why it matters:** A professional cannot tell how to move from evaluation to useful work. Repeated “not connected” copy explains state but does not resolve it, and a working-looking composer risks confusing a demonstration with a real provider response despite the labels.

**Acceptance criteria:**

- When no provider is connected, the empty conversation presents one clear **Connect AI** action beside an explicitly named **Try local demo** action.
- **Connect AI** opens the real connection flow or an honest unavailable-state screen with the exact next step; it never starts a simulated response.
- Demo mode remains visually persistent during the full response and in its result card.
- A connected state replaces the demo action with the selected provider/model and a truthful health state.

### P1 — Constellation is announced but is not a meaningful choice

**Observed:** Every conversation displays “Constellation · lead + 2 members,” while the sidebar disclosure only lists three fixed demo agents and status words. There is no Single AI/Constellation choice, lead/member selection, explanation of the coordination benefit, or direct path to configure it.

**Reproduction:** Create a new conversation and expand **Constellation** in the sidebar. The user can view fixed idle agents but cannot understand or change how the next message will be handled.

**Source evidence:** `src/components/chat/ChatPanel.tsx:41-43`; `src/components/sidebar/Sidebar.tsx:71-76`; `src/App.tsx:35`.

**Why it matters:** Constellation is Rivune’s product distinction. In the current journey it reads as decorative status rather than a capability that earns the additional complexity.

**Acceptance criteria:**

- The composer exposes a compact, keyboard-accessible choice between **Single AI** and **Constellation** before sending.
- Selecting Constellation shows the lead, members, and concise purpose in one nearby popover or sheet; configuration has an explicit entry point.
- During a run, the conversation distinguishes observable member contributions from the combined result and labels partial failure, retry, cancellation, and completion.
- Demo and connected configurations use the same information structure, with demonstration state clearly labeled.

### P1 — The galaxy competes with sustained reading

**Observed:** With the default Milky Way treatment on, bright stars and nebula detail remain visible directly behind the conversation, composer, sidebar navigation, and status shelf. The visual identity is strong, but the reading surface changes contrast continuously across the page.

**Reproduction:** Open the seeded **A calmer workspace** conversation at desktop width and scan the long assistant paragraph, composer placeholder, sidebar labels, and shelf summary. Their backgrounds expose different high-detail regions of the image.

**Source evidence:** `src/styles.css:33-43` deliberately makes the galaxy continuous through nearly transparent surfaces; `src/App.tsx:15-20,35` makes this the default and provides the appearance toggle.

**Why it matters:** Rivune’s galaxy identity should frame demanding work. Direct image detail under long-form text increases visual noise and works against the stated calm, dependable reading experience.

**Acceptance criteria:**

- Keep the Milky Way visible around the workspace and in deliberate identity moments, while conversation, composer, dialogs, and editor use stable reading surfaces with consistent luminance.
- Verify body copy, secondary text, focus rings, and disabled controls against WCAG AA contrast across both Milky Way and calm appearances.
- At desktop and narrow widths, no bright star or nebula edge sits directly beneath paragraph text or editable content.
- Appearance changes preserve draft, scroll position, selected conversation, and open artifact state.

## Review boundary

This audit assesses the browser demonstration’s product coherence. It does not verify live AI quality, provider discovery, Tauri host integration, persistence across restart, signed distribution, updater behavior, or App Store readiness.

Source snapshot hashes reviewed:

- `App.tsx` — `e04725261335ddf1d63099d358ba092632497150ff729ef01cd147fccb9838ae`
- `ChatPanel.tsx` — `639663e3e91551d796b0c4a0094091f62355f20116920a45807cd107bf2c48c4`
- `Sidebar.tsx` — `8c90705e9cccd799aebc48f836d2bc5417c2dda08035ceb834036f6d8ff2a775`
- `useWorkspaceDemo.ts` — `bd67cc0d963a30b593382b5ba64adf2fd56ebb9aee58b726ec75dbfb1d46a72f`
