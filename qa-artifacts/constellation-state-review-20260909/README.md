# Isolated Constellation regression cases

2026-09-09. Current production component supersedes the earlier findings. No app source edited, app build/server/native/provider operations performed. All fixtures synthetic. No private QA supplement accessed. Results remain local.

Run from repository root:

```sh
node --experimental-strip-types --test qa-artifacts/constellation-state-review-20260909/projection.test.mjs
```

**6/6 PASS**, recorded in `results.tap`. Uses existing TypeScript and React server-rendering dependencies. Transpiles the production TSX into memory and imports the actual production DTO parser and team configuration dependency; no copied component implementation or generated app files. These are static-render assertions, not DOM interaction acceptance.

Covered: cancelled/failed/preserved runs label retained running events as historical; partial contribution remains available; failed member issue and absent final answer are honest; output identifies saved role/provider/model/effort; provider-default model remains explicitly unknown. Production `Constellation.tsx` SHA-256 at check: `6744ee9b6b68a628321ba35aecdc889748dfe5cf2a661b43b644b9857f9bd5c6`.

## Exact DOM fixture and assertion specifications — NOT RUN

No jsdom/happy-dom dependency is installed. Existing DOM tests use a served browser document. To avoid a server or app changes, leave these specifications for that established harness. Import the production `ConstellationConfiguration`; do not recreate its state logic. Use React act/createRoot from the existing harness, with a recorder for onApply and no host bridge.

Common fixture: same mounted conversation key `C`; three configured fixture routes A/B/C; matching catalog entries with distinct IDs but identical labels, supported/installed, supportsProviderDefault=true, authentication=unknown, responseTest=notTested; runtimeCapabilities.constellation=available. Catalog revision r1. Each selection uses schemaVersion=1, modelID=null, effortID=null, catalogRevision=r1. Initial team [A,B], leadIndex=0. Render the same root/key on every update and flush effects with act. Open the details before interactions. Record onApply argument arrays by value.

1. **Pristine refresh.** Rerender team [B,C], leadIndex=1. Assert checked providers exactly B/C, lead value C; no conflict message; Save calls onApply([B,C], C) once. No call on rerender itself.
2. **Dirty refresh, load saved.** Start initial team, check C locally (A/B/C), set lead B. Rerender saved team [B,C], lead C. Assert local A/B/C and B retained, conflict visible, Save disabled, zero calls. Click Load saved team; assert B/C and C, conflict removed; Save records [B,C], C.
3. **Dirty refresh, keep local.** Repeat case 2; click Keep my team choices. Assert A/B/C and B retained, conflict removed, zero calls until Save; Save records [A,B,C], B. This is explicit overwrite intent, not a persistence claim.
4. **Successful save acknowledgement.** Local team A/B/C lead B; Save records once. Rerender props with exactly that acknowledged team. Assert conflict clears and subsequent pristine saved update [B,C]/C refreshes controls. This checks dirty-state reset after matching acknowledgement.
5. **Catalog removal.** Initial team A/B, at least A/C still available. Remove B from routes/catalog; revision r2. Assert B remains visibly removable with unavailable explanation, Save disabled; uncheck B, check C, choose A; Save records [A,C], A. Do not silently drop B or preserve a hidden ID. Controller catalog-validation tests separately prove revision handling.
6. **Failed save then refresh.** Edit initial selection to A/B/C lead B; recorder returns without updating saved props, simulating unsuccessful persistence. Assert edits remain. Rerender a conflicting saved [B,C]/C; assert case-2 conflict protection. No provider/submission call exists in this fixture.

Only static projection findings are verified corrected here. Refreshed-form source now includes dirty/base-key synchronization and conflict controls, but the six DOM cases above remain unexecuted; do not mark them passed based on source inspection.
