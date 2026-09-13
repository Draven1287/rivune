# Quiet confirmation correction — state closure

**BOUNDED PASS — prior P2 closed.** The compact toolbar now renders the last confirmed summary as visible text whenever confirmation exists. New snapshot mode/provider controls are absent until confirmation clears. No remaining defect identified in this narrow correction.

Exactly three hashes differ from the prior frozen review, and every entry in the refreshed final manifest matches live source:

- ComposerExecutionControl.tsx: `7dba11866b74ffe8ef7a3515960739af51d7910691c8b568a908c0d814773d3e`
- quiet-workspace.css: `a6011b41d267d68664269ccf13f43544dab5fd9d5f083ee10df80b37ae78dfa5`
- hostRenderer.test.tsx: `1fb64aa19e20209c2683f265b7ca2e9ac12514e51762e92d1f715f814d216235`

Independent execution of the captured actual component passes acknowledged=false and acknowledged=true with a newer snapshot and old confirmed summary. Both cases expose only the old summary span in the toolbar, with no mode/provider buttons and no callback invocation. [check.cjs](check.cjs), [check.log](check.log), and [hashes.json](hashes.json) retain the evidence. This uses deterministic hook/helper stubs, not browser mounting.

The production change is a conditional presentation branch; apply, save/send guards, controller callbacks, and noncompact summary behavior remain unchanged. The added CSS allows the visible summary to wrap. When confirmation is absent the previous compact controls return.

The inspected new mounted regression exercises applied-but-lost reply, malformed acknowledgement and refresh failure after acknowledgement. It checks visible toolbar content after snapshot change, absence of unconfirmed controls, Send and keyboard fencing, retained draft, exact original mutation recovery, no extra save for refresh-only recovery, and new labels only after confirmation clears. Producer records report five mounted scenarios passing at 1280 and 320; no browser tests were rerun here.

The regenerated quiet-cases.txt is byte-exact to the declared lines 848–890 of the current hashed harness. Both source and excerpt hashes recompute to quiet-cases-provenance.json. It contains the corrected artifact/inspection/team fixture and new confirmation regression, closing the stale-excerpt finding.

No live/candidate edits, build, server, native or provider action occurred. This closes the state-display finding; visual approval and native/provider acceptance remain separate.
