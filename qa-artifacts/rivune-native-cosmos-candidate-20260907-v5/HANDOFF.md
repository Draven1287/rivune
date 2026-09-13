# Rivune native cosmos website candidate V5

V5 preserves the user-approved native Rivune galaxy design and the V4 contact correction. It changes factual product copy and source documentation so the website reflects Rivune’s current architecture and verified state.

- Preview: `http://127.0.0.1:4300/rivune/`
- Frozen source: `source/`
- Built preview: `dist/`
- Evidence: `evidence/`
- V4-to-V5 delta: `evidence/v5-text.patch`

The revised site now states that Rivune is being developed as one Tauri desktop app for macOS, Windows, and Linux. It does not transfer legacy SwiftUI behavior or provider readiness to Tauri. It records that no built and running Tauri app, accepted installer, or live Tauri provider request has been verified; Normal AI through the real host pipeline is the first milestone, while Council and Swarm ports remain pending.

The download page continues to expose no installer. Its developer-source disclosure identifies the current archive as legacy SwiftUI Mac code rather than the forthcoming Tauri app. Privacy copy distinguishes legacy local behavior from Tauri behavior that still requires verification.
It describes Council and Swarm as planned data paths without assigning either one ahead of the Normal AI host-pipeline milestone.

Validation:

- All 26 Python tests pass, including release gates and a Tauri-direction regression test.
- All nine routes return HTTP 200 at 1280×900, 768×900, 390×844, and 320×568.
- No horizontal overflow or browser errors were detected.
- Copy Email, Gmail compose, and email-app paths pass at 320px and 390px with every contact child contained inside the card.
- All three modes open by keyboard; macOS, Windows, and Linux each show a truthful unavailable state.
- Home, App, How it works, and Download were visually inspected on desktop and mobile.

No redesign, app screenshot, installer, repository integration, or publication occurred.
