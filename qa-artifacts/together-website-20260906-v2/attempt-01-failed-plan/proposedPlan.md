# Goal

Create one finished, distinctive Lantern Pages website—not competing concepts—combining an independent literary journal with an inviting evening reading room. The user wants a coherent, responsive static artifact whose first screen clearly explains the fictional neighborhood book club, presents the next meeting, and uses substantial original artwork rather than giant type or generic cards.

Known facts: the project snapshot is empty; only `index.html` and `styles.css` may be proposed; external assets, JavaScript, packages, tracking, and build steps are prohibited. The rejected incumbent used an oversized heading, empty space, and repetitive cards. Reasonable inference: Codex should own integration because the runner assigns it that role. Assumption: browser rendering is unavailable unless the runner explicitly provides it; reviews must therefore be described as code/design reviews, not browser tests.

# Collaboration approach

Use complementary workstreams: Codex produces the complete semantic content and inline artwork while Claude produces the complete visual system and responsive CSS against a frozen shared interface.

Execution remains runner-owned: Codex proposes; Claude reviews this plan; both produce in parallel; both review their partner’s work; Codex integrates; Claude integrates only if Codex integration fails. There is no separate provider sign-off.

# Shared requirements

Freeze this interface before parallel production:

- Files: `index.html` links only `styles.css`; no other files or resources.
- Landmarks: focusable skip link targeting `#main-content`, `<header>`, `<nav aria-label="Primary navigation">`, one `<main id="main-content">`, and `<footer>`.
- Section IDs and navigation targets: `#gathering`, `#shelf`, `#evening`, `#questions`.
- Primary hero action: an anchor to `#gathering`, never a booking or signup control.
- Heading contract: exactly one `<h1>`; logical descending section headings.
- Major classes: `.site-header`, `.brand`, `.primary-nav`, `.hero`, `.hero__copy`, `.hero__art`, `.eyebrow`, `.button-link`, `.gathering`, `.gathering__cover`, `.gathering__details`, `.meeting-facts`, `.shelf`, `.shelf__list`, `.book`, `.book__cover`, `.evening`, `.evening__sequence`, `.faq`, `.site-footer`, `.fiction-note`.
- Meeting data shape: semantic title and description plus `<dl class="meeting-facts">` containing date, time, venue, and reading assignment.
- FAQ data shape: native `<details>`/`<summary>` pairs; no JavaScript.
- Artwork contract: hero reading-table illustration and four distinct fictional book covers are inline SVG or CSS, labeled or hidden appropriately, with stable viewBoxes and no external dependencies.
- Content contract: all names, books, address, and event details are fictional samples; disclose this once prominently but quietly.
- Visual tokens in `:root`: `--paper`, `--paper-deep`, `--forest`, `--forest-soft`, `--orange`, `--orange-dark`, `--line`, `--muted`, `--serif`, `--sans`, spacing tokens, content width, and focus-ring token. System font stacks only.
- Layout assumptions: composed asymmetry at 1280px; readable single-column adaptation at 390px; no generic equal-card grid; restrained corner radii and shadows.
- Accessibility: strong contrast, keyboard-visible skip link, persistent visible focus outlines on every background, semantic text alternatives, touch-friendly links, and reduced-motion handling if motion exists.
- Incumbent comparison criteria: first-screen composition, clarity of attendance information, visual originality, section rhythm, accessibility, responsive behavior, and file completeness. Preserve any incumbent idea only if it performs better on these criteria; otherwise the empty snapshot and rejected template establish no implementation worth retaining.
- Evidence discipline: distinguish code-inspection findings from rendered/browser-tested evidence. Confidence is high for structural requirements and provisional for visual fit until actual previewing occurs. Evidence that could alter conclusions includes overflow, SVG legibility, contrast, or hierarchy problems observed at 390px or 1280px.

# Codex task

Owned files: ["index.html"]

Inputs: the original request, frozen interface above, empty project snapshot, Claude’s plan review, and the eventual complete `styles.css`.

Concrete output: complete `index.html` containing the compact header/navigation, asymmetrical hero, direct gathering action, substantial inline hero illustration, featured fictional gathering, four intentionally distinct cover artworks total, three-book curated shelf, varied “what an evening is like” section, accessible FAQ, fiction disclosure, and elegant footer. Supply polished fictional editorial copy and all meeting facts.

Assumptions: native HTML and inline SVG are sufficient; no form or transactional state is needed; artwork classes and viewBoxes will remain stable for Claude’s CSS.

Dependencies: provide Claude the final element hierarchy, class/ID inventory, SVG viewBoxes, accessibility intent, and content lengths. Consume Claude’s tokens, layout rules, responsive expectations, and any selector-related blockers. Review Claude’s CSS specifically for selector compatibility, content overflow risk, focus visibility, reduced-motion behavior, and whether it preserves the intended hierarchy. Integrate both complete files and own the user’s exact final JSON schema.

Handoff must list: interfaces provided, any deviations from the frozen contract, review findings, fixes incorporated, and unresolved blockers.

# Claude task

Owned files: ["styles.css"]

Inputs: the original request, frozen interface above, Codex’s proposed structure/interface, and Codex’s eventual complete `index.html`.

Concrete output: complete `styles.css` implementing the warm ivory/deep forest/burnt-orange art direction; editorial serif and practical system sans typography; purposeful asymmetrical desktop composition; distinct layouts for gathering, shelf, evening sequence, and FAQ; styling for inline SVG covers and hero artwork; visible keyboard states; and robust behavior at 390px and 1280px.

Assumptions: markup follows the frozen IDs/classes and SVG contract; fonts are local system stacks; motion can be omitted unless it materially improves the design.

Dependencies: provide Codex the final token values, responsive breakpoints, expected intrinsic sizing, selector requirements, and content-length constraints. Consume Codex’s exact DOM, SVG structure, accessible labels, and navigation targets. Review Codex’s HTML specifically for semantic hierarchy, one-`h1` compliance, usable primary action, complete fictional content, FAQ accessibility, illustration originality, and compatibility with the CSS.

Handoff must list: interfaces provided, selectors or markup assumptions, review findings, fixes requested or incorporated, and unresolved blockers.

# How the work connects

Codex → Claude: exact DOM hierarchy, IDs, classes, SVG viewBoxes, content lengths, and accessibility semantics needed to author reliable styles.

Claude → Codex: finalized tokens, selectors, breakpoints, sizing assumptions, responsive constraints, and HTML issues discovered during review.

Both reviews must cite concrete elements or selectors and distinguish definite code findings from visual hypotheses. Codex reconciles incompatibilities while preserving the stronger decision under the shared criteria; unsupported novelty or disagreement is not a reason to replace the incumbent choice. If neither review supports a better alternative, the incumbent decision remains.

# Definition of done

- The final response is exactly one fenced `json` object with shape `{"summary":"What changed","files":[...]}` and contains complete contents for exactly `index.html` and `styles.css`, each path relative and owned once.
- The summary says the files are proposed for Rivune to preview/apply, not already changed, and accurately distinguishes partner code/design review from browser tests that did not occur.
- The two files form one working static site with a local relative stylesheet and no remote resources, scripts, packages, tracking, build step, fake transaction, or omitted dependency.
- Every requested section and all fictional sample disclosures are present, polished, and mutually consistent.
- The first screen has a compact header, concise single main heading, clear club purpose, visible meeting information/action, and substantial intentional illustration.
- The featured gathering includes an original cover, editorial description, date, time, venue, and reading details.
- The shelf contains three distinct fictional books with original covers, titles, authors, and thoughtful sentences, presented as a curated shelf rather than interchangeable cards.
- The evening explanation uses a visibly different rhythm; FAQ uses accessible native disclosure controls; footer is complete.
- Navigation and skip links target valid IDs; landmarks and heading order are semantic; focus indicators, contrast, and text alternatives are accounted for.
- CSS explicitly supports 390px mobile and 1280px desktop without relying on giant typography; inline art remains composed at both sizes.
- Both handoffs document frozen interfaces and unresolved blockers; each partner’s specific review is reconciled before integration.
- File completeness and interface compatibility are checked by inspection. No rendering, browser testing, or empirical responsive result is claimed unless actually performed by the runner.