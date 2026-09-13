# Archive inspector integration handoff

The three files in `ARCHIVE_INSPECTOR_SOURCE_RECEIPT.json` are finished and released to runtime integration. No host/lib/main/Cargo/app/index/shared-styles files were edited by this slice.

## Runtime contract

Register `legacy_inspection` in the appropriate crate module and call `legacy_inspection::inspect_legacy_import(&preview)` only after loading and verifying the user-selected preserved archive. It returns `Result<ArchiveInspection, String>`. Export the DTO through `inspectLegacyImport(fingerprint)`; reject a mismatched/unavailable/unverified archive. No filesystem path or permission from archive data may be followed or activated.

Serialized DTO: `{schemaVersion:1,fingerprint,sections:[{kind,items:[{id,label,detailText}],totalCount,truncated}]}`. All five section kinds are present: `projects`, `orphanDrafts`, `attachments`, `preferences`, `notices`. Per-section maximum100items, per-item maximum4096 UTF-8 detail bytes/256label bytes, maximum128KiB serialized reply including escaping. A section's truncated flag covers both missing items and shortened text. Attachment count represents occurrences across history, project files and draft attachments, not just historical-turn attachment count in the original receipt. Do not equate these totals silently.

Preferences are restricted to recognized boolean motion/context choices and an allowlisted default-mode enum. A notice explains omitted keys and inactive permissions. Raw preference JSON, old-consent fields, bookmarks, credential fields and retry context never enter the DTO. Preserved user-authored instructions/draft/attachment text are plain text in this explicitly opened inspection view.

Import `initializeArchiveInspector` from `./archive-inspector.mjs` in the runtime-owned app module. Initialize once with `{inspect: fingerprint => host.inspectLegacyImport(fingerprint)}`. Connect a stable receipt action to `inspector.open(receipt.fingerprint, clickedButton)`. `open` returns a promise settling after load or cancellation; `close()` is available for app shutdown. Keep the trigger node stable across polls so focus can return. Do not initialize on every render.

The module creates its modal and loads `archive-inspector.css` using `new URL('./archive-inspector.css', import.meta.url)`. Include this file in packaging. No inline styles or CSP weakening are needed. The modal is compatible with a Settings parent dialog, closes by Escape, restores parent focus, bounds text/scroll, rejects malformed/mismatched/oversized replies, times out after10seconds, and ignores superseded/late replies. Inspection failure never claims data was modified or successfully exported.

## Evidence and limits

- Five Rust tests executed against existing shared-target dependency rlibs, no new target/dependency: allowlist/privacy, Unicode/escaped JSON limits, item cap, invalid binding, actual prepared synthetic payloads.
- Eight JS DTO validation checks passed.
- Sixteen rendered checks passed using the existing synthetic-browser harness and the exact native CSP. Covers CSS loading, literal untrusted text, five categories/truncation, parent focus, immediate close/reopen/late reply, keyboard navigation, retry,390/760px fit, pending close settlement and timeout. No renderer errors or CSP violations.
- Independent reviewer found and then accepted fixes for queued-close and CSP issues. Final review found no concrete scoped P1/P2 blocker.

This is source/module acceptance. The trigger, bridge, verified archive loading and combined native build still require runtime integration and the prepared native acceptance sequence. No real provider, account, native app, installer or publication was used in these tests.
