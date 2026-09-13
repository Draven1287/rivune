# S04 admission quarantine and host cleanup precedence correction

Frozen successor ready for independent recheck: `016bde7243034e8059d266ca5ce6ff9f28483410`; parent `3325e095ad28ae2aceb208e5520109ebee60632b`; Git tree `e886dabe4eb012499b847540c19879e8fe04b3f9`. Manifest: 112 files, SHA-256 `ff93f242e72692c58e62a47be3a68d2c4e802be45155440d3d6097450f88a530`. Three-file delta: codex_model_discovery.rs, host.rs and MODEL_DISCOVERY.md. Candidate clean, all committed blobs match manifest, no remotes, root index untouched. Visual export remains separate; owner visual approval is not inferred from review.

## Review findings addressed

1. Admission retains its early quarantine check and now rechecks CLEANUP_QUARANTINED after acquiring REGISTRY. Deterministic public begin/Lease test uses thread-local test-only barriers: A holds the real lease, B passes the fast check and pauses, A sets quarantine and drops its lease, then B proceeds and must return DISCOVERY_CLEANUP_PENDING without inserting an identity or taking the active slot. This reproduces the reviewer interleaving; no timing sleeps are used. Tests touching the global registry are serialized and restore their test quarantine flag.
2. Host return finalization preserves DISCOVERY_CLEANUP_PENDING and DISCOVERY_CLEANUP_FAILED before substituting DISCOVERY_PROVIDER_CHANGED. It rebuilds lifecycle reports from the bound request, discarding all models and keeping selection disabled. A focused host-boundary test covers both unchanged and failed revalidation (the common false branch for changed/removed providers or unavailable lock), both cleanup codes, and ordinary provider-change substitution. It intentionally attaches synthetic models to cleanup reports to prove they are stripped. It does not inject a real workspace-lock poison or call a provider.

## Focused evidence

`native-admission-precedence.log`: 15 native tests passed, including 13 discovery module/process tests, the host cleanup-boundary regression and the existing provider-discovery boundedness test. All process peers are synthetic. `stage-admission-precedence.log`: nine validator checks passed. STATIC_CHECKS.json verifies all 112 staged files, dependency references, registry integrity and native output wiring. Frontend code/bridge unchanged; prior 14-check frontend results remain historical rather than rerun for this Rust-only correction.

Local evidence directory: qa-artifacts/s04-codex-discovery-20260909. No private QA forwarded. Full source behavior and known lifecycle limits remain documented in MODEL_DISCOVERY.md and S04_DISCOVERY_CLEANUP_BOUND_RECEIPT_20260909.md. This correction does not prove hard OS termination/isolation, real provider compatibility or model admission. No real account/model query, inference, paid call, auth mutation, native app launch/install, held issue publication or Symphony mutation occurred.

Next: frozen successor recheck of these two P2 corrections. Independent acceptance remains pending.
