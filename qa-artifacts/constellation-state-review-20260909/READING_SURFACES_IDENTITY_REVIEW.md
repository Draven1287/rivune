# Reading surfaces — final bounded source/build identity review

2026-09-10. PASS: no mismatch found in the requested source and rebuilt-asset delta. Independent read-only identity verification; no source edits, builds, browser/native launch, providers, servers, signing or publication. Earlier packaging acceptance remains the boundary for unchanged aspects.

## Source

Commit 5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b has exactly parent 3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d and exactly one changed path, prototypes/ai-native-workspace/src/styles.css. Its bytes equal the independently approved proposed stylesheet at qa-artifacts/export-reading-surfaces-20260910/proposed/; SHA256 is 7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643. Read the proposal and its independent visual acceptance as provenance. The actual Git diff equals source.patch.

All 141 committed blobs match manifest hashes and byte lengths, candidate files and stage tree. The 140 other files are byte-identical to parent. Exact Git path set, stage manifest and allowlist match. Aggregate independently recomputed as 31a6040b381f97332bc0fe17162b7fe60abea694fdecff2d74d67084f99db082; Git tree 5f199268313341aa2c55e8bc5bc0f3e7c441e1bc. Static receipt agrees with current stage receipt; this review does not rerun that validator or functional suites.

Candidate HEAD is the requested commit, with no tracked/index changes and no remotes. Status retains exactly the two preexisting untracked node_modules/gen paths. Existing packaging audit covers their unchanged scope; this review does not clean or stage them.

## Compiled frontend delta

Compared actual prior compact-native-build-20260910/frontend-dist with the new reading-surfaces frontend-dist. Compiled CSS SHA256 is 59673c32da05fa0945dc6b882776cad89e2e872b26f622618b1147d622b0a9d3. Exactly one 854-byte insertion exists; removing it yields the prior CSS byte for byte. Independently enumerated the expected compiled declaration string and matched it exactly, rather than accepting compiled-css-delta.css on trust.

Declarations are only the approved host root/header/sidebar/chat/chat-header/composer backgrounds plus the existing 700px mobile backgrounds. Minification maps left center to 0 (equivalent left/vertical-center), max-width to width<=, combines the identical mobile background selectors and maps the existing galaxy URL to its unchanged hashed PNG. No spacing, typography, focus, layout or unrelated CSS change was introduced.

JavaScript content is byte-identical despite the hashed filename change. desktop-host.mjs and both PNGs are byte-identical. index.html and desktop-entry.mjs are exactly the old files with the new hashed JS/CSS references substituted. Exact seven-file frontend set and every frontend-assets/build-receipt hash match.

## Native artifact identity and preservation

All three bundle files match build-receipt.json; no additional bundle files exist. Binary SHA256: 3be98bd7deab1c0feab5882a7cd57ca267fdb385dc9b53a4964bdc7f2972633a. Info.plist identifies com.rivune.desktop.qa.reading20260910 and executable rivune. The retained native dependency file references all seven files in the new isolated frontend directory. The build receipt binds the requested commit/manifest, custom-protocol build and new frontend path; frontend and Cargo logs report successful completion. Native log retains one unused-variable warning, not a build failure.

Before/after source and preservation records match. Independently hashed all 141 manifest-addressable live paths, 23 prior artifact files, and 11 preserved installed/S02 binary/plist/profile paths; each matches its recorded value. Only hashes were inspected for preserved profile content.

This verifies the on-disk artifact identity and consistency with retained dependency/build evidence. It does not extract/decompress embedded assets from the executable, prove a runtime served-asset response, prove absence of historical launches from file hashes, or establish native functional/visual approval. The receipt reports this separate build unlaunched. No launch or signing occurred in this review.

## Reproducible evidence

verify_reading_identity.py and READING_IDENTITY_VERIFICATION.json beside this report record independent checks and exact hashes. No functional suites, builds or unrelated packaging audit were repeated. Reading-surface proposal approval plus identity matching is not new exact-built runtime rendering or release approval.
