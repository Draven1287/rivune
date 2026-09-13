# Superseding temporary stage seal release

This coordinator release supersedes conflicting CENTRAL_QA_SEAL_RELEASE_R5_003.md. Packaging01a07831 must not create Library/Caches staging or remove attributes under that document.

Recheck existing /private/tmp/rivune-r5-seal-003/Rivune.app content tree56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058 and inventorydb55ca48a20593303f0f666ac570ad790f408816d31c73648b7802788af9eba1. Require only com.apple.provenance on7entries, no new attributes/symlinks. No xattr removal.

Run once: /usr/bin/codesign --force --sign - --timestamp=none /private/tmp/rivune-r5-seal-003/Rivune.app. If already signed under another action, stop and report instead. On failure stop/no retry.

On success hash tree/executable/xattr state and collect accepted strict metadata/seal evidence in fresh /private/tmp/rivune-r5-seal-003-evidence, direct evidence/report filenames. Same hash-bound tools/validator/policy, only paths change; require qualified_for_native_review=true and distribution_ready=false.

Preserve source/stages001/002/R3/installed app. No launch/install/rebuild/DMG/provider/public action, no security changes.
