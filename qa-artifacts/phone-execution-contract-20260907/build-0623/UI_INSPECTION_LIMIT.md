# Rivune build 2026090623 UI inspection limit

The installed Rivune app did not crash. After the native main workspace, account/footer popover, and Account settings screen were successfully inspected, the external `SkyComputerUseService` pipe closed while invoking the saved project `Rivune QA — Field notes`.

One bounded recovery was attempted: the CUA JavaScript session was reset, the running app was resolved again first by bundle identifier and then by exact path `/Applications/Rivune.app`. Bundle lookup correctly reported multiple local bundles with the same identifier; the required exact-path retry again returned `Sky Computer Use native pipe closed before response`. Diagnostic Reports contained new `SkyComputerUseService` crash reports at that time. `Rivune` remained running as `/Applications/Rivune.app/Contents/MacOS/Rivune`, its plist remained build `2026090623`, and no Rivune crash report appeared.

Per the review boundary, no further inspector retries were made. No prompt was sent, no provider was called, and no saved content was changed. Project and complete-file continuation behavior remains covered by the accepted automated native suite, while the Project to existing-file post-navigation rendered state is explicitly unverified in this installed checkpoint. This external inspection limitation does not roll back the accepted installed build.
