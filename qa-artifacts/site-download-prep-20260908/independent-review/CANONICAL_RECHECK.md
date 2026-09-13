# Canonical integration recheck

**PASS for the approved platform-summary integration.**

The resulting canonical `pages-site/build.py` is byte-for-byte equal to the approved baseline plus the single reviewed MENU_SCRIPT line:

- Baseline SHA-256: `23d079fe88615c4fe514f1a87ce81b9402276bab701eef5b7c03d4356cadce1a`
- Integrated SHA-256: `031862790270acde01c763e54a8467e2167f1bd7c6206ca8a2f7e8a25eeb9cb7`

The resulting `pages-site/test_site.py` is byte-for-byte equal to the supplied pre-integration copy plus the explicit reviewed-handler normalization and one-per-route assertion recorded in `canonical-integration/FINAL.diff`:

- Integrated test SHA-256: `99aab91030094fccdb7cbb7643a2f655fbea5751aa4f4785f9f6649a7052d337`

All 19 protected template, release, documentation, publication, workflow, stylesheet, and asset source hashes still match `canonical-integration/PROTECTED_BEFORE.json`. The integration receipt records 20 passing tests, a coming-soon/review build, no adapter binding, and no publication. This recheck verified exact diff and hash parity; it did not rerun the browser suite or repeat the full test batch.

The generated canonical browser receipt remains limited to the unavailable page on loopback. Synthetic-ready browser evidence remains separate. No real installer, download, installation, or live publication is established.
