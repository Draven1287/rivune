# V4 independent journal review — ACCEPT for bounded integration

Accepted frozen source SHA-256: `24f78f3fa4cdcfae5f8690fb28fa7505ad3138b8fe8dc2992489d4654c97c4c5`.
Accepted tests SHA-256: `a09917a31abab2fdd09dad6b0a3578e40914b92cc52dc64240d691369a84b056`.
Final owner-frozen package: `/private/tmp/rivune-phone-journal-v4-final.hEVX9j`. Root-owned unmodified-source adversarial harness: `/private/tmp/rivune-root-journal-v4-el3042bx`.

Root independently ran all 18 synthetic Swift tests against both the initial v4 and the final owner-frozen test cleanup: passed, exit 0. The only final test changes replace two redundant throwing assertions with optional claims and non-nil expectations; production source is byte-identical. Final run has no compiler warnings. Root also compiled the unmodified candidate source with a separate real-file review harness, exit 0: same-storage duplicate journal rejected; stale-token cleanup cannot remove a successor; valid-owner cleanup permits reacquisition; first admission dispatches; restart reattaches interrupted/unknown without redispatch; malformed-read and semantic-validation initialization failures release their own lease; the postfailure successor remains exclusive; a separate process cannot acquire the file lock. Output and source are preserved in `independent-review`. No provider calls or installed app changes occurred.

## Review disposition

The v3 failed-initialization lifecycle issue is fixed. A retained token-owned RAII object is now solely responsible for lease cleanup. The registry removes ownership only when the token matches. Both early and late initializer failures release the owned object automatically; no explicit journal catch/deinit releases remain. Source diff from v3 is restricted to this ownership correction. Prior validated metadata, result-reference checks, canonical SHA-256 identities, persisted-before-dispatch admission, interrupted restart behavior and file locking are unchanged. No remaining P1/P2 finding in this isolated review scope.

This accepts the exact frozen foundation for the native owner's manual integration under the user's existing local development authorization. It does not claim that the phone transport or actual Mac task coordinator is durable yet. Preserve v1-v3 rejection evidence.

## Integration acceptance still needed

- Bind journal identity to authenticated paired device, exact admitted request content and supported execution route; never accept caller-controlled raw metadata as authority.
- Persist reservation before actual provider dispatch; duplicates reattach, conflicts and storage failure produce zero dispatches.
- Keep Mac execution alive on phone detach; only explicit authorized Stop requests cancellation and its acknowledgement.
- After process restart, unresolved runs remain interrupted/unknown, never automatically retried; replay completed results through stable workspace references.
- Qualify actual bridge/coordinator integration with fake dispatch counters, disconnect/reconnect, restart, write failure, protocol/permission rejection and result identity checks. Preserve unsupported Council/Swarm rejection until separately implemented.
- Physical iPhone background/foreground, Mac sleep/unavailability, artifact transport and away-from-home operation remain unverified. Atomic file replacement here is not a power-loss durability or general exactly-once external side-effect guarantee.

Keep installed build0623 stable until a reviewed integrated candidate is ready. Existing review-install authorization remains in effect; this scope statement creates no new permission gate.
