# S04 capability review — 2026-09-09

Disposition: no blocking defect found in the six-file capability boundary change. This accepts the defaults-only source slice, not real model discovery or native runtime readiness.

Reviewed frozen commit `e0c19ec8f01316e1f7535dbd6e3f4bbfe2a1b995` against `ad4d37273e09be94b673432214bf78aac5b61772` in `tools/symphony/source-import-candidate`, plus the S04 coordination receipt. All production code inspected came from Git objects, independent of ongoing builder edits.

## Findings

- Catalog parsing accepts the optional versioned capability field and rejects malformed values, unknown fields, future versions and unsupported support claims. A missing field remains readable and is interpreted conservatively by `providerSelectionCapabilities`; parsing itself does not insert the fallback field into the object.
- Native catalog serialization includes the capability object in the provider bytes hashed for revision. Resolution checks selection structure, exact catalog revision and route availability before capability validation. Explicit models are rejected; effort without a model remains `INVALID_SELECTION`. Defaults retain null effective model/effort IDs and `providerManagedDefault` attribution.
- Changed selection/team values are resolved before candidate workspace creation or mutation persistence. Every team member is checked. Structural validation separately requires selection to equal the designated lead. Unchanged structurally valid legacy selections can preserve draft text, while later admission still resolves the current catalog. Clearing a selection does not invent a replacement choice.
- Exact mutation replay precedes revision conflict and changed-configuration validation. Reusing an identity with changed payload is rejected. Existing durable/uncertain replay semantics remain intact; the added validation cannot retroactively reject a previously recorded mutation because its catalog became stale.
- Persistence clones ordered members, lead index, requested selection and revisions without a migration or fallback. Reviewed defaults are constructed in the requested order with the requested lead. Constellation preparation resolves members in that order and derives the lead member from the saved index. The new UI copy correctly states that overrides are unavailable.

## Verification and limits

Independently ran all five new frontend capability tests against exact frozen blobs copied into this report's `s04-frozen-tests` fixture directory: **5 passed, 0 failed** using Node v22.23.1:

```sh
node --experimental-strip-types --test qa-artifacts/constellation-state-review-20260909/s04-frozen-tests/tests/modelCapabilities.test.mjs
```

Coverage includes legacy parsing, strict capability validation, stale-team nonmutation, explicit default review retaining the second lead, override rejection and removed routes. Inspected the native test source and retained `native-focused.log` / `native-regressions.log`: they report two new and two existing Rust tests passing. Those native executions are builder-provided evidence, not independently rerun here. The legacy native test checks full team equality after reopening and rejection followed by accepted review at revision 1; its final reopen assertion checks team identity, not an explicit final draft-text/revision assertion. Replay ordering and exact draft/revision assignments were independently checked in source.

No provider execution, native build/launch, full browser suite, publication, service change, private supplement access or Symphony issue retry occurred. Discovery, authentication, entitlements, rendered native behavior and release readiness remain outside this acceptance.
