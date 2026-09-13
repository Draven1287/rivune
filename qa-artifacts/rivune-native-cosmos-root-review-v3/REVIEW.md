# Independent website review — V3 and focused V4 correction

V3: 71 manifest entries matched. The independent browser script exercised nine routes at 1280, 768, 390 and 320 pixels, exact Contact destinations, successful/rejected/missing clipboard capabilities, polite status, retained keyboard focus, Enter/Space on all three mode disclosures and compact footer geometry. All 36 route/viewport states passed without document overflow or page errors. Clipboard capabilities were simulated inside an isolated browser; the audit did not write the user's clipboard or send email.

Visual inspection found a defect that document-width checks missed. At 320 pixels the Contact card ended at x302, with its content boundary x275, but the address and action column extended to x309.17. CONTACT_GEOMETRY.json records the failing measurements. The sole website owner received this finding and produced frozen V4; root did not edit the website implementation.

V4: all 66 manifest entries independently matched. The focused rendered regression passes at 320 and 390 pixels. Address and controls now fit exactly inside the padded card (x45–275 and x45–345 respectively), the full alias remains unchanged, and keyboard Copy Email retains focus and reports success. The narrow screenshot was inspected. See V4_CONTACT_CHECK.json and V4_MANIFEST_CHECK.json.

Acceptance is bounded to the reviewed informational website behavior and the V4 contact correction. It is not a claim that a Tauri installer, cloud service, email delivery or the underlying AI workflows are ready. Preserve the approved galaxy and typography. Architecture copy needs to follow the controlling unified Tauri direction before the next publication review; do not imply unbuilt Windows/Linux installers exist.

The white skip-link rectangle visible in full-page captures after scrolling/focus is not treated as a confirmed product defect: direct unfocused viewport geometry measured top -100/bottom -50.4 with fixed positioning. Do not remove the accessible skip link based solely on that capture artifact.

No deployment, native Rivune lifecycle action or real account/model call was performed by this audit. V4 remains a local candidate pending the current publication decision.
