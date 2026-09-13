# S00 local Git source import candidate

## Candidate

- Local repository: `tools/symphony/source-import-candidate`.
- Branch: `codex/s00-source-import`.
- Commit: `64cf31c4224b8edd51af09d79e4f4d9d9cac2ffc`.
- Git tree: `20ff5c40bfcaf061b97c2bb2b69747b758bfed9d`.
- Source manifest SHA-256: `ab1d34946ad5d3ba96c30726032f2c32dde12e703f4e1cbcba1c28d7a57f5518`.
- Exactly **93 files**, **6,697,341 bytes**. Every committed blob was compared to the source manifest. Working tree clean; no remotes.

The candidate was initialized as a separate repository, copied only from ALLOWLIST.txt, and committed using its own index with hooks/signing disabled and a clearly local Codex author identity. The broad workspace index was never used or changed. No reports, profiles, dependencies, compiled output or validators/review metadata were committed. Existing old image/icon resources are retained only as local source inputs and remain publication-held.

## Validation and corrected metadata

`STATIC_CHECKS.json` now reports **93**, replacing the stale 89-file count. Reproducible `validate.mjs` validates exact allowlist, file hashes/sizes/tree digest, optional authoritative source comparison, no symlinks/extra files, **92 literal JS/CSS/HTML/Rust/Cargo references**, npm root/direct locked versions, native output and configured icon paths. It rejects unexplained changes instead of automatically regenerating hashes. Dynamic runtime dependencies and full compiler resolution remain outside this static check.

`validate.test.mjs` passed seven reported tests (one containing group and six cases): valid baseline; content drift; extra file; symlink; stale count; missing referenced fixture even after its manifest/count/hash is updated coherently. Stage comparison passed against both the authoritative working source and the isolated candidate. Existing fresh-source receipt proves 118 unit tests and desktop web/typecheck build on this exact source hash; these builds were not repeated here.

From the authoritative repository root:

```sh
node tools/symphony/source-stage/validate.mjs --source .
node --test tools/symphony/source-stage/validate.test.mjs
node tools/symphony/source-stage/validate.mjs --source tools/symphony/source-import-candidate
```

Validator inputs may instead be supplied with `--tree`, `--manifest`, `--allowlist` and `--source`. Validators and review metadata intentionally remain outside the publication allowlist. Preserve them locally for audit; an approved later source promotion can add reviewed portable validation tooling explicitly rather than silently broadening this candidate.

## Readiness by remaining work

**Ready now:** exact local source revision for independent import audit; complete current frontend/bridge/native/import-crate slice; reproducible source-integrity/static-dependency checks; fresh frontend dependency install/unit/build evidence. No missing desktop-entry or stale-count blocker remains.

**Before source publication:** independently approve the exact candidate revision and source/secret/license exclusions; integrate/review the selected silver-R logo and resolve galaxy/icon rights; review the lockfile's 51 dependency entries without integrity fields and decide the required lock-provenance correction. The candidate is locally complete for inspection but not publication-cleared. Do not publish the broad workspace index.

**Before native/product delivery, separate from source import:** native asset/CSP runtime, retry/Dock packaged checks, minimum toolchain and target-platform prerequisites; offline cross-platform dependency cache is incomplete. These do not prevent inspection of this source candidate. N5 remains outside authorized work.

**Next-ready assignment:** independent reviewer verifies commit/tree against ALLOWLIST.txt and SOURCE_MANIFEST.json and runs the three commands above; app source owner can then normalize missing npm registry integrity metadata in a separate lockfile-only candidate, preserving every package version and rerunning the isolated locked-install checks. Logo integration waits for the exact selected asset/provenance handoff. Remote inventory worker ownership does not include this local source.

No push, native build/launch, cache duplication, N5, private forwarding or Symphony configuration occurred. No worker ownership or monitoring state was changed.
