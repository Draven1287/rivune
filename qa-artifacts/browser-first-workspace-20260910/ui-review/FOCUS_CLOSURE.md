# Independent focus closure

Bounded PASS: both prior P2 focus findings closed on frozen TSX ea71da17db0e054bad9ed423615a2b7fb2d2ab087b00bab0ca5a3070c71c555f / CSS 652fd5bcd89d7916e10b59a13daba5562b009deb3d7b6f682ff11368645352e0. All four receipt hashes independently match before and after. Read updated RECEIPT.md and focus-closure/check.log (owner16 deterministic cases PASS).

Fresh reviewer-owned app-browser tab at actual root http://127.0.0.1:4317/, no harness. Builder explicitly released browser ownership before review.

Reviewer-verified:
- At320×844, Enter on Toggle conversations focuses New conversation. Eight Tabs stay on sidebar controls, each center hit test uncovered. Reverse Tab wraps through Rivune and Close conversations. Main has inert while navigation open.
- Escape and explicit Close conversations restore exact Toggle conversations, aria-expanded=false, main inert removed.
- Open narrow navigation →1280×900 retains New conversation focus and removes main inert. Shrink from focused visible desktop navigation →320 restores Toggle conversations, collapsed.
- At320 and1280: Results → Tab from Close to sample row → Enter focuses H2#bw-results-title. Next Tab reaches Close, following Tab reaches All results; Enter restores Agent status labels sample row. Escape restores original external Results trigger. No BODY transition reproduced.
- Initial and final draft exactly equal (empty). No typing or data mutation. This verifies no unintended draft change during this path, not nonempty/ABA persistence or reload recovery.
- Reviewer viewport reset and own tab closed. No source/server/native/provider/OS clipboard/Arc/Claude operations.

Nonzero list-scroll restoration remains owner deterministic-component evidence: one mounted short result cannot establish that case. No full accessibility, screen reader, zoom, clipboard scheduling or host/backend acceptance. Prior P3 typography feedback and user visual approval remain separate. No new screenshots needed for these focus-only assertions; prior review captures and builder focus-closure screenshots remain explicitly attributed.

Task read/send tools unavailable this turn. Lead current history could not be refreshed; no reliance on stale live history. Current local coordination plus direct builder/lead delegations supplied scope. Direct findings delivery not claimed; coordinator can consume this report.
