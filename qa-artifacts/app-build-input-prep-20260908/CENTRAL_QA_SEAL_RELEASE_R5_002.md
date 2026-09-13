# Central QA seal release — R5 002

Status: authorized for one local QA-only staging normalization and one ad hoc signing attempt. This does not authorize installation, launch, DMG creation, notarization, publication, provider use, or distribution.

## Frozen source

- App: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app`
- POSIX/content tree SHA-256: `56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058`
- Executable SHA-256: `f134aad42c69e75f806f11073d6eae6f319590659b8d76e64fe4433afcb2e28d`
- The source bundle must remain unchanged.

## Fresh paths

- Staging root: `/Users/Aaravshah/Library/Caches/Rivune/qa-seal-r5-002`
- Staged app: `/Users/Aaravshah/Library/Caches/Rivune/qa-seal-r5-002/Rivune.app`
- Evidence root: `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-evidence-r5-sealed-002`

All three paths were absent before this release. The staging root is outside the workspace File Provider location because seal-001 acquired `com.apple.FinderInfo` and `com.apple.fileprovider.fpfs#P` on its staged bundle root. Current read-only inspection also found `com.apple.provenance` throughout both trees. Therefore the seal-001 receipt's statement that FinderInfo was not observed must not be reused for seal-002.

## Authorized sequence

1. Recheck the frozen source tree and executable hashes above.
2. Create the fresh staging root and stage exactly one tree-identical copy using the accepted staging helper.
3. Before normalization, record every extended-attribute name, path, and SHA-256 of its raw value for the source and staged trees.
4. On the staged copy only, remove these signing-blocking attributes wherever present:
   - `com.apple.provenance`
   - `com.apple.FinderInfo`
   - `com.apple.ResourceFork`
   - `com.apple.fileprovider.fpfs#P`
5. Record the complete staged-tree extended-attribute inventory again. Stop unless none of those four attributes remains. Record any other attribute and stop for central review rather than broad-clearing it.
6. Recompute the staged POSIX/content tree and executable hashes. They must still equal the frozen source hashes above.
7. Run this exact signing operation once on the staged copy only:

   `/usr/bin/codesign --force --sign - --timestamp=none /Users/Aaravshah/Library/Caches/Rivune/qa-seal-r5-002/Rivune.app`

8. If signing fails, stop without retry. If it succeeds, collect fresh evidence into the released evidence root and require all of:
   - strict deep bundle verification succeeds;
   - classification is `bundle_sealed_ad_hoc`;
   - Info.plist is bound;
   - sealed resources are present;
   - `qualified_for_native_review=true`;
   - `distribution_ready=false`.
9. Record source post-checks proving the original tree and executable remain unchanged.

## Boundary

This release authorizes normalization only on a newly staged, disposable copy. It authorizes one ad hoc QA seal and read-only qualification evidence. It does not authorize source mutation, a rebuild, installation, launch, DMG creation, Developer ID signing, notarization, Gatekeeper claims, provider calls, publication, or deletion of prior evidence.
