# Frozen Rivune website candidate V4

Status: local informational-preview candidate only. Frozen V3 and its evidence remain unchanged. No publication, domain purchase, provider request, email send, pricing page, shared native edit, or DMG action occurred.

## Presentation change

- Tightened the hero and moved the full-width real native screenshot immediately beneath it; the image starts at 599 px in the 1280 x 1000 render.
- Added “For decisions. For everyday work.” with three static illustrative prompts for the planned team experience.
- Added the verified Aarav introduction, the exact public forwarding alias, GitHub Issues, and matching privacy disclosure.
- Added four visible FAQ answers for availability, provider accounts, unbundled AI usage, and multi-provider routing.
- Preserved appointed-lead direction, Council local-development only, and Auto/Swarm future status.
- Replaced V3’s blanket no-script assertions with a narrow audited-inline-script contract that still rejects external, tracking, and network scripts.

## Frozen unit

- Complete 17-file site source and required assets: `site/`
- Generated 12-file coming-soon preview: `site/dist/`
- Exact patch against frozen V3: `presentation-v4.patch`
- Full source, distribution, evidence, and patch hashes: `manifest.json`
- Reproducible render script and screenshots: `evidence/`

## Verification

```sh
cd /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/pages-presentation-candidate-20260907-v4/site
python3 -m unittest -v
python3 build.py --publish-target preview
node ../evidence/render-v4.cjs
```

All 22 tests and the preview build passed. The 1280, 390, and 320 px renders passed overflow, keyboard, menu, enlargement, reduced-motion, link, image, and console checks. The frozen source matches the independent 17-file snapshot exactly, and the V3 patch reconstructs all 17 files byte-for-byte.

## Boundaries and next dependency

The public alias is present but delivery and reverse-alias reply behavior are unverified. Source preview 4 remains an Xcode-required ZIP, not a signed DMG. Installed-app and live-public states were not assessed. Root reconciliation with the separately prepared 18-file publication unit. No public action is authorized.
