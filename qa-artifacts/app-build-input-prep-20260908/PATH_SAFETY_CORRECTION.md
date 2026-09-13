# Path-safety correction receipt

The independent build-input review at `/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/tauri-r2-integration-review-20260907/build-input-review/REVIEW.md` (SHA-256 `b31251c8eff86b8f8e85b3bab95af3107d8f5253910b2a9e84e871ae3ee29667`) found that lexical path checks allowed an output ancestor symlink to redirect evidence into the accepted source.

The corrected proposal binds `safe-artifact-io.py` by absolute path and SHA-256. Before any system metadata tool runs, the helper opens the accepted source and output roots as directories, compares their physical device/inode ancestry, requires fresh direct-child evidence/report names, and performs a write-free preflight. After collection, the helper repeats the physical check, holds the checked output directory descriptor, creates both leaves relative to that descriptor with `O_EXCL` and `O_NOFOLLOW`, and invokes the bound validator through a fixed argv.

Deterministic regression coverage confirms:

- An ancestor alias resolving into the accepted source is refused before any system-tool runner call or write.
- A symlinked output root is refused before any system-tool runner call or write.
- Replacing the output parent with a symlink into the accepted source after preflight is refused at final creation, with no evidence/report written into the source.

The canonical config now binds the selected 11.0 development floor, but execution remains blocked until central coordination freezes the complete accepted-project and `macArtifactValidation` receipt, source hashes, fresh external paths, and exact candidate. The only canonical edit is that config field; this correction does not build, run Cargo, sign/seal, package, launch an app/provider, or claim distribution readiness. A fresh unsigned or linker-only build is expected to fail the sealed-bundle validator unless a separately authorized QA sealing step produces a newly reviewed candidate and fresh evidence paths.
