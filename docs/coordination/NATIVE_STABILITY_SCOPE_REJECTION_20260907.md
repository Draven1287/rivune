# Native stability candidate: REJECT for installation

Candidate: qa-artifacts/native-stability-diagnostics-20260907/v1.
Reported manifest: 9c0063750355fe55f591c9f4bfa40ffe325963c94579d8de5266daa5915f887d.

Central decision: REJECT for current delivery and installation. This is a scope rejection, not a technical acceptance/rejection of unreviewed source or claimed test results.

This decision also applies to subsequently submitted v2, reported manifest08b85432bdce8adf0a24f671aab984d65d4cae7beda3b24b765076c542a212b3. V2 is not accepted for installation or further SwiftUI validation. Owner reports v1 test-host isolation failed and wrote three content-free diagnostics to the normal folder, then owner stopped that host and removed those files; central has not independently verified those actions or v2 test/build claims. Preserve the report as incident evidence. A newer legacy candidate does not supersede the user's Tauri direction.

The user explicitly selected unified Tauri for macOS, Windows and Linux and requires a verified Tauri replacement of the installed Mac app. That direction supersedes SwiftUI diagnostics/features, Xcode app builds and a SwiftUI replacement restart. See TAURI_INSTALLED_APP_DECISION_20260907.md and TAURI_CENTRAL_ACCEPTANCE_20260907.md.

Do not install this candidate, announce a legacy replacement restart, rerun legacy tests/builds/releases, or reproduce the XCTest host crash. Preserve source, binary, symbols and evidence as historical reference only. Current installed0725 remains untouched until the separate Tauri acceptance/backup/migration/rollback gate is met.

The earlier lifecycle r3 test interruption was intentional, not an invitation to retry. Prior direct STOP messages repeatedly failed with “Cannot steer ... without an active turn id.” This receipt does not grant any build slot. Acknowledge the stop when received; report existing launch/test timestamps without running additional commands that launch an app host.

Active implementation owner: Plan unified AI accounts app, 01a051fa-f42b-7501-b83b-44a75dc29634; canonical Tauri source qa-artifacts/cross-platform-shell-20260907/candidate4-runtime. Coordinate any further bounded work with central before modifying those files.
