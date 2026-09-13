# macOS artifact metadata validator

This package provides a read-only CLI for validating recorded macOS app-bundle metadata before native review or packaging handoff. It never invokes plutil, file, vtool, codesign, spctl, the app executable, or a shell. A packaging owner collects those outputs separately and supplies them as JSON.

The validator compares:

- CFBundleExecutable with the observed executable basename.
- Plist identifier and versions with explicit expected product values.
- LSMinimumSystemVersion with the expected minimum and every Mach-O slice.
- Architectures parsed from file with per-slice vtool results and expected architectures.
- An explicit macOS platform on each LC_BUILD_VERSION slice; numeric platform 1 is accepted as macOS, while LC_VERSION_MIN_MACOSX is treated as an explicitly macOS legacy command.
- The signed identifier with CFBundleIdentifier.
- Strict bundle verification with signature display evidence to distinguish a linker-only ad hoc signature, a bundle-level ad hoc seal, an identity-signed bundle seal, an invalid signature, and unavailable evidence.

A successful signature verification exit code is insufficient by itself. Bundle-sealed classifications also require explicit app-bundle format, signed identifier, sealed-resource, and bound-Info.plist evidence. Truncated display output remains unknown and blocking.

LSRequiresCarbon is always surfaced: true blocks qualification; false produces a removal warning. Missing fields, malformed output, unavailable tools, architecture disagreement, deployment mismatch, signed-identifier mismatch, and signature verification failure all fail qualification explicitly.

## Use

Run:

    python3 validate_mac_artifact.py --input evidence.json --output report.json

Exit codes:

- 0: consistent enough for native visual/runtime review.
- 2: evidence parsed, but qualification failed.
- 3: input could not be read or parsed.

Every report embeds the complete supplied evidence and its SHA-256. This preserves the evidence boundary without claiming that the validator collected or authenticated it.

## Qualification boundary

qualified_for_native_review means the supplied metadata is internally consistent and the recorded strict bundle verification passed. distribution_ready is always false. A valid bundle-level ad hoc seal remains a local-development artifact and does not establish Developer ID signing, hardened runtime, entitlements, notarization, stapling, Gatekeeper distribution, clean-Mac installation, DMG integrity, pilot acceptance, or OS runtime compatibility.

The R3 regression fixture reproduces recorded facts from the prior review: plist minimum 10.13, arm64 Mach-O minimum 11.0, LSRequiresCarbon=true, and a linker-only ad hoc signature. It is deterministic synthetic evidence derived from the review, not a repeat inspection of the live app.

Run the deterministic suite:

    python3 -m unittest -v
