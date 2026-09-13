# Tauri visual correction — 8 September 2026

The user visually rejected the Rivune M1 QA build shown at 06:43–06:45 Denver time. Functional test results do not supersede this rejection. Preserve the current native QA evidence; coordinate a new revision rather than editing a frozen candidate during testing.

## Required corrections

- Restore the approved silver R/galaxy identity throughout. The menu-bar V is wrong and the Dock currently shows a generic application icon. Use existing approved artwork, with an appropriate legible tray rendering, rather than designing another brand.
- The QA wrapper Info.plist lacks an application icon declaration, and the canonical Tauri configuration currently has an empty bundle.icon array. Correct both the actual packaged app and the review wrapper; test the running Dock and menu-bar identity after relaunch, not only asset files.
- Recompose Orbit as a complete scene with one larger lead AI and smaller AI members circling through a full orbit. The current gray spheres overlap the welcome heading, explanatory text, button, and composer. Keep illustration in a dedicated layout region, with text and interaction surfaces consistently readable across window sizes. Respect reduced motion and hidden-window pause. Do not represent decorative animation as live model activity.
- Preserve the approved actual Milky Way background and stronger earlier typography. Improve spacing, hierarchy, and density in the chat and tabbed Settings. Remove redundant development wording from the main experience; keep necessary availability details near the relevant control. Do not remove keyboard focus visibility.
- Keep the two experiences Single AI and Constellation Engine. Do not replace the product with an unrelated mockup, and do not reintroduce SwiftUI as the implementation.

## Ownership and acceptance

Technical coordinator: sequence correction work after recording the native QA boundary, maintain one canonical integration/build owner, and include local dependency sources in build provenance.
Frontend owner: implement Orbit/layout/Settings corrections in the actual Tauri renderer. Packaging owner: fix approved icons and bundle metadata in a bounded patch. PM: track visual acceptance separately from native functional qualification.

Review the corrected running Tauri app at normal and minimum supported window sizes, including welcome screen, composer, Settings, Dock, and tray. Preserve conversations and rollback. No paid tools or public release are authorized by this correction. The user has not accepted the corrected visual result yet.

## User-approved migration approach

The user explicitly approved faithfully recreating the earlier SwiftUI Rivune design in Tauri, rather than continuing to redesign during migration. Use the existing SwiftUI source and approved earlier app visuals as the reference for typography, spacing, sidebar, composer, Settings, and interaction behavior. Reuse approved galaxy, icon, and other assets. Reimplement layouts in the actual Tauri frontend and port required behavior to its backend; this is not a request to revive SwiftUI/Xcode as the shipping app or to promise automatic code conversion.

First identify the earlier reference that matches the user's approved screenshots. Preserve that baseline and compare corresponding screens directly. New features such as the complete Orbit and Constellation Engine should extend that visual language. Existing functionality, accessibility, data preservation, and stability requirements remain in force. Do not change a frozen QA candidate in place; deliver one coordinated next revision.
