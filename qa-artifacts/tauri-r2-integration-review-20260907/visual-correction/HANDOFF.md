# Tauri visual correction — renderer patch

Baseline: user-approved screenshots from September 6 at 21:54:36/44 in this task (silver R, Milky Way, dark reading panels and composer, compact sidebar), plus Rivune/Theme.swift palette, 13px sidebar labels, 15px response body, 16px composer inset and panel radius; SidebarView.swift 36px rows and SettingsView.swift reference. This patch does not claim full behavioral parity with those screens. No Swift build was used.

Only index.html, styles.css, chrome.mjs changed. Before copies retained here; rejected native binary/profile untouched. SOURCE_RECEIPT.json binds current changes and existing Graphite modules. Runtime retains sole build ownership.

Orbit moved out of the fixed ambient background into a dedicated in-flow welcome region, full circle, larger silver-R lead and three smaller members. It cannot paint behind welcome heading or composer. Welcome content scrolls on short windows. It is decorative and does not imply team execution. Scene animation also stops when welcome is hidden, alongside existing document-hidden/system reduced-motion handling.

Sidebar, composer, and Settings use earlier darker palette and stronger typography with consistent spacing. Existing Graphite validation/persistence controls now initialize through chrome.mjs. No host/API/account behavior was fabricated. Existing unavailable capabilities remain disclosed.

Validation: 19 browser checks on the actual canonical HTML/modules (no mocked replacement UI), 1120x760, 760x560, 640x480, 390x844. Dedicated Orbit bounds/no horizontal overflow; Graphite save and rendered accent; reduced-motion; Escape opener focus. Screenshots orbit.png and settings.png inspected. No native host runs, actual provider calls or installer checks. Independent review pending at writing.

Remaining: current bridge still owns functional readiness; Constellation/voice unavailable. This slice does not add missing legacy Projects/search/account behavior or tray icons. Dock/tray packaging is another owner. Full-screen before/after comparison, native app window-size review, animation lifecycle, and final user visual acceptance remain required after integration.

Minimum-height correction: at desktop heights <=680, Orbit and welcome text use two columns. minimum-760x560.png shows entire heading, introduction, CTA and composer visible; normal scene remains above text. Final 19 checks pass.

Approved reference screenshot original paths (now absent from filesystem, but supplied images remain in task):
- /var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/TemporaryItems/NSIRD_screencaptureui_sHhB2q/Screenshot 2026-09-06 at 21.54.36.png
- /var/folders/m5/y_7ddb5167j2pxsm38hv61gh0000gp/T/TemporaryItems/NSIRD_screencaptureui_bP3VH0/Screenshot 2026-09-06 at 21.54.44.png

Comparison: silver R wordmark/artwork retained; black glass reading/composer surfaces and stronger labels restored; Settings stays in-app as subsequently requested (original showed separate window). Existing sidebar functionality still differs: original Projects/search sections are not implemented here. Do not claim complete source/screenshot parity. Exact pixel overlay with missing original files is not verified.

Independent reviewer found no P1/P2 in initial patch including welcome-hidden animation gate. Final compact CSS follow-up requested. Animated full360 and real hidden-window pause/resume still require runtime verification; reduced-motion browser results do not prove them.

Final independent review: no source blocker in compact CSS. Reviewer inspected minimum screenshot and member bounds. Renderer files released to coordinator/runtime; no further edits by this lane. Native visual acceptance remains pending.
