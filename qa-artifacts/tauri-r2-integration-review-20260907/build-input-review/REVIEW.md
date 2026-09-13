# Build-input evidence patch review

P2 correction required before executor integration. Independently8 fixture tests passed; inspected hashes recorded. No actual app/build/signing/target/provider execution. Additional actual-collector test used only temporary synthetic bundle/source files and a stub tool runner.

## P2: output ancestor symlink bypasses outside-source boundary

Executor checks inside(validated.cwd, policy.outputRoot) lexically. requireFresh checks only immediate output parent with lstat; ancestors may be symlinks. Schedule reproduced: accepted-source/out exists; sibling alias points to accepted-source; outputRoot is alias/out. Lexical outside-source check permits it, lstat(alias/out) sees a normal directory, and actual collectMacArtifactEvidence writes evidence into accepted-source/out. Fresh wx prevents leaf overwrite but does not enforce the promised source isolation.

Resolve and bind physical source/output ancestry or reject symlink components before any runner/write, then use an anchored safe-write strategy to preserve that boundary against replacement. Validate report output through the same policy; final leaf freshness alone is insufficient. Add ancestor-alias-to-source, symlinked parent, and swapped-parent tests with zero output/source mutation on rejection. Review bundle/tool ancestor handling consistently with its nofollow claim.

Other inspected scope: receipt binds minimum macOS/config version/identifier/architecture; fixed argv has no shell and collector only requests signature display/verification. Tools/interpreter/validator hashes are preflighted; raw stdout/stderr capture is bounded and recorded failure/truncation prevents qualification. Missing reviewed minimum macOS currently blocks execution, as intended. Accepted-validator evidence hash/native-only result does not imply distribution readiness. Failure evidence and final-input freeze remain required; no release or signing approval supplied by this review.
