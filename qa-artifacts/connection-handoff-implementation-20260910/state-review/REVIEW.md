# Connection handoff — source/state review

**BOUNDED PASS.** No actionable state or authority defect found in the reviewed delta. Browser acceptance belongs to the UI reviewer; native configuration durability and provider readiness are not established here.

## Frozen identity

All four live hashes and before-image hashes match the implementation manifest. An independently regenerated four-file diff matches `scoped-source.patch` exactly. Copies and [hashes.json](hashes.json) are retained here.

- ProviderSetup.tsx: `fce3938ce6aa04d82c3de17c926db54ed63ac72c6656a981ad6e090f6c992d88`
- HostWorkspace.tsx: `b838b3c7c213296d4ddef8dca426579782f5156c960b7e7b31d2bac82b32680e`
- hostRenderer.test.tsx: `21b1d40cc00250503fed42aeeb7898c587953966826b2ec0a4b302cca9d58860`
- rendererScenarios.ts: `f7a7a7aa31f981eada7a3b519789fde498b26d549b8839ddd901d25d026337c0`

## State and authority findings

ProviderSetup keys its private session by bridge object identity. Committed replacement unmounts the old session; layout cleanup invalidates its lifetime before late discovery, configuration, reconciliation or refresh completions can authorize handoff. Inspection checks lifetime before requesting its snapshot and again before adopting it. Configuration and reconciliation check before invoking the parent refresh callback. Already-issued adapter operations are not cancelled: a reserved/configuration/recovery operation can finish against its original bridge. This code suppresses stale UI authority rather than guaranteeing cancellation of host writes.

Durable configuration sets handoff eligibility, but synchronous busy state and reactive busy state keep Continue disabled throughout the parent refresh. Refresh failure retains a refresh-needed gate; the refresh-only action does not configure again. Applied recovery can establish eligibility, while rejected/no-operation recovery cannot. Legacy matching-snapshot reconciliation never promotes durability. New inspection or configuration clears previous eligibility. Availability, disabled state and unresolved durability provide additional gates.

Parent refresh captures the current controller, awaits that controller, and rejects if the ref changed. The old session also checks its own lifetime after completion. Continue is offered only with an available conversation; its handler closes Results and Settings, selects the chat surface and routes existing close-focus behavior to the existing Message node. It calls neither save nor send. The delta adds no conversation selection/team/draft mutation. The status reads the current workspace default and explicitly leaves sign-in and response testing unverified.

The refresh-only finally branch still calls a state setter on its old component after cleanup. That does not authorize a new session or call the parent, and no user-visible defect was established from it; it is not treated as a blocker.

## Focused independent checks

Three deterministic continuation checks passed using the captured actual ProviderSetup transpiled into a minimal hook/element harness:

- Late discovery after cleanup does not request its snapshot.
- Late applied reconciliation after cleanup does not invoke parent refresh.
- Pending refresh blocks Continue, and its late completion does not replay the parent callback.

These checks inject hook lifecycle, parser and adapter behavior; they are not React mounting, bridge integration, or browser replacement tests. They exercise the actual captured async callback bodies across manually triggered cleanup. The first harness invocation had an incorrect local TypeScript dependency path; that harness path was corrected before the passing run. Evidence: [continuations.cjs](continuations.cjs), [continuations.log](continuations.log). Run with Node from the workspace; no build or server is needed.

Inspected producer assertions and verification record report 11 mounted cases at three widths plus keyboard, TypeScript and three selector checks. The supplied tests cover durable/uncertain/refresh-failure, applied/rejected/none recovery, pinned/team preservation, pending save bridge replacement and missing prerequisites. Those browser results were not independently rerun here. Pending discovery/reconcile/refresh replacement is covered only by source review and the bounded continuation checks above, not real React scheduling. Parent controller replacement rejection is source-inspected.

Only local review evidence was written. No live/candidate edit, browser/native action, build, provider call, or startup re-review occurred.
