# Startup observability and containment implementation

2026-09-10. Integrated UI proposal and five controller regressions after verifying every declared base hash. Read blank-window-diagnosis-20260910/DIAGNOSIS.md: no deterministic S02 root cause was established. This is startup observability/containment, not an S02 repair or native boot proof. Stopped for independent UI and entry/lifecycle acceptance.

## Implemented scope

Eight live frontend source/test files changed. Five production files: index.html, src/main.tsx, src/App.tsx, new src/StartupFallback.tsx and src/startup.css. Three test files: tests/hostController.test.mjs, tests/hostRenderer.test.tsx and tests/rendererScenarios.ts. Paths are under prototypes/ai-native-workspace.

Static semantic loading content exists before JavaScript. A linked startup stylesheet does not depend on App evaluation. The entry renders a boundary and loader; dynamic App loading rejection gives an inert failure screen. Pending loading has no timeout or speculative failure diagnosis. Render failure is contained by the boundary. Marked desktop entry with missing/null/primitive/accessor bridge shows connection unavailable and never invokes the accessor. Object bridges retain existing adapter validation; no desktop markers retain the intentional browser demo.

Builder added a controlled optional loader seam in StartupFallback.tsx instead of duplicating entry behavior in tests. Production uses the default dynamic import. Its effect ignores completion after disposal, including StrictMode's abandoned effect. No retry/reload/global-error-handler or host/storage action was added. Failure copy reports unknown save status without claiming data loss or successful persistence.

HostWorkspace and controller production files were not edited. start() catches hydration failures into error/uncertain, rather than throwing to the render boundary. Mounted error/uncertain cases retain the existing host surface and do not show the new render-failure fallback.

## Executed verification

- TypeScript check and one scoped `npm run build:desktop`: PASS. Generated only live frontend dist-desktop; no native compilation/bundle.
- Five new actual-controller startup rejection/disposal regressions: PASS. Captured focused run also includes one existing unreadable-storage test, six total PASS. No save/submit/configure/journal-write/clear/reconcile replay in these cases.
- Existing desktop HTML transform and renderer selector tests: six PASS.
- Existing4317 mounted renderer harness, scenario=startup-fallback: twelve cases PASS at measured widths320,390,1280. Actual React StrictMode/boundary/loader/App tested with throwing child, rejected module, unresolved module, valid desktop, intentional demo, missing/null/primitive/accessor bridge, partial object bridge, hydration error and hydration uncertain. Accessor count zero; private exception strings absent from UI. Fallbacks have announcements and no textarea/button/input/link controls. Fallback document scroll width equals viewport width.
- No host/storage mutations in fallback or desktop-startup cases. Intentional demo already writes its initial preview history through useWorkspaceDemo; the test compares loader-mounted demo against direct-App baseline and confirms unchanged write count, zero localStorage writes and no host calls. All storage is a private synthetic stand-in; real browser storage is not changed by the checks. The first test run correctly detected this pre-existing demo behavior; assertion was narrowed to baseline equivalence rather than changing demo production behavior.
- Visually inspected failure at320x800, bridge-unavailable at390x844, and loading at1280x900; also failure at1280x720. Text wraps legibly without horizontal overflow. Temporary viewport override reset. Browser screenshots were observed inline, not saved as evidence files.
- Generated HTML retains loading root and references existing hashed CSS containing startup styles. Vite merges the startup sheet into index-CnIYQdHI.css; it remains linked before App evaluation. desktop-entry preserves bridge-first ordering. Entry has a real dynamic App-Bi2xxq7I.js import and references App-B7AUD2mV.css; both exist and use same-origin relative paths. HTML has no inline executable script or preview CSP. Unchanged native policy permits self scripts/styles without unsafe-eval; generated dynamic imports introduce no external/eval requirement. This is generated-input compatibility inspection, not native CSP/WebKit execution.

## Evidence and preservation

Evidence directory: qa-artifacts/startup-fallback-implementation-20260910. source-hashes.json records all eight exact before/after hashes; implementation.patch is the exact combined live delta including builder test/seam additions. before/ captures prior files. frontend-build.log, controller-tests.log, entry-selector-tests.log, generated-assets.json, verify.py and verification.json record executed checks. Twelve browser case outcomes and measured widths are captured in tool observations; verification.json summarizes those observations, not an automated browser replay log.

All148 accepted candidate files and three current Startup Handoff QA bundle files retain captured hashes (151 protected inputs). Candidate HEAD remains2ea834a1e2385c34b8f516854b5317c6a08a0607. No export, root/candidate commit, native source changes or current QA replacement. Prior live styling and other unrelated live work were preserved by exact targeted edits.

Missing proof: actual native document/asset loading, WebKit CSP enforcement, native startup/display behavior, S02 root cause, safe S02 retirement, provider handoff, persistence/durability, and failed native navigation. If HTML itself never loads, this frontend cannot display a fallback. Failure of initial React/bootstrap dependencies leaves static loading; no claim of automatic diagnosis. Error boundaries do not catch arbitrary async/event-handler failures. No native bundle/build/launch/quit/process/profile/provider/dependency/server/publication actions occurred in this slice. S02 retirement remains pending confirmation.
