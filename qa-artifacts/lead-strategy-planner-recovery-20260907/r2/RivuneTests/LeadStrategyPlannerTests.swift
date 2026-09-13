import Foundation
import XCTest
@testable import Rivune

private actor LeadStrategyRecordingRunner: AITextRunning {
    struct Call: Sendable {
        let route: AIExecutionRoute
        let prompt: String
        let options: TerminalRunOptions
    }
    var response: String
    var shouldFail: Bool
    var delay: Duration?
    private var calls: [Call] = []

    init(response: String, shouldFail: Bool = false, delay: Duration? = nil) {
        self.response = response
        self.shouldFail = shouldFail
        self.delay = delay
    }

    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        calls.append(.init(route: route, prompt: prompt, options: options))
        if let delay { try await Task.sleep(for: delay) }
        if shouldFail { throw TerminalEngineError.launchFailed(.codex) }
        return .init(text: response, elapsedSeconds: 0.01)
    }

    func snapshot() -> [Call] { calls }
}

final class LeadStrategyPlannerTests: XCTestCase {
    private let codex = TeamMemberConfiguration(
        memberID: "lead-codex", displayName: "Codex lead",
        routeRef: TeamRouteReference(.codexCLI),
        requestedModelID: "gpt-5.6-sol", requestedEffort: "high"
    )
    private let claude = TeamMemberConfiguration(
        memberID: "review-claude", displayName: "Claude reviewer",
        routeRef: TeamRouteReference(.claudeCodeCLI),
        requestedModelID: "opus", requestedEffort: "medium"
    )

    private var team: TeamRunConfiguration {
        TeamRunConfiguration(members: [codex, claude], orchestratorMemberID: codex.memberID,
            fallback: .orderedMemberIDs([claude.memberID]))
    }

    private func request(response: String, workflows: [TeamWorkflow] = [.council, .swarm],
                         requested: TeamWorkflow? = nil,
                         limits: LeadStrategyPlanningLimits = .current) -> (LeadStrategyPlanner, LeadStrategyPlanningRequest, LeadStrategyRecordingRunner) {
        let runner = LeadStrategyRecordingRunner(response: response)
        let request = LeadStrategyPlanningRequest(runID: UUID(), team: team,
            prompt: "Build a small accessible website.", approvedContext: "Use the approved two-file scope.",
            availableWorkflows: workflows, requestedWorkflow: requested, limits: limits,
            delivery: .nativeTextArtifact(.current))
        return (.init(textRunner: runner), request, runner)
    }

    func testValidCouncilUsesOnlyExactAppointedLeadRouteAndOptions() async throws {
        let fixture = request(response: #"{"strategy":"council","reason":"Independent perspectives should challenge the same decision.","assignments":[]}"#)
        let plan = try await fixture.0.propose(fixture.1)
        XCTAssertEqual(plan.strategy, .council)
        XCTAssertNil(plan.swarmGraph)
        XCTAssertEqual(plan.lead, codex)
        let calls = await fixture.2.snapshot()
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls[0].route, .codexCLI)
        XCTAssertEqual(calls[0].options, codex.options)
        XCTAssertTrue(calls[0].prompt.contains("\"appointedLeadID\":\"lead-codex\""))
        XCTAssertTrue(calls[0].prompt.contains("do not execute work"))
    }

    func testValidSwarmProducesValidatedGraphAndPreservesEveryFrozenMemberSelection() async throws {
        let first = UUID(), second = UUID()
        let response = """
        {"strategy":"swarm","reason":"The files have complementary ownership.","assignments":[
          {"taskID":"\(first.uuidString)","memberID":"lead-codex","dependencies":[],"ownedPaths":["index.html"],"brief":"Create the complete semantic markup.","maximumOutputBytes":120000},
          {"taskID":"\(second.uuidString)","memberID":"review-claude","dependencies":["\(first.uuidString)"],"ownedPaths":["styles.css"],"brief":"Create styling against the approved markup contract.","maximumOutputBytes":100000}
        ]}
        """
        let fixture = request(response: response)
        let plan = try await fixture.0.propose(fixture.1)
        XCTAssertEqual(plan.strategy, .swarm)
        let graph = try XCTUnwrap(plan.swarmGraph)
        XCTAssertNoThrow(try graph.validate())
        XCTAssertEqual(graph.runID, fixture.1.runID)
        XCTAssertEqual(graph.tasks.map(\.parentLeaderID), [codex.memberID, codex.memberID])
        XCTAssertEqual(graph.tasks.map(\.providerID), [codex.routeRef.providerID, claude.routeRef.providerID])
        XCTAssertEqual(graph.tasks.map(\.adapterID), [codex.routeRef.adapterID, claude.routeRef.adapterID])
        XCTAssertEqual(graph.tasks.map(\.modelID), [codex.requestedModelID, claude.requestedModelID])
        XCTAssertEqual(graph.tasks.map(\.requestedEffort), [codex.requestedEffort, claude.requestedEffort])
        XCTAssertEqual(plan.taskOutputLimits, [
            .init(taskID: first, maximumBytes: 120000),
            .init(taskID: second, maximumBytes: 100000)
        ])
        XCTAssertEqual(plan.taskAssignments, [
            .init(taskID: first, member: codex),
            .init(taskID: second, member: claude)
        ])
        XCTAssertEqual(plan.frozenTeamSHA256.count, 64)
        XCTAssertEqual(plan.frozenRequestSHA256.count, 64)
        let calls = await fixture.2.snapshot()
        XCTAssertEqual(calls.count, 1)
    }

    func testIdenticalRoutesRetainExactAssignedMemberIdentityThroughPlanRoundTrip() async throws {
        let sameRouteReviewer = TeamMemberConfiguration(
            memberID: "review-codex-same-route", displayName: "Second Codex member",
            routeRef: codex.routeRef, requestedModelID: codex.requestedModelID,
            requestedEffort: codex.requestedEffort
        )
        let identicalRouteTeam = TeamRunConfiguration(
            members: [codex, sameRouteReviewer], orchestratorMemberID: codex.memberID,
            fallback: .orderedMemberIDs([sameRouteReviewer.memberID])
        )
        let first = UUID(), second = UUID()
        let response = """
        {"strategy":"swarm","reason":"Keep exact ownership despite identical routes.","assignments":[
          {"taskID":"\(first.uuidString)","memberID":"review-codex-same-route","dependencies":[],"ownedPaths":["review.txt"],"brief":"Review the requirements.","maximumOutputBytes":1000},
          {"taskID":"\(second.uuidString)","memberID":"lead-codex","dependencies":["\(first.uuidString)"],"ownedPaths":["answer.txt"],"brief":"Integrate the reviewed result.","maximumOutputBytes":1000}
        ]}
        """
        let runner = LeadStrategyRecordingRunner(response: response)
        let planningRequest = LeadStrategyPlanningRequest(
            runID: UUID(), team: identicalRouteTeam, prompt: "Produce a reviewed answer.",
            approvedContext: "Use the frozen team.", availableWorkflows: [.council, .swarm],
            requestedWorkflow: .swarm, delivery: .nativeTextArtifact(.current)
        )

        let plan = try await LeadStrategyPlanner(textRunner: runner).propose(planningRequest)
        let graph = try XCTUnwrap(plan.swarmGraph)
        XCTAssertEqual(graph.tasks[0].providerID, graph.tasks[1].providerID)
        XCTAssertEqual(graph.tasks[0].adapterID, graph.tasks[1].adapterID)
        XCTAssertEqual(graph.tasks[0].modelID, graph.tasks[1].modelID)
        XCTAssertEqual(graph.tasks[0].requestedEffort, graph.tasks[1].requestedEffort)
        XCTAssertEqual(plan.taskAssignments.map(\.member.memberID),
            [sameRouteReviewer.memberID, codex.memberID])

        let decoded = try JSONDecoder().decode(LeadStrategyPlan.self,
            from: JSONEncoder().encode(plan))
        XCTAssertEqual(decoded.taskAssignments, plan.taskAssignments)
        XCTAssertEqual(decoded.frozenTeamSHA256, plan.frozenTeamSHA256)
        XCTAssertEqual(decoded.frozenRequestSHA256, plan.frozenRequestSHA256)
        XCTAssertEqual(decoded.swarmGraph?.tasks.map(\.id), graph.tasks.map(\.id))
    }

    func testUnknownMemberFailsAfterLeadCallWithoutDispatchingWorkers() async {
        let task = UUID()
        let fixture = request(response: #"{"strategy":"swarm","reason":"Split it.","assignments":[{"taskID":"\#(task.uuidString)","memberID":"invented-agent","dependencies":[],"ownedPaths":["index.html"],"brief":"Build it.","maximumOutputBytes":1000}]}"#)
        do {
            _ = try await fixture.0.propose(fixture.1)
            XCTFail("Expected unknown member rejection")
        } catch {
            XCTAssertEqual(error as? LeadStrategyPlanningError, .unknownMember("invented-agent"))
        }
        let calls = await fixture.2.snapshot()
        XCTAssertEqual(calls.count, 1)
    }

    func testMalformedAndOverBudgetModelOutputsFailClosed() async {
        let malformed = request(response: "```json\n{}\n```")
        do { _ = try await malformed.0.propose(malformed.1); XCTFail("Expected malformed output") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .malformedProposal) }

        var limits = LeadStrategyPlanningLimits.current
        limits.maximumPlannerOutputBytes = 100
        let oversized = request(response: String(repeating: "x", count: 101), limits: limits)
        do { _ = try await oversized.0.propose(oversized.1); XCTFail("Expected output budget failure") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .outputBudgetExceeded) }
        let malformedCalls = await malformed.2.snapshot()
        let oversizedCalls = await oversized.2.snapshot()
        XCTAssertEqual(malformedCalls.count, 1)
        XCTAssertEqual(oversizedCalls.count, 1)
    }

    func testOverlappingPathsAndCyclesAreRejectedByExistingGraphValidator() async {
        let first = UUID(), second = UUID()
        let overlap = request(response: """
        {"strategy":"swarm","reason":"Split it.","assignments":[
          {"taskID":"\(first.uuidString)","memberID":"lead-codex","dependencies":[],"ownedPaths":["assets.txt"],"brief":"First.","maximumOutputBytes":1000},
          {"taskID":"\(second.uuidString)","memberID":"review-claude","dependencies":[],"ownedPaths":["assets.txt/a.txt"],"brief":"Second.","maximumOutputBytes":1000}
        ]}
        """)
        do { _ = try await overlap.0.propose(overlap.1); XCTFail("Expected overlap rejection") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .invalidTaskGraph) }

        let cycle = request(response: """
        {"strategy":"swarm","reason":"Split it.","assignments":[
          {"taskID":"\(first.uuidString)","memberID":"lead-codex","dependencies":["\(second.uuidString)"],"ownedPaths":["a.txt"],"brief":"First.","maximumOutputBytes":1000},
          {"taskID":"\(second.uuidString)","memberID":"review-claude","dependencies":["\(first.uuidString)"],"ownedPaths":["b.txt"],"brief":"Second.","maximumOutputBytes":1000}
        ]}
        """)
        do { _ = try await cycle.0.propose(cycle.1); XCTFail("Expected cycle rejection") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .invalidTaskGraph) }
    }

    func testExplicitUnavailableWorkflowFailsBeforeCallingLeadAndNeverSubstitutes() async {
        let fixture = request(response: #"{"strategy":"council","reason":"Use Council.","assignments":[]}"#,
            workflows: [.council], requested: .swarm)
        do { _ = try await fixture.0.propose(fixture.1); XCTFail("Expected unsupported workflow") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .unsupportedWorkflow(.swarm)) }
        let calls = await fixture.2.snapshot()
        XCTAssertTrue(calls.isEmpty)
    }

    func testLeadCannotSilentlyReturnDifferentRequestedWorkflow() async {
        let fixture = request(response: #"{"strategy":"council","reason":"Use Council.","assignments":[]}"#,
            requested: .swarm)
        do { _ = try await fixture.0.propose(fixture.1); XCTFail("Expected exact workflow rejection") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .unsupportedWorkflow(.swarm)) }
        let calls = await fixture.2.snapshot()
        XCTAssertEqual(calls.count, 1)
    }

    func testCancellationStopsAtPlannerBoundaryWithoutWorkerDispatch() async throws {
        let runner = LeadStrategyRecordingRunner(
            response: #"{"strategy":"council","reason":"Use Council.","assignments":[]}"#,
            delay: .seconds(5)
        )
        let request = LeadStrategyPlanningRequest(runID: UUID(), team: team,
            prompt: "Plan this.", approvedContext: "", availableWorkflows: [.council, .swarm],
            delivery: .nativeTextArtifact(.current))
        let task = Task { try await LeadStrategyPlanner(textRunner: runner).propose(request) }
        try await Task.sleep(for: .milliseconds(40))
        task.cancel()
        do { _ = try await task.value; XCTFail("Expected cancellation") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .cancelled) }
        let calls = await runner.snapshot()
        XCTAssertEqual(calls.count, 1)
    }

    func testTaskAndAggregateOutputLimitsFailClosed() async {
        let first = UUID(), second = UUID()
        var limits = LeadStrategyPlanningLimits.current
        limits.maximumOutputBytesPerTask = 1_000
        limits.maximumTotalOutputBytes = 1_500
        let fixture = request(response: """
        {"strategy":"swarm","reason":"Split it.","assignments":[
          {"taskID":"\(first.uuidString)","memberID":"lead-codex","dependencies":[],"ownedPaths":["a.txt"],"brief":"First.","maximumOutputBytes":900},
          {"taskID":"\(second.uuidString)","memberID":"review-claude","dependencies":[],"ownedPaths":["b.txt"],"brief":"Second.","maximumOutputBytes":900}
        ]}
        """, limits: limits)
        do { _ = try await fixture.0.propose(fixture.1); XCTFail("Expected aggregate budget rejection") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .outputBudgetExceeded) }
    }

    func testUnsupportedDeliveryFailsBeforeCallingLead() async {
        let runner = LeadStrategyRecordingRunner(
            response: #"{"strategy":"council","reason":"Use Council.","assignments":[]}"#
        )
        let request = LeadStrategyPlanningRequest(runID: UUID(), team: team,
            prompt: "Build an executable.", approvedContext: "", availableWorkflows: [.council, .swarm],
            delivery: .unsupported("Signed executable delivery"))
        do { _ = try await LeadStrategyPlanner(textRunner: runner).propose(request); XCTFail("Expected delivery rejection") }
        catch {
            XCTAssertEqual(error as? LeadStrategyPlanningError,
                .unsupportedDeliveryCapability("Signed executable delivery"))
        }
        let calls = await runner.snapshot()
        XCTAssertTrue(calls.isEmpty)
    }

    func testSwarmArtifactPathsAndNativeBudgetsAreValidated() async {
        let task = UUID()
        let invalidExtension = request(response: """
        {"strategy":"swarm","reason":"Split it.","assignments":[
          {"taskID":"\(task.uuidString)","memberID":"lead-codex","dependencies":[],"ownedPaths":["App.swift"],"brief":"Build it.","maximumOutputBytes":1000}
        ]}
        """)
        do { _ = try await invalidExtension.0.propose(invalidExtension.1); XCTFail("Expected path rejection") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .invalidTaskGraph) }

        let oversizedSingleFile = request(response: """
        {"strategy":"swarm","reason":"Split it.","assignments":[
          {"taskID":"\(task.uuidString)","memberID":"lead-codex","dependencies":[],"ownedPaths":["index.html"],"brief":"Build it.","maximumOutputBytes":131073}
        ]}
        """)
        do { _ = try await oversizedSingleFile.0.propose(oversizedSingleFile.1); XCTFail("Expected file budget rejection") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .invalidTaskGraph) }
    }

    func testLeadTransportFailureIsExplicitAndNeverDispatchesWorkers() async {
        let runner = LeadStrategyRecordingRunner(response: "", shouldFail: true)
        let request = LeadStrategyPlanningRequest(runID: UUID(), team: team,
            prompt: "Plan this.", approvedContext: "", availableWorkflows: [.council])
        do { _ = try await LeadStrategyPlanner(textRunner: runner).propose(request); XCTFail("Expected lead failure") }
        catch { XCTAssertEqual(error as? LeadStrategyPlanningError, .leadFailed) }
        let calls = await runner.snapshot()
        XCTAssertEqual(calls.count, 1)
    }
}
