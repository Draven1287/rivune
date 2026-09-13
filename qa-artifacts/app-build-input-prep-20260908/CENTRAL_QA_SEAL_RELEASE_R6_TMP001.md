# R6 one temporary local QA seal release

Packaging01a07831 sole mutation owner. Before mutation independently verify original R6 app tree175ffbbcf6c5b6bf854818ac0b5a70a569df2eaca4101c94966a47cb32d38137 and executable4cff1fbc4f148a9fcaa79ad39222f9e18626f7de3df7d897c69236e165f1cb32 against R6_BUILD_002_RESULT.md0c9acc55. Stop any mismatch.

Stage ONE fresh content/POSIX-identical copy at /private/tmp/rivune-r6-seal-001/Rivune.app; verify exact tree and no symlinks. Inventory source and staged per-entry xattrs with binary-safe xattr -px decoded bytes/hash. No xattr cleanup. Require stage no FinderInfo/fileprovider/quarantine or unexpected metadata; provenance-only acceptable based prior successful test. Abort unexpected state.

Then run once /usr/bin/codesign --force --sign - --timestamp=none /private/tmp/rivune-r6-seal-001/Rivune.app. Stop on failure/no retry. On success hash sealed tree/executable and binary-safe xattr inventory, collect accepted hash-bound metadata/seal policy in fresh /private/tmp/rivune-r6-seal-001-evidence (direct evidence/report JSON filenames). Only paths change from accepted policy, preserve identity/platform/minOS/tool/validator checks. Require strict bundle_sealed_ad_hoc, Info.plist bound/resources sealed, native-review qualificationtrue/distributionfalse.

Preserve originalR6/R5/stages/R3/installed app. No native launch/install/rebuild/DMG/provider/public action or security change. Return corrected exact command/count/policy/artifact/evidence receipt; no other task may issue overlapping seal releases.
