# Local open-source preparation review — September 6, 2026

No publication, upload, remote, signing, notarization or account activation.
Installed Mac build 2026090607 is unchanged by this package.

## Review artifacts

- Prepared native-only repository: /private/tmp/rivune-prepared-native-repository
  (106 staged files, no commit, no remote; website remains a separate repository).
- Review patch: /private/tmp/rivune-open-source-review.patch
- Website diff: /private/tmp/rivune-website-positioning.diff
- Final native source ZIP: /private/tmp/rivune-public-candidate-0607-exclusive.zip
- ZIP size: 11,064,591 bytes; version 0.2 / build 2026090607.
- SHA-256: 33181b8c8a34958de981857828a2a47f4fc7a1899e64a4315eb3ef944090cee3
- 105 exact allowlisted files plus SOURCE_MANIFEST.json, per-file hashes,
  disabled/blank official account configuration, CRC passed, no empty files.
- No commit exists in the source root, so revision is explicitly null and this
  candidate's file hashes provide provenance. Do not call it a tagged release.

## Changes and verified scope

Website homepage/mobile navigation have no Open workspace or /workspace CTA.
The page explicitly identifies the older source preview 0.1/build 1 and links
its full SHA-256 file. That download remains 1,687,197 bytes, SHA-256
 eef7bc9471b9ae58524ba876f4df38b31d766d23a2b704b22f510f37207f4abd.
It is separate from the new unpublished native candidate and not a DMG.
Hero secondary span remains unchanged: #8c8f95 on #090a0b = 6.11:1.
Future managed cloud is named separately from the local app.

README distinguishes current API implementations from the older archive and
marks earlier acceptance results historical. Owned client/local runtime remains
Apache-2.0, including orchestration and adapters; future managed cloud is a
separate proposed service. Trademark and dependency notices are explicit.
Original native dependency license/notice texts are included. Artwork provenance
is still a gate, not established by including a NOTICE file.

The exact export manifest excludes website assets/dependencies, local review
and coordination docs, account setup/runbook credentials, private history,
recordings, build output and machine-specific Xcode user state. Account URLs and
publishable identifiers are removed from both exported plists; private installed
configuration is untouched. Fork identity limitations are documented rather than
silently weakening callback validation. A public key is not an authorization gate.

The preparation script fails on invalid/missing/symlink paths, missing referenced
Swift sources, empty/incomplete copy contents and heuristic credential findings.
Scans report rule and filename only. Eleven tests passed for redacted secret
canaries, inert account export, deterministic ZIPs, unlisted private-file
exclusion, symlink and source-completeness guards. Regex scanning is not a full
secret or supply-chain audit. The old source generator remains retired because
its manifest is stale; its diagnostic scans now use filenames, not source lines.

## Validation

- Xcode 27.0 beta 27A5228h, macOS 27.0 beta / Apple Silicon.
- Clean extracted native candidate Release build passed:
  /private/tmp/rivune-public-source-build.log.
- Native deterministic tests: 209 passed, 0 failed, 0 skipped:
  /tmp/rivune-public-source-build/Logs/Test/Test-Rivune Mac-2026.09.06_15-24-09--0600.xcresult.
- Generic iOS Simulator build passed: /private/tmp/rivune-public-source-ios.log.
- The final candidate's Rivune/, RivuneTests/ and Rivune.xcodeproj/ bytes match
  the exact extracted build/test input; later changes affect export/docs only.
- Clean website install with Node22.23.1/npm10.9.8 (`npm ci --ignore-scripts`),
  lint, TypeScript, account/workspace contracts and production build passed.
  Build log: /private/tmp/rivune-website-open-source-build.log.

Shared-folder reads intermittently stalled. The first website review copy had an
empty ZIP; the snapshot was repaired from the earlier proven local archive after
verifying its complete SHA and readback. The shared original still reports the
expected size, but this is not a fresh public-origin/download-save verification.
The reviewed website snapshot is /private/tmp/rivune-website-positioning-review.

## Remaining public-release checklist

- [ ] Owner reviews staged native repository and separate website topology.
- [ ] Establish verified private security and conduct reporting destinations.
- [ ] Complete artwork/provider-mark provenance and per-deliverable permissions;
      Apple's website SVG is excluded from this native export but still requires
      website-specific review. Confirm distributed binary acknowledgements.
- [ ] Review the exact staged tree and any future committed history/CI artifacts
      for secrets, private data and untrusted dependencies.
- [ ] Commit/tag reviewed source and record final provenance, then rebuild and
      recheck artifacts if any bytes change.
- [ ] Obtain explicit publication authorization; create no public remote yet.
- [ ] Verify public-origin links/download delivery/canonical/crawl configuration.
- [ ] Keep the DMG unavailable until Developer ID signature, notarization,
      stapling and Gatekeeper validation pass on the exact installer.
- [ ] Separately verify real account lifecycle, physical iPhone pairing and full
      accessibility. Compile/tests do not establish those product acceptance gates.

Independent website positioning review passed at CSS widths 1440/768/390:
release label/older snapshot distinction/bytes/hash wrap without overflow;
keyboard Menu→Updates and Enter on checksum link work; reduced-motion demo
completes. Snapshot ZIP local HTTP200, SHA and CRC pass. Evidence:
/Users/Aaravshah/.codex/visualizations/2026/09/06/01a07831-61e0-72c3-b166-d19081c8e272/rivune-positioning-recheck/REVIEW.md.
This closes the snapshot-copy defect, not public download/save verification.

Exporter follow-up: rejected destinations and partial archives are cleaned up;
0644/0755 modes are normalized. Cross-umask determinism, short reads and write
mismatches have direct passing fixtures. Native source remains byte-identical to
the successful clean Release/test/iOS inputs, so native checks were not repeated.

Concurrent-output regression fixed: directory and ZIP/checksum outputs are
acquired exclusively. Cleanup tracks owned filesystem identities and preserves
competing outputs. Three fixtures inject competing directory/archive/checksum
creation at acquisition time and verify preservation; all 11 exporter tests pass.

Final scoped independent recheck passed at 21:37:24 UTC: all 11 exporter tests
from the exact exclusive ZIP pass, including competing-output preservation.
CRC/file hashes and the staged 106-file index match; all 70 native build inputs
remain unchanged. No material regression found in this exporter-only fix.
Receipt: /private/tmp/rivune-open-source-audit-20260906/exclusive-exporter-test-receipt.json.
No additional native rerun required. Public-release prerequisites remain open.
