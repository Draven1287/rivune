# Connection-to-composer handoff — ready for independent UI review

Four-file frontend/test-only delta. Exact two proposal base hashes rechecked before applying proposal.patch. source-hashes.json, scoped-source.patch and before-images are in qa-artifacts/connection-handoff-implementation-20260910/. ProviderSetup.tsx and HostWorkspace.tsx implement the handoff; hostRenderer.test.tsx and rendererScenarios.ts provide the narrow fixture. Both frozen startup correction hashes,148 candidate source files and3 Sent Draft QA bundle files remain unchanged.

## Behavior and proposal corrections
Continue to chat requires durable configuration acknowledgement or applied recovery, plus successful workspace refresh. It remains blocked while busy, disabled, refresh-needed or uncertain; matching snapshot alone cannot authorize it. Rejected/no-operation recovery never offers Continue. Reinspection/new save clears eligibility. Explicit handoff closes Settings/Results, selects Chat and restores focus to the existing Message node; it performs no save/send and preserves pinned/team binding and draft text. The status names the current workspace-default ID and explicitly leaves sign-in/response unverified. Without an active conversation, Continue is absent and copy directs creating/choosing one.

Beyond the proposal, bridge identity changes remount a private ProviderSetup session. Layout-effect lifetime guards discard late discovery/configuration/recovery/refresh outcomes before parent handoff callbacks. Parent refresh captures the current controller and rejects replacement. Busy state is reactive so button availability updates reliably after asynchronous completion. Reopening Settings on the same bridge retains a durably confirmed handoff; starting another inspection invalidates it. Issued host saves are not cancelled or replayed by this frontend lifecycle handling.

## Executed mounted proof
Existing4317 fixture: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=connection-handoff

11/11 selected actual React cases PASS at verified1280,390 and320 pixel widths: durable explicit handoff; uncertain save with matching snapshot blocked; durable-save refresh failure and refresh-only recovery; recovery applied/rejected/no-operation; pinned and team binding preservation with Settings reopen; late old-bridge save after replacement; missing routes; absent active conversation. The supplied fragment was integrated with a necessary unmount before its explicit mount. The missing-conversation test checks button presence rather than mistaking the explanatory notice for an action.

Manual keyboard fixture: http://127.0.0.1:4317/tests/hostRenderer.html?scenario=connection-handoff&handoffKeyboard=1

At320px, two Tab presses moved from Close Settings through Find providers to Continue; Return closed Settings and focused Message with exact Keyboard handoff draft text. Page scrollWidth320. The mounted cases assert same textarea identity/draft, no submission, one configuration on normal save paths and no recovery replay. Keyboard fixture deliberately supplies a fake durable configuration; no real account or provider is connected. It retains the shell for independent keyboard inspection.

TypeScript and3 selector tests PASS. No Results suite repeated. Real provider authentication, native configuration durability, actual OS restart and exhaustive async cancellation permutations are not proved here. Bridge replacement was executed during a pending configuration save; separate pending discovery/reconcile/refresh bridge-replacement cases were not run. Recovery acknowledgement and snapshot behavior are synthetic; native persistence retains its separate acceptance.

No host edit, native app launch/build, provider execution, new server/dependency, export/bundle or publication. Stopped for independent UI/source review.
