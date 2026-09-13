**Review verdict (brief):** The incumbent plan is sound and its shape — complementary workstreams with `index.html` and `styles.css` owned separately — is the right fit, because the user's request *itself* specifies that split. I am not replacing it. The revision below keeps its structure, tokens, class inventory, and orchestration, and repairs six concrete gaps: unowned SVG color/theming (the seam most likely to produce a broken hand-off), an unstated cover count, no rule against inline `<style>`/`style=`, undecided motion policy, undecided placement of the fiction disclosure, and a definition of done leaning on subjective words ("polished", "elegant", "substantial"). Confidence is high on structural items, provisional on visual fit until an actual preview happens.

# Goal

Deliver one finished, distinctive Lantern Pages website — a single coherent artifact, not two rival sites and not a proposal. Art direction: independent literary journal crossed with an inviting evening reading room. The first screen must read as composed: asymmetrical, a concise welcoming headline, visible next-meeting detail, and substantial original inline artwork. No giant type as a stand-in for visual content, no emoji, no generic grid of interchangeable rounded cards.

Known facts: the project snapshot is empty, so nothing is inherited; only `index.html` and `styles.css` may be proposed; no JavaScript, external assets, packages, tracking, or build step; Rivune's preview disables JS. Inference: the prior "generic template" is described, not supplied, so there is no incumbent implementation to preserve — only its failure modes to avoid. Assumption: no browser rendering is available to either provider; all findings are code/design inspection and must be labeled as such.

# Collaboration approach

Complementary workstreams against a frozen interface. Codex authors all semantic content and inline artwork; Claude authors the entire visual system and responsive behavior. Neither writes in the other's file.

Orchestration is fixed and not up for renegotiation: Codex plans, Claude reviews the plan, both produce in parallel, both partner-review, Codex integrates first with Claude as fallback. There is no separate sign-off step. Reviews must cite specific elements or selectors. Disagreement is not a deliverable: if a review finds no supported improvement, it says so.

# Shared requirements

Frozen before production. Deviations are permitted only if documented in the hand-off.

- **Files:** `index.html` contains exactly one `<link rel="stylesheet" href="styles.css">`. No `<script>`, no `<style>` block, no `style=` attribute on HTML elements, no external URLs, no emoji.
- **Landmarks:** skip link (first focusable element) → `#main-content`; `<header class="site-header">`; `<nav class="primary-nav" aria-label="Primary">`; one `<main id="main-content">`; `<footer class="site-footer">`.
- **Section IDs (nav targets):** `#gathering`, `#shelf`, `#evening`, `#questions`. Note the deliberate mismatch: the FAQ section uses id `#questions` with class `.faq`.
- **Headings:** exactly one `<h1>` (in the hero); each `<section>` has an `<h2>`; no skipped levels.
- **Primary action:** an `<a class="button-link" href="#gathering">` in the hero. No form, button, booking, signup, payment, or success state anywhere.
- **Class inventory:** `.site-header`, `.brand`, `.primary-nav`, `.skip-link`, `.hero`, `.hero__copy`, `.hero__art`, `.eyebrow`, `.button-link`, `.gathering`, `.gathering__cover`, `.gathering__details`, `.meeting-facts`, `.shelf`, `.shelf__list`, `.book`, `.book__cover`, `.evening`, `.evening__sequence`, `.faq`, `.site-footer`, `.fiction-note`. Codex may add descriptive classes; any addition must be listed in the hand-off, and Claude's CSS must not break if an optional class is absent.
- **Meeting data:** heading + editorial description + `<dl class="meeting-facts">` with four `<dt>`/`<dd>` pairs: date, time, venue, reading.
- **FAQ:** native `<details>`/`<summary>` pairs inside `#questions`. Four to five entries. No JS.
- **Artwork:** exactly five inline SVGs — one hero reading-table illustration (`.hero__art`), one featured cover (`.gathering__cover`), three shelf covers (`.book__cover`). Each has a `viewBox`, no fixed `width`/`height`, `preserveAspectRatio` set intentionally. Decorative SVGs use `aria-hidden="true"`; the four covers use `role="img"` + `<title>` naming the fictional book. Covers must be visibly distinct in composition, not one template recolored.
- **SVG theming (seam fix):** SVG fills/strokes are presentation attributes authored by Codex using the frozen tokens, e.g. `fill="var(--forest)"`, `stroke="var(--line)"`. Codex owns geometry and which token each shape uses; Claude owns the token values and all sizing/placement. Neither restyles the other's half.
- **Tokens in `:root` (frozen values):** `--paper:#F7F1E4`, `--paper-deep:#EFE6D4`, `--forest:#16302A`, `--forest-soft:#2F4F44`, `--orange:#B5471E`, `--orange-dark:#8E3413`, `--line:#D9CDB6`, `--muted:#55635B`; `--serif` and `--sans` as system stacks only (e.g. Georgia/"Iowan Old Style"/serif; system-ui/-apple-system/Segoe UI/sans-serif); spacing scale, `--measure` content width, `--focus-ring`.
- **Focus:** indicator must stay visible on paper, forest, **and** orange backgrounds — use a two-color ring (inner `--paper` outline, outer `--forest` via `box-shadow`, or equivalent). `.skip-link` is off-screen until `:focus`, then visibly positioned in the header.
- **Motion policy (decided):** no animation by default. Small transitions (≤200ms, color/transform only) are permitted; if any exist, a `@media (prefers-reduced-motion: reduce)` block must disable them.
- **Fiction disclosure (decided):** one `.fiction-note` sentence in the footer stating all people, books, addresses, and events are fictional samples. No development notes elsewhere.
- **Responsive:** must work at 390px and 1280px. Single-column, readable at 390px with no horizontal overflow; composed asymmetry at 1280px. Each section gets a different layout rhythm — the shelf must not be three equal cards.
- **Size:** `index.html` roughly 9–30 KB; `styles.css` roughly 6–20 KB. Do not thin the design to hit a small number.
- **Evidence discipline:** label findings as code inspection. Do not claim rendering, browser testing, or measured contrast unless actually run.

# Codex task

Owned files: ["index.html"]

Inputs: the original request, the frozen interface above, the empty snapshot, this plan review, and later Claude's complete `styles.css`.

Output: the complete `index.html` — compact brand/nav header; asymmetrical hero with `<h1>`, short welcoming copy, an inline next-meeting line, and the `#gathering` action; the hero reading-table illustration; the featured gathering with cover, editorial description, and `.meeting-facts` `<dl>`; a curated three-book shelf (distinct titles, authors, one thoughtful sentence each, individual covers — deliberately varied structure, e.g. one lead entry plus two secondary); a "what an evening is like" section using a different rhythm (a sequence/timeline, not cards); the FAQ `<details>` set; the footer with `.fiction-note`. All fictional editorial copy is Codex's to write.

Dependencies: hand Claude the final DOM outline, complete class/ID inventory, all five viewBoxes and their intended aspect ratios, which token each SVG region uses, per-element content lengths (headline words, longest `<dd>`, longest book sentence), and accessibility intent. Consume Claude's token values, breakpoints, and any selector blockers.

Review Claude's CSS for: selectors matching the real DOM, overflow risk at 390px given actual copy lengths, focus visibility on all three background colors, reduced-motion compliance, and whether the styling preserves the intended hierarchy. Then integrate both complete files and emit the user's exact final JSON.

Hand-off lists: interfaces provided, deviations from the freeze, review findings, fixes incorporated, unresolved blockers.

# Claude task

Owned files: ["styles.css"]

Inputs: the original request, the frozen interface above, Codex's structure hand-off, and later Codex's complete `index.html`.

Output: the complete `styles.css` — token block; serif for editorial moments, system sans for nav and practical information; asymmetrical hero composition at desktop; four visibly different section treatments (gathering, shelf, evening sequence, FAQ); intrinsic sizing rules for the five inline SVGs so each stays composed at both widths; `.skip-link` focus behavior; the two-color focus ring on every interactive element; `<summary>` styling that keeps the disclosure affordance and marker legible; footer; and a mobile-first cascade verified against 390px and 1280px.

Dependencies: hand Codex the final token values, breakpoint list, expected SVG aspect ratios and max widths, any selector requirements, and content-length limits the layout assumes. Consume Codex's exact DOM, SVG structure, labels, and nav targets.

Review Codex's HTML for: semantic landmarks and heading order, single-`h1` compliance, nav/skip anchors resolving to real IDs, the primary action pointing at `#gathering` with no fake transaction, completeness of the meeting facts, FAQ accessibility, whether the five artworks are genuinely distinct, absence of emoji/`<script>`/`<style>`/`style=`, and CSS compatibility.

Hand-off lists: interfaces provided, markup assumptions, review findings, fixes requested or incorporated, unresolved blockers.

# How the work connects

Codex → Claude: DOM hierarchy, IDs, classes, five viewBoxes with token usage per region, content lengths, accessibility semantics.

Claude → Codex: token values, breakpoints, sizing assumptions, selector requirements, responsive constraints, plus every HTML defect found in review.

The interface freeze is what makes parallel work safe: Claude styles the frozen inventory, Codex builds to it, and the SVG theming rule (Codex geometry + token references, Claude token values + sizing) keeps the artwork from being co-owned. Codex reconciles conflicts by choosing the option that scores better on first-screen composition, clarity of attendance information, visual originality, section rhythm, accessibility, responsive robustness, and file completeness. Novelty, volume, or confidence is not a tiebreaker; if neither review supports a change, the existing decision stands.

# Definition of done

Objectively checkable by inspecting the two files:

1. Output is exactly one fenced `json` object `{"summary":..., "files":[...]}` with complete contents for exactly `index.html` and `styles.css`, relative paths, each owned once.
2. The summary says files are proposed for Rivune to preview/apply, not already applied, and explicitly separates partner code/design review from browser tests that have not happened.
3. `index.html` contains exactly one `<link>` to `styles.css`, zero `<script>`, zero `<style>`, zero `style=` attributes, zero `http://`/`https://` references, zero emoji.
4. Exactly one `<h1>`; every `<section>` has an `<h2>`; no skipped heading levels; `<header>`, `<nav>`, `<main id="main-content">`, `<footer>` each present once.
5. Skip link is the first focusable element, targets `#main-content`, and has a `:focus` rule in CSS that makes it visible.
6. Sections `#gathering`, `#shelf`, `#evening`, `#questions` exist; every `href="#..."` in the document resolves to an ID in the document.
7. A `.button-link` in the hero has `href="#gathering"`. No `<form>`, `<input>`, `<button>`, or success/confirmation text anywhere.
8. `.meeting-facts` is a `<dl>` with four `<dt>`/`<dd>` pairs covering date, time, venue, reading.
9. Exactly five inline `<svg>` elements, each with a `viewBox` and no external reference; the four covers have `role="img"` and a `<title>`; the hero art is `aria-hidden="true"`. The four covers differ in shape composition, not only in color.
10. `.shelf__list` has exactly three books, each with cover, title, author, and one sentence; its CSS is not three equal columns of identical treatment, and `.evening__sequence` uses a different layout mechanism from `.shelf__list`.
11. `#questions` uses `<details>`/`<summary>` only; four to five entries.
12. Footer contains one `.fiction-note` sentence disclosing fictional content; no development notes elsewhere in the page.
13. `:root` defines every frozen token at the stated values; all `font-family` declarations resolve to system stacks with no `@font-face` or web font import.
14. A focus rule exists for links, `.button-link`, and `<summary>`, using a two-color ring so it is visible on `--paper`, `--forest`, and `--orange` backgrounds.
15. If any `transition`/`animation` appears, a `@media (prefers-reduced-motion: reduce)` block disables it; otherwise neither appears.
16. CSS is mobile-first with at least one width breakpoint producing the desktop asymmetry; no fixed pixel widths that exceed 390px on any element; no `<h1>` sized above roughly 3.5rem at desktop.
17. File sizes fall in the 9–30 KB and 6–20 KB ranges.
18. Both hand-offs exist, list frozen interfaces, review findings, fixes, and unresolved blockers, and every reported finding cites a specific element or selector.
19. No claim of rendering, screenshotting, or measured browser results appears anywhere unless actually performed.