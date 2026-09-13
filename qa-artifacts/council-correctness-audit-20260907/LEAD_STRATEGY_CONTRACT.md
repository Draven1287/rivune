# Smallest lead strategy decision contract

Date: 2026-09-07  
Status: review-only contract map; no shared implementation

## Product boundary

Rivune presents one conversation, one frozen team and one composer. Council and Swarm are internal execution strategies. Auto asks the appointed lead for a structured proposal, then the runtime either accepts that exact strategy or records why it is unavailable. Manual selection fixes the requested strategy before the lead decision. The runtime never relabels a substituted path as the requested strategy.

## Minimal records

The lead returns only a proposal:

```swift
enum TeamStrategy: String, Codable {
    case council
    case swarm
    case councilThenSwarm
    case swarmThenCouncil
}

struct LeadStrategyProposal: Codable {
    let schemaVersion: Int              // exactly 1
    let runID: UUID                     // exact frozen run
    let leadMemberID: String            // exact appointed lead
    let frozenInputDigest: String       // runtime-created request/team/context digest
    let strategy: TeamStrategy
    let reason: String                  // nonempty, user-readable, <= 512 UTF-8 bytes
    let requiredCapabilities: [String]  // closed identifiers, unique and sorted
    let requiredPermissions: [String]   // closed identifiers, unique and sorted
}
```

The runtime creates the authoritative receipt:

```swift
enum StrategySelectionSource: String, Codable {
    case automaticLeadDecision
    case manualOverride
}

enum StrategyAdmission: String, Codable {
    case accepted
    case unavailable
    case invalidProposal
}

struct StrategyDecisionReceipt: Codable {
    let proposal: LeadStrategyProposal
    let selectionSource: StrategySelectionSource
    let manualOverride: TeamStrategy?
    let admission: StrategyAdmission
    let effectiveStrategy: TeamStrategy?       // nil unless the exact proposal is accepted
    let capabilityEvidenceIDs: [String]        // frozen runtime-owned receipts
    let grantedPermissionIDs: [String]         // frozen runtime-owned grants
    let admittedPhaseBudget: Int?              // runtime-computed, not model-authoritative
    let admittedCallBudget: Int?
    let unavailableReasons: [String]
    let supportedOffer: TeamStrategy?          // disclosure only; never auto-executed
}
```

The proposal deliberately does not choose adapters, create permissions, raise budgets, add members or claim that a capability exists. Those remain runtime-owned facts. Capability and permission identifiers must come from closed application enums; unknown identifiers make the proposal invalid.

## Admission rules

1. Decode a bounded response and require the exact schema, run, lead and frozen-input digest.
2. Under manual override, require `proposal.strategy == manualOverride`. A mismatch is an invalid proposal and starts no phase.
3. Translate the proposed strategy into deterministic phase requirements:
   - `council`: two or more admitted independent-answer members plus an admitted lead/fallback policy.
   - `swarm`: at least one real worker adapter, bounded scoped assignments, required tool permissions and an admitted lead integrator.
   - combined strategies: both requirement sets and an admitted two-phase budget in the declared order.
4. Validate current adapter readiness, exact model/effort identity, permissions, selected team capacity and runtime-owned call/worker/phase limits.
5. Accept only the exact proposed strategy. If any requirement fails, record `unavailable`, keep `effectiveStrategy` nil and start no phase.
6. A supported subset may appear only as `supportedOffer`. Running it requires a new explicit decision; its output cannot be labeled as the unavailable strategy.
7. Persist the receipt before dispatch. Retry reuses the frozen receipt and completed phase outputs unless readiness or permissions have changed, in which case it stops before new work.

## Cross-phase invariants

- Council first answers remain independent. No member sees peer drafts before submitting its own answer.
- Swarm assignments remain distinct, scoped and permission-bounded. A narrative description of workers is not a Swarm execution receipt.
- A phase transition records the prior phase's immutable result digest and the exact context admitted to the next phase.
- Cancellation stops pending and queued work across both phases and cannot be overwritten by late success.
- One appointed lead owns the final review and answer/deliverable. Any fallback is explicit and preserved in the same run history.
- Every disclosure distinguishes proposed, accepted, unavailable, running, partial, cancelled and complete states.

## Synthetic routing cases

| Case | Frozen input | Lead proposal | Runtime evidence | Required result |
| --- | --- | --- | --- | --- |
| Advice | Compare two choices using supplied evidence | `council` | Two independent members and lead admitted; no worker tools needed | Accept Council; identical first-round context, separate answers, lead synthesis, one final answer |
| Build | Implement a bounded change and return exact files | `swarm` | Real worker adapter, workspace grant, scoped task and worker/call budgets admitted | Accept Swarm; issue distinct assignments, retain worker receipts, lead reviews actual artifact before final |
| Mixed | Evaluate approaches, implement the selected one, then report | `councilThenSwarm` | Both strategies and two-phase budget admitted | Council completes first; its immutable reviewed result informs scoped Swarm work; lead returns one final deliverable |
| Unavailable tools | Modify files, but no worker tool permission or adapter exists | `swarm` | Swarm requirement fails; Council is available | Record Swarm unavailable, zero worker or Council calls, `effectiveStrategy == nil`; Council may be shown only as a supported offer |
| Manual override | User selects Council for a build-shaped prompt | `council` with `manualOverride == council` | Council admitted even if Auto would have proposed Swarm | Execute Council exactly; persist manual source and reason. A lead response proposing Swarm is invalid and executes nothing |

## Small synthetic test set

1. `testAutoAdviceAcceptsCouncilAndPreservesIndependentFirstAnswers`
2. `testAutoBuildAcceptsOnlyRealAdmittedSwarm`
3. `testAutoMixedRunsDeclaredCouncilThenSwarmOrderWithFrozenTransitionDigest`
4. `testUnavailableSwarmStartsNoWorkAndCouncilOfferIsNotExecution`
5. `testManualCouncilOverrideRejectsMismatchedLeadProposalBeforeDispatch`
6. `testRoutingDecisionCannotExpandTeamPermissionsOrRuntimeBudget`
7. `testCombinedCancellationRejectsLatePhaseSuccessAndPersistsCompletedEvidence`
8. `testRetryDoesNotReplayCompletedCouncilPhaseOrChangeFrozenStrategy`

Recording transports should assert exact call count, role, model/effort options, prompt digest, phase order, permission receipt and cancellation boundary. No live provider is needed for this contract suite.

## Integration seam

Keep `CouncilRunner` unchanged as the Council strategy executor. A future coordinator-level router owns `LeadStrategyProposal` parsing and `StrategyDecisionReceipt` admission, then invokes Council, Swarm or both. This preserves Council's independent-draft and lead-synthesis rules while allowing Auto to remain one product-level entry point.

