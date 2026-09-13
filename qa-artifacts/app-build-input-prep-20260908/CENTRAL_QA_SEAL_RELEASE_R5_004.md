# Central QA seal release — R5 004

Status: authorized for one exact provenance normalization and one ad hoc signing attempt on the existing disposable stage-003 copy. This supersedes the unexecuted Caches-based release R5 003.

## Bound inputs

- Staged app: `/private/tmp/rivune-r5-seal-003/Rivune.app`
- POSIX/content tree SHA-256: `56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058`
- Executable SHA-256: `f134aad42c69e75f806f11073d6eae6f319590659b8d76e64fe4433afcb2e28d`
- Diagnostic receipt: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/app-build-input-prep-20260908/R5_QA_STAGE_003_DIAGNOSTIC.json`
- Diagnostic SHA-256: `645170f7e69bb940fe367c5173b0eafbdccb62cd778d987c02c7fbcf9471d270`
- Xattr inventory: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/app-build-input-prep-20260908/R5_XATTR_INVENTORY_STAGE_003.json`
- Inventory SHA-256: `db55ca48a20593303f0f666ac570ad790f408816d31c73648b7802788af9eba1`
- Fresh evidence root: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-evidence-r5-sealed-003`

The bound inventory proves that each of the seven staged entries has exactly one extended attribute, `com.apple.provenance`, with a 3-byte value whose SHA-256 is `b3781f5b27a4fe25a5b85c9d02beed6a3cf4b4048ae5cb18e090b12b959a0ccd`. No other attribute or symlink is present.

## Authorized normalization and seal

1. Recheck the stage tree, executable, diagnostic, inventory, and xattr mapping above. Stop on any mismatch.
2. Remove `com.apple.provenance` with one individual `/usr/bin/xattr -d com.apple.provenance <exact-path>` argument vector for each of the seven paths recorded in the inventory. No recursion, wildcard, broad clearing, or other attribute is authorized.
3. Inventory the full staged tree and require zero remaining extended attributes.
4. Recompute the POSIX/content tree and executable hashes. Both must remain equal to the bound values above.
5. Run exactly once:

   `/usr/bin/codesign --force --sign - --timestamp=none /private/tmp/rivune-r5-seal-003/Rivune.app`

6. Stop without retry on failure. On success, collect fresh evidence into the released evidence root and require:
   - strict deep bundle verification succeeds;
   - classification is `bundle_sealed_ad_hoc`;
   - Info.plist is bound;
   - sealed resources are present;
   - `qualified_for_native_review=true`;
   - `distribution_ready=false`.
7. Recheck the original source app remains tree `56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058` with executable `f134aad42c69e75f806f11073d6eae6f319590659b8d76e64fe4433afcb2e28d`.
8. Persist the exact commands, exit codes, pre/post inventories, hashes, and qualification result outside `/private/tmp` in one R5 seal-003 result receipt.

## Boundary

Only the disposable stage-003 copy may change. No source or installed-app mutation, rebuild, installation, launch, DMG, Developer ID signing, notarization, Gatekeeper claim, provider call, publication, deletion, recursive xattr operation, security-setting change, or retry is authorized.
