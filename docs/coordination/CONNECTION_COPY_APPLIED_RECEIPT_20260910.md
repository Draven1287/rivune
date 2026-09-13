# Connection copy — separate applied delta

Applied the exact supplied connection-copy.patch after both BASE_HASHES.json entries matched. Exactly three strings in connectionGuidance.ts and ProviderSetup.tsx changed. No provider behavior, setup/discovery logic or frozen foundation file changed. This copy delta remains separate from the13-file durable-artifact foundation; all13 current frozen hashes were reverified unchanged.

Three existing guidance tests and TypeScript typecheck PASS. Existing mounted connection-guidance and provider-success fixtures PASS on4317: no setup/send from opening guidance, focus restored on dismissal, one synthetic configuration save, and draft preserved. The initially combined scenario query was rejected before checks ran; each documented individual scenario then passed.

An isolated synthetic render harness imports the actual changed helper and ProviderSetup. At320px it shows exact missing-installation, untested-response and durable-save text. Each message has equal client/scroll width277px, with no message overflow. Mount counters remain0 discovery/configuration/send; after explicit synthetic discovery and save they are1/1/0. No real provider/discovery/configuration or send was performed. Harness viewport reset. The harness is a review-only presentation of these states, not the native Settings container.

Evidence: qa-artifacts/connection-copy-applied-20260910/hashes.json (before/after), before/, guidance-tests.log, typecheck.log, verification.json and synthetic-render-fixture/. Safe existing-server preview: http://127.0.0.1:4317/dist/connection-copy-review/index.html . No source export/commit/package build/native operation/publication.
