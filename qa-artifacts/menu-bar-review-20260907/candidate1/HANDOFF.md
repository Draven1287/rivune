# Rivune menu-bar quick access and explicit-text Review — candidate 1

Status: isolated source candidate; shared app source untouched; not independently accepted, installed, or rendered.

## Delivered behavior

- A native `MenuBarExtra` anchor with a custom monochrome Rivune orbit/pearl mark that inherits system foreground color for light and dark menu bars.
- A transient `.window` menu-bar presentation. AppKit owns outside-click dismissal; Escape calls the scene dismiss action. No custom floating or always-on-top window is created.
- Open Rivune activates/focuses the existing main window.
- New conversation calls the existing `RivuneStore.newChat()` draft-preservation path, then focuses the real app. It does not submit.
- Running status observes the existing `RivuneRunCoordinator.runs` and `RivuneStore.hasActiveProviderRuns`. It shows real conversation titles/stages when journal rows exist and avoids inventing provider/model/progress details when only the store-level active flag exists.
- Settings calls the existing in-workspace `presentSettings()` path and focuses the main window.
- Quit calls `NSApp.terminate(nil)`, preserving `RivuneTerminationDelegate` save/active-work admission instead of bypassing it.
- Review accepts only text explicitly typed or pasted into the visible field. “Add to draft” appends a clearly separated `Review this text:` request to the existing composer draft and opens Rivune for inspection. It never auto-sends, silently reads the pasteboard, captures a screen, or creates another conversation database.
- The combined review draft is rejected, not truncated or overwritten, above the existing 16 KiB prompt boundary.
- All principal buttons have visible keyboard-focus outlines and accessibility hints. Reduced Motion replaces the indeterminate spinner with a static activity dot.

## Exact source manifest

Copy:

- `source/RivuneMenuBar.swift` -> `Rivune/RivuneMenuBar.swift`
- `tests/RivuneMenuBarTests.swift` -> `RivuneTests/RivuneMenuBarTests.swift`

Then apply:

- `integration/RivuneApp.scene.patch`
- `integration/project.pbxproj.patch`

Only the Mac app target receives `RivuneMenuBar.swift`; only the Mac test target receives `RivuneMenuBarTests.swift`. The iOS source phase is unchanged. `MANIFEST.sha256` records the exact inspected baselines, candidate files, patches, and expected materialized hashes. If either baseline hash differs, stop and rebase the two small integration patches rather than applying by offset.

## Source and test evidence

Materialized copy: `/private/tmp/rivune-menubar-c1.6lnJne`

Focused command:

```sh
xcodebuild -project Rivune.xcodeproj -scheme 'Rivune Mac' -configuration Debug -destination 'platform=macOS' -derivedDataPath /private/tmp/RivuneMenuBarC1Derived -clonedSourcePackagesDirPath /private/tmp/rivune-0621-tests/SourcePackages -disableAutomaticPackageResolution CODE_SIGNING_ALLOWED=NO test -only-testing:RivuneTests/RivuneMenuBarCommandRouterTests -only-testing:RivuneTests/RivuneMenuBarTaskSnapshotTests -only-testing:RivuneTests/RivuneReviewDraftPolicyTests
```

Result: `TEST SUCCEEDED`; 9 focused tests passed. The test build compiled the full current Mac app target and the new source. `plutil -lint Rivune.xcodeproj/project.pbxproj` also returned `OK`.

Coverage includes:

- exact dismiss/new-chat/show-window and settings/show-window ordering;
- native quit routing and one invocation per user command;
- existing conversation draft restoration after starting a new chat;
- running -> synthesizing -> complete task-state changes;
- honest fallback for active non-journaled work;
- review append without replacement, explicit nonempty input, and over-limit rejection;
- zero provider-dispatch counter changes for every quick command.

A bounded static scan of the two candidate Swift files found no `NSPasteboard`, screen-capture, screenshot, submit, message-send, generation-task, terminal-service, or provider-runner references.

## Native integration and review steps

1. Native integrator confirms the two baseline hashes in `MANIFEST.sha256` or rebases the small scene/project additions onto newer accepted source.
2. Copy the two new Swift files, apply the scene hook, and add them only to the Mac target/test target as recorded.
3. Re-run the focused tests plus the integrator's accepted full Mac regression suite with no signing or provider workloads.
4. In the integrator-owned rendered slot, inspect the status mark on light and dark menu bars; open/dismiss by outside click and Escape; tab through every control; enable Reduce Motion; and test VoiceOver labels.
5. With an identified isolated build, verify: minimized/closed main-window focus; a nonempty draft survives New conversation and restores when returning; Settings covers/returns to the retained workspace; real run stage changes appear; Review appends to—not replaces—the current draft and performs no send; Quit blocks during active work and saves/quits when idle.
6. Keep installed build `2026090623` as the reported baseline until the native owner explicitly applies, builds, installs, and records newer evidence.

## Boundaries and remaining acceptance

- Source/build evidence only. No native app UI control was used, no screenshot was captured, and rendered outside-click/focus/contrast behavior remains unverified.
- No live provider call, model review, network, auth/credential mutation, user-data edit, publication, purchase, package, release, or installation occurred.
- Screenshot review is not added here. Users can use the existing explicit attachment path only when the selected real route supports the media; this candidate does not claim image understanding.
- Independent source review and the native integrator's rendered slot are required before integration acceptance.
