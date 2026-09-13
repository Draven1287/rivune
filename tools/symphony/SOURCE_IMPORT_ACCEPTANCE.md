# Frozen S00 source import acceptance

2026-09-09. Independent Git-object and retained-build-evidence review only. No build, candidate/source mutation, native launch, private QA forwarding, service reconfiguration or dispatch.

## Decision

**Accepted as a technically usable source baseline for authorized local isolated implementation, without public publication.** This decision is scoped to commit `a52cde8f25d0af4fc57ebd42b858510ca69b6797` in `tools/symphony/source-import-candidate`, tree `81a6d46772fab13c82c99e07dad82d39e092602b`. It is not acceptance of changing HEAD/worktree, distribution rights, native runtime behavior, or permission to activate workers. Lead controls any execution authorization separately; monitoring service was untouched.

## Independently verified

- Read frozen content using `git show`/`git ls-tree` in the candidate repository, not the outer workspace repository or mutable source. **97/97 paths, byte counts and SHA-256 values match current source manifest**; exact set equality, no extra files, all entries ordinary100644 blobs (no symlinks/submodules/executables). Manifest content identifier: `d985a8468ee582877711d74705b7dde79135a61ee4a5b8c5bbd1aef488c4e4ec`; individual hashes independently verified, aggregate algorithm not rerun.
- Exactly four provisional notice inputs committed under `third-party-notices/rivune-desktop`: candidate runtime text, separate build text, NOTICE_INPUTS.json and explanatory README. All four match `verification.json` hashes. README preserves17 native material gaps, tooling/platform gaps and artwork exclusions. Missing license text was not represented as resolved.
- No dependency tree, dist, native binary, private review report, collector, cache or profile occurs in the97-file committed set. The whole outer Git index was not used as the acceptance set. This confirms file exclusions, not exhaustive literal/image privacy clearance.
- Reviewed source-owned desktop build entry and frozen package/config wiring: current React builds into dedicated dist-desktop; exact matching bridge loads before React; native frontendDist selects that output. CSP/capability preservation was accepted in the preceding source delta review and no later non-notice source delta is asserted by this import.

## Build evidence and boundaries

Read `S00_NATIVE_SOURCE_BUILD_RECEIPT_20260909.md`, source.json, stage-validation.json, verification.json, frontend-build-success.log and native-build.log. Logs show Vite build completed and native dev-profile compilation completed in18.32s for the candidate desktop and two sibling path crates. Receipt records locked/offline custom-protocol build, no TAURI_CONFIG override and reuse of existing dependency/cache inputs. These environmental details are receipt evidence, not independently observed process execution.

Independently rehashed all **seven retained desktop web outputs** and the retained native binary: every hash matches verification.json. Binary is41069128 bytes, SHA-256 `4707442b3e9056566952bb5e3e088080fc8edf3326693d44d1460a5e7e1ca0d0`. This supports the exact reported compile artifact; a matching artifact is not an independently reproduced build or proof of reproducibility. Shared output can change later and must be rehashed before reuse. The binary was not executed.

Stage validator receipt reports97 files and92 literal references; no validator/full build was repeated here. Clean-source frontend installation and tests are covered by the earlier fresh-source receipt; current native compilation uses an existing shared cache. No minimum-toolchain, other-platform, installer/signing or provider claim.

## Remaining concrete blockers by purpose

**For isolated local implementation:** no source-availability or missing clean-entry blocker remains for this exact baseline on the evidenced macOS environment. Keep it local, retain resource/publication holds, avoid new network/dependency changes outside task authorization and pin the exact starting commit. The51 missing npm integrity entries remain a dependency-provenance limitation; builder's version-preserving lock successor requires its own diff/version/integrity review before substituting it for this baseline. Existing installed cache does not confer immutable future download verification.

**For public source/binary redistribution:** unresolved artwork provenance/selected-logo integration;17 native notice-material gaps and optional-platform/tooling notices; final shipped-output/license/source-availability mapping; complete source/resource privacy review. Provisional notice files are inputs, not final bundle notices. No rights to galaxy or icons are inferred from local compilation. Local source use and resource redistribution clearance are separate decisions.

**For claiming a usable packaged app:** native CSP/assets, failed-invocation retry/reconciliation, Dock/recovery behavior, cross-platform SDK/build/runtime validation, signing/installers and provider usability remain untested by this pass. N5/private-forwarding holds remain. Do not infer any of these from a successful compile.

No publication or Symphony dispatch was performed or authorized by this report. Monitoring-only service status/configuration remains outside this audit.


## Integrity successor acceptance — 5920d717

Independent Git-object comparison accepts `5920d717c45b1ee351c2502c4c4efa3f4dbf311e` as the local implementation successor to a52cde8. Tree `2a303ce55575f5d234c343a71cee9b1c8fc3ba0a`; manifest identifier `5375a63cff76e96ca65e20132fb4dc542cbf052d9d7ef4099e41f94be2e35892`.

- Exact three-file delta verified: package-lock.json, NOTICE_INPUTS.json, notice README. All97 committed per-file hashes match regenerated manifest. No executable source or license text change.
- Lock comparison removes only resolved/integrity fields before deep comparison: all package entries, versions, edges, flags and other fields unchanged. All previously present integrity records unchanged. Exactly51 changed entries match51 retained registry records by path/version/URL/integrity, each records successful SHA-512 and SHA-1 verification. All97 final entries contain syntactically valid64-byte SHA-512 digest values.
- NOTICE_INPUTS changes are exactly51 npm false-to-true integrityPresent flags; all other package data unchanged. README removes only obsolete integrity gap wording and preserves publication holds.
- Collector source enforces exact registry name/version, HTTPS registry origin/no credentials, rejected redirects, SHA-512 verification and recorded SHA-1 verification. These are independently reviewed retained records/code; tarballs were intentionally not retained, so this reviewer did not independently rehash downloaded bytes or repeat network acquisition.
- All seven retained successor web outputs independently rehashed and match both successor verification.json and prior native compile inputs. No native rebuild needed for this delta. Offline install,118 tests and build success remain retained builder evidence, not rerun here.
- Validator source now requires registry resolved URL and SHA-512 for each entry. Regression removes React integrity and coherently changes manifest hashes, then expects rejection; retained log reports8/8 checks pass. This closes the missing-field regression gate, not arbitrary tarball authenticity/security auditing.

**Missing npm integrity blocker is closed for this frozen successor. Local isolated implementation readiness remains accepted.** Publication remains held for notice completeness/final-output mapping, artwork provenance and remaining privacy/resource review. Native runtime and other-platform acceptance remain separate. No services, dispatch, source, builds, network or approval-held issue publication were changed by this review. Earlier51-missing-integrity statements above describe the parent only.


## Notice-only successor acceptance — ad4d3727

Accepted as a bounded notice-material improvement to the existing local implementation baseline: `ad4d37273e09be94b673432214bf78aac5b61772`, parent5920d717 preserved. Declared tree `d908b3001462f8a23cf006007828149acb782bda`; manifest identifier `0b5c9fe968599f8847d09cfb99ebf75dfa0da419c2e6a58cfa82ef6f6f7ba786`.

Independent Git-object reads verified106/106 manifest paths/sizes/hashes and exactly12 notice-only changed/added paths. Code, locks, capabilities, artwork and build/tooling notice aggregate remain unchanged. No builds or network requests repeated.

Independently hashed17 existing .crate archives against provenance and frozen Cargo.lock checksums; read their embedded VCS metadata without extraction and verified recorded metadata hashes/upstream commits. All33 package/resource associations match committed resource byte counts/SHA-256.26 associations additionally match recorded Git blob SHA-1. The five UNIC AUTHORS associations match retained raw-source hashes. Selectors license header matches the exact cached lib.rs prefix and full source hash; retained Mozilla HTML matches the recorded raw-source hash. Network acquisition authenticity and HTML-to-text extraction are retained provenance evidence, not a fresh network verification/legal interpretation in this review.

Seven formerly missing package material sets now have recorded resources: alloc-stdlib, five UNIC crates, selectors. Apache/MIT alternatives remain together with UNIC copyright/authors; no alternative elected. Selectors source-availability obligations remain separate from obtaining MPL text. Ten objc2-family runtime packages still have empty primary notices and explicit UNRESOLVED markers, with explanatory upstream material supplemental only. No gap was silently relabelled complete.

Validator source includes removing an upstream notice resource while coherently rehashing manifest entries; retained log reports9/9 tests passing. This review verified resource associations directly and did not rerun the validator suite. Full source/resource privacy clearance and distribution notice completeness are not inferred from hash validity.

Local isolated implementation readiness remains accepted; the notice-only delta needs no repeated compilation to preserve the prior source-build conclusion. Public distribution remains held for the ten runtime gaps, tooling/optional-platform material, actual output/source-availability mapping and artwork provenance. No maintainer contact, legal clearance, issue publishing/retry, service operation or private evidence forwarding occurred.
