# V5 intermediate demo and platform review

Status: demo preview behavior PASS; simulated-ready platform behavior FAIL. Owner notified before final freeze. No publication and no real installer/provider call.

Resident frozen source: /private/tmp/rivune-v5-demo-review-jg__wu1v/site. Hashes matched before/after copy. Built preview independently and passed expanded 32-state route/keyboard audit. Browser exercised all 3 examples x 3 stages at 390 and 1280 pixels (18 states), reset, pressed states, focus and six platform selections. Preview result PASS with no external/non-GET requests or JS exceptions. Test source: audit_demo.cjs.

## Fix before final acceptance

1. Simulated-ready fixture leaves Mac DMG actionable after selecting Windows or Linux. Four failures across two widths. Platform selection must show only applicable release actions; unavailable platforms should have one clear availability state.
2. Mac platform panel is hardcoded coming-soon even when fixture release is ready. Two failures across two widths. Use the validated release metadata for selected-platform heading and actions together.
3. Browser rejects CSS font shorthand `600 12px/1.25 inherit`; controls compute 16px normal instead. Use separate valid family, weight, size and line-height declarations to express intended typography. Visual token values themselves remain subject to brand review.

Personally viewed desktop new hero. Product is now alongside shorter copy, but screenshot remains the prior capture and walkthrough is below the first hero. Keep latest user feedback about concise availability, opaque header, discoverable About/contact and new preview handoff in the final visual review. This evidence does not accept the final brand or an actual download.

## About-to-Contact discoverability

Independent keyboard navigation Home → About succeeds. At 390×844, Email Aarav spans y=906–950, below the initial viewport after navigation; at 1280×900 it spans y=738–782 and is visible. Footer has neither About nor Contact link at either width. This quantitatively confirms the previously assigned discoverability gap; not an additional competing redesign. Evidence: contact-observations.json and resident parent/contact screenshots. No email link was activated. Final revision must bring contact alongside the introduction and provide footer paths.
