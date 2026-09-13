# SITE-PLATFORM-SUMMARY-INTEGRATE

Verified canonical build baseline 23d079fe88615c4fe514f1a87ce81b9402276bab701eef5b7c03d4356cadce1a, read independent approval, and applied its corrected platform-summary-canonical.patch (not the malformed owner patch). Only the approved MENU_SCRIPT line changed in build.py. Its entire remaining byte content is identical after reversing that line. Validators, render_tokens, build ready refusal and all other logic are untouched.

Related test_site.py changes account explicitly for the approved handler delta while retaining original page golden hashes and privacy delta checks; every generated route must include exactly one reviewed handler. All20 tests pass; final no-target build leaves review/coming-soon. Exact diff and hashes are FINAL.diff/VALIDATION.json. Protected template/release/docs/publication/workflow source hashes verified unchanged.

Full resulting MENU_SCRIPT matches the earlier browser-tested patched-menu.js byte-for-byte after removing script tags. BROWSER.json adds a focused actual Chromium check on the generated canonical unavailable page: Enter selection Windows->Linux->Mac, one selected platform, status focus, zero installer links, original Mac summary restored and zero browser errors. Only loopback page navigation was used, no external link clicks. Temporary server stopped and tab closed. Synthetic ready browser evidence remains separately bound in ../browser-evidence; no canonical ready artifact or real installer is claimed.

No adapter integration, release-link activation, network service call, deployment, native build or artwork change. Lane released. Accepted installer and verified link metadata remain the dependency for real binding; artifact-contract review proceeds separately.
