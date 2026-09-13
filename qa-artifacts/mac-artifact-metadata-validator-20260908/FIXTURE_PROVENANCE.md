# Fixture provenance

The regression fixture named r3-regression.json is a synthetic transcription of findings in:

qa-artifacts/tauri-r2-integration-review-20260907/r3-integration/R3_R2_APP_INDEPENDENT_REVIEW.md

Bound source SHA-256:

4fad330756e90c1f27efb217504d0ab9158f425b784410cbc4766ece14343e0e

Transcribed facts:

- Architecture: arm64.
- Plist LSMinimumSystemVersion: 10.13.
- Mach-O LC_BUILD_VERSION minimum: 11.0.
- LSRequiresCarbon: true.
- Ad hoc linker signature with no Team ID, no bound Info.plist, and no sealed resources.
- Strict bundle verification failure.

The fixture adds deterministic product identity/version placeholders only to isolate these regression checks. It is not raw evidence from the live app and must never be used to claim that the current app still has these properties.

The other fixtures are wholly synthetic parser and policy cases.
