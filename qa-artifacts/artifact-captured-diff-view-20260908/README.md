# Captured diff viewer handoff

Isolated read-only module for the accepted prepared diff contract. Extract diff-controller.mjs, diff-viewer.mjs and diff.css. Inject readPreparedDiff and pass prepared metadata to the mounted viewer. Runtime host integration remains pending; this harness provides synthetic captures, not host provenance or permissions.

Reads bind preparedOperationId, expectedCapturedSnapshotSha256, fileIndex and before/after offsets. No caller-controlled path reads or current-disk reads. Completed byte counts and SHA-256 hashes are verified before inert text is displayed. BOM, CRLF, tabs and UTF-8 boundaries are preserved. Missing originals and existing empty originals have distinct labels. Operation/capture changes invalidate pending responses. No Apply, grants or project writes exist.

Bounds: at most 40 files, 256 KiB aggregate per side, 128 KiB after per file, 64 KiB response chunks, 16 KiB display pages and 64 paired reads per selected file. Excessively fragmented host responses fail closed. Pagination displays full captured before/after text; there is no inline line-diff highlighting. The future host must independently enforce ownership and snapshot provenance.

Validation: 15 Node tests passed; BROWSER.json records 9 Chromium checks covering inert text, empty/missing distinction, stale responses, large pagination, keyboard focus and responsive layout. Inspect recorded viewport widths in that receipt; these are browser harness results, not native app acceptance. diff-390.png provides the captured mobile review image. No canonical source, provider integration or build changes. Existing read-only viewer is not modified.

Run: node --test qa-artifacts/artifact-captured-diff-view-20260908/test-diff.mjs
