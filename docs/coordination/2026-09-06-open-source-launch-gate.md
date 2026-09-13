# Rivune open-source publication record and historical gate audit

**Source publication and public source CI are complete.** The public [Apache-2.0 repository](https://github.com/Draven1287/rivune) has current prerelease [v0.2.0-source-preview.4](https://github.com/Draven1287/rivune/releases/tag/v0.2.0-source-preview.4). Its archive SHA-256 is `c2c816c818aa3150c3f0f47634fa599626f735e1879fc38815d34dec021aadb1`; manifest revision is `4082cf2f545702e01efa55040cefab9af733a055`. [GitHub Actions run 34063457228](https://github.com/Draven1287/rivune/actions/runs/34063457228) passed exporter tests, Mac build/tests and iOS build. Private vulnerability reporting, Dependabot, secret scanning, push protection and the 100% community profile remain verified complete. See [the current readiness ledger](2026-09-06-status-ledger.md) and [next owner checklist](2026-09-06-next-owner-checklist.md).

This publication update supersedes the earlier source hold, unconfigured-reporting, no-remote/no-revision and local-candidate-only statements below. The earlier hashes identify successive local audit candidates, not the published archive. Source publication does not close the blocked signed/notarized DMG or unimplemented live Rivune Cloud authentication gates.

## Completed exporter hardening after preview 4

Per the verified handoff from **Audit Rivune native app**, [PR 2](https://github.com/Draven1287/rivune/pull/2) merged at [`68747456c17692784ba0924fc9ed41392ce6c7af`](https://github.com/Draven1287/rivune/commit/68747456c17692784ba0924fc9ed41392ce6c7af). The exporter checks every copied file and the allowlist against the actual Git commit and ignores Git replace refs. All 20 exporter tests and the full public Apple pipeline passed. This closes the assigned exporter hardening work.

Preview 4 assets are unchanged, and the audit owner independently rechecked all 105 source files. Its archive hash and manifest revision above remain the published release identity; the PR merge is a separate later source state. No new release or signed-update acceptance is implied. The coordinator recorded the owner's results without rerunning CI or downloading the release again.

## Superseded release audit record — preview 3

[v0.2.0-source-preview.3](https://github.com/Draven1287/rivune/releases/tag/v0.2.0-source-preview.3) is superseded by preview 4. Its archived receipt is SHA-256 `8cda78adffe5b2f80b6bf919e36959fae82ae0bdf939e67353bb5446073cb7db`, manifest revision `b9f047bed203abe868c27f75a721ea468f264c62`, and passing [CI run 34063167814](https://github.com/Draven1287/rivune/actions/runs/34063167814). These values remain only as audit history; they do not identify the current release or CI result.

## Superseded release audit record — preview 2

[v0.2.0-source-preview.2](https://github.com/Draven1287/rivune/releases/tag/v0.2.0-source-preview.2) is historical only: archive SHA-256 `5f1756fa9d4d55968bf1825c83f8ce74747dcadef61f9bebe2857a1f54b3c576`, manifest revision `7d69404f23ee9c8ba9283e6f206213aa709a9b68`. Preview 4 and its passing public CI supersede this release record.

## Historical audit snapshot — 21:37 UTC

At this earlier snapshot, the exclusive-output native candidate passed archive, manifest and staged-tree checks; all 11 exporter tests passed, and the previously reported competing-output cleanup race was closed. Successful extracted-source Mac Release, Mac XCTest and generic iOS Simulator results were bound to its 70 identical native/project inputs. Reporting channels, artwork review, final owner review and committed/tagged provenance were then publication gates. The records below preserve that audit history; use the linked current checklist for remaining work. This is an internal coordination record excluded from the prepared source manifest.

This audit did not change product code, the installed app, Git history, remotes, hosting, accounts or service settings. It generated an isolated initial source candidate and validation receipts under `/private/tmp/rivune-open-source-audit-20260906/`, then independently checked implementation's final candidate, staged tree and native build receipts. The auditor ran only the 11 synthetic exporter tests extracted from the exact final ZIP, without repeating native builds/tests. No model requests, installations, signing, notarization or publication were performed by this audit.

## Candidate actually checked

| Item | Result |
| --- | --- |
| Preparation entry point | `scripts/prepare_open_source.py`, using `scripts/open_source_files.txt` |
| Final local candidate | `/private/tmp/rivune-public-candidate-0607-exclusive.zip` |
| Version / build | 0.2 / 2026090607 |
| SHA-256 | `33181b8c8a34958de981857828a2a47f4fc7a1899e64a4315eb3ef944090cee3` |
| Archive size | 11,064,591 bytes |
| Contents | 105 allowlisted files plus `SOURCE_MANIFEST.json` |
| Integrity | ZIP CRC passed; all 105 file hashes matched; no extra unmanifested payload files or unsafe archive paths |
| Account configuration | Both exported plists have `Enabled=false`, empty URL/publishable key, and all account methods disabled |
| Excluded material | No website, `.env`, `.git`, `.openai`, internal coordination/design-review/handoff paths, credential-file names or build-output names in the candidate |
| Text inspection | 94 text members scanned; no credential-pattern or configured Supabase-project-host matches. Two user-path matches are the scanners' own regex/string literals, not personal filesystem paths |
| Documentation links | README relative links resolve inside this candidate |
| Provenance limit | Revision is explicitly null because the root repository has no commit. File hashes identify this local candidate; it is not a tagged or published release |
| Native verification | Extracted Mac Release build, Mac XCTest and generic iOS Simulator build passed. All 70 native/project inputs, including pins and assets, match the final candidate; no missing/mismatched inputs. Implementation's xcresult summary reports 209 passed, 0 failed, 0 skipped |
| Exporter verification | All 11 tests independently passed from the final ZIP at 21:37:24 UTC, including competing directory/archive/checksum preservation. Normalized 0644/0755 modes, cross-umask determinism, short-read/write-mismatch and prior redaction/account/exclusion/path checks pass |
| Staged local repository | `/private/tmp/rivune-prepared-native-repository`: 106 index entries exactly match the ZIP payload, with only regular/executable modes, no unresolved stages, gitlinks, missing/extra/mismatched blobs or unstaged changes; no HEAD or remote |
| Scope limit | No live provider/account, physical iPhone, public-origin download, signed binary or publication acceptance is inferred from these source checks |

Current receipts: `exclusive-candidate-validation.json` binds the final archive, its 70 tested native inputs and all 106 staged index entries; `exclusive-exporter-test-receipt.json` records the independent 11-test run. Earlier `hardened-candidate-validation.json` belongs to superseded hash `5b78d5915edb047ba4ed98098e52de42e8758fe443b2fbfabfadc84cec1fed21`. `final-candidate-validation.json`, `final-native-build-binding.json` and `staged-tree-validation.json` belong to superseded hash `e0777ee1ad5cb45fb0732aeca606e284e4a3b4ea831902992b16ee8ff4fe0539`. The initial `candidate-validation.json` belongs to the superseded 104-file candidate, hash `eb6a109deb559aae16869862012f9d44cbbbe855fc8d1e4c6755eacb508361d8`. `source-text-scan.json`, `header-scan.json` and `current-gate-snapshot.json` preserve the initial broader source review. Keep the exact artifact hash and input comparison with validation; documentation/export changes need updated artifact checks, while unchanged native inputs do not require repeating successful native builds.

Verified build logs: `/private/tmp/rivune-public-source-build.log:2401` (Release), `/private/tmp/rivune-public-source-tests.log:3123` (Mac tests), and `/private/tmp/rivune-public-source-ios.log:4924` (generic iOS Simulator). Each invocation names `/private/tmp/rivune-candidate-extracted-0607/Rivune-source/Rivune.xcodeproj`. XCTest result: `/tmp/rivune-public-source-build/Logs/Test/Test-Rivune Mac-2026.09.06_15-24-09--0600.xcresult`. Native-input comparison also exists at `/private/tmp/rivune-native-input-comparison.json`. Implementation's consolidated report is `docs/OPEN_SOURCE_PREPARATION_REVIEW.md`.

## Findings and corrections already observed

1. **Source and repository scope are now explicit.** The final 105-file native manifest includes every file currently under `Rivune/` and `RivuneTests/`, dependency pins, licensing, build instructions, export scripts and exporter tests. It contains no missing on-disk entries. `docs/BUILD_FROM_SOURCE.md` identifies the new preparation command, exact Xcode 27.0 beta build 27A5228h and the older packager's retired status. The native-only staged repository is independent of the shared folder's nested website repository.

2. **The older website ZIP is a distinct artifact.** At the initial read it was 1,687,197 bytes, version 0.1/build 1, 53 files/66 ZIP members, with SHA-256 `eef7bc9471b9ae58524ba876f4df38b31d766d23a2b704b22f510f37207f4abd`. Its CRC and checksum passed. It has no source revision/member provenance and must not inherit the new candidate's capabilities or test status. The old `package_source_preview.sh` manifest omits 17 Swift files referenced by today's project, plus other current resources; its completeness guard would reject regeneration. Its diagnostic scan was changed from matching source lines to filenames during remediation. Keep that stale packaging path retired unless its manifest and acceptance are repaired.

3. **License foundation exists; headers are an improvement, not a blanket blocker.** LICENSE carries Apache-2.0, NOTICE identifies Rivune contributors, CONTRIBUTING requires submission rights and states the contribution license, and CODE_OF_CONDUCT credits its adapted source. In the resident-source spot scan, 44 owned source/script files had no SPDX/copyright header in their opening 2,500 characters. Add a consistent header convention or license map if desired, retaining upstream notices; absence alone does not establish an Apache violation. Redistribution must preserve applicable licenses and notices, and modified upstream files need the required change notices. [Apache license](https://www.apache.org/licenses/LICENSE-2.0), [Apache FAQ](https://www.apache.org/foundation/license-faq.html).

4. **Dependency texts and trademark policy were added during the audit.** `THIRD_PARTY_NOTICES.md`, `TRADEMARKS.md`, and 12 original license/NOTICE files for the nine pinned Swift dependencies now exist and are in the new candidate. This closes the missing-native-source-notice inventory item. Final binary acknowledgements remain a separate artifact check: source inclusion does not prove the eventual app/DMG includes readable notices. Sparkle contains additional component terms; preserve its full license text. Website dependencies and assets are outside this native export and need their own delivered-payload inventory; package-lock license labels alone do not establish either redistribution or a violation.

5. **The local-client/Cloud boundary is now documented.** `OPEN_SOURCE_STRATEGY.md:113–138` keeps owned client/runtime, orchestration, adapters, local data features, wire contracts and tests under Apache-2.0, without requiring an official Cloud account for local CLI/BYOK use. Managed execution, sync, tenant administration, billing and infrastructure are proposed Cloud scope. Cloud is not described as shipped; service authorization belongs on the server. NOTICE and TRADEMARKS separate code licensing from brand identity. Existing Apache grants are not withdrawn; the license permits commercial reuse and does not grant a general trademark license. [Apache FAQ](https://www.apache.org/foundation/license-faq.html).

## Historical pre-publication gates — superseded by the current readiness record

| Priority / scope | Remaining action | Evidence required to close |
| --- | --- | --- |
| P1 — reporting readiness | Establish a real monitored private vulnerability destination and a private conduct contact | Verified destination URLs/addresses, responsible maintainers and an operational reporting process. SECURITY and final CODE_OF_CONDUCT now truthfully say the channels are unconfigured. Do not invent a contact or publish to create one during this audit |
| P1 — artwork scope | Review the particular brand/provider assets retained in each deliverable | Source, copyright/license or applicable usage permission, modifications and retained notices per asset. Website's Apple SVG is attributed to a general Apple website download; attribution does not establish permitted sign-in use or redistribution. It is excluded from the native candidate, so this is a website-specific unresolved item, not evidence that the native ZIP contains it. [Apple third-party guidelines](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html) |
| P2 — release identity and owner review | Review the staged native tree, then assign the source commit/tag and immutable release receipt when ready | The 106-file staged tree exactly matches the final ZIP and has no remote/HEAD. Owner review, committed revision and tagged provenance remain. The candidate's null revision is honest preparation metadata. Do not describe current-build tests or historical live runs as tests of the older website ZIP |
| P2 — automation, historical and now closed | Initial audit found issue/PR templates without workflows | Superseded by passing public [CI run 34063457228](https://github.com/Draven1287/rivune/actions/runs/34063457228) for preview 4; no CI-setup task remains |
| Separate binary gate | Verify required acknowledgements in the actual compiled payload, plus normal binary-release acceptance | A future app/DMG receipt. Developer ID, notarization and updater activation are not prerequisites for publishing inspected source code |

Exporter follow-ups are closed for this candidate: outputs are acquired using exclusive mkdir/x+b/x operations, ownership enters the cleanup list only after successful acquisition, device/inode identity is checked before removal, and ExitStack closes streams before cleanup. Three injected competing-output tests preserve the other invocation's directory, archive and checksum. Scoped review found no material regression. This establishes the reported competing-creation case; it does not claim immunity to arbitrary path replacement after acquisition. Normalized modes, cross-umask/short-read/write-mismatch fixtures and the documented exporter test command are retained. The Xcode completeness guard still handles simple basename spelling; future quoted/duplicate-path layouts need stronger coverage. Current candidate completeness is independently established by exact manifest/tree comparison and successful builds.

## Private/generated artifact review

The root ignore file covers common signing material, environment files, credentials, Xcode user state, JavaScript dependencies and generated output. It does not make every untracked file public-safe. Local handoff and coordination documents contain absolute user paths and task IDs. Logo-study provenance also refers to local generated-image outputs. The public export correctly excludes these.

The broader resident-text scan covered 153 files. Credential-assignment candidates in website tests are deliberate rejection/serialization fixtures, and the email input is placeholder text. No real credential was confirmed in the inspected bytes. This is a heuristic scan, not comprehensive secret clearance. `website/.env.local` exists and is ignored; its contents were not read. It was a cloud placeholder during inspection.

Cloud eviction affected multiple local files during the audit. The broad scan skipped 88 dataless paths; the design subset had 29 dataless files out of 71. Three inspected design screenshots were explicitly fictional Rivune mockups. Do not label those as real private account leaks. Uninspected `reference-account.png`, `reference-home.png` and other historical assets remain excluded pending review. A later failed read of the old ZIP coincided with it becoming dataless; the successful earlier integrity receipt stands, and no corruption finding is made from that failed read.

Website `.openai/hosting.json` carries an operational project ID with null database/storage bindings, not an observed credential. `vite.config.ts` imports it. If website source is later published, supply a reproducible example/local configuration and keep official deployment binding separate; simply deleting the imported file would break setup. Its generated `dist/` copy, identity studies, local environment and deployment state must stay outside the native/source publication path.

## Historical pre-publication procedure

1. Freeze the intended source scope. Start from the reviewed native candidate or explicitly review any expanded website scope; do not broad-stage the shared working folder.
2. Review the final file allowlist, complete source/dependency/asset inventory and final scan results. Inspect any newly included or previously unread file. Keep real data and official backend configuration out.
3. Confirm LICENSE/NOTICE/third-party texts and artwork treatment against the actual payload. Keep code license, trademark policy and proposed Cloud service terms distinct.
4. Establish the private security and conduct reporting channels. SECURITY's current honest placeholder is not an operational reporting channel.
5. Extract the exact hashed candidate into a fresh directory. Follow BUILD_FROM_SOURCE with isolated build/test storage and record all deterministic native checks. Run separate website checks only for a website release.
6. Review the resulting local public tree/index, authorship metadata and any imported history. Resolve the nested website repository deliberately, then record the reviewed local revision as part of publication preparation. This audit did not stage or commit.
7. Regenerate a final candidate from the reviewed revision, record version/tag/revision/member hashes and SHA-256, and bind validation to those bytes. Confirm any public download points to the artifact it actually describes.
8. Present the concrete revision, artifact hash, reporting links, notices and validation receipt for the owner's final publication decision. Public remote creation, push/upload and publication remain outside this task.

## What cannot reliably be undone after publication

Apache grants for distributed code are expressly perpetual/irrevocable subject to the license's conditions; a later business-model or repository-visibility change cannot retract compliant recipients' existing grants. [Apache license](https://www.apache.org/licenses/LICENSE-2.0).

Deleting a public repository, release ZIP or website download cannot recall other people's clones, forks, downloads or cached copies. If a credential is exposed, removal alone is insufficient; revoke/rotate it and assess the copies/history separately. This is why final payload review precedes publication. [GitHub guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

No public launch, legal-clearance certification, absence-of-secrets guarantee or current binary-release approval is asserted by this audit.
