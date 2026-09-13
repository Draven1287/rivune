# Rivune desktop attribution inputs

These source-owned notice inputs are provisional, not complete distribution notices or legal clearance. They preserve collected license/NOTICE text and package associations for the currently inspected npm and macOS Cargo graph. Runtime candidates and generated CSS attribution are in CANDIDATE_RUNTIME_NOTICES.txt; tooling inputs remain separately in BUILD_DEPENDENCY_NOTICES.txt. NOTICE_INPUTS.json records package/version/category and notice-file hashes. No caches or private reports are included.

Before distribution, map actual bundled output to the candidates, resolve applicable missing material, preserve required copyright/NOTICE text, review source-availability obligations, and prepare a final distribution notice path. Do not silently remove UNRESOLVED markers or elect an alternative license based only on metadata. The native build currently does not bundle these provisional files as final notices.

## Runtime notice material update

Exact cached crate archives for all 17 targeted packages matched Cargo.lock SHA-256 checksums; their embedded VCS records identified immutable upstream commits. Source URLs, versions, notice hashes and archive lineage are in UPSTREAM_NOTICE_PROVENANCE.json. Only notice resources are retained under upstream-notices/.

Full material was obtained for alloc-stdlib (Dropbox BSD notice), five UNIC packages (both Apache and MIT texts, COPYRIGHT and AUTHORS), and selectors (exact source header plus official Mozilla MPL 2.0 text). No alternative license was elected. Seven missing-material entries are closed; this is not final distribution clearance.

Ten objc2-family entries remain unresolved:

- block2
- dispatch2
- objc2
- objc2-app-kit
- objc2-core-foundation
- objc2-core-graphics
- objc2-encode
- objc2-exception-helper
- objc2-io-surface
- objc2-web-kit

For these ten, exact-commit LICENSE.md supplies upstream licensing explanations and links, but not full package-specific copyright/license text. It also flags SDK-derived-code considerations. That verified explanation is included as supplemental evidence; no copyright holder or license election was invented. Obtain applicable upstream notice/grant clarification before declaring these complete.

Selectors now includes full official MPL 2.0 text and its exact source header; shipped-source availability and final package mapping still require review. Remaining tooling gaps include @napi-rs/wasm-runtime, @rolldown/binding-darwin-arm64, @tybys/wasm-util and defmt-parser; 46 optional npm entries are not installed locally. Windows/Linux closure and generated-code obligations remain unverified. License expressions and notices have not all received final interpretation.

Galaxy/icon resources and the selected silver-R logo have separate unresolved provenance/integration work; dependency notices confer no artwork rights. The npm lock now records integrity for all 97 dependency entries; the 51 newly completed entries were checked against exact-version registry metadata and downloaded tarball hashes. This does not resolve notice or artwork rights. These gaps do not prohibit local compilation, but this candidate is not publication-cleared.
