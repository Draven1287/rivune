# Early V4 independent review

Disposition: functional snapshot passes; final presentation changes requested. This is not final candidate or publication acceptance.

The source snapshot was taken only after verifying the same 17 source hashes before copying, in the copy, and after copying. Its exact paths and hashes are in `snapshot.json`. The owner was still working; any final source delta must be reconciled before this evidence can support acceptance.

## Verified

- Complete 22-test suite passes. Both V3 publishing-test regressions are corrected in this snapshot. The preview build passes with coming-soon status; no actual installer is implied.
- Independent Chromium 148 rendering at 1280 × 1000, 390 × 844 and 320 × 568. Screenshots and 22 state observations are in `rendered/`.
- All page images load, and sampled homepage, privacy and guide states have no horizontal overflow. No page/console errors, failing responses or attempted external requests were observed during this run.
- First keyboard focus is Skip to content; activation focuses main.
- At both mobile widths, keyboard Menu → The app closes the menu and reaches #product. Keyboard activation opens the availability FAQ.
- The image-enlargement link has a visible solid focus outline and a 130.375 × 44 px target. It opens the exact 1152 × 768 PNG with a null opener at both mobile widths.
- With reduced motion requested, sampled pages use non-smooth scroll behavior.
- Developer copy uses the user's provided introduction. The contact route is explicitly labeled GitHub Issues; no private email or fake form is present.

## Visual findings sent to the implementer

1. The screenshot starts around 774 px down at desktop width because a second large heading and paragraph separate it from the hero. It is wider and more readable than V3, but should appear sooner. Place it immediately below the compact hero and move the longer descriptive heading/copy beneath, or compress that intervening block substantially.
2. The example disclaimer reads like internal review guidance. Replace it with a concise public-facing label such as “Illustrative prompts for Rivune’s planned team experience.” Availability distinctions remain visible elsewhere.
3. The privacy FAQ should acknowledge that current multi-model requests may reach multiple connected providers, with a link to the detailed privacy page; singular provider wording is too narrow for the earlier Together route.

These are bounded refinements to the current direction. Keep Rivune's graphite/silver identity, authentic app image, developer introduction, accessible controls and honest source-versus-installer availability.

No shared native source, public repository, hosting configuration or user account was changed. The temporary browser and loopback server were closed by the rendering script.
