# Frozen mobile-polish follow-up candidate

Status: local candidate only. This package addresses the two non-blocking notes in `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/pages-presentation-candidate-20260907-v2/INDEPENDENT_REVIEW.md`. Candidate v2 and all of its evidence remain unchanged.

## Changed behavior

1. The native screenshot now has a visible, keyboard-accessible `View larger image` link. It opens the exact existing 1152 x 768 PNG in a new tab with `noopener`; no UI was invented or cropped.
2. Activating any mobile navigation anchor now removes the Menu disclosure's `open` attribute. Pointer and keyboard activation both close the menu after reaching the destination.

## Frozen unit

- Complete source and required assets: `site/`
- Generated coming-soon preview: `site/dist/`
- Exact patch against accepted v2: `mobile-polish.patch`
- Full source, dist, patch, and evidence hashes: `manifest.json`
- Owner evidence: `evidence/`

## Verification

```sh
cd /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/pages-presentation-candidate-20260907-v3/site
python3 -m unittest -v test_site.StaticOutputTests.test_mobile_product_polish_is_accessible test_site.StaticOutputTests.test_base_paths_assets_and_fragment_navigation
python3 build.py --publish-target preview
```

Both focused tests passed. The preview build passed. At 390 x 844 there was no horizontal overflow; the new link rendered at 130 x 44 px; pointer and Enter activation closed the menu at `#product`; the exact 1152 x 768 image route returned HTTP 200; and the browser console had no warning/error entries.

## Next dependency

Independent reviewer acceptance of v3 before it replaces v2; publication remains separately gated by Pages enablement and a real signed DMG decision. No publish, pricing, provider, or shared native action was taken.
