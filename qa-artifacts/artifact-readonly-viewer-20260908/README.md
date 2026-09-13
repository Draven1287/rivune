# Extractable read-only artifact viewer

Implemented isolated vanilla ES modules. No canonical site/Tauri files changed. Reuses Rivune's existing system-sans/code typography and surface/focus tokens; fixture server reads current Tauri styles in place. No artwork was copied. The module has no dependency, provider, native command, filesystem write, Apply/Revert/Continue control or executable HTML preview.

## Extraction boundary

```js
import {mountArtifactViewer} from './artifact-viewer.mjs';
const viewer = mountArtifactViewer({
  container: document.querySelector('#artifacts'),
  adapter: {
    listArtifacts: ({conversationId}) => hostRead.listArtifacts({conversationId}),
    readArtifactFile: ({artifactId, expectedRevisionSha256, path}) =>
      hostRead.readArtifactFile({artifactId, expectedRevisionSha256, path})
  }
});
await viewer.load(conversationId);
// Or supply an already retrieved bounded metadata list:
await viewer.setArtifacts(conversationId, artifactMetadata);
// On unmount:
viewer.destroy();
```

The hostRead example is a proposed injected adapter, not an implemented host command. Only methods returning `Promise<{ok:true,value}|{ok:false,error}>` are required. List value is the accepted contract's ArtifactRevision[]; file value is `{content:string,sha256:string}`. A read error with `code:'missing'` produces a specific missing-file state; other failures show a generic retry message without exposing raw host errors. The controller constructs path requests only from validated metadata selected by index, never typed paths. Host ownership/archive/provenance authorization remains mandatory; this viewer is not a file-permission boundary and cannot verify raw-response provenance without host bytes.

Metadata is copied/frozen, conversation-bound, limited to100 artifacts/256KiB serialized metadata, 1–40 files per artifact,128KiB/file,256KiB/artifact and4096-byte summary. Safe relative extension-limited paths, case/NFC duplicates, Windows device names and declared byte totals are checked. Returned UTF-8 content must have the exact declared byte length and SHA-256 before display; no truncation or newline normalization. Unpaired surrogate strings are rejected. `crypto.subtle` is required; failure is explicit rather than displaying unverifiable text.

Artifact and file lists use native buttons with selected state. Arrow/Home/End moves focus within a list; Enter/Space selects. The code pane is a keyboard-focusable read-only pre/code area. Async completion updates text without replacing list buttons or stealing their focus. Retry returns focus to the selected file when its button disappears. Navigation, replacement metadata, cross-revision selection and destroy invalidate pending responses, including late errors. Loading/error/missing/empty states clear prior content. Archived records show read-only provenance and expose no write controls.

All untrusted labels and bytes render through textContent. The module contains no innerHTML, iframe, script execution, shell command, native invoke or network request. It is a plain text/code viewer; HTML is displayed literally.

## Evidence

`node --test test-controller.mjs`: **15/15 pass**. Includes unsafe CRLF/tab byte preservation; immutable metadata; only bound adapter reads; stale file/revision/list success and rejection races; invalid/foreign paths; duplicate/bounds checks; hash/byte mismatch; missing/retry; empty/error; archives; destroy and aggregate limits.

`BROWSER.json`: **10 checks passed in actual in-app Chromium**, with the injected synthetic adapter. Exact unsafe markup/CRLF/tabs remained text; no script/image/iframe/editor nodes were created; keyboard file selection and retry focus remained correct; archived labels, loading/stale revision, missing, error and empty states behaved correctly. No document overflow at320/390/1280. Nine recorded adapter requests contain only artifactId/expectedRevisionSha256/path. Zero browser error logs. This is not a native-host integration test. Synthetic metadata revision IDs are deliberately recognizable placeholders, not real runtime provenance receipts.

The ordinary screenshot tool produced scaling/blank-canvas artifacts. `viewer-cdp-390.png` is a clean independently captured browser screenshot and was visually inspected; original captures are retained with that limitation. Module state/byte/interaction assertions do not rely on the malformed captures. Fixture server uses a restrictive CSP, serves only named local files/styles, and was stopped; tabs closed and viewport reset. No external navigation or provider execution occurred.

Fixture buttons at the top of index.html deliberately drive synthetic conditions; they are not product controls and are not part of the extractable viewer module. `serve.py` starts a loopback-only server with an ephemeral port for independent checks; no build step is needed.

## Review handoff

Extract `artifact-controller.mjs`, `artifact-viewer.mjs` and `viewer.css` only after independent review and an actual runtime read-only DTO bridge is available. Fixture/harness/server/tests stay isolated. The accepted contract is `../tauri-r2-integration-review-20260907/artifact-workflow-prep/CONTRACT.md` and `DTO.ts`; the prior UI convention is `../cross-platform-shell-20260907/candidate4-runtime-r2/web/transcript.mjs` plus `styles.css`/`transcript.css`. HASHES.json binds source, test/browser receipts, screenshots and exact reference hashes. Stop before canonical integration.
