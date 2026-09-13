# S02 route picker review — 2026-09-10

Frozen dd9706b37e2b5fe162bf0390b2b1bf073e3fd4a0 versus e49efc20e0c50609730787534ecfaa4556198b5a. Reviewed receipt and eight-file delta locally. **Prior private-acknowledgement P2 closed; UI acceptance pending the following corrections.**

## P2 — Do not demote durable save when refreshing the workspace fails

`prototypes/ai-native-workspace/src/host/ProviderSetup.tsx:41–43`: the exact durable branch awaits onConfirmed within the configuration try/catch. The parent callback invokes controller.refresh, which can reject on snapshot/catalog transport or parsing failure or competing controller activity. The catch then sets durabilityUnconfirmed=true and phase=uncertain, although the host already acknowledged durable persistence. This incorrectly tells users crash durability is unknown and funnels them into another save/review cycle. Separate acknowledged save state from refresh state: preserve durable receipt and clear intended configuration before attempting refresh; report refresh failure as stale display with a read-only retry. Add a synthetic durable configure reply followed by failing refresh; require durable wording, one configuration invocation and unchanged draft. Established from frozen callback/control flow; not claimed as a mounted reproduction.

## P3 — Correct the empty connections message for the new picker

`prototypes/ai-native-workspace/src/host/HostWorkspace.tsx:161`: when no catalog providers exist, the old message still says Connection configuration is not available from this panel, directly above the newly available Add a connection controls. Remove that contradictory sentence or condition it on missing guarded capability. Test empty-provider setup with both supported and unsupported optional bridges.

## Accepted boundaries and evidence

Private expected provider/selected ID are now isolated from mutable bridge arguments; returned durable values use that private baseline. **4/4 exact frozen configuration tests passed** under Node v22.23.1, copied into s02-picker-frozen-tests, including mutation of provider path and nested guard for both select values. Reproduce from workspace root: `node --experimental-strip-types --test qa-artifacts/constellation-state-review-20260909/s02-picker-frozen-tests/tests/providerConfiguration.test.mjs`.

Inspection runs only from explicit buttons; no effect or mount query was added. Route choice is initially empty. Saving uses the captured snapshot guard; native stale-route/provider/global-selection rejection is unchanged. Local busy ref prevents duplicate inspection/configuration/check calls, and currentDisabled is checked at handler entry. Existing workspace pending work/runs disable setup. This is not a global operation fence: setup busy lives inside the component, and closing Settings does not prevent later workspace actions; a guarded save still serializes natively but its refresh callback may fail as described above. No provider/account/model/test-message activation was added.

Uncertain outcomes disable both inspection and another save. Reconciliation reads a fresh snapshot, removes old eligible routes, explicitly retains crash-durability uncertainty even when fields match, and never calls configure. Only a separate review action reinspects routes and obtains new guard expectations. Neither equality nor callback completion establishes durability. Closing the dialog leaves ProviderSetup mounted, retaining its local uncertainty state; renderer restart does not. No durable operation identity or timeout is added.

No conversation/draft payload crosses configuration. Controller refresh preserves locally dirty/pending draft entries; native configuration still changes only provider list/global selection. Pinned selections/teams remain unchanged, as the new binding explanation states. UI hooks do not rewrite them.

Inspected owner mounted fixture source: actual discoverProviders/configureSelectedProvider spies count explicit calls, exercise durable/lost/stale responses and verify no replay/draft save/send. Coverage omits post-durable refresh failure and does not simulate a native stale guard internally (it throws the synthetic rejection). Owner screenshots/mounted artifacts were not forwarded or represented as independent rendering evidence. No browser/native launch, real provider configuration/process/authentication, product edits or publication occurred. All review fixtures/report remain local.


## Successor 49777f3 — 2026-09-10

Prior P2 durable-save demotion and P3 empty-state contradiction are closed in frozen 49777f343d8488621060d31edfd5666c418a9c1b. The durable branch clears intended state before refreshing and catches refresh failure separately, retaining durable wording and offering a read-only retry. Empty-state copy now follows optional guarded configuration/discovery capability. The connected host already requires getSnapshot. Independent source recheck; mounted regression execution remains owner evidence. See S02_CONVERSATION_BINDING_REVIEW.md for bounded successor acceptance.
