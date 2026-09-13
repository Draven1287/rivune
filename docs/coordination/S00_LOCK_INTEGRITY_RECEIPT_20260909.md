# S00 exact npm integrity normalization

## Successor revision and bounded delta

Local successor **`5920d717c45b1ee351c2502c4c4efa3f4dbf311e`**, parent **`a52cde8f25d0af4fc57ebd42b858510ca69b6797`** unchanged, Git tree **`2a303ce55575f5d234c343a71cee9b1c8fc3ba0a`**, source manifest SHA-256 **`5375a63cff76e96ca65e20132fb4dc542cbf052d9d7ef4099e41f94be2e35892`**. The candidate still has 97 allowlisted files, clean working tree and no remotes. Every committed blob matches the manifest; the broad workspace index was untouched.

Three source files changed:

1. `prototypes/ai-native-workspace/package-lock.json`: added exact registry `resolved` and `integrity` fields for 51 entries. Every package version, dependency/optional dependency edge, engine/platform flag and other field was compared unchanged. No upgrade or lock re-resolution occurred.
2. `third-party-notices/rivune-desktop/NOTICE_INPUTS.json`: 51 npm `integrityPresent` flags updated to match the normalized lock.
3. `third-party-notices/rivune-desktop/README.md`: removed the now-resolved missing-integrity claim while preserving notice/artwork holds. No license text changed.

All **97 dependency entries now have integrity**. Existing integrity entries were preserved. The local `a52cde8` parent and its native compile evidence were not rewritten.

## Registry and tarball proof

For every missing entry, the collector requested `https://registry.npmjs.org/<encoded-name>/<exact-version>`, required matching name/version and a registry HTTPS tarball URL, rejected redirects, downloaded the exact tarball, and compared SHA-512 with `dist.integrity` plus SHA-1 with `dist.shasum`. **51/51 passed; zero unavailable entries**. No package code was executed and downloaded tarballs were not persisted as a duplicate cache. Registry access was authorized through the execution review.

`registry-verification.json` records exact metadata URLs, package/version, tarball URL, integrity, shasum and byte count for each entry. `verify-registry.mjs` is the local repeatable acquisition/verification script; it prepares a proposed lock separately and refuses source mutation on an unavailable entry. This verifies the registry's exact artifacts, not a general security or authorship audit.

## Locked frontend validation

Reconstructed the prior 97-file allowlist in fresh temporary tree `/private/tmp/rivune-s00-integrity-ffq4wrik` and substituted only the proposed lock for execution. The two attribution bookkeeping updates were applied after validation; they do not change executable source. Using the existing warm npm cache:

```sh
npm ci --offline --ignore-scripts --no-audit --no-fund --cache /private/tmp/rivune-s00-fresh-3qmgz0k4/npm-cache --logs-dir /private/tmp/rivune-s00-integrity-ffq4wrik/npm-logs
node --test tests/*.test.mjs
npm run build:desktop
```

Offline install passed, **51 packages installed**, all installed versions matched the lock; **118 unit tests passed**; TypeScript and desktop web build passed. Node22.23.1/npm10.9.8 as in the prior fresh-source validation. This proves offline installation with that warm cache, not availability on a clean empty cache or every platform.

Generated web files are byte-identical to the input of the prior successful `a52cde8` native compile. No native rebuild or launch was needed or performed. Per-output hashes, exact revisions and comparison results are in `verification.json`.

The stage validator now requires registry resolution plus SHA-512 integrity for every lock dependency, preventing silent regression. **Eight reported validator tests passed** (seven cases plus containing group), including removal of an integrity field even after coherently updating the source manifest hashes. Updated `STATIC_CHECKS.json` records complete registry integrity and 97 files. Validator helpers are local review tooling outside the source allowlist.

## Remaining gates and next-ready work

The missing npm integrity gate is closed. Notice completeness remains open for the explicitly listed native/tooling/optional-platform material and actual shipped-output mapping; no license election was made. Galaxy/old icon rights and the selected silver-R handoff remain pending. No artwork was substituted or cleared.

Independent review can compare parent `a52cde8` to successor `5920d71`, check the three-file delta and registry verification, and accept the lock correction without rerunning native compilation. Next source work is package-specific notice completion and exact selected-logo/provenance integration once that handoff is available. Native runtime CSP/assets/retry/Dock validation is a separate scope. No push, app install/launch, mounted shutdown/N5, private evidence forwarding or Symphony change occurred.
