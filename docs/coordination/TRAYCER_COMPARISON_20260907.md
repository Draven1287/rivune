# Traycer comparison and Rivune polish decision

September 7, 2026. This compares observed local startup, a rendered public product demonstration, and Rivune's frozen 0620 source/native QA evidence. It does not establish comparative answer quality, overall reliability, or full-workflow performance.

**Update after the user requested a fresh reinstall:** Official Traycer 1.2.0 was downloaded, its SHA-256 matched the release asset, and macOS accepted its notarized signature. Finder replaced the administrator-owned app after local user authorization. The installed plist now reports 1.2.0; launch restores the existing workspace and the compatibility blocker is gone. The old bundle is preserved at `/private/tmp/traycer-replacement-20260907/Traycer-1.1.9.app`. No account/history reset occurred. See `reinstallation-complete.json` and `traycer-1.2.0-restored-workspace.png` in the comparison evidence folder.

The actual 1.2.0 workspace shows a quiet dark reading area, a restrained transcript column with substantial whitespace, agents/artifacts grouped separately in the sidebar, and model/effort controls grouped in the composer. Those direct visual observations support the bounded Rivune polish targets below. Interior accessibility elements were not exposed, and coordinate actions returned inspection-tool errors; Settings/picker interaction and full smoothness remain unverified. This supersedes the earlier statement that startup was still blocked, while preserving its historical evidence.

## What was actually inspected

- Installed `/Applications/Traycer.app`, bundle `ai.traycer.desktop`, version 1.1.9. Native launch reached a client/host compatibility error instead of the workspace. The account menu opened and dismissed. No provider request, new login, subscription action, host update, reset, or history deletion was performed.
- Traycer's built-in updater offered 1.2.0. Download reached “Update ready to install”; Restart was invoked. Reopening still showed the compatibility error and the installed plist still reported 1.1.9. Update success is **not** claimed. The observed screen recommends updating the host while its detailed reason says the client is too old and another host update will not help. This is a concrete recovery-message inconsistency on this installation, not evidence that every Traycer installation fails.
- [Traycer's current public product page](https://traycer.ai/) was opened in a background browser and its embedded workspace demonstration was visually inspected. It depicts chat, named artifacts, a detail pane, and compact prompt controls. These are marketing-demo observations, not interactive execution acceptance. Older editor-extension documentation was not treated as proof of the current desktop app.
- Rivune's `continuation-selected.png`, native AX receipts, and frozen final 0620 source. The screenshot is fictional QA output. Real request semantics are supported separately by recording tests; neither establishes that Council makes better websites or answers.

Evidence: `qa-artifacts/traycer-comparison-20260907/traycer-1.1.9-startup.png`, `traycer-1.1.9-startup-ax.txt`, and `traycer-public-demo.png`. Rivune evidence is in `/private/tmp/rivune-review-2026090620/` and `qa-artifacts/native-product-audit-20260906/build-0620/`. Personal account-menu contents were not copied into the comparison evidence.

## Comparison

| Area | Traycer observation | Rivune observation and decision |
| --- | --- | --- |
| Reading hierarchy | Public demo uses opaque dark reading surfaces, clear panel boundaries and compact activity labels | Rivune already has a nearly opaque response card. Keep its broad conversation surface; align artifact prose with normal answers and reduce competing composer boxes |
| Prompt controls | Demo groups workflow/model controls adjacent to the prompt | Rivune has a separate Team row plus a Council configuration trigger. Consolidate to one Team action and a readable Manager label, preserving every supported choice |
| File context | Demo places context near the prompt and named outputs in its sidebar | Rivune 0620 has explicit complete-file continuation and correct context disclosures. Reduce its banner padding and enlarge the removal target; preserve exact selected files and the visible memory-off notice |
| Navigation density | Demo's three columns expose more material but also produce small labels and truncated titles | Do not copy this layout literally. Raise Rivune sidebar labels from 12 to 13 points, normalize row height and spacing, and retain the anchored account footer |
| Retrieval | Demo gives named artifacts their own navigation | Keep this as a later retrieval improvement. Current polish uses the existing artifact cards and preview; it does not introduce another artifact store or imply current project-wide retrieval |
| Startup/recovery | This installed version failed to reach its workspace; the displayed primary recovery action contradicted its detailed reason | Rivune should present one accurate next action and preserve local work. Do not use an error-free-looking marketing page as proof of smooth operation |
| Smoothness and quality | Full Traycer navigation, generation, cancellation and completed-task behavior were blocked/unmeasured | Rivune has bounded native interaction checks and deterministic tests. Neither product receives an overall smoothness or quality winner from this comparison |

## Product decision and work underway

Proceed with four presentation changes in [RIVUNE_POLISH_IMPLEMENTATION_TARGETS.md](RIVUNE_POLISH_IMPLEMENTATION_TARGETS.md): one composer configuration row, compact selected-file context, consistent readable sidebar typography, and artifact summaries matching answer prose. Source-derived targets include 36-point sidebar rows, 13-point labels, a 32-point context removal target and 15-point prose with 5-point line spacing. These are implementation targets, not measured usability improvements yet.

Preserve background presets and saved brightness, native Mac window semantics, Rivune's original identity, the account footer, Council/member configuration and all supported workflow guards. Do not enable Swarm or copy a permissive access default as part of visual polish. No forced switch away from the user's selected background.

**Ownership:** Review and update website daily implements the isolated candidate at `/private/tmp/rivune-polish-next`, owning only Theme, Components, SidebarView and ProjectWorkspace candidate files. Update Rivune product direction finishes 0620's existing install gates independently and later integrates an accepted candidate. Summarize current work independently reviews the frozen candidate. Root coordinates comparison, scope, native UI handoffs and user decisions.

**Acceptance:** Capture comparable before/after states with the same background at supported narrow and wide window sizes; verify long names, keyboard focus, one visible Council Team action, manager identity, selected-file/removal behavior, preserved drafts, account-footer reachability, and readable artifact summaries. Focused checks must use the actual native build. Public-site publication, hosted models, payment plans, new adapters and file-format repair are outside this visual increment.

The fresh-install startup failure is resolved. The comparison now includes the actual restored 1.2.0 workspace, while detailed interaction, runtime quality and performance remain unmeasured. The four-file Rivune polish candidate at `/private/tmp/rivune-polish-next` has since built successfully for Mac Debug and passed independent source review. Native rendered acceptance is next; no parity or superiority claim follows from that source review.
