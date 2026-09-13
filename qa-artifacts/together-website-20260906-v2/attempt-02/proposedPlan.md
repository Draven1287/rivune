# Goal

Create one coherent, finished static website for Lantern Pages: a fictional neighborhood book club presented as an independent literary journal crossed with an inviting evening reading room. The redesign must replace the generic-template feel with a crafted asymmetrical hero, original inline artwork, varied editorial layouts, useful meeting information, accessible navigation and FAQ, and responsive behavior at 390px and 1280px.

Known facts: the project snapshot is empty; only `index.html` and `styles.css` may be proposed; JavaScript, external assets, packages, tracking, and build steps are prohibited.

Reasonable inference: because Rivune’s preview is static and disables JavaScript, all navigation, FAQ behavior, artwork, and responsive presentation must work through semantic HTML, CSS, inline SVG, and native `<details>` elements.

Assumption: fictional dates, people, books, and addresses may be invented if they are internally consistent and accompanied by one concise sample-content disclosure. This assumption would change only if the user supplies preferred fictional content.

# Collaboration approach

Use complementary workstreams: Codex owns the semantic content and inline artwork in `index.html`, Claude owns the complete visual system and responsive implementation in `styles.css`, and both work against one frozen interface rather than producing rival sites.

Execution remains runner-owned in this order: Codex proposes the shared structure and interface; Claude reviews that plan; both produce their owned files in parallel; each specifically reviews the partner’s output; Codex resolves inconsistencies and integrates the final response; Claude acts as fallback integrator only if Codex integration fails. There is no separate provider sign-off.

# Shared requirements

Before parallel production, Codex proposes and Claude reviews this frozen contract:

- File linkage: `index.html` uses `<link rel="stylesheet" href="styles.css">`.
- Landmarks: focusable skip link, compact `<header>`, `<nav aria-label="Primary navigation">`, `<main id="main-content">`, and `<footer>`.
- Navigation targets: `#gathering`, `#shelf`, `#evening`, and `#questions`.
- Heading rule: exactly one `<h1>` in the hero; logical subordinate heading levels elsewhere.
- Hero interface: `.hero`, `.hero__copy`, `.hero__eyebrow`, `.hero__actions`, `.hero__next`, `.hero__art`, and `.button`; the primary action is an anchor to `#gathering`.
- Featured gathering interface: `#gathering.feature`, `.feature__cover`, `.feature__copy`, `.meeting-facts`, and `.meeting-facts__item`.
- Shelf interface: `#shelf.shelf`, `.shelf__intro`, `.shelf__rail`, `.book`, `.book__cover`, `.book__meta`, and `.book__note`; exactly three books, each with distinct inline SVG cover art.
- Evening interface: `#evening.evening`, `.evening__intro`, `.evening__flow`, and `.evening__step`; it must use a visibly different rhythm from the shelf.
- FAQ interface: `#questions.faq` containing native `<details>` and `<summary>` elements; answers remain usable without scripts.
- Disclosure interface: `.sample-note`, appearing concisely once in the main content or footer.
- SVG contract: inline decorative SVGs use `aria-hidden="true"` and `focusable="false"`; meaningful SVGs receive an accessible name. All SVGs define `viewBox` and scale without external resources.
- Shared tokens in `:root`: `--paper`, `--paper-deep`, `--ink`, `--ink-soft`, `--accent`, `--accent-dark`, `--line`, `--serif`, `--sans`, `--content-max`, `--space-section`, and `--focus`.
- Visual assumptions: warm ivory surfaces, deep forest text, restrained burnt orange, editorial serif moments, system sans-serif utilities, mostly square or subtly shaped compositions rather than a repeated rounded-card system.
- Accessibility contract: sufficient contrast, visible `:focus-visible` outlines on every background, no color-only meaning, semantic lists where appropriate, useful link text, and reduced-motion handling if any motion is introduced.
- Content consistency: hero teaser, featured gathering, FAQ, and footer must use the same fictional event facts.
- Handoff contract: each partner lists the interfaces supplied, contract deviations, review findings, and unresolved blockers. Any contract change requires notifying the other partner before integration.
- Evidence policy: distinguish source-code review from browser rendering. Do not claim files were changed, rendered, previewed, or browser-tested unless that actually occurred.

The incumbent direction is the user’s art direction and two-file architecture. Alternatives are acceptable only if they improve hierarchy, accessibility, responsive behavior, or editorial distinctiveness without violating those constraints. Novelty alone is not a reason to replace an incumbent decision.

# Codex task

Owned files: ["index.html"]

Inputs: the original request, the empty project snapshot, Claude’s review of the frozen contract, and the agreed selectors, tokens, event facts, and SVG accessibility rules.

Concrete output: complete `index.html` containing all page content, semantic landmarks, the skip link, compact navigation, asymmetrical hero, prominent link to the next gathering, featured meeting details, one substantial original hero illustration, four distinct fictional cover compositions total, a three-book curated shelf, a differently structured evening explanation, accessible FAQ, concise fictional-content disclosure, and elegant footer.

Responsibilities:

- Propose the shared page structure, interface, fictional event facts, and ownership before parallel work.
- Keep the headline concise and avoid oversized type serving as the primary visual content.
- Write warm, specific fictional editorial copy without fake booking, signup, payment, or success flows.
- Ensure every internal link resolves to an existing unique ID.
- Review Claude’s CSS specifically for hierarchy, action visibility, selector coverage, artwork scaling, keyboard focus, 390px behavior, 1280px composition, and avoidance of interchangeable cards.
- Integrate both complete files into the user’s exact final fenced-JSON schema. The final schema belongs to Codex as integrator, not to both contributors.
- State accurately in the summary that the proposal received source-level partner review and that browser testing was not performed unless the runner actually performs it.

Assumptions: system font stacks are acceptable; native `<details>` supplies the required FAQ interaction; inline SVG is permitted inside HTML.

Dependency on Claude: Codex needs Claude’s plan review, complete `styles.css`, selector/token handoff, and specific HTML review findings before integration.

# Claude task

Owned files: ["styles.css"]

Inputs: the original request, Codex’s proposed structure and HTML/CSS interface, the frozen selectors and tokens, the eventual complete `index.html`, and the agreed responsive and accessibility constraints.

Concrete output: complete `styles.css` implementing the warm editorial visual system, balanced asymmetrical composition, distinctive book-cover and reading-room treatments, varied section rhythms, clear meeting facts, polished navigation and footer, robust focus states, and responsive layouts for 390px mobile and 1280px desktop.

Responsibilities:

- Review Codex’s proposed plan before production, identifying concrete interface, accessibility, composition, or responsive risks without inventing disagreement.
- Define all frozen custom properties and style every agreed selector.
- Use system serif and sans-serif stacks only.
- Make the illustration and covers intentional at both target widths, preventing clipping, unreadable SVG text, overflow, or visually empty hero space.
- Avoid generic repeated rounded cards; differentiate hero, feature, shelf, evening flow, FAQ, and footer through composition and rhythm.
- Include keyboard-visible skip-link behavior and `:focus-visible` treatment that remains legible across light, dark, and accent backgrounds.
- Use media queries appropriate to the content, including a 390px-safe single-column layout and a composed 1280px presentation.
- Include `@media (prefers-reduced-motion: reduce)` if transitions or animations exist; omit motion if it adds no value.
- Review Codex’s HTML specifically for semantic landmarks, one-`h1` compliance, usable actions, ID/selector agreement, FAQ accessibility, SVG semantics, content consistency, and completeness.
- Provide a handoff listing implemented tokens/selectors, responsive assumptions, review findings, and unresolved blockers.

Assumptions: CSS may enhance native `<details>` without replacing its semantics; decorative effects must degrade cleanly.

Dependency on Codex: Claude needs the frozen interface and fictional content facts before styling, then the complete HTML to verify selector coverage and give a specific partner review.

# How the work connects

Codex → Claude: provide the approved semantic outline, IDs, class names, token names, repeated event facts, SVG roles, and complete HTML; Claude uses them to create selector-complete styling and reports any markup problems found during review.

Claude → Codex: provide the complete stylesheet, responsive/layout assumptions, implemented interface inventory, and specific HTML review findings; Codex uses them to resolve mismatches and produce the single final Rivune proposal.

Both handoffs must identify supplied interfaces and unresolved blockers. Neither partner may silently rename selectors, alter shared event facts, introduce another file, or substitute a competing full-site implementation.

# Definition of done

The integrated proposal is complete only when all of the following are true:

- The final response is exactly one fenced JSON object with `summary` and `files`.
- `files` contains exactly two complete entries: `index.html` and `styles.css`, with relative paths and no deletions.
- JSON is syntactically valid, including correctly escaped complete file contents.
- HTML references only local `styles.css`; there are no remote resources, scripts, packages, tracking, build requirements, or external assets.
- The page includes a compact header/navigation, designed asymmetrical hero, concise welcoming `h1`, visible meeting teaser, and substantial original inline SVG/CSS artwork.
- The featured gathering includes an original cover, editorial description, date, time, venue, and reading details that agree everywhere they appear.
- The curated shelf contains exactly three fictional books with distinct covers, titles, authors, and thoughtful one-sentence notes, presented as a shelf rather than interchangeable marketing cards.
- The “what an evening is like” section has a clearly different visual and semantic rhythm.
- The FAQ uses accessible native behavior, all section links work, and the primary action leads directly to `#gathering`.
- Fictional people, books, addresses, and events are disclosed clearly and concisely.
- There is no fake booking, signup, payment, or success state.
- Semantic landmarks, exactly one `h1`, keyboard-visible skip link, logical headings, usable contrast, and persistent focus outlines are present.
- Inline SVG is accessible, self-contained, scalable, and intentional at both target widths.
- Source inspection supports a 390px mobile layout and a composed 1280px desktop layout without obvious overflow or dependency on JavaScript.
- Any motion respects reduced-motion preferences.
- Both files use the frozen interface consistently, every selector needed by the HTML is covered, and each partner has supplied a specific review of the other’s work.
- Incumbent design choices are preserved unless a change demonstrably improves hierarchy, accessibility, coherence, or responsiveness.
- The summary briefly describes the artifact and distinguishes partner/source review from browser tests not actually run.
- No claim is made that files were changed, previewed, rendered, or browser-tested.
- Confidence is limited to what source-level review can establish; actual browser rendering at 390px and 1280px remains the evidence that could change conclusions about final visual behavior.