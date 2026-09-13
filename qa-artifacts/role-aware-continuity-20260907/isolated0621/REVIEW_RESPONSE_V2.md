# Response to independent review

Status: P1 corrected in `role-aware-production-v2.patch`; independent re-review required before integration.

The review correctly found that the v1 generic role-aware direct prompt serialized `selectedArtifact` but omitted the established `ArtifactContinuation.instructions` response contract. The corrected prompt now keeps the typed authority policy and appends that exact existing contract only when `selectedArtifactReference` is present.

The artifact remains untrusted immutable reference data. The current user request remains highest priority. The provider is explicitly required to apply the requested change and return exactly one JSON manifest containing every complete resulting file, not a patch or omitted unchanged files.

A new production coordinator recording test submits the same exact artifact through ChatGPT and Claude direct modes using typed history, separately approved project instructions, and selected documents. It verifies:

- exactly two calls total and one call on each direct route;
- exact artifact equality, including source IDs, response digest, snapshot digest, filenames, and complete contents;
- the current-request precedence statement and serialized current request;
- the artifact-as-untrusted-reference boundary;
- the exact original `ArtifactContinuation.instructions` string;
- the complete-file JSON manifest and no-patch requirements.

Verification after correction:

- `RoleAwareProductionEntryPathTests`: 6 passed, 0 failed.
- Full `Rivune Mac` suite: 303 passed, 0 failed, 0 skipped.
- Generic iOS Simulator Debug build: passed.
- Corrected v2 patch dry-run reconstruction against the frozen base: passed for all seven files.

The v1 patch remains present only to preserve the review trail and is superseded. Shared native source remains untouched because its `RivuneStore.swift` contains newer phone admission and request-ID work.

The existing phone legacy test is intentionally described only as a serialization check. Host-side rejection and zero-provider-call proof should be added while integrating with the newer native phone admission path; this frozen candidate does not claim that acceptance.
