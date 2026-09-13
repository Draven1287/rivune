# S02 blank window — bounded boot diagnosis

Observed blank window is reported by STARTUP_HANDOFF_NATIVE_READINESS_20260910.md, not reproduced by this task. No window interaction, reload, launch, process command or profile content access. Debugging skill used to separate reproducible boot evidence from hypotheses. No corrective patch justified yet.

## Confirmed checks

S02 provenance identifies commit dd9cfedd6130c4704e5addeb28307a12b20c341f and seven compiled inputs. The old bridge is recoverable from that Git commit and matches recorded SHA-256 0d23ea7fb3bdc3cb521994fad953ca568f0e73ef88ac46ef5fdd2fa1a722c17f. The two-line desktop-entry reconstruction (bridge import, then index-D_OJvy65.js) matches recorded hash 0314da682f1715bce4183dab8c23eb2fb44545e10dbc961b294cf367ffb41b89 exactly.

Executed `node qa-artifacts/blank-window-diagnosis-20260910/boot-check.mjs`: S02 and accepted Startup Handoff bridges evaluate without exception with synthetic Tauri globals and without them. Neither evaluation invokes IPC or listener registration eagerly. This is JavaScript evaluation evidence only, not a WebKit test or simulated successful provider operation.

S02 native base config enables withGlobalTauri and has self-only script CSP plus native IPC connect sources. Its override changes identity/window/frontendDist, not security. Pinned tauri-utils recognizes .mjs as text/javascript; codegen recognizes js and mjs for CSP handling. Therefore extension-based MIME omission and obvious missing withGlobalTauri are not supported explanations. Actual served MIME/CSP is not observed.

S02 frontendDist points to a mutable generated candidate directory, unlike current isolated Startup Handoff frontend-dist. Original hashed S02 JS/CSS files were not found in the inspected retained artifacts. Current generated files cannot stand in for those original bytes. A compiled custom-protocol app does not ordinarily reload that filesystem directory on each launch: directory drift alone is not evidence of the running blank screen's cause.

At S02 source, HostWorkspace initially renders Opening your workspace and renders a bounded unavailable state when startup IPC rejects. Browser draft storage access is lazy/caught, not an obvious top-level storage exception. State reviewer confirms controller hydration rejection is handled as an error state. Thus a plain IPC rejection does not by itself explain wholly absent content; this does not rule out later render exceptions or webview failure.

## Ranked hypotheses, not root-cause claims

1. Module fetch/evaluation failure or React render exception: compatible with blank #root and no static fallback, but no console error/served JS evidence available.
2. Native navigation/document load failure or webview process failure: also compatible; frontend fallback cannot cover a document that never loaded.
3. CSP/resource response failure: possible at runtime, not reproduced by retained config inspection.

No deterministic failing input established, so changing bridge order, CSP, or disabling safety gates would be speculative. No such patch produced. Current Startup Handoff source identity PASS cannot prove it avoids the observed S02 failure.

## Coordination / next evidence

UI reviewer 01a08293-eb84-7e61-9fed-a1148d7ab1da owns isolated static-root/dynamic-import/render-error fallback proposal. That is observability/containment, not an S02 root-cause fix; it cannot cover HTML-not-loaded. State reviewer 01a07cde-764e-7551-92bc-b518107e2137 owns actual-controller hydration/disposal/replacement failure probes, not loader edits.

Smallest next diagnostic dependency is an explicitly authorized, non-reloading inspection of the existing webview's boot error/failed-resource status, or recovery of the exact retained S02 compiled JS for offline examination. Capture only error category, resource URL/status/MIME and sanitized stack—no profile/draft payload. Current assignment does not authorize that UI inspection. Do not relaunch or infer safe Quit from blank content. Sole builder integrates any independently reproduced correction; no competing source changes here.
