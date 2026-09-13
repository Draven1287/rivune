# Independent review — SITE-DOWNLOAD-PREP

## Disposition

**Platform-summary handler: APPROVE FOR CANONICAL-ONLY INTEGRATION using `platform-summary-canonical.patch`.** The one-line handler change preserves the initial server-rendered macOS title and body across Windows/Linux/macOS transitions. It does not change `validate_release`, `verify_public_asset`, `render_tokens`, release metadata, the ready-build refusal, publication controls, or any installer gate.

Apply only while `pages-site/build.py` has SHA-256:

`23d079fe88615c4fe514f1a87ce81b9402276bab701eef5b7c03d4356cadce1a`

The owner's `platform-summary.patch` contains the right one-line code change, but it is not a valid directly applicable patch: `git apply --check` reports `corrupt patch at line 10`. The corrected canonical-path patch in this review applies cleanly to the bound source.

**Download adapter: HOLD AS AN ISOLATED PREPARATION ARTIFACT.** Its fail-closed behavior and fixture isolation pass review, but no accepted installer or independently established release-snapshot provenance/freshness exists here. Its supplied snapshot is content-checked only. Real adapter binding therefore remains pending the accepted installer, verified release metadata/public asset snapshot, and review of the final canonical integration.

## Evidence reviewed

- All seven adapter unit tests pass.
- Missing, malformed, unsafe, mismatched, and incomplete inputs produce the unavailable state and clear installer control, details, instructions, release metadata, and checksum.
- Synthetic ready data requires `fixture=True` and receives a prominent fixture banner and `noindex,nofollow`; the same synthetic record fails closed in the non-fixture branch.
- A non-fixture record cannot render ready without a separately supplied snapshot whose tag, exact asset URL, upload state, size, and digest match.
- The adapter performs no network request when a snapshot is supplied. The snapshot's origin and freshness are deliberately outside the adapter's proof.
- The platform unit test reproduces the original summary loss and passes ready and unavailable Mac → Windows/Linux → Mac restoration, single selection, visibility, and focus checks.
- Browser evidence contains 27 ready/missing/invalid × 320/390/1280 × platform states. Each state has one selected platform; missing and invalid pages expose no installer link; ready Mac restores its full synthetic summary; logged requests are loopback-only; logs are empty.
- Browser input, stylesheet, asset, and screenshot hashes match the supplied hash record. The inspected 320-pixel ready viewport is readable.

## Proof boundary

The adapter tests are Python unit tests. The handler test is a minimal DOM execution test. The browser evidence is an actual in-app Chromium run against loopback-only synthetic fixtures. These checks do not establish a real installer, trusted release-snapshot provenance, native app behavior, download success, installation, signing, notarization, Gatekeeper acceptance, publication, or broad visual parity.

The screenshot handoff correctly disclaims wide-capture scaling and stitched-page artifacts. DOM state and measured widths support the responsive state assertions; the supplied images should not be used as broad design approval.

## Integration sequence

1. Review and apply only `platform-summary-canonical.patch` to the matching canonical `pages-site/build.py`.
2. Run the existing site unit/build checks and a focused Mac → Windows/Linux → Mac browser transition check on the generated page.
3. Keep `download_adapter.py` isolated until an accepted installer and verified release record exist.
4. When those exist, integrate the adapter through the canonical build flow without weakening the current ready-build guard until the complete binding is separately approved.
