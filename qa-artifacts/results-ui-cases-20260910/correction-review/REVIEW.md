# Narrow Results correction closure — 2026-09-10

Bounded PASS. The prior list-scroll defect and detached/hidden-opener dynamic coverage gap are closed in the selected mounted synthetic fixtures. No new actionable defect found. All six correction source hashes independently match the owner manifest; exact expected/actual SHA-256 values are in hashes.json.

Read correction receipt, six-file manifest and actual changed scenario bodies. Used only existing4317 results-correction and results-navigation URLs; no broad suite, production edits, new server, native/provider/clipboard operations. State reviewer remains source-only. Local screenshots were viewed, not saved/forwarded.

## Independently observed execution

- results-correction PASS at verified390×844,1001×844 and1201×844.
- results-navigation PASS at verified390×844 and1001×844.
- Additional exploratory tab runs defaulted to1280 despite an earlier viewport setting; those were not counted toward requested-width acceptance. Verified innerWidth in the actual tab after targeted navigation/reload before recording the above verdicts.

The correction scenario creates42 rows, focuses row25, captures a positive scroll offset after setting1700, opens its exact text, then asserts both identical row aria-label focus and exact prior pane.scrollTop after Back. The test asserts replacement chat inertness below/equal1200 and chat width>=480 above1200. It hides the opener with visibility:hidden, then separately detaches it, and asserts chat h1 receives focus on Close in each case. Both modifications are controlled fixture behavior and restored by the harness. This is dynamic mounted proof, superseding the prior source-only fallback qualification.

Ready result-a is removed from authoritative metadata and its displayed text disappears. Ready result-b is then followed by replacement of HostWorkspace bridge with an unavailable empty object; pane and text disappear. This is bridge replacement, not a real native transport-disconnect event. No unsupported null bridge or foundation change was used.

Navigation now uses actual available controls. At390, Conversations deliberately closes Results before attempting a rejected conversation open; the original conversation and visible list remain, then an accepted open completes. At1001, sidebar remains reachable while Results replaces Chat; rejected open preserves the ready result, accepted open closes Results. No direct snapshot substitution/hidden-control click is used in these changed navigation branches. Do not claim Results survives the deliberate mobile Conversations pane switch.

## Readability check

Used results-correction&preview=1 after the selected run to retain the mounted shell. That preview intentionally has zero artifact rows, so screenshots prove shell/empty-state layout, not long-list typography. At1201 the measured central Chat width was532.8203125px and page scrollWidth1201. Chat and Results are distinct readable columns. At1001 Results replaces Chat, retained Chat is inert, page scrollWidth1001 and sidebar is reachable. At390 Results title, Close and empty-state copy wrap/read clearly, page scrollWidth390. All use calm opaque reading surfaces.

The correction preview's test-summary overlay occupies the lower-right/lower mobile surface; this is harness UI, not an app defect or evidence of unobstructed bottom controls. Prior mounted review covers result text/control readability at320/390; this narrow recheck did not repeat it. No new full-Tab, screen-reader, zoom, native durability or OS clipboard claims.

Viewport override reset after checks. Next dependency: independent source review and sole-builder integration/release decisions; no further UI correction is requested by this bounded review.
