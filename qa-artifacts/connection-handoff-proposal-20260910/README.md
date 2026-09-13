# Connection-to-composer handoff proposal — 2026-09-10

Existing gap confirmed in current live source, not inferred from the stale backlog. ProviderSetup accepts durable save and refreshes workspace but only instructs closing Settings; no Continue action exists. The Settings close effect restores the original opener, usually Settings, rather than Message. Existing provider-success mounted case checks retained draft after Close but does not check Message focus.

## Minimal two-file patch

proposal.patch changes ProviderSetup.tsx and HostWorkspace.tsx only. Full proposed files and base/proposal SHA-256 values accompany it. No live/candidate files were edited.

A handoff flag is set only by durable configure acknowledgement or recovery result applied. The explicit Continue to chat button is unavailable before that and disabled while busy, disabled by parent, refresh-needed, or durability-unconfirmed. Reinspection/new save clears eligibility. Rejected/no-operation recovery and snapshot-only matching never authorize handoff. Failed display refresh retains saved authority but blocks Continue until explicit refresh succeeds.

Continue closes Results without restoring its opener, chooses Chat, sets the Settings focus-restoration target to the existing Message node and closes Settings. It performs no save or send. Parent only supplies the callback with a conversation and available workspace. It preserves existing styles, draft, compact execution control and ordinary Close Settings behavior. Without an active conversation, no Continue button is supplied; existing new-conversation flow remains necessary, not created automatically.

An adjacent composer status names the current snapshot workspace-default ID and states that this save did not test sign-in or a provider response. It explicitly says the conversation uses the selection above: pinned conversations and Constellation are not silently rebound. Existing readiness catalog/guidance is retained; no guessed authentication, installed state or response success is introduced. No repetition of the old three-string copy patch.

## Tests and evidence

PASS: git apply --check on exact current base.
PASS: strict isolated TypeScript check using copied current src plus two proposal overlays and existing installed dependencies, no emitted output. typecheck/ is an isolated copied-source verification directory, not another runnable app or server.

mounted-cases.fragment.tsx supplies three proposed actual-host-renderer scenarios: durable explicit handoff, uncertain+matching snapshot blocked, and durable-save/display-refresh-failure recovered without re-save. Each asserts retained exact textarea/draft, no submit and one configuration; successful paths assert Message focus and no hidden/inert ancestor. The fragment uses existing harness helpers and requires adding the narrow selector. It is NOT EXECUTED, not independently typechecked as a harness fragment and not a rendered PASS. No production test or server changed.

Builder acceptance should run these at1280/390/320 and add recovery applied/rejected/no-operation, existing pinned/team binding, missing routes, absent active conversation, bridge replacement, keyboard Tab/Enter and Settings reopened after success. Recovery and bridge replacement need particular lifecycle review; the proposal resets handoff eligibility on bridge change but does not redesign existing ProviderSetup async cancellation. Do not claim a real connection/authentication/response test from this handoff.

Next dependency: sole builder review/integration against recorded base hashes, then narrow mounted fixture execution and independent UI acceptance. Current source already includes later startup recovery UI; do not apply this to older c84cc2d blindly. No native/provider/account/server/dependency/website changes or private QA forwarding.
