# Rivune native cosmos website candidate V4

V4 is a narrow responsive correction over the frozen V3 candidate. It preserves the approved galaxy, typography, messaging, contact behavior, FAQ, modes, footer, and installer boundaries.

- Preview: `http://127.0.0.1:4299/rivune/`
- Frozen source: `source/`
- Built preview: `dist/`
- Evidence: `evidence/`
- V3-to-V4 delta: `evidence/v4-text.patch`

At 320px, V3’s public email and action column extended 7.17px beyond the contact card. V4 uses a zero-minimum mobile grid, constrains every child to the padded content width, and adds an intentional line-break opportunity before `@`. The complete address stays visible, selectable, and available unchanged to Copy Email, Gmail compose, and the email-app link.

Measured after the correction:

- 320px viewport: contact content bounds 44–276px; email and every action occupy 45–275px.
- 390px viewport: contact content bounds 44–346px; email and every action occupy 45–345px.
- Keyboard Copy Email announces success at both widths.
- No document overflow.

All 25 static tests pass. No website redesign or publication occurred.
