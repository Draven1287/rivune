# S00 dependency attribution candidate

Offline local review, 2026-09-09. Inputs: current 93-file S00 stage and `S00_FRESH_SOURCE_FRONTEND_RECEIPT_20260909.md`; existing fresh npm install and macOS-filtered Cargo metadata/cache. No install, build, network transfer, source/stage change or dependency-tree copy. Artwork rights are excluded and unresolved independently.

## Deliverables

- `CANDIDATE_RUNTIME_NOTICES.txt`: actual cached license/notice text, deduplicated by SHA-256 with package/version/file associations. Contains explicit UNRESOLVED entries; **not ready to ship as complete notices**.
- `BUILD_DEPENDENCY_NOTICES.txt`: separate actual notice texts for tooling/development graph.
- `NOTICE_INPUTS.json`: package/category/license/path-within-package/text hashes and availability.
- `COLLECTION_RESULT.json`: exact missing-material inventory.
- `collect_notices.py`: repeatable cache-only collector. No source tree copies; only license/notice resources enter candidate files.

## Classification and evidence

React19.2.6, ReactDOM19.2.6 and Scheduler0.27.0 are the frontend runtime dependency graph; all three have actual cached MIT license text. Tailwind4.2.1 has its own generated-CSS attribution category and cached MIT text; build-only npm flags are not used to exclude its generated output. Remaining93 npm entries are build/development/optional tooling. npm lock dev=false alone does not prove shipping: emnapi runtime is tooling-related here, not a React app import.

Native metadata yields202 normal-dependency runtime candidates and52 build/proc-macro/development candidates, excluding three first-party path crates. Classification traverses normal dependency edges, stops at proc-macro boundaries, and preserves dependencies shared with runtime in runtime category. Cargo feature unification and platform metadata can overapproximate linkage; this is not a native binary bill of materials. Code-generating build tools may impose attribution requirements on output and must be checked against final package. macOS only; Windows/Linux/optional platform closure is not established.

Collected187 distinct text resources across both categories. Installed npm versions match lock entries (no detected version mismatch). Hashes identify exact text files; not all texts have received line-by-line legal interpretation. License expressions are preserved, including OR choices and legacy slash syntax; no license election was invented.

## Concrete remaining gaps

1. Missing standalone cached license/notice files for these **native runtime candidates**:

- alloc-stdlib 0.2.4 — BSD-3-Clause
- block2 0.6.2 — MIT
- dispatch2 0.3.1 — Zlib OR Apache-2.0 OR MIT
- objc2 0.6.4 — MIT
- objc2-app-kit 0.3.2 — Zlib OR Apache-2.0 OR MIT
- objc2-core-foundation 0.3.2 — Zlib OR Apache-2.0 OR MIT
- objc2-core-graphics 0.3.2 — Zlib OR Apache-2.0 OR MIT
- objc2-encode 4.1.0 — MIT
- objc2-exception-helper 0.1.1 — Zlib OR Apache-2.0 OR MIT
- objc2-io-surface 0.3.2 — Zlib OR Apache-2.0 OR MIT
- objc2-web-kit 0.3.2 — Zlib OR Apache-2.0 OR MIT
- selectors 0.36.1 — MPL-2.0
- unic-char-property 0.9.0 — MIT/Apache-2.0
- unic-char-range 0.9.0 — MIT/Apache-2.0
- unic-common 0.9.0 — MIT/Apache-2.0
- unic-ucd-ident 0.9.0 — MIT/Apache-2.0
- unic-ucd-version 0.9.0 — MIT/Apache-2.0

`selectors` source header explicitly states MPL-2.0 but does not supply the full license text. That header is corroborating evidence, not a substitute for required license/source-availability handling. objc2 family archives inspected likewise have metadata but no standalone text found. Do not substitute another author's MIT/BSD copyright notice merely because the license identifier matches. Resolve these from authoritative package materials in a separately authorized acquisition or confirm a supported alternative from existing explicit license grants.

2. Three installed npm tooling packages lack standalone notice text: @napi-rs/wasm-runtime1.2.3, @rolldown/binding-darwin-arm641.0.1, @tybys/wasm-util0.10.3. Native build dependency defmt-parser1.0.0 likewise lacks text.46 optional npm lock entries are not installed locally; their target-platform notices are unavailable here. Exact entries remain in COLLECTION_RESULT.json.
3. Map final shipped native/frontend output to these candidates before pruning tooling or declaring completeness. Include applicable copyright/NOTICE and licenses; review copyleft/source availability for actually shipped components. This report identifies inputs and gaps, not legal clearance.
4. Existing lock integrity gaps (51 npm entries without integrity per fresh receipt) remain provenance work; notice extraction does not repair them.
5. Galaxy/icon/logo ownership and derivative rights are not inferred from root Apache-2.0, dependency licenses, or this candidate notice file.

## Minimal builder integration

Use the runtime candidate and inventory as review inputs, retain a separate tooling inventory, resolve listed runtime notice gaps, and add a distribution notice path only after final package mapping. Do not add the whole dependency-review folder or caches to the source stage automatically. No current source-export approval or service/dispatch change follows from this work.
