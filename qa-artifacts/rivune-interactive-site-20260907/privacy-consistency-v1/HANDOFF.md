# SITE-PRIVACY-CONSISTENCY final delta

Only canonical privacy.html and test_site.py changed. The final canonical dist was rebuilt after all 20 tests passed, and publishTarget is review. VALIDATION.json contains final source/page/manifest hashes; PROTECTED_BEFORE.json was rechecked unchanged; FINAL.diff is the full two-file delta.

Finding: the privacy email action still invoked a mailto handler, the same interaction the user had reported did not open Gmail. This is a contact-path inconsistency and handler-dependent usability problem, not evidence that mailto is universally broken. No external email app was launched or tested. Minimal correction: replace the privacy paragraph's Email Aarav mailto action with Contact Aarav linking to /rivune/contact/, whose approved Gmail/copy/manual-fallback controls remain unchanged. Only its adjacent explanatory sentence changes; alias-forwarding, delivery dependency, security instructions, and all other privacy text remain byte-identical.

Metadata finding: privacy omitted og:url despite having a canonical URL. Added only og:url using the existing CANONICAL token. No visible design, legal claim, other metadata, or noindex changes.

Tests now verify this exact privacy delta can be reversed to recover the approved V2 page hash, preserving provenance rather than replacing the old golden hash. Targeted checks cover the new contact destination, absence of mailto, existing Gmail/copy/fallback availability, canonical og:url equality, noindex, and unchanged delivery/security wording. Other pages/styles/scripts retain their original approved hashes. No fresh browser behavior or email delivery proof is claimed.

Reviewer role is report-only and non-build, coordinated with task 01a07831-61e0-72c3-b166-d19081c8e272. Inspect the final canonical privacy export and diff; check the in-page contact route and unchanged contact options without sending email. Do not build or edit canonical files; broader operator-document findings remain that reviewer's reporting lane. Release metadata, build.py, check_publish.py, workflow, old QA snapshots and approved layout are untouched. No publication, network, server operation or email occurred.
