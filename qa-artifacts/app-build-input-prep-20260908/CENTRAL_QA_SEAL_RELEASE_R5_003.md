# Central QA seal release — R5 003

Status: authorized for one exact local QA-only normalization and one ad hoc signing attempt. This release supersedes the held seal-002 attempt. It does not authorize installation, launch, DMG creation, notarization, publication, provider use, deletion, or distribution.

## Accepted evidence

- Frozen source app: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`
- Source POSIX/content tree SHA-256: `56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058`
- Source executable SHA-256: `f134aad42c69e75f806f11073d6eae6f319590659b8d76e64fe4433afcb2e28d`
- Bound pre-seal inventory: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/app-build-input-prep-20260908/R5_XATTR_INVENTORY_PRE_SEAL_002.json`
- Inventory SHA-256: `a86673f2c6fe865a7ca8855d2f54c07f469d1ad59a709b140c368466f93b4adb`
- Seal-002 hold receipt: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/app-build-input-prep-20260908/R5_QA_SEAL_002_HOLD.json`
- Hold receipt SHA-256: `06a482037617df9e744f3d86724b9c5989a774b2b771a8f0fb79d7f4a3c192e3`

The inventory establishes this exact staged-copy mapping: the `Rivune.app` root has `com.apple.FinderInfo`, `com.apple.fileprovider.fpfs#P`, and `com.apple.provenance`; each of the other six bundle entries has only `com.apple.provenance`. No symlink, quarantine, or ResourceFork was present.

## Fresh paths

- Staging root: `/Users/Aaravshah/Library/Caches/Rivune/qa-seal-r5-003`
- Staged app: `/Users/Aaravshah/Library/Caches/Rivune/qa-seal-r5-003/Rivune.app`
- Evidence root: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-evidence-r5-sealed-003`

All paths were absent before this release.

## Authorized sequence

1. Recheck the frozen source tree and executable hashes.
2. Create the fresh staging root and stage exactly one POSIX/content-tree-identical copy with the accepted staging helper.
3. Inventory every xattr name, exact path, and raw-value SHA-256 before normalization.
4. Stop unless the new staged inventory exactly matches the mapping established above. Do not normalize an unrecognized attribute or path.
5. On the staged copy only, remove each recorded attribute from its exact recorded path with individual `/usr/bin/xattr -d <name> <path>` argument vectors. Do not use `xattr -c`, recursive removal, wildcards, or source paths.
6. Inventory the entire staged tree again and require zero remaining extended attributes.
7. Recompute the staged POSIX/content tree and executable hashes and require the frozen values above.
8. Run exactly once:

   `/usr/bin/codesign --force --sign - --timestamp=none /Users/Aaravshah/Library/Caches/Rivune/qa-seal-r5-003/Rivune.app`

9. Stop without retry on failure. On success, collect fresh evidence into the released evidence root and require:
   - strict deep bundle verification succeeds;
   - classification is `bundle_sealed_ad_hoc`;
   - Info.plist is bound;
   - sealed resources are present;
   - `qualified_for_native_review=true`;
   - `distribution_ready=false`.
10. Recheck that the source app tree and executable remain unchanged. Record every command, exit code, pre/post inventory, tree hash, and qualification result in one seal-003 receipt.

## Boundary

This release permits only the newly staged disposable copy to change. The source app, installed app, prior stages, and prior evidence remain immutable. No rebuild, installation, launch, DMG, Developer ID signing, notarization, Gatekeeper claim, provider call, publication, broad xattr clearing, security-setting change, or deletion is authorized.
