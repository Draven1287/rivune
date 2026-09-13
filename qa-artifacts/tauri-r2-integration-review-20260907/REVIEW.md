# Integrated R2 frontend handoff

Runtime owner explicitly delegated R2/web and renderer tests; Rust ownership was retained. Root integrated the previously reviewed premium Settings/sidebar/composer/assets and transcript/Markdown modules into the actual R2 frontend. This is no longer just an isolated design package.

## Changes to authoritative source

- In-app Settings, local workspace footer, actual provider controls and galaxy preference; existing setup/status gates retained.
- Actual admitted-run conversation history with formatted responses and distinct partial/error states. Host confirmed admission append order; controls now use that order too.
- Per-conversation local drafts/revisions, serialized writes, atomic navigation, stale-response guards, and unchanged-submission clearing bound to the correct conversation.
- A failed save followed by disconnect/reconnect no longer overwrites unsaved text.
- Polling applies latest completed sequence rather than rejecting every result when latency exceeds the polling interval. Navigation suppresses polling and invalidates previous requests at commit.
- Unreadable history cannot be misattributed to a different conversation or enable new Send/Retry work.
- No clipboard or external-opener bridge exists yet; their optional controls were omitted as the runtime owner directed. Copy/open behavior is implemented in the underlying reviewed module but not falsely exposed here.

## Executed checks

33 integrated Chromium checks passed against actual R2 web files, including the five earlier renderer regressions and new reconnect/navigation/save-order/late-acknowledgment/slow-poll cases. No unhandled script errors. Screenshots use explicitly labeled synthetic provider output.

The runtime's existing app.test.mjs and core.test.mjs passed 11/11. The runtime's original keyboard test was updated to load the new local modules/assets and passed. Rust/wire tests were not rebuilt by root during this frontend lane; Rust owner retains the build lane.

Independent source review identified navigation timing, polling starvation and malformed-history Retry issues; all corrected and final scoped recheck found no remaining blocker. Reviewer did not independently rerun browser tests.

## Freeze and ownership

WEB_MANIFEST.sha256 binds the exact integrated web files; RENDERER_TEST_MANIFEST.sha256 binds renderer tests. Root freezes those files at handoff and returns ownership to the runtime task. Root did not edit src-tauri, root manifests, package.json or runtime documentation. Runtime owner should rebuild from this complete frontend and its final Rust freeze before claiming native results.

To rerun integrated checks: node tests/integrated-browser.cjs, with RIVUNE_RENDERER_EVIDENCE_DIR pointing to a dedicated result directory if desired. Tests require the local Playwright/Chromium paths also used by the existing keyboard test. They never invoke provider executables or real user stores.

## Remaining acceptance

No native app launch, install, migration, real provider call or window-level behavior was exercised here. Native IPC, close/reopen persistence, imported-data preservation, process cancellation/recovery, full supported conversation workflows, lead-directed Council/Swarm, Review and installers remain separate gates. Local drafts are protected through an in-process connection/save failure; durable recovery across quitting still requires a successful host save and is not claimed after a persistent storage failure.
