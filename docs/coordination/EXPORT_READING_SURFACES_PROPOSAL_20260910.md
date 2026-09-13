# Proposed minimal export reading-surface correction

Scope: reconcile-export-reading-surfaces, based on EXACT_EXPORT_RENDERED_REVIEW_20260910.md and RIVUNE_DESIGN_DIRECTION.md. Proposal only; no live source, candidate, commit, export or native build changed.

The current live/export CSS diff mixes calm surfaces with unrelated demo spacing, typography, result cards and welcome adjustments. Only existing palette/background decisions are carried into this proposal. It appends11 CSS lines to the accepted styles.css, scoped entirely to .chat-first.theme-orbit.host-workspace. No ChatPanel.tsx or Sidebar.tsx change/dependency is needed.

Required selectors:
- Host root: selected live left-to-right dark gradient over the unchanged Milky Way image; retains identity around exposed edges.
- .app-header: selected live subdued header background.
- .host-sidebar: selected live navigation gradient, preserving the underlying galaxy without a bright starfield over content.
- .host-chat: opaque #101722 from the live .workbench surface. This supplies the calm transcript backdrop; a redundant .host-transcript fill is unnecessary.
- .host-chat-header: #111a26 from the live .panel-heading surface.
- .host-composer: opaque #253246 -> #1a2637 gradient from the live composer.
- Existing host mobile breakpoint700px: opaque #0b121d shell/header/tab bar and #101a29 navigation, mapping the selected live mobile treatment to the host's existing breakpoint. This changes no dimensions/breakpoint behavior.

No blur, spacing, layout, typography, borders, focus rules, result viewer, conflict-scroll rule or controller behavior changes. Demo welcome treatment remains untouched; the host does not use those demo classes. Galaxy image and branding remain unchanged. This avoids wholesale copying of live styles or excluded components.

Patch: qa-artifacts/export-reading-surfaces-20260910/reading-surfaces.patch.
Proposed full source: qa-artifacts/export-reading-surfaces-20260910/proposed/prototypes/ai-native-workspace/src/styles.css.
Base SHA256:7ca3a5bc4035e1fe094a392d84c0fd6c005ddc981356aca1c9ac339a2d771a76.
Proposed SHA256:7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643.
Full patch/delta/preview hashes and URL mapping: proposal.json and preview-hashes.json in the same artifact directory.

Isolated existing4317 preview URLs:
- Normal chat/list/composer/viewer: http://127.0.0.1:4317/dist/exact-export-review/reading-surfaces-3bc19ce/tests/hostRenderer.html?scenario=conversation-list&preview=1&conversationList=1
- Team composer: http://127.0.0.1:4317/dist/exact-export-review/reading-surfaces-3bc19ce/tests/hostRenderer.html?scenario=compact-composer&preview=1
- Retained conflict: http://127.0.0.1:4317/dist/exact-export-review/reading-surfaces-3bc19ce/tests/hostRenderer.html?scenario=composer-supersession-preview&preview=1

These clone the prior verified static synthetic preview, with byte-identical JS, base compiled CSS and assets. A second stylesheet carries only the proposed declarations. Its sole transformation is source image URL ./assets/rivune-workspace-milky-way.png -> compiled relative URL ./rivune-workspace-milky-way-B-psVFJf.png; image bytes are unchanged. HTML adds that stylesheet and labels the tab as proposed. This is accepted source/synthetic browser execution plus a proposed CSS delta, not a new exact-export/native bundle. Original live and baseline exact-export previews remain untouched.

UI reviewer should compare normal desktop and390 reading/navigation surfaces, then open team editor/result viewer and scroll the retained conflict review to acceptance. Prior functional claims remain separate; this task seeks approval of the minimal style direction before any source application, commit/export or rebuild. No native launch, provider, new server, dependency or publication action.

## Owner rendered verification

Viewed the isolated proposal at desktop 1280x720 and mobile 390x844. Transcript and composer have calm opaque surfaces; galaxy remains at desktop perimeter. Mobile Chat and Conversations panes show solid dark backgrounds without starfield behind text. The normal fixture reports Synthetic checks: PASSED (3). Reset viewport and retained proposal tab for review. Reverified live, candidate and proposed source stylesheet hashes against those recorded above; all match. No source application, commit, export or native rebuild performed. Independent proposal review remains pending.
