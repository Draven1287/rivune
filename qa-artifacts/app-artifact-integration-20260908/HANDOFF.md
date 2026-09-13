# App artifact integration compatibility

Prepared integration.patch against the frozen baseline/web copy of candidate4-runtime-r2/web. No canonical files edited. PATCH_HASHES.json binds every baseline file and changed candidate file. The patch applies cleanly to baseline. Canonical app.mjs, core.mjs, index.html, desktop-host.mjs and styles.css changed during this task: frontend must rebase the three integration touchpoints under its named lease, not apply blindly.

Exact seams:
- app.mjs imports and initializes artifactReview after host creation; render() supplies only an existing selected conversation while shutdown is not frozen. The existing transcript and composer DOM are left in place. Existing shutdown dialog closing also clears the review.
- core.mjs forwards only present listArtifacts/readArtifactFile/readPreparedDiff methods. No methods or invoke names are added to desktop-host.mjs. The current bridge has none, so the product shows no artifact action.
- index.html loads the accepted two stylesheets and a bounded dialog width. artifact-review.mjs adds the Artifacts header button only with both catalog reads, mounts the accepted viewer, destroys it on Close/Escape/conversation switch and restores triggering focus.
- exported artifactReview.openPrepared(prepared) is an integration seam for a future real prepared-operation selection. It checks conversation ownership/state before passing the DTO to the accepted captured-diff viewer. No user-facing prepare/apply/revert button is invented.

All six files from accepted artifact-readonly-viewer and artifact-captured-diff-view packages are reused byte-for-byte. No redesign. Review shows full captured before/after pages, not changed-line highlighting.

Runtime dependencies: real host-backed listArtifacts({conversationId}), readArtifactFile({artifactId,expectedRevisionSha256,path}), and optional readPreparedDiff({preparedOperationId,expectedCapturedSnapshotSha256,fileIndex,beforeOffset,afterOffset}), returning accepted Result<T> wrappers. Real host must enforce ownership, revision/capture provenance and storage bounds. A selected_artifact string in admitted context is not a catalog/capability. Expose methods only after commands actually exist. Prepared operation discovery/selection is not currently wired; this patch does not fabricate it. No fixture files enter the product patch.

Validation: 3 compatibility tests pass, covering absent/partial capability, request field filtering and exact Result wrapper/error preservation. 12 browser checks pass in the exact isolated patched renderer with an injected synthetic host; cover unavailable action, artifact open/file switch/inert content, Close/Escape, focus, retained unsaved draft/transcript, late read suppression, reopen, prepared-owner rejection, captured diff display/close and absence of write controls. No unhandled browser errors. Browser request interception serves only frozen local files and blocks other origins. BROWSER.json and integrated-artifact.png are evidence. These are not native/runtime or mobile visual acceptance. Browser processes closed after tests.

Commands:
node --test qa-artifacts/app-artifact-integration-20260908/compatibility.test.mjs
node qa-artifacts/app-artifact-integration-20260908/browser-check.cjs

Handoff is ready for frontend rebase and runtime dependency work. No canonical integration, build, provider invocation or project write has occurred.
