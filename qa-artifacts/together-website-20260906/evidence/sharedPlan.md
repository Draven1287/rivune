## Goal
Produce a complete, polished, accessible two-file static website for Lantern Pages, a fictional neighborhood book club, and return its full source as exactly one fenced JSON object in the required shape. The deliverable is working code, not a plan.

## Collaboration approach
Complementary workstreams against a contract frozen **before** either provider starts, so both work in parallel with no blocking handoff. Codex owns `index.html` (structure, copy, navigation). Claude owns `styles.css` (palette, typography, layout, responsive behavior, focus and disclosure styling). The contract below is the single source of truth; neither provider may add an ID or class outside it without amending it in one place and notifying the other. After both drafts exist, each provider inspects the other's actual code against the review checklist, preserves what works, and proposes concrete fixes rather than rewrites. Claude then performs the integration pass and emits the final JSON; Codex signs off on the assembled pair first.

## Shared requirements
**Frozen structural contract** (both providers code against this from the start):

| Landmark | Element | ID |
|---|---|---|
| skip target | `<main id="main" tabindex="-1">` | `main` |
| header | `<header class="site-header">` with `<nav class="site-nav">` | — |
| hero | `<section class="hero" id="hero">` | `hero` |
| next meeting | `<section class="section meeting" id="next-meeting">` | `next-meeting` |
| selections | `<section class="section selections" id="selections">` | `selections` |
| FAQ | `<section class="section faq" id="faq">` | `faq` |
| footer | `<footer class="site-footer">` | — |

Permitted class list (no others without amendment): `skip-link`, `site-header`, `brand`, `site-nav`, `site-nav__link`, `hero`, `hero__title`, `hero__lede`, `hero__actions`, `btn`, `btn--primary`, `btn--ghost`, `section`, `section__title`, `section__intro`, `meeting__grid`, `meeting__item`, `meeting__label`, `meeting__value`, `card-grid`, `card`, `card__tag`, `card__title`, `card__author`, `card__blurb`, `faq__item`, `faq__q`, `faq__a`, `site-footer`.

**Frozen palette** (declared once as custom properties on `:root`; both providers reason about these exact values):
`--cream #FBF5EA` (page), `--paper #FFFDF8` (cards), `--ink #23201C` (body text), `--ink-soft #554E45` (secon
[truncated]

## Codex task
**Inputs:** the original user request and the frozen contract above. No wait on Claude.

**Deliverable:** complete `index.html`, ≤ 7,500 bytes.

- Skip link as the first focusable element in `<body>`: `<a class="skip-link" href="#main">Skip to main content</a>`, targeting `<main id="main" tabindex="-1">`.
- Semantic landmarks: `header`, `nav`, `main`, `section` (each with an accessible name via its `section__title`), `footer`. Exactly one `<h1>`, in the hero. Heading levels descend without skipping.
- Header nav with three links to `#next-meeting`, `#selections`, `#faq`.
- Hero: memorable, specific `h1`, a short lede, and two CTAs — `.btn.btn--primary` → `#next-meeting`, `.btn.btn--ghost` → `#selections`.
- Next-meeting section using a `<dl>` inside `.meeting__grid` with 4 `.meeting__item` pairs (date/time, place, book, what to bring or how to join). Wrap the date in `<time datetime="…">`.
- Three `.card` elements inside `.card-grid`, each with `.card__tag` (e.g. "This month" / "Next up" / "In December"), `.card__title` in an `<h3>`, `.card__author`, and `.card__blurb`.
- FAQ: 4 `<details class="faq__item">` with `<summary class="faq__q">` and a `<p class="faq__a">`. Native disclosure only; no `open` attribute on more than the first, if any.
- Footer with a link back to `#main` or `#hero` and a short fictional club line.
- Every `href` beginning with `#` must match an `id` that exists in the document. No empty `href`, no `href="#"`.

**Review obligation:** after Claude's CSS exists, inspect the actual stylesheet for selectors that reference classes not in the markup, markup classes with no styling, prohibited resources, focus suppression, contrast changes, and anything that would push a fixed width past 390px. Report findings as concrete, minimal fixes and preserve Claude's design decisions where they work.

## Claude task
**Inputs:** the original user request and the frozen contract above. No wait on Codex.

**Deliverable:** complete `styles.css`, ≤ 6,000 bytes.

- Warm cream/ink/terracotta editorial system built on the frozen custom properties, declared once on `:root`.
- System fonts only, e.g. a serif stack (`ui-serif, Georgia, 'Times New Roman', serif`) for display headings and a system sans stack (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`) for body — or all-serif if it reads better editorially. No webfonts, no `@font-face`, no `@import`.
- Mobile-first: single column at base; `.card-grid` uses `grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr))` with `min-width: 0` on grid and flex children; `.meeting__grid` goes two-column at a `min-width` breakpoint. Content wrapper capped around `68rem` with `clamp()`-based side padding and `margin-inline: auto`.
- Overflow guards, all inspectable: no fixed `width` or `min-width` greater than ~330px; no `100vw`; no `white-space: nowrap` on any element containing prose; `overflow-wrap: break-word` on `body`; `box-sizing: border-box` globally; fluid type via `clamp()` rather than fixed large sizes.
- `.skip-link` visually offscreen by default (clip/position technique, not `display:none`), fully visible and legible on `:focus`.
- Focus per the frozen rule. Hover and focus states differ from each other and from resting state.
- Native disclosure styling: style `summary` with a visible affordance and `cursor: pointer`; if using a custom marker, remove the default via `list-style` / `::-webkit-details-marker` and supply a CSS-drawn replacement (borders/transforms only, no images). Never hide the summary text.
- Hero interest built from CSS only — gradients, rules, layered background colors, letterspacing, a terracotta accent bar. No images, no `url()`.
- Any transition wrapped by a `@media (prefers-reduced-motion: reduce)` opt-out.

**Review obligation:** after Codex's HTML exists, inspect 
[truncated]

## How the work connects
The contract removes the handoff that would otherwise block both providers: because IDs, class names, palette values, focus rule, content dimensions, and byte budgets are fixed up front, Codex's markup and Claude's stylesheet are compatible by construction rather than by negotiation. The dependency that remains is verification, and it runs in both directions: Codex's markup is what makes Claude's selectors resolve, and Claude's stylesheet is what makes Codex's skip link, focus visibility, and responsive layout actually function. Neither file satisfies the accessibility requirements alone — the skip link needs Codex's anchor plus Claude's visible-on-focus styling; contrast needs Claude's values plus Codex's use of them for real text; no-overflow needs Codex's short tokens plus Claude's fluid layout. Each provider reviews the other's completed code against the checklist above, keeps the other's good ideas, and states findings as inspection. If a review finding requires a contract change, the contract is amended once and both files are updated to match; the contract, not either provider's preference, is the tie-breaker.

## Definition of done
Each item is checkable against the emitted text:

1. Output is exactly one fenced `json` block parsing to `{"summary": string, "files": [...]}` with exactly two entries, paths `index.html` and `styles.css`, each with complete contents.
2. `index.html` ≤ 7,500 bytes, `styles.css` ≤ 6,000 bytes, combined ≤ 15,000 bytes; the counts are stated.
3. `index.html` contains `<!DOCTYPE html>`, `<html lang="en">`, `<meta charset>`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, a `<title>`, and a `<meta name="description">`.
4. The only external reference in either file is `href="styles.css"`. Zero occurrences of `<script`, `<img`, `<iframe`, `<form`, `<input`, `<button`, `rel="icon"`, `@import`, `@font-face`, `url(`, `http://`, `https://`, `//`-prefixed URLs, or `javascript:`.
5. Every `href` starting with `#` matches an `id` present in the document; no `href="#"` and no empty `href`. IDs `main`, `hero`, `next-meeting`, `selections`, `faq` all exist.
6. First focusable element in `<body>` is `.skip-link` targeting `#main`; `<main id="main">` exists; `.skip-link` is offscreen at rest and visible under a `:focus`/`:focus-visible` rule.
7. `styles.css` defines a `:focus-visible` rule with a visible outline and offset; there is no `outline: none` or `outline: 0` without an equivalent replacement in the same rule.
8. Text colors resolve to the frozen palette pairs; if any pair changed, the new contrast ratio is computed and stated, and is ≥ 4.5:1
[truncated]