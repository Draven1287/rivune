# Startup fallback UI implementation proposal — 2026-09-10

Five-file isolated patch/full files with base/proposal hashes. No live/candidate edits, native/provider actions, dependencies or server started. Prepared for sole builder integration, not another app.

Current main.tsx statically imports App and styles then renders into an empty root. App chooses desktop when a bridge descriptor or Tauri marker exists, otherwise browser demo. The current HostWorkspace has startup-status recovery UI, but entry import/render failures can prevent it from mounting. This inspection is not a diagnosis of the actual S02 blank window.

## Implemented proposal

- index.html supplies Rivune-owned static loading markup inside #root, with a small independently linked stylesheet. Missing JS leaves meaningful loading text; even failed CSS leaves semantic text. No timeout labels a slow load as failure.
- main.tsx initially renders loading, dynamically imports App and shows explicit failed UI on import rejection. StartupBoundary catches child render/lifecycle errors and replaces content with an inert error explanation. No raw exception/path/log is displayed.
- App explicitly shows bridge-unavailable when desktop markers exist but the bridge descriptor is missing, accessor-only, null or non-object. It does not fall back to demo. Object bridges still undergo existing adapter/status validation. Absence of all desktop markers preserves the existing intentional browser demo.
- StartupFallback provides loading/status versus failed/alert headings, quiet dark navy/silver surfaces and responsive typography. No image dependency, animation or redesign. Failure says latest save status cannot be determined and does not imply saved data loss. Guidance is to keep the window open and report preceding actions; no reload/reset/clear/retry/save/send control.

## Tests and integration boundaries

PASS git apply --check on current base. PASS strict isolated TypeScript check over copied source plus proposal overlays using installed toolchain. source-hashes.json records exact five-file base/proposal bytes. typecheck/ is copied source for validation only.

mounted.fixture.tsx contains reusable actual React test code for a throwing child and a marked-null desktop bridge. It asserts explicit fallback/alert, no raw error leak and no writable workspace/buttons for missing bridge. This fixture has NOT been executed or typechecked in its final harness location. Builder/state test owner must import it into an isolated supported harness and provide React act environment. No rendered accessibility,320/390 screenshot or browser PASS is claimed.

Required remaining cases: rejected App import via controlled module-loader seam; unresolved import retains loading; valid desktop continues through existing HostWorkspace; absent all markers preserves explicit demo behavior; accessor bridge is not invoked; no automatic host/storage commands; boundary retry is absent. Native HTML-not-loaded or navigation failures cannot be handled by this frontend. Failure of static React/bootstrap dependencies leaves static loading text, not a falsely diagnosed import error. Error boundaries do not catch arbitrary event-handler/asynchronous exceptions; this proposal does not install global exception handlers.

Builder must ensure desktop export/build rewrites the new stylesheet link correctly and preserves static root markup/CSP. No assumption that old S02 uses current index.html; desktop reviewer owns entry/CSP/loader comparison. Startup lifecycle reviewer owns independent controller hydration/disposal tests. Both received interface/path directly.

Next: sole builder integrate against base hashes after loader diagnosis, execute fixture and loader-rejection tests, verify generated HTML/assets and rendered states. This proposal does not establish native boot recovery or saved-data durability.

## Reviewer coordination addendum

Desktop diagnosis found no deterministic retained-source loader root cause; exact old hashed JS/CSS unavailable. This proposal remains containment, not an S02 fix. State reviewer confirms controller initial snapshot rejection is caught into error/uncertain with null snapshot, not thrown to React. StartupBoundary cannot catch that state. Existing HostWorkspace notice/state rendering remains responsible; any replacement of that UI requires explicit controller-state mapping and mounted proof, not treating resolved start() as successful hydration. Independent five-case controller regression patch is at startup-failure-tests-20260910/integration.patch and is not included in this proposal.
