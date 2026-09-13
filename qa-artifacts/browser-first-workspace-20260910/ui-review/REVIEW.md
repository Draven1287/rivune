# Browser-first workspace independent UI review

Verdict: two P2 keyboard/focus defects; bounded layout improvement, not visual approval. Reviewed the real `http://127.0.0.1:4317/` root in a new reviewer-owned Codex app-browser tab. No harness, native, server, provider, cloud or Claude operation. Receipt's three SHA-256 hashes match independently before and after review. Source read: BrowserWorkspace.tsx; comparison criteria: DESIGN_VISUAL_ACCEPTANCE_NEXT.md. User rejection of the prior appearance remains authoritative; this review does not reverse it.

## Actionable findings

### P2 — Narrow Conversations overlay leaves keyboard focus behind it

At 320×844, activate Toggle conversations. Focus stays on the toggle. Tab reaches Results, then the transcript's Agent status labels card instead of entering navigation. The card's center is covered by `.bw-sidebar` (independent DOM hit test); its focus is therefore obscured. Escape on the toggle leaves aria-expanded=true. The sidebar overlays most of the chat without making obscured content inert or managing focus.

Correction: on opening narrow navigation, move focus into its visible navigation controls; prevent traversal into covered chat controls. Provide keyboard close/Escape and restore the toggle. Preserve an accessible close path if using modal behavior. Acceptance: keyboard-open → navigation focus → complete visible navigation traversal → Escape → exact toggle; no covered focus target. Test at 320 and desktop breakpoint transition, retaining draft.

### P2 — Results list/detail transitions discard focus

Desktop reproduction: Results → Tab from Close results to Agent status labels → Enter. The row unmounts and document.activeElement becomes BODY while dialog remains open. Clicking All results similarly leaves BODY because that button unmounts. No new heading/result row receives focus. Initial modal focus and Escape-to-header opener work, but internal transitions do not preserve orientation.

Correction: move focus to a focusable result heading when selecting a result; Back restores the exact result row (and list scroll position). Acceptance: keyboard-only list → detail → Back retains a visible meaningful focus target at each transition, with Escape restoring the original external opener. Repeat at 320. Do not substitute browser-only results for the host's exact artifact contract.

### P3 — Typography remains smaller and looser than proposed reading targets

Measured desktop body 16px/29.6px (1.85), author 13px, header title 14px, preview note 11px, composer helper 10px. Body is legible, but metadata/helper sizes are below the proposed 13–14px control/readability target and the body line-height exceeds 1.5–1.65. Recommendation: compare body 16px/25–26px with current spacing and raise actionable helper/metadata text to 12–13px minimum; retain clear differentiation from answer text. Do not fabricate a recommendation heading from arbitrary content. This is proposed polish, not a release-blocking accessibility certification.

## Reviewer-verified layout and behavior

- Desktop 1487×1058: document width=1487, main starts x244; body measure672px, form728px, textarea694px. Reading/card/disclosure share the leading edge; form edge is28px left (4px outside proposed24px target, a minor deliberate-choice discussion). Body/calm composer have opaque surfaces; galaxy is limited to sidebar, although its lower area also underlies Connections/account labels.
- Clearer author/sample badge, distinct result card and explicit demonstration disclaimer improve grouping compared with prior Quiet screenshot. Current sample is a different conversation, so this is not an equal-content pixel fidelity comparison or final visual selection.
- At320×844: document width320, composer area157.9px; form296px wide and114.5px high. Header and result action fit. Expanded Constellation scrolls to its final rows with28.1px clearance above composer (end657.98, composer top686.10). No horizontal page overflow or sample-end occlusion reproduced.
- Narrow Connections fits x17..303 and y86.4..757.6, with all content and Return reachable without clipping. Initial focus is Close connections. Desktop Tab reaches Return; Escape returns to Connections opener. Return to conversation focuses `browser-message` and retains exact synthetic draft.
- Draft was restored to the original empty value using keyboard Select All/Backspace and verified empty. The browser tool's empty-string fill did not clear it; no app data-loss claim inferred from that tool behavior. Reviewer viewport override cleared and own tab closed.
- Results displays plain sample code, and sample/nonconnected labels are explicit. No clipboard click, live send, installation or authentication attempted.

## Evidence

Screenshots use native capture density2: desktop2974×2116 for CSS1487×1058; narrow640×1688 for CSS320×844. Early captures with forced density produced compositor scaling artifacts and were overwritten; do not interpret those transient captures as app layout bugs.

- `desktop.png`: desktop root and sample draft during review.
- `narrow.png`: narrow root, no overflow.
- `narrow-end.png`: expanded disclosure at transcript end.
- `navigation-narrow.png`: overlay covers the chat.
- `connections-desktop.png`, `connections-narrow.png`: native HTML dialogs.
- `results-desktop.png`: sample code detail.

## Limits and next acceptance

This is BrowserWorkspace with recorded samples and unavailable desktop connections, not HostWorkspace, Constellation execution or backend acceptance. No testing of full member output/configuration, real durable admission, provider response, new-conversation persistence, OS clipboard, native startup, screen reader or200% zoom. No claim of complete contrast compliance or long arbitrary transcript coverage. Review the two focus corrections in this root; integrate accepted appearance with real host contracts only through the sole builder. User visual approval remains outstanding.

## Delivery limitation

Direct builder/lead delivery attempted after report creation, but `send_message_to_thread` is no longer callable in this turn and tool discovery exposes no replacement thread tool. Neither message was sent. This shared report is ready for coordinator/builder consumption; no delivery receipt claimed.

Builder subsequently notified this task that BrowserWorkspace.tsx is receiving clipboard lifetime/selection guards, pending-copy protection and dynamic participant count. The matching hashes above are the pre-correction checkpoint; CSS/composition reportedly unchanged. This review does not accept that incoming correction. Await its new hashes/receipt before focused recheck. The two UI focus findings remain distinct from the announced clipboard change.

## Frozen correction recheck

Builder supplied BrowserWorkspace.tsx SHA256 `94d3531e732d45b50d2efb1707eecf3652c3e76dea7831ac7d204b4a883c03d0`. Independently verified all four updated source-hashes.txt entries, including unchanged CSS and new browserCopyFeedback.cjs. Read corrected receipt/source. Owner reports15 deterministic hook/element-stub clipboard cases, typecheck/build PASS; these are not independently mounted clipboard acceptance.

Fresh reviewer-owned real-root tab: at1280×900, Results row keyboard Enter still leaves BODY focused; All results still leaves BODY. At320×844, Toggle conversations → Tab → Results → Tab focuses Agent status labels behind `.bw-sidebar`; Escape leaves expanded=true. Both existing P2 UI findings remain open on the frozen correction. Document width remains320. No new defect inferred from clipboard correction, no OS clipboard operation. Viewport override cleared and tab closed. Earlier screenshots remain pre-correction CSS/composition evidence, not newly captured corrected-state evidence. Direct task messaging remains unavailable in current tools; this addendum is the delivery artifact.

## Superseding focus closure

Both P2 findings are now closed by independent mounted root checks on ea71da17/652fd5bc. See FOCUS_CLOSURE.md for exact scope and limitations. Earlier sections preserve pre-correction evidence, not current open defects. P3 typography and visual approval remain separate.
