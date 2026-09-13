# User decision: replace installed Rivune with Tauri

The user explicitly directs Tauri as the primary macOS, Windows, and Linux app implementation, replacing SwiftUI/Xcode app development. The user also explicitly requires the Rivune app installed on their own Mac to become the Tauri app. A prototype or installer plan alone does not complete the request.

Delivery owner: Audit Rivune project updates coordinates a reachable Tauri host implementer and installation owner. Preserve the existing native app as a reference and rollback artifact. Stop new SwiftUI features; reuse behavior contracts and regression evidence as porting requirements.

Acceptance before replacing /Applications/Rivune.app:
- Working Tauri frontend and Rust host, actual provider dispatch rather than demo output.
- Existing conversation/project/settings formats inventoried, backed up, and migrated or imported without destructive changes. Credentials handled without exposing or copying secret values into logs.
- Verify submit, progress, cancellation, retry, provider failure, window close/reopen, draft recovery and history persistence in an isolated profile.
- Clearly distinguish Normal, Council and Swarm capabilities available in the exact build. Carry remaining Council/Swarm work forward; do not mark a placeholder implementation done.
- Record source/build identity; keep prior app and data rollback. Check no active user request, announce a single replacement restart, then install and verify the Tauri app actually launches from Applications.
- Preserve approved galaxy identity and comfortable chat UI. No unsolicited new design direction.

Constraints: $0; no paid provider calls/services/runners, public release or deployment. Command-line Apple platform build prerequisites may still be necessary for Tauri on macOS; this does not reinstate a SwiftUI or Xcode project.

Toolchain setup is complete: workspace-local Rust 1.98.1 and Cargo 1.98.1 are installed under `.toolchains/rustup` and `.toolchains/cargo`. Use explicit workspace-local environment variables rather than installing another toolchain. Apple command-line clang is available.

After the user's disk-space concern, obsolete build caches were removed. All native builds now share `.toolchains/target-candidate4-r2`; do not create duplicate target directories for reviews or freezes. Preserve source identity with small manifests and receipts. The previous installed app and user data remain untouched. The scoped native smoke passed on an earlier isolated development build; it is not acceptance of later source changes, providers, migration, or installation.
