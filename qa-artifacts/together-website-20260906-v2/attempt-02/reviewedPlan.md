# Goal

Deliver one coherent, finished static website for Lantern Pages — a fictional neighborhood book club styled as an independent literary journal crossed with an inviting evening reading room — as a single Rivune proposal containing exactly `index.html` and `styles.css`.

The site must replace the previous generic-template feel with: a composed asymmetrical first screen, substantial original inline SVG artwork, a featured gathering with scannable facts, a curated three-book shelf that does not read as three identical marketing cards, an "what an evening is like" section with a different visual rhythm, an accessible FAQ, and an elegant footer — working at 390px and 1280px with no JavaScript, no external assets, and no build step.

**Known facts.** The project snapshot is empty (greenfield). Only `index.html` and `styles.css` may be proposed. Rivune shows a read-only proposal and its static preview disables JavaScript. The user explicitly prescribed the ownership split (one partner owns all of `index.html`, the other all of `styles.css`).

**Reasonable inferences.** Because the preview disables JS, all interaction must be native: `<details>`/`<summary>` for the FAQ, in-page anchors for navigation, CSS for any motion. Because the user complained about "an enormous heading in an almost empty box" and "repeated cards," the failure mode to design against is *uniform section treatment*, not missing content.

**Assumptions (stated, not verified).** Fictional facts may be invented provided they are internally consistent and disclosed once, concisely. Contrast is verified arithmetically from pinned hex values below, not by browser measurement. "The project's documented limits" are not present in the snapshot, so this brief pins working ceilings instead.

# Collaboration approach

**Shape: complementary workstreams.** Codex owns `index.html` (content, structure, all inline SVG geometry). Claude owns `styles.css` (tokens, composition, responsive behavior, all color and typography). Both work against one frozen contract; neither produces a rival full site.

**The incumbent plan's shape is correct and is retained.** It was assessed against the user's real constraints — the split is *mandated verbatim by the user*, the two-file architecture is mandated, and the art direction is the user's own. No alternative shape (single-author with reviewer, or duplicate-and-merge) is better here: the first violates "both contribute," the second is explicitly forbidden ("do not submit two rival full websites"). Novelty is not a reason to move. What this revision changes is not the shape but six concrete defects in the incumbent brief:

1. **SVG color ownership was undefined.** Inline SVG lives in Codex's file but its palette is Claude's design. Fixed by a frozen SVG class vocabulary plus a `currentColor`/`var()` rule below.
2. **Token *names* were frozen but not *values*.** "Usable contrast" was therefore not checkable by either partner. Fixed by pinning hex values and computed ratios.
3. **A circular dependency.** Claude's inputs listed "the eventual complete `index.html`" while both produce in parallel. Fixed by splitting production (against the contract) from review (against the actual file).
4. **Integration authority was unbounded** — Codex "resolves inconsistencies" over a file it does not own. Fixed by a minimal-patch rule.
5. **Artwork count was ambiguous** ("four distinct cover compositions total" vs. one hero illustration + one feature cover + three shelf covers). Fixed: five distinct compositions.
6. **Several done-criteria were unfalsifiable** ("asymmetrical," "feels like a shelf," "composed"). Fixed by structural proxies that a reader of the source can check.

**Fixed orchestration (do not vary).** Codex plans → Claude reviews the plan → both produce their owned files in parallel → both partner-review → Codex integrates first, Claude integrates only if Codex integration fails. There is no separate sign-off step and no third round.

**Evidence policy.** Source-level review is not browser testing. No partner may claim files were changed, applied, rendered, previewed, or tested in a browser. Confidence in visual outcomes is bounded by what reading the source supports.

# Shared requirements

## Frozen DOM skeleton

Both partners target exactly this structure and these names. This is a planning outline, not deliverable markup. Indentation = nesting; `element.class` notation; `×N` = repeat count.

```
a.skip-link                          -> href="#main-content"
header.masthead
  .masthead__inner
    a.wordmark                       -> href="#main-content"; contains svg.wordmark__mark
    nav[aria-label="Primary navigation"]
      ul.nav > li ×4 > a.nav__link   -> #gathering #shelf #evening #questions
main#main-content[tabindex="-1"]
  section.hero[aria-labelledby="hero-title"]
    .hero__copy
      p.hero__eyebrow
      h1#hero-title                  (the only h1)
      p.hero__lede
      .hero__next > p.hero__next-label, time[datetime], p.hero__next-place
      .hero__actions
        a.button.button--primary     -> href="#gathering"
        a.button.button--quiet       -> href="#evening"
    .hero__art > svg.reading-table   (decorative, aria-hidden)
  section#gathering.feature[aria-labelledby="feature-title"]
    .feature__cover > svg.cover.cover--feature
    .feature__copy
      h2#feature-title
      p.feature__blurb
      dl.meeting-facts
        div.meeting-facts__item ×4 > dt.meeting-facts__term + dd.meeting-facts__detail
      p.feature__note
  section#shelf.shelf[aria-labelledby="shelf-title"]
    .shelf__intro > h2#shelf-title + p
    ol.shelf__rail
      li.book ×3
        svg.cover.cover--shelf
        .book__meta > h3.book__title + p.book__author
        p.book__note
    div.shelf__ledge                 (decorative, aria-hidden)
  section#evening.evening[aria-labelledby="evening-title"]
    .evening__intro > h2#evening-title + p
    ol.evening__flow
      li.evening__step ×4 > p.evening__time + h3.evening__step-title + p
  section#questions.faq[aria-labelledby="faq-title"]
    h2#faq-title
    details.faq__item ×4 > summary.faq__question + .faq__answer > p
footer.colophon
  .colophon__inner
    .colophon__brand > svg.wordmark__mark + p
    ul.colophon__links > li ×4 > a
    p.sample-note
    p.colophon__legal
```

Deviation from this skeleton requires notifying the partner before integration; silent renaming is prohibited.

## Frozen design tokens (values, not just names)

Declared once in `:root` in `styles.css`. Codex must not write a `<style>` block or any `style=` attribute.

| Token | Value | Role |
|---|---|---|
| `--paper` | `#F7F1E4` | primary surface (warm ivory) |
| `--paper-deep` | `#EFE5D2` | recessed panels, shelf ledge |
| `--ink` | `#1E332A` | body text, dark surfaces (deep forest) |
| `--ink-soft` | `#4A6255` | secondary text, rules |
| `--accent` | `#B4531F` | fills, rules, illustration accent (burnt orange) |
| `--accent-dark` | `#8A3D14` | accent **text** on paper; primary button background |
| `--line` | `#D8C9AE` | hairlines, borders |
| `--serif` | `Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif` | editorial |
| `--sans` | `system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif` | navigation, facts, UI |
| `--content-max` | `1180px` | measure ceiling |
| `--space-section` | `clamp(3.5rem, 7vw, 6.5rem)` | section rhythm |
| `--focus` | `#B4531F` on light; re-declared `#F6C177` inside dark scopes | focus ring |

Contrast ratios computed arithmetically from these hex values (not browser-measured): ink/paper ≈ 12:1; ink-soft/paper ≈ 5.9:1; accent-dark/paper ≈ 6.8:1; paper on accent-dark ≈ 6.8:1; paper on ink ≈ 11.9:1; amber focus ring on ink ≈ 8.2:1. **`--accent` (#B4531F) on paper is ≈ 4.5:1 and must not be used for small body text** — use `--accent-dark`. Single light theme only; do not add `prefers-color-scheme` variants.

## Frozen SVG contract (resolves the color-ownership defect)

- Codex authors **geometry only**: `viewBox`, path/shape data, and class names. No `fill`/`stroke` hex literals, no `width`/`height` attributes, no `<style>` inside SVG.
- Every shape carries one class from this vocabulary; Claude styles each: `.sv-paper`, `.sv-paper-deep`, `.sv-ink`, `.sv-ink-soft`, `.sv-accent`, `.sv-accent-dark`, `.sv-line`.
- Decorative SVGs: `aria-hidden="true" focusable="false"`. Book covers are decorative (the title/author are real text next to them) — no SVG `<text>` for titles, so nothing depends on SVG font rendering.
- Every SVG has a `viewBox`; sizing comes from CSS only.

## Frozen fictional facts (single source of truth)

Club meets the **second Thursday, monthly**. Next gathering: **Thursday, 12 November 2026, 7:00–9:00 p.m.** (`datetime="2026-11-12T19:00"`) at **The Fernwick Room, Marlow Street Library, 42 Marlow Street**. Featured book: ***The Lamplighter's Almanac*** by **Ines Auclair**; reading **chapters 1–9 (pp. 3–128)**. Shelf = the three books *after* this one: ***A Field Guide to Quiet Streets*** by **Teodor Vance**; ***Salt Almanac*** by **June Ferrier**; ***The Hour of Blue Windows*** by **Amara Oyelaran**. (12 November 2026 is verified to be both a Thursday and the second Thursday of that month.) These facts must agree in the hero, feature, FAQ, and footer.

## Frozen constraints

- `<link rel="stylesheet" href="styles.css">`; no other external reference, no `<script>`, no `<iframe>`, no fonts/images/URLs off-file.
- Exactly one `<h1>`. Heading levels descend without skipping.
- Skip link is visually hidden until `:focus-visible`, then visible against the paper surface; `#main-content` carries `tabindex="-1"` so the jump moves focus.
- `:focus-visible` outline ≥ 2px solid `var(--focus)` with `outline-offset: 2px`, legible on paper, on `--paper-deep`, on `--ink` (footer), and on accent buttons.
- No fake booking, signup, payment, or success state. No form submission. No emoji. No decorative container `border-radius` above 4px on content blocks (guards against the "rounded card grid" the user rejected).
- One concise `.sample-note` disclosing that all people, books, addresses, and events are fictional. No development notes on the page.
- Any transition/animation is wrapped by `@media (prefers-reduced-motion: reduce)` that disables it; if there is no motion, no such block is needed.
- Working size ceilings: `index.html` ≤ 40 KB, `styles.css` ≤ 28 KB. These are generous ceilings, not targets — do not thin the design to shrink bytes.

# Codex task

Owned files: ["index.html"]

**Inputs.** The original request; the empty snapshot; this brief; Claude's plan review; the frozen skeleton, tokens, SVG vocabulary, and fictional facts above.

**Deliverable.** The complete `index.html`, matching the frozen skeleton, containing:

- Skip link, compact masthead with wordmark SVG and four-item primary nav.
- Hero: eyebrow, one concise `h1` (≤ 8 words; the headline is not the visual payload), a two-sentence lede saying what the club is and how to attend, a visible next-meeting teaser using `<time datetime="2026-11-12T19:00">`, and two anchor actions — primary to `#gathering`.
- **Five distinct original SVG compositions** (this is the count; the incumbent's "four total" was ambiguous): `svg.reading-table` (hero — a reading table / lamp / stacked-books scene, substantial, ≥ 900 units wide in its viewBox, ≥ 25 shapes, legible when scaled to ~320px wide), one `cover--feature`, and three `cover--shelf` covers that differ in composition — not one motif recolored. Geometry only, per the SVG contract.
- Featured gathering: editorial blurb (60–90 words) and a `dl.meeting-facts` with exactly four items — Date, Time, Where, Reading — matching the frozen facts.
- Shelf: `ol` of exactly three books, each with cover, title, author, and one thoughtful sentence (18–30 words) that says something specific, not marketing copy.
- Evening: `ol` of four steps with a time cue, a short title, and one sentence each — deliberately a sequence, not a card set.
- FAQ: four `<details>` items, all closed by default, covering how to join, whether you must finish the book, cost, and accessibility of the venue.
- Footer: wordmark, section links, `.sample-note`, and a plain legal line.

**Responsibilities.**
- Own every internal link resolving to an existing unique ID.
- Write warm, specific fictional copy; keep the same facts everywhere.
- **Partner review of `styles.css`** on substance, not syntax: selector coverage against the skeleton (name every unstyled selector), visual hierarchy, action prominence, artwork scaling at 390px and 1280px, focus visibility on all four background types, shelf/evening differentiation, and absence of a uniform card treatment.
- **Integrate first.** Assemble both complete files into the user's exact fenced-JSON schema (`summary` + `files` with `index.html` and `styles.css`). At integration you may apply only *minimal, previously-flagged* fixes to `styles.css` and must list them in the handoff; you may not rewrite or restyle Claude's file. If a mismatch is large, prefer changing your own HTML.
- Write the user-facing summary: brief, describes the result, states that the proposal received source-level partner review and that **no browser rendering or testing was performed**. Keep code and partner discussion out of the summary.

**Handoff to Claude (required contents).** Final section order and any skeleton deviations; the exact class list actually emitted, including every SVG shape class used; viewBox dimensions and intrinsic aspect ratio of all five SVGs; the frozen facts as written; per-section review findings on `styles.css`, each marked blocking / non-blocking; unresolved blockers.

# Claude task

Owned files: ["styles.css"]

**Inputs.** The original request; this brief; the frozen skeleton, tokens, SVG vocabulary, and facts. Production proceeds **against the frozen skeleton, not against Codex's file** — Codex's `index.html` arrives at review time, which is when selector coverage is verified. This removes the circular dependency in the incumbent brief.

**Deliverable.** The complete `styles.css` implementing:

- All twelve tokens at their pinned values, plus every SVG shape class.
- **Hero asymmetry:** at ≥ 1000px a two-column grid with unequal tracks (e.g. `1.15fr 0.85fr` or `minmax(0,1fr) 0.78fr`) and vertical offset between copy and art; at < 760px a single column with the art below the actions and no clipping.
- **Feature:** a distinct treatment from the hero — cover set against a `--paper-deep` panel with a hairline rule; `dl.meeting-facts` laid out as a scannable two-column term/detail grid in `--sans`, collapsing to stacked pairs at 390px.
- **Shelf:** reads as a shelf, not three cards — a horizontal `.shelf__ledge` rule under the covers, staggered vertical offsets between the three `li.book` items, covers sharing a fixed aspect ratio but *not* enclosed in identical bordered boxes. At 390px it stacks with the ledge suppressed or redrawn.
- **Evening:** a numbered vertical flow with a continuous rule and accent markers (CSS counters permitted) — structurally unlike the shelf at both widths.
- **FAQ:** styled `summary` retaining a visible open/closed marker (if `list-style` is removed, supply a CSS marker), keyboard-focusable with a visible ring, generous hit area.
- **Footer:** `--ink` surface, `--paper` text, with `--focus` re-declared to `#F6C177` in that scope.
- Skip-link reveal on `:focus-visible`; focus rings verified against paper, paper-deep, ink, and accent-dark backgrounds.
- Typography: `--serif` for `h1`, `h2`, `h3`, book titles, and the feature blurb; `--sans` for nav, meeting facts, buttons, eyebrows, times, and footer. `clamp()` sizing so the `h1` stays composed at 390px and does not balloon at 1280px.
- Media queries appropriate to the content, guaranteeing a clean 390px single column (no horizontal overflow, no fixed widths exceeding ~358px of content) and a composed 1280px layout capped by `--content-max`.
- `@media (prefers-reduced-motion: reduce)` if and only if motion exists.

**Responsibilities.**
- Review this plan before production and raise concrete interface, contrast, composition, or responsive risks — specifically, do not manufacture disagreement, and do not accept the plan reflexively where a token, ratio, or breakpoint is genuinely unworkable.
- Style **every** selector in the frozen skeleton; leave no orphan.
- **Partner review of `index.html`** on substance: skeleton conformance, one-`h1` compliance, ID/anchor integrity, `<details>` semantics, SVG contract compliance (no hex literals, `viewBox` present, decorative flags), fact consistency across the four locations, disclosure presence, absence of fake flows, and file completeness.

**Handoff to Codex (required contents).** Implemented token table and any value adjustments with the recomputed contrast ratio; complete list of styled selectors and SVG shape classes; breakpoint list and the responsive assumptions made (especially assumed SVG aspect ratios); per-section review findings on `index.html`, each marked blocking / non-blocking; unresolved blockers; explicit confirmation that nothing was rendered or browser-tested.

# How the work connects

**Contract → both.** This brief is the sole shared truth: skeleton, token values, SVG class vocabulary, and fictional facts. Both partners produce in parallel against it, so neither blocks the other.

**Codex → Claude.** The emitted class list, the SVG viewBoxes and aspect ratios, and any skeleton deviation. Claude needs the aspect ratios to size `.hero__art` and both cover variants without distortion or clipping; a deviation reported late is the single highest-risk failure in this split.

**Claude → Codex.** The stylesheet, the styled-selector inventory, breakpoints, and HTML review findings. Codex needs the inventory to confirm no markup hook is unstyled and no style targets a nonexistent element.

**Mismatch resolution.** The owner of a file fixes that file. Codex integrates and may apply only minimal, pre-flagged patches to `styles.css`, disclosed in the handoff. Claude integrates only if Codex integration fails, under the same restriction toward `index.html`. Neither partner may rename a frozen selector silently, alter a frozen fact, add a third file, or submit a competing full site.

# Definition of done

Every item is checkable by reading the two files and this brief.

**Packaging**
1. Output is exactly one fenced JSON object with keys `summary` and `files`; JSON parses, with correctly escaped complete contents.
2. `files` has exactly two entries, paths `index.html` and `styles.css`, relative, no traversal, no hidden folders, no deletions.
3. `index.html` ≤ 40 KB and `styles.css` ≤ 28 KB.

**Constraint compliance**
4. `index.html` contains `href="styles.css"` and zero other external references; zero `<script>`, zero `style=` attributes, zero `<style>` blocks, zero `http`/`https` resource URLs.
5. No form, no submit control, no fake booking/signup/payment/success text. No emoji characters.

**Structure**
6. Every element and class in the frozen skeleton is present in `index.html`, and every one of them is matched by at least one rule in `styles.css`.
7. Exactly one `<h1>`; the `h1` is ≤ 8 words; heading levels descend without skipping.
8. Anchors `#gathering`, `#shelf`, `#evening`, `#questions`, `#main-content` each resolve to exactly one element; `.button--primary` targets `#gathering`.

**Content**
9. Feature `dl` has exactly four `dt`/`dd` pairs: Date, Time, Where, Reading, matching the frozen facts; `<time datetime="2026-11-12T19:00">` appears in the hero.
10. The frozen date, time, venue, book, and author strings are identical everywhere they appear (hero, feature, FAQ, footer).
11. `ol.shelf__rail` has exactly three `li.book`, each with a distinct `cover--shelf` SVG, `h3` title, author, and a 18–30-word note.
12. `ol.evening__flow` has exactly four `li.evening__step`. `section#questions` has exactly four `<details>`, none with `open`.
13. Exactly one `.sample-note`, stating the fictional nature of people, books, addresses, and events in one or two sentences; no other development notes on the page.

**Artwork**
14. Five distinct SVG compositions exist: one `.reading-table`, one `.cover--feature`, three `.cover--shelf`. Hero SVG viewBox width ≥ 900 units and ≥ 25 shape elements; no two covers are the same path set recolored.
15. Zero hex color literals and zero `fill`/`stroke` attributes inside any SVG; every shape carries an `sv-*` class and every `sv-*` class used is styled. Every SVG has `viewBox` and no `width`/`height` attributes.
16. Decorative SVGs carry `aria-hidden="true"` and `focusable="false"`; no SVG `<text>` carries a book title or author.

**Presentation and accessibility**
17. `styles.css` declares all twelve tokens at the pinned values (or documents any change with a recomputed ratio ≥ the original); `--accent` is not used for body-size text on paper.
18. `--focus` is re-declared within the footer/dark scope; a `:focus-visible` rule with `outline-offset` applies to links, buttons, `summary`, and the skip link.
19. `.skip-link` is off-screen by default and visible on focus; `#main-content` has `tabindex="-1"`.
20. Hero uses unequal grid tracks at desktop and a single column below the stated breakpoint; the shelf uses a ledge plus staggered offsets; the evening flow uses a numbered vertical rule — three visibly different section mechanisms, plus a fourth (feature panel).
21. No content container uses `border-radius` > 4px.
22. Source inspection shows no fixed width or `min-width` that forces content past ~358px at a 390px viewport; layout at 1280px is capped by `--content-max`.
23. If any `transition`/`animation` exists, a `prefers-reduced-motion: reduce` block disables it.

**Process**
24. Both handoffs exist with their required contents; each partner's review names specific sections and marks findings blocking or non-blocking. Any minimal cross-file patch applied at integration is listed.
25. Incumbent decisions from this brief are preserved unless a change is justified by hierarchy, accessibility, coherence, or responsiveness — not by novelty.
26. The summary is brief, contains no escaped code, and states plainly that review was source-level and that no browser rendering, preview, or test was run. No claim that files were changed or applied.

**What would change these conclusions.** The only evidence that can settle actual visual behavior — hero balance, SVG scaling, shelf legibility at 390px, real contrast rendering — is opening the applied files in a browser at 390px and 1280px. Nothing in this process substitutes for that, and the summary must say so.