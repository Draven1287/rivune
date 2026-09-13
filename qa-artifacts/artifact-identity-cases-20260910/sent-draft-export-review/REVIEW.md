# Sent-draft source export — independent identity review

**Bounded PASS.** No source identity or preservation mismatch found. This clears the assigned export identity gate before the next build; it does not establish new native runtime behavior.

## Exact identity

- Commit: `c84cc2d07fffc1050c2be52ef31b62fbd3c1181a`
- Parent: `5fa49168a9284efeec713b7222e0e5c74be16c8a`
- Git tree: `df3dd55c10992ee653bfb9fb82a9bd373151f7b0`
- Manifest aggregate SHA-256: `ac15ded7187b8c85fbbfb600bfc196e4e55234f2d2c8132e41fbcb0584acacc8`

## Independently verified

The four implementation entries and two mounted fixture/selector entries reconstruct exactly the six-path accepted delta. All six match the independently recorded mounted-review hashes; the controller and controller-test entries also match this reviewer's captured controller evidence. The host review's frozen identities and bounded acceptance were inspected. All accepted baseline hashes match the parent, and all after hashes match committed and current live source bytes. There are five modifications and one addition, `sent_draft_tests.rs`.

All 148 Git blobs match the manifest SHA-256 and byte length, candidate files, and stage tree bytes. The staged file set and the 148 unique allowlist entries match the committed path set exactly. Manifest total bytes and canonical aggregate recompute correctly. Every one of the 142 paths outside this delta is byte-identical to the parent.

The calm styles remain `7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643`. Previously excluded live deltas retain their recorded hashes and were not introduced into this commit. Every entry in the export's live-before record still matches its live file.

Stage manifest, static-check report, validator hashes, and import metadata agree with their export records and actual files. HEAD, branch, parent, tree, aggregate and delta bookkeeping match. Tracked files are clean; status contains exactly the same recorded untracked frontend `node_modules` and native `gen/` paths. No Git remotes are configured. The committed diff passes `git diff --check`.

All three files in the older Results QA bundle match both its original build receipt and the pre-export hash record. Its binary remains `65be23620d739570e301d16706055c49584e1194c1c5918e53c78223e652f776`, associated by that receipt with parent `5fa49168a9284efeec713b7222e0e5c74be16c8a`. It is not a build of the new sent-draft commit.

## Evidence and scope

Reproducible independent assertions: [verify.py](verify.py). Observed result: [result.json](result.json).

The export receipt reports TypeScript, 12 controller tests, three selector tests and static composition checks passing. Functional tests were not repeated in this identity review. Prior host/controller/mounted reviews retain their stated evidence limits. Asset publication and notice completeness holds remain recorded in stage metadata.

Only this review's script, result and report were written. Production, candidate and bundle files were read only. No build, browser, native launch, provider action, publication or Git mutation occurred.
