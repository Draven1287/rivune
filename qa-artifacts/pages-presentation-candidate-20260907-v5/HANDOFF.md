# Rivune website V5 handoff

Status: frozen local candidate for owner review. No push, release, deployment, or publication was performed.

## Result

- Eight real routes: Home, App, How It Works, FAQ, About, Download, Privacy, and the backward-compatible Council vs Swarm guide.
- Compact product-first hero with readable typography and a restrained graphite/mineral/alpine-blue direction.
- App screenshots are absent from markup and public assets. Home and App use responsive HTML interface previews with explicit prewritten-example disclosures.
- Keyboard-accessible, prewritten walkthrough with three examples and three review stages. It explicitly states that no AI request is sent.
- Platform availability selector for macOS, Windows, and Linux. Windows and Linux remain planned. A Mac DMG appears only when validated release metadata exists and only while macOS is selected.
- About/contact appears near the top of About and in the global footer. The public forwarding alias remains `rivune.crave757@slmails.com`.
- Coming-soon output has no installer button or installation tutorial. Developer source is kept in a secondary disclosure and remains clearly separate from an app installer.

## Verification

- `python3 -m unittest -v`: 23/23 passed.
- Preview build completed with `publishTarget=preview`, `releaseStatus=coming-soon`, and `simulation=false`.
- Playwright checked all eight routes, direct loads, refresh, Back/Forward, canonical URLs, current-page navigation, keyboard mobile menu, the desktop More disclosure, all images, console errors, and horizontal overflow.
- Layouts checked at 1280x1000, 768x900, 390x844, and 320x568; a 640px layout check represents 200% zoom from a 1280px viewport.
- Demo controls, reset, focus behavior, reduced motion, platform switching, and source/installer separation passed.
- The simulated ready fixture confirmed that the Mac artifact disappears for Windows/Linux and returns only for macOS.
- Key palette text/background contrast ratios range from 9.10:1 to 17.79:1.
- `presentation-v5.patch` applies to the frozen accepted V4 source and recreates this V5 source exactly (`patch-compare.log` is empty).

## Evidence boundary

The downloadable Mac installer is still unavailable in the production metadata. A local simulated ready fixture verifies conditional presentation only; it is not release evidence. Publication remains blocked on actual signed/notarized DMG acceptance, final owner review, and the repository’s explicit publication gate.

## Contents

- `source/`: complete static-site source used for this candidate.
- `dist/`: generated coming-soon preview output.
- `evidence/`: tests, browser observations, screenshots, contrast check, ready-fixture check, and patch validation.
- `presentation-v5.patch`: exact accepted-V4-to-V5 source change.
- `manifest.json`: SHA-256 inventory of the frozen payload.
