# Root review of premium-native audit patch

Accepted for source integration: swarm-home-availability.patch SHA-256 efbff7bfb2f8dbe28bb01a1f699a314286d28625079ad54ff518e71034f5a4cd. Root independently verified the hash, inspected every changed line, and dry-ran the patch against the supplied base successfully. This changes only Home's disabled Swarm label, accessibility value/hint and tooltip. Existing selection, styling and disabled behavior remain intact. It corrects a misleading connection-required message; it does not implement or enable Swarm.

New rendered states remain unverified. Native owner may carry this patch as a separate display-only delta in mutable staging, with ordinary compile/layout verification before reporting it installed. Preserve immutable phone review checkpoints.

The proposed Manager terminology and readiness copy require semantic review before patching: a configured manager and an actual fallback synthesis lead can differ, so preserve that distinction in saved-run disclosure. Do not promise the provider will expose a resolved model at runtime; requested and confirmed values stay distinct and unknown stays unknown. Prefer concise connection status rather than additional provider plumbing in the primary chat UI.
