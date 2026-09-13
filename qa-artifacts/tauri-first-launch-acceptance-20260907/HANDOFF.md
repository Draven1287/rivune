# Tauri first-launch acceptance handoff

This durable package audits an evidence-only freeze of `candidate4-runtime-r2` without editing or launching Rivune. The renderer runs against eight visibly marked synthetic fixtures and makes zero provider calls. The premium frontend and website V6 are untouched.

## Outcome

Acceptance is **blocked**: 3 of 8 scenarios currently satisfy every check. Invalid-provider correction, retry, and cancel pass. Empty workspace, no-provider, save failure, import preview, and unsupported mode remain blocked.

Concrete user-visible gaps:

- Empty and no-provider states say “Connected — select a local provider.” Missing configuration must not be labeled connected.
- Message entry and Send are enabled during the initial host check; Send also remains enabled with a conversation but no provider.
- Save failure preserves the draft but exposes `permission denied writing snapshot` and produces an unhandled renderer error.
- Import preview has no first-launch surface.
- An imported Council draft stays visible but has no unsupported-mode warning.

`COPY_HANDOFF.md` gives concise replacement language using the reviewed website V6 terms. `ACCEPTANCE.md` supplies reproducible manual expectations and the required launched-window gate.

## Evidence boundaries

- `bound-source/` is an evidence copy captured while the runtime owner was editing the source candidate. Hash binding prevents future source drift from changing these results.
- `wire_probe/` produces actual Rust serde serialization for the exact ID casing expected at the JS boundary. Rust-to-JS and JS-to-Rust field-name checks pass with zero provider calls.
- The then-current full host did not compile during this audit. An earlier locked attempt also found candidate source and `Cargo.lock` out of sync. Runtime ownership and remediation remain outside this package.
- Tauri was not launched. The configured CSP contains `connect-src 'none'`, but no packaged-WebView CSP failure was reproduced. `get_snapshot`, `configure_provider`, `create_conversation`, and `save_draft` still require actual `window.__TAURI__.core.invoke` verification plus restart persistence in an isolated profile.
- Browser-host fixture success is not IPC proof, application readiness, or provider readiness.

## Other checks

- All eight fixture screenshots include a visible synthetic/no-provider-call banner.
- Keyboard focus uses the declared 3px visible ring, and connection/error text retains `role="status"`.
- Eight declared opaque foreground/background pairs pass their applicable contrast thresholds, ranging from 10.34:1 to 18.53:1. Packaged WebView, placeholder, and disabled-opacity rendering remain manual checks.
- No runtime, premium frontend, website, provider, user data, import destination, or publication state was changed.
