# Superseded executor proposal provenance

The initial proposal identities `package-local.mjs` 317cc63d... and `PROPOSED_EXECUTOR_NEXT.patch` 29171495... are superseded. They explicitly covered only Info.plist, lib.rs, and constellation_projection.rs.

The current proposal expands explicit binding to 15 source files:

- package-local.mjs `1256d71507b38c7d9b8d17ab703b26ad66bc53e642238c1f68edda247f00323f`
- PROPOSED_EXECUTOR_NEXT.patch `431df180f8465701e886a6b24524bea31a22a8bcde6bf5ec5981e22781a9263b`
- NEXT_EXECUTOR_ACCEPTED_PROJECT_REVIEW.json `80cb6f6ee3a441a1d7d3a8aee0624acdc578544341f97c01f6f440749bc184bb`
- NEXT_SOURCE_TOOL_FREEZE_MANIFEST.json `7228dfbd96cd1058102c3c0efe856a85356da60842f5b913be47e000b78bfc0f`

A later metadata-annotation variant produced review/source-manifest hashes 5ed354c1... and 9151b673.... It is superseded because those annotations are non-binding and independent review had already anchored 80cb6f6e... and 7228dfbd.... Runtime's 257-package/1-workspace-member report remains informational in NEXT_EXECUTOR_INPUT_DELTA.json; the accepted executor reruns metadata before build. No acceptance status, canonical source, build, or signature changed.
