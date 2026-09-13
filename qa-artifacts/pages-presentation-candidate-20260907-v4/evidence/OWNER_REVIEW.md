# V4 owner review

V4 was rendered from the generated coming-soon `site/dist` package with Chromium headless shell through the saved `render-v4.cjs` script. All non-loopback requests were blocked.

- 1280 x 1000: no horizontal overflow. Compact hero ends at 572 px; the real native screenshot begins at 599 px and fills the remaining first viewport with product proof.
- 390 x 844: no horizontal overflow. Product section begins at 531 px and screenshot begins at 543 px.
- 320 x 568: no horizontal overflow. Product section begins at 584 px and screenshot begins at 596 px, directly after the compact hero.
- Full-page desktop and mobile images were visually inspected. The graphite/silver identity remains consistent; intended-use examples are clearly static editorial examples; FAQ answers remain visible; developer and release sections remain distinct.
- Both installer controls are disabled. Source preview 4 remains a separate GitHub link with Xcode and non-DMG language.
- Internal `/rivune/` links and image route returned HTTP 200. External homepage links are limited to GitHub and the exact reviewed `mailto:rivune.crave757@slmails.com` alias; external requests were not made.
- Skip-link keyboard focus, mobile-menu keyboard navigation/closure, FAQ visibility, full-resolution image popup, reduced-motion CSS, and console errors were checked. All passed; no console warning/error was recorded.
- The email alias was not sent to or delivery-tested. Forwarding and reverse-alias reply behavior remain unverified.
- This is owner-render evidence for a local candidate, not independent acceptance, installed-app proof, release readiness, or publication authorization.
