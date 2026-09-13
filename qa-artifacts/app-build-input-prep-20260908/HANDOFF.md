# APP-BUILD-INPUT-PREP

## Disposition

The artifact evidence collector and accepted-validator integration are implementable. The canonical development config now binds the centrally selected arm64 build floor, but execution remains gated on a complete accepted-project receipt, frozen source hashes, fresh external output paths, and a fresh candidate.

The current Tauri config binds:

- Product name: Rivune.
- Development identifier: com.rivune.desktop.development.
- App version: 0.0.1.
- Explicit Cargo binary: rivune.
- `bundle.macOS.minimumSystemVersion`: 11.0.

The pinned Tauri 2.11.4 schema accepts `bundle.macOS.minimumSystemVersion` as a string or null, documents that it maps to `LSMinimumSystemVersion` and the build deployment target, and defaults to 10.13 when omitted. The explicit 11.0 value is the selected development arm64 build policy. It is not evidence that Rivune has been tested on macOS 11 and is not a public support claim.

Development identifier/version and arm64 are recorded candidate-policy inputs, not final release identity metadata. Complete project/source hashes, fresh output paths, the produced bundle identity, and bundle seal status must be frozen in the coordinator's next accepted-project receipt.

## Prepared implementation

mac-artifact-evidence.mjs:

- Derives expected plist metadata from the frozen Tauri config, Cargo product identity, accepted architecture, and a new receipt block binding.
- Requires an explicit minimumSystemVersion in both config and receipt.
- Binds the Python interpreter, validator, plutil, file, vtool, and codesign by absolute path and SHA-256.
- Uses fixed argument arrays with shell disabled.
- Opens and compares the physical source/output directory ancestry before any collector command, then repeats that check after the build before creating evidence.
- Holds the checked output directory descriptor and creates fresh mode-0600 evidence/report leaves relative to it with O_EXCL and O_NOFOLLOW, so a path-parent replacement between preflight and final creation is refused or cannot redirect those writes.
- Requires a real nonsymlink app directory, plist, and bundle executable.
- Captures bounded stdout/stderr with exit status and a truncation flag.
- Requires the accepted validator's evidence hash, native-review qualification, and distribution_ready=false.

PROPOSED_EXECUTOR.patch adds this module and the bound safe-artifact-io.py helper to the previously reviewed executor and inserts a pre-build policy/tool/output check plus post-build collection and validation. The build runner cannot start when the new binding is missing or inconsistent. The patch applies to accepted package-local.mjs SHA-256 f909fd08ecb3007ac75a3e9e23de743f1b2c4b81dc6c7cc1ed715235f08f27d3.

The patch is a proposal only. The canonical runtime is changing and its final tree hash is unresolved. Do not apply this patch automatically or regenerate the accepted target/cache.

The collector does not sign or seal the app. A fresh build with only a linker signature or no bundle resource seal will produce preserved evidence and fail qualification. That failure is expected and must not be bypassed. If native review needs a bundle-level ad hoc seal, a separately authorized QA-sealing step must act on the exact staged candidate; collection then runs again with new fresh output paths. Developer ID distribution signing remains a later independent gate.

## Tests

Eleven artifact-path Node tests use synthetic bundle files and deterministic tool stubs. Three additional static metadata tests bind the exact canonical config, pinned local schema, development identity/architecture receipt context, unresolved output paths, and local `LSRequiresCarbon` origin. They cover:

- Canonical development config acceptance with minimum macOS 11.0.
- Exact argv command plans with no shell.
- Successful native-review-only qualification from synthetic evidence that explicitly represents a sealed bundle.
- Missing bundle executable.
- File architecture mismatch.
- Collector failure and truncation.
- Executable/plist identity mismatch.
- Validator execution failure.
- Physical ancestor alias into the accepted source, with zero system-tool calls and zero writes.
- A symlinked output root, with zero system-tool calls and zero writes.
- Output-parent replacement after preflight, refused before evidence/report creation.

No real artifact, build, Cargo command, codesign operation, app, provider, or target directory was used. The canonical changes are the explicit `bundle.macOS.minimumSystemVersion` field and the one-key conventional `src-tauri/Info.plist` merge input.

`LS_REQUIRES_CARBON_REVIEW.md` records that `LSRequiresCarbon = true` appears in preserved generated Tauri bundles and is embedded in the pinned CLI/bundler executable. The new conventional `src-tauri/Info.plist` merge input contains only `LSRequiresCarbon = false`; the config needs no path reference because the pinned schema documents automatic discovery. Static validator coverage confirms that `false` produces the accepted warning rather than the `true` error. A future fresh bundle must still prove the generated value.

## Next gate

After the coordinator freezes the next actual accepted-project receipt and produces a fresh Tauri app, collect evidence for that exact output and review the validator report. Qualification is not assumed: an unsealed build remains blocked pending an explicitly authorized QA-sealing workflow or a newly produced bundle that already carries valid bundle-level sealing evidence. Do not reuse R3 evidence or infer success from this preparation.
