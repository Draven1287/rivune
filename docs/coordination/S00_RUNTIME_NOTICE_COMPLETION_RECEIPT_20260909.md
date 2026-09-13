# S00 exact-version runtime notice successor

## Revision and exact delta

Successor **`ad4d37273e09be94b673432214bf78aac5b61772`**, parent **`5920d717c45b1ee351c2502c4c4efa3f4dbf311e`** preserved. Git tree **`d908b3001462f8a23cf006007828149acb782bda`**, source manifest SHA-256 **`0b5c9fe968599f8847d09cfb99ebf75dfa0da419c2e6a58cfa82ef6f6f7ba786`**, **106 allowlisted files**. Exactly 12 notice-only paths changed: runtime candidate text, notice inventory, notice README, new upstream provenance JSON and eight deduplicated notice resources. Build/tooling notice text, package locks, code, images and capabilities are unchanged. All committed blobs match the manifest; isolated candidate clean; no remotes or broad workspace index use.

## What was verified and integrated

All 17 exact cached crate archives matched Cargo.lock SHA-256 checksums. Their embedded `.cargo_vcs_info.json` records tied the requested versions to immutable official upstream commits. Official GitHub license/copyright files were fetched at those commits and checked against Git blob hashes. Only notice resources were retained, without a dependency-cache copy.

Seven missing-material entries are now filled:

- **alloc-stdlib0.2.4:** exact Dropbox BSD notice, including its original copyright attribution.
- **unic-char-property, unic-char-range, unic-common, unic-ucd-ident and unic-ucd-version0.9.0:** exact-commit Apache and MIT texts, COPYRIGHT and AUTHORS. Both alternatives retained; no election made.
- **selectors0.36.1:** exact source license header, verified against the cached crate source, plus the official [Mozilla MPL2.0 text](https://www.mozilla.org/en-US/MPL/2.0/). The original official HTML hash and reproducible body-text extraction are recorded; paragraph/heading/list formatting was retained. Obtaining this text does not close the distribution source-availability gate.

`third-party-notices/rivune-desktop/UPSTREAM_NOTICE_PROVENANCE.json` contains package/version/license expression, archive checksum, VCS commit, immutable source URL, text SHA-256, Git blob/source hash and extraction details. Each of 33 package/text associations was verified against the copied notice resource, its byte count and the runtime notice aggregate. Notices contain original text and attribution without invented ownership. The failed official `index.txt` probe was recorded; the canonical Mozilla HTML page supplied the license text instead.

## Ten concrete runtime gaps remain

- block2
- dispatch2
- objc2
- objc2-app-kit
- objc2-core-foundation
- objc2-core-graphics
- objc2-encode
- objc2-exception-helper
- objc2-io-surface
- objc2-web-kit

For each, its exact upstream root `LICENSE.md` is now included as **supplemental evidence only**. That file states licensing choices through links and discusses SDK-derived-code uncertainty, but does not provide complete package-specific copyright/license text. No template from another author was substituted and no license alternative was elected. Their `notices` arrays remain empty, `supplementalNotices` point to the verified upstream explanation, and runtime UNRESOLVED markers remain. Applicable notice/grant clarification from the package's authoritative materials is still needed before calling these complete.

The exact explanation for the current objc2/dispatch2 commit is [upstream LICENSE.md](https://raw.githubusercontent.com/madsmtm/objc2/8852b424193ca41602281b3d7540d7c8ed51e49a/LICENSE.md); other package-specific commits are separately recorded in provenance. This receipt reports what upstream supplies, not a legal conclusion about SDK distribution.

## Validation and residual delivery gates

Source validator passed at106 files, with exact hashes and notice-resource/aggregate references checked. **Nine reported validator tests passed** (eight cases plus containing group), including removing a notice resource while coherently rehashing its manifest. No frontend/native build, install or launch was performed for this notice-only delta.

Tooling notice gaps, 46 optional npm entries lacking local notice material, other target-platform closure, actual shipped-output mapping and license/source-availability review remain. Artwork rights and selected silver-R integration remain separate holds. Previously resolved npm integrity stays complete and unchanged.

Next-ready assignment: independent reviewer verifies the frozen ad4d372 notice-only delta and seven recovered sets; pursue authoritative clarification for the ten named objc2-family notices and finish target/output mapping without changing license elections. Do not publish the provisional notices as complete. No package upgrades, image changes, source push, Symphony issue creation, private evidence forwarding or historical commit mutation occurred.
