# Browser copy feedback — independent state closure

**BOUNDED PASS — prior P2 closed.** No remaining stale-copy feedback defect found in this correction. The roster-count observation is also resolved.

Verified captured identities:

- BrowserWorkspace.tsx: `94d3531e732d45b50d2efb1707eecf3652c3e76dea7831ac7d204b4a883c03d0`
- tests/browserCopyFeedback.cjs: `5000063f8539bbfcc4c75dc825ec084ce88b5c5da50bb306f47d32778ccdfb3a`

Selection/back/open, close button, native cancel/close, conversation selection/new, and external conversation/result/content changes invalidate the feedback generation. Layout cleanup marks the component unmounted and advances the generation. A completion must own the pending symbol, belong to a mounted component, retain its captured generation and find the dialog open before publishing status. A stale completion may release the operation lock but cannot announce success/failure on a different selection.

The synchronous ref lock is acquired before awaiting the clipboard call and is not cleared by navigation. It prevents overlapping writes even before React rerenders, and keeps the button disabled until the issued operation settles. This does not cancel or reverse an OS clipboard write. If the clipboard promise never settles, further copy remains blocked for that component lifetime; the code does not invent a successful timeout/cancellation.

Independently ran 18 scenarios against the captured actual component: the 15 producer scenarios plus content-change success/failure and same-tick duplicate callback invocation. All passed. The cases exercise current success/failure, selection/back, close/reopen, simulated Escape/native close, external conversation changes, unmount, subsequent valid copy of B, duplicate exclusion and derived two-member roster. Unmount cases assert no later state writes. Content changes suppress feedback even when result ID is unchanged.

Evidence: [independent-check.cjs](independent-check.cjs), [check.log](check.log), [hashes.json](hashes.json). The check adapts the captured producer harness to local captured source and adds the three independent cases. Hook/element/dialog and clipboard implementations are deterministic stand-ins; this does not establish browser event ordering, actual Escape delivery or OS clipboard behavior. No mounted UI tests were run here.

The displayed sample participant count now uses workspace.agents.length. Sample provenance remains explicit; this correction adds no host artifact verification, provider execution, durable save or real-send semantics. Reviewed the receipt's correction section; its stated test limits agree with the harness.

Only local review evidence was written. No production edits, CUA/browser/native/cloud action, server, provider or OS clipboard operation occurred.
