# Startup/handoff export — independent identity review

**BOUNDED PASS.** The exported bytes match the accepted corrected startup and connection-handoff inputs. No mismatch found. This is source identity acceptance only.

- Commit: `2ea834a1e2385c34b8f516854b5317c6a08a0607`
- Parent: `c84cc2d07fffc1050c2be52ef31b62fbd3c1181a`
- Git tree: `9da0c197e0b5d81a0ee96398eda787984f0150fe`
- Manifest aggregate: `171ccf39b8cbee0189968505950f1085e12d5b261ecfeb61813e2e878d2c7f28`

Exactly six modified paths reconstruct from the corrected startup two-file manifest and accepted handoff four-file manifest. All baseline hashes match the parent; all accepted after hashes match live files and committed blobs. The handoff map also matches this reviewer's frozen evidence. The desktop correction closure was read: exported main.rs is `cd29d3fa5d7f5aa0bd467b47b35af3fa9e42dffaaa07b21e5a969657c339cd1d`, not the rejected pre-correction `3294fcea…` version.

All 148 Git blobs match manifest hashes/lengths, candidate files and staged tree bytes. The 148-entry allowlist and actual stage file set match exactly. Manifest total bytes and aggregate recompute correctly. All 142 paths outside the delta retain parent bytes, including calm styles SHA-256 `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`. No additional live path was imported.

Stage manifest, static report, validator hashes and import bookkeeping match the records and actual files. HEAD, branch, parent, tree and delta agree. Candidate status contains exactly the two recorded pre-existing untracked paths, with no tracked changes; no remotes are configured. The committed diff passes whitespace checking. All 148 entries in the live-before capture retain their hashes.

Both prior QA bundles have exactly three files matching their original build receipts. Results QA retains binary `65be23620d739570e301d16706055c49584e1194c1c5918e53c78223e652f776` from recorded source `5fa49168…`. Sent Draft QA retains binary `a3ba0fd767e18033b27d2af1f03d20f1de1975bdfb4383d0b574a91376605281` from recorded source `c84cc2d…`. Neither bundle is a build of this export.

Reproducible independent checks: [verify.py](verify.py), run with Python from the workspace root. Observed output: [result.json](result.json).

Functional tests were already accepted and were not rerun. No source/candidate mutation, build, browser, native launch, provider action or publication occurred. Existing review and publication limits remain; native startup exit and handoff behavior are not established by this export check.
