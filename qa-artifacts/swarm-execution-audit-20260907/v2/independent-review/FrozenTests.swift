import Foundation
import Testing
@testable import SwarmExecutionCandidate

private let leadID = "lead-member"
private let workerA = SwarmWorkerIdentity(memberID: "worker-a", providerID: "openai", adapterID: "codex-cli", requestedModelID: "fixture-a", requestedEffort: "high")
private let workerB = SwarmWorkerIdentity(memberID: "worker-b", providerID: "anthropic", adapterID: "claude-cli", requestedModelID: "fixture-b", requestedEffort: nil)

private func owned(_ path: String, base: Data? = nil) -> SwarmOwnedPath {
    .init(path: path, expectedBaseSHA256: base.map(sha256))
}

private func makePlan(existingIndex: Data? = nil, dependent: Bool = false) -> SwarmExecutionPlan {
    let firstID = UUID(uuidString: "11111111-1111-1111-1111-111111111111")!
    let secondID = UUID(uuidString: "22222222-2222-2222-2222-222222222222")!
    var tasks = [
        SwarmChildTask(taskID: firstID, parentLeaderID: leadID, workerMemberID: workerA.memberID,
                       ownedPaths: [owned("index.html", base: existingIndex)], brief: "Build the page structure"),
        SwarmChildTask(taskID: secondID, parentLeaderID: leadID, workerMemberID: workerB.memberID,
                       ownedPaths: [owned("styles/site.css")], brief: "Build the visual system")
    ]
    if dependent {
        tasks.append(.init(taskID: UUID(uuidString: "33333333-3333-3333-3333-333333333333")!,
                           parentLeaderID: leadID, workerMemberID: workerA.memberID,
                           dependencies: [firstID, secondID], ownedPaths: [owned("README.md")],
                           brief: "Document the integrated interface"))
    }
    return .init(runID: UUID(uuidString: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")!,
                 leadMemberID: leadID, workers: [workerA, workerB], tasks: tasks,
                 checks: [.init(checkID: "html", description: "Validate the page structure"),
                          .init(checkID: "mobile", description: "Validate the narrow layout")])
}

private actor RecordingWorker: SwarmWorkerExecuting {
    private(set) var requests: [SwarmWorkerRequest] = []
    private(set) var active = 0
    private(set) var peak = 0
    private(set) var cancellations = 0
    let failFirstTask: UUID?
    let delay: Duration
    let outputOverride: (@Sendable (SwarmWorkerRequest) -> SwarmWorkerResult)?

    init(failFirstTask: UUID? = nil, delay: Duration = .milliseconds(15),
         outputOverride: (@Sendable (SwarmWorkerRequest) -> SwarmWorkerResult)? = nil) {
        self.failFirstTask = failFirstTask
        self.delay = delay
        self.outputOverride = outputOverride
    }

    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerResult {
        requests.append(request)
        active += 1
        peak = max(peak, active)
        defer { active -= 1 }
        do { try await Task.sleep(for: delay) }
        catch { cancellations += 1; throw error }
        if request.task.taskID == failFirstTask && request.attempt == 1 {
            throw SwarmExecutionError.workerFailed
        }
        if let outputOverride { return outputOverride(request) }
        return .init(summary: "Completed assigned scope", files: request.task.ownedPaths.map {
            .init(path: $0.path, bytes: Data("bytes:\(request.worker.memberID):\($0.path):\(request.attempt)".utf8))
        })
    }
}

private actor RecordingVerifier: SwarmCandidateVerifying {
    private(set) var calls = 0
    private(set) var candidates: [SwarmIntegratedCandidate] = []
    private(set) var cancellations = 0
    let failingCheck: String?
    let malformed: Bool
    let delay: Duration

    init(failingCheck: String? = nil, malformed: Bool = false, delay: Duration = .zero) {
        self.failingCheck = failingCheck
        self.malformed = malformed
        self.delay = delay
    }

    func verify(_ candidate: SwarmIntegratedCandidate, checks: [SwarmCheckSpec]) async throws -> [SwarmCheckObservation] {
        calls += 1
        candidates.append(candidate)
        do { try await Task.sleep(for: delay) }
        catch { cancellations += 1; throw error }
        if malformed { return [] }
        return checks.map { check in
            .init(checkID: check.checkID, passed: check.checkID != failingCheck,
                  boundedEvidence: Data("fixture evidence for \(check.checkID)".utf8))
        }
    }
}

@Test func leadDispatchesTwoDistinctScopedWorkersAndProducesVerifiedReceipt() async throws {
    let plan = makePlan()
    let worker = RecordingWorker()
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: worker, verifier: verifier)
    let receipt = try await session.run(approvedContext: "Approved project context", targetSnapshot: [:])

    #expect(receipt.state == .complete)
    #expect(receipt.leadMemberID == leadID)
    #expect(Set(receipt.workerMemberIDs) == Set([workerA.memberID, workerB.memberID]))
    #expect(await worker.peak == 2)
    #expect(Set(await worker.requests.map(\.worker.memberID)) == Set([workerA.memberID, workerB.memberID]))
    #expect(receipt.tasks.allSatisfy { $0.parentLeaderID == leadID && $0.state == .succeeded })
    #expect(receipt.integratedFiles.count == 2)
    #expect(receipt.checks.count == 2 && receipt.checks.allSatisfy(\.passed))
    #expect(receipt.receiptSHA256.count == 64)
    #expect(receipt.planSHA256.count == 64)
    #expect(receipt.verifyIntegrity())
    let tampered = SwarmIntegrationReceipt(schemaVersion: receipt.schemaVersion, runID: receipt.runID,
        planSHA256: receipt.planSHA256, leadMemberID: receipt.leadMemberID, workers: receipt.workers,
        tasks: receipt.tasks, integratedFiles: receipt.integratedFiles, checks: receipt.checks,
        state: .partial, receiptSHA256: receipt.receiptSHA256)
    #expect(!tampered.verifyIntegrity())
    #expect(await verifier.calls == 1)

    let encoded = String(decoding: try JSONEncoder().encode(receipt), as: UTF8.self)
    #expect(!encoded.contains("Approved project context"))
    #expect(!encoded.contains("bytes:worker"))
    #expect(!encoded.contains("fixture evidence"))
}

@Test func graphRejectsUnboundedDelegationAndOverlappingOwnershipBeforeDispatch() async throws {
    let base = makePlan()
    let overlapping = SwarmChildTask(parentLeaderID: leadID, workerMemberID: workerB.memberID,
                                     ownedPaths: [owned("styles")], brief: "Overlap a child path")
    let invalid = SwarmExecutionPlan(runID: base.runID, leadMemberID: leadID,
                                     workers: [workerA, workerB], tasks: [base.tasks[0], base.tasks[1], overlapping], checks: base.checks)
    #expect(throws: SwarmExecutionError.ownershipConflict) { try invalid.validate() }

    let deep = SwarmChildTask(parentLeaderID: leadID, workerMemberID: workerA.memberID,
                              ownedPaths: [owned("deep.txt")], brief: "Too deep", depth: 2)
    let invalidDepth = SwarmExecutionPlan(leadMemberID: leadID, workers: [workerA, workerB],
                                          tasks: [deep, base.tasks[1]], checks: base.checks)
    #expect(throws: SwarmExecutionError.invalidPlan) { try invalidDepth.validate() }

    let oneWorker = SwarmExecutionPlan(leadMemberID: leadID, workers: [workerA], tasks: base.tasks, checks: base.checks)
    #expect(throws: SwarmExecutionError.invalidPlan) { try oneWorker.validate() }
}

@Test func dependencyReceivesOnlyPeerManifestsAndNoRawPeerBytes() async throws {
    let plan = makePlan(dependent: true)
    let worker = RecordingWorker()
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: worker, verifier: verifier)
    let receipt = try await session.run(approvedContext: "bounded", targetSnapshot: [:])

    #expect(receipt.state == .complete)
    let requests = await worker.requests
    #expect(requests.count == 3)
    #expect(requests[0].dependencyManifests.isEmpty && requests[1].dependencyManifests.isEmpty)
    #expect(requests[2].dependencyManifests.count == 2)
    #expect(requests[2].dependencyManifests.values.flatMap { $0 }.allSatisfy { $0.proposedSHA256.count == 64 })
}

@Test func targetChangedAfterPlanningProducesConflictAndSkipsVerification() async throws {
    let original = Data("original".utf8)
    let plan = makePlan(existingIndex: original)
    let worker = RecordingWorker()
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: worker, verifier: verifier)
    let receipt = try await session.run(approvedContext: "", targetSnapshot: ["index.html": Data("changed".utf8)])

    #expect(receipt.state == .conflict)
    #expect(receipt.integratedFiles.isEmpty)
    #expect(receipt.checks.isEmpty)
    #expect(await verifier.calls == 0)
}

@Test func caseVariantOfExistingTargetAlsoProducesConflict() async throws {
    let plan = makePlan()
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: RecordingWorker(), verifier: verifier)
    let receipt = try await session.run(approvedContext: "", targetSnapshot: ["INDEX.html": Data("existing".utf8)])
    #expect(receipt.state == .conflict)
    #expect(await verifier.calls == 0)
}

@Test func oneFailedWorkerRetriesWithoutDiscardingOrRepeatingSuccessfulPeer() async throws {
    let plan = makePlan(dependent: true)
    let failedID = plan.tasks[0].taskID
    let worker = RecordingWorker(failFirstTask: failedID)
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: worker, verifier: verifier)
    let partial = try await session.run(approvedContext: "", targetSnapshot: [:])
    #expect(partial.state == .partial)
    #expect(partial.tasks.first(where: { $0.taskID == plan.tasks[1].taskID })?.state == .succeeded)
    #expect(await verifier.calls == 0)

    let repaired = try await session.retryFailed(taskID: failedID, repairBrief: "Repair only the assigned page")
    #expect(repaired.state == .complete)
    let requests = await worker.requests
    #expect(requests.filter { $0.task.taskID == failedID }.count == 2)
    #expect(requests.filter { $0.task.taskID == plan.tasks[1].taskID }.count == 1)
    #expect(requests.filter { $0.task.taskID == plan.tasks[2].taskID }.count == 1)
    #expect(requests.last(where: { $0.task.taskID == failedID })?.repairBrief == "Repair only the assigned page")
    await #expect(throws: SwarmExecutionError.retryUnavailable) {
        try await session.retryFailed(taskID: failedID, repairBrief: "Unbounded second repair")
    }
}

@Test func cancellationStopsOwnedWorkersPreventsDependentsAndVerification() async throws {
    let plan = makePlan(dependent: true)
    let worker = RecordingWorker(delay: .seconds(30))
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: worker, verifier: verifier)
    let run = Task { try await session.run(approvedContext: "", targetSnapshot: [:]) }

    for _ in 0..<100 {
        if await worker.requests.count == 2 { break }
        try await Task.sleep(for: .milliseconds(5))
    }
    await session.cancel()
    let receipt = try await run.value
    #expect(receipt.state == .cancelled)
    #expect(await worker.requests.count == 2)
    #expect(await worker.cancellations == 2)
    #expect(receipt.tasks.allSatisfy { $0.state == .cancelled })
    #expect(await verifier.calls == 0)
}

@Test func cancellationDuringVerificationCannotPublishCompleteReceipt() async throws {
    let plan = makePlan()
    let verifier = RecordingVerifier(delay: .seconds(30))
    let session = try SwarmExecutionSession(plan: plan, worker: RecordingWorker(), verifier: verifier)
    let run = Task { try await session.run(approvedContext: "", targetSnapshot: [:]) }
    for _ in 0..<200 {
        if await verifier.calls == 1 { break }
        try await Task.sleep(for: .milliseconds(5))
    }
    await session.cancel()
    let receipt = try await run.value
    #expect(receipt.state == .cancelled)
    #expect(receipt.checks.isEmpty)
    #expect(receipt.integratedFiles.count == 2)
    #expect(await verifier.cancellations == 1)
    #expect(receipt.verifyIntegrity())
}

@Test func unownedWorkerOutputFailsClosedWithoutIntegration() async throws {
    let plan = makePlan()
    let worker = RecordingWorker(outputOverride: { _ in
        .init(summary: "Attempted scope escape", files: [.init(path: "foreign.txt", bytes: Data("bad".utf8))])
    })
    let verifier = RecordingVerifier()
    let session = try SwarmExecutionSession(plan: plan, worker: worker, verifier: verifier)
    let receipt = try await session.run(approvedContext: "", targetSnapshot: [:])

    #expect(receipt.state == .partial)
    #expect(receipt.tasks.allSatisfy { $0.state == .failed })
    #expect(receipt.tasks.allSatisfy { $0.attempts.last?.failure == .invalidWorkerOutput })
    #expect(await verifier.calls == 0)
}

@Test func failingOrMalformedVerificationCannotProduceCompleteReceipt() async throws {
    let plan = makePlan()
    let worker = RecordingWorker()
    let failing = RecordingVerifier(failingCheck: "mobile")
    let first = try SwarmExecutionSession(plan: plan, worker: worker, verifier: failing)
    let failedCheck = try await first.run(approvedContext: "", targetSnapshot: [:])
    #expect(failedCheck.state == .partial)
    #expect(failedCheck.checks.count == 2)
    #expect(failedCheck.checks.first(where: { $0.checkID == "mobile" })?.passed == false)

    let malformed = RecordingVerifier(malformed: true)
    let second = try SwarmExecutionSession(plan: makePlan(), worker: RecordingWorker(), verifier: malformed)
    let malformedReceipt = try await second.run(approvedContext: "", targetSnapshot: [:])
    #expect(malformedReceipt.state == .partial)
    #expect(malformedReceipt.checks.isEmpty)
}

@Test func receiptTypedEncodingRejectsColonBoundaryMutation() async throws {
    let base = makePlan()
    let special = SwarmWorkerIdentity(memberID: workerA.memberID, providerID: "openai:codex",
                                      adapterID: "cli", requestedModelID: "fixture-a", requestedEffort: "high")
    let plan = SwarmExecutionPlan(runID: base.runID, leadMemberID: base.leadMemberID,
                                  workers: [special, workerB], tasks: base.tasks, checks: base.checks)
    let session = try SwarmExecutionSession(plan: plan, worker: RecordingWorker(), verifier: RecordingVerifier())
    let receipt = try await session.run(approvedContext: "", targetSnapshot: [:])
    var object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(receipt)) as! [String: Any]
    var workers = object["workers"] as! [[String: Any]]
    workers[0]["providerID"] = "openai"
    workers[0]["adapterID"] = "codex:cli"
    object["workers"] = workers
    let tampered = try JSONDecoder().decode(SwarmIntegrationReceipt.self,
        from: JSONSerialization.data(withJSONObject: object))
    #expect(tampered.workers != receipt.workers)
    #expect(tampered.receiptSHA256 == receipt.receiptSHA256)
    #expect(!tampered.verifyIntegrity())
}

@Test func receiptTypedEncodingDistinguishesNilFromLiteralDefault() async throws {
    let session = try SwarmExecutionSession(plan: makePlan(), worker: RecordingWorker(), verifier: RecordingVerifier())
    let receipt = try await session.run(approvedContext: "", targetSnapshot: [:])
    var object = try JSONSerialization.jsonObject(with: JSONEncoder().encode(receipt)) as! [String: Any]
    var workers = object["workers"] as! [[String: Any]]
    workers[1]["requestedEffort"] = "default"
    object["workers"] = workers
    let tampered = try JSONDecoder().decode(SwarmIntegrationReceipt.self,
        from: JSONSerialization.data(withJSONObject: object))
    #expect(tampered.workers != receipt.workers)
    #expect(!tampered.verifyIntegrity())
}

@Test func targetAncestorDescendantAndUnicodeEquivalentPathsConflictBeforeVerification() async throws {
    let ancestorVerifier = RecordingVerifier()
    let ancestor = try SwarmExecutionSession(plan: makePlan(), worker: RecordingWorker(), verifier: ancestorVerifier)
    let ancestorReceipt = try await ancestor.run(approvedContext: "", targetSnapshot: [
        "STYLES": Data("existing file blocks styles/site.css".utf8)
    ])
    #expect(ancestorReceipt.state == .conflict)
    #expect(await ancestorVerifier.calls == 0)

    let descendantVerifier = RecordingVerifier()
    let descendant = try SwarmExecutionSession(plan: makePlan(), worker: RecordingWorker(), verifier: descendantVerifier)
    let descendantReceipt = try await descendant.run(approvedContext: "", targetSnapshot: [
        "INDEX.HTML/child": Data("existing descendant blocks index.html".utf8)
    ])
    #expect(descendantReceipt.state == .conflict)
    #expect(await descendantVerifier.calls == 0)

    let base = makePlan()
    let unicodeTasks = [
        SwarmChildTask(parentLeaderID: leadID, workerMemberID: workerA.memberID,
                       ownedPaths: [owned("café/site.css")], brief: "Build styles"),
        SwarmChildTask(parentLeaderID: leadID, workerMemberID: workerB.memberID,
                       ownedPaths: [owned("index.html")], brief: "Build structure")
    ]
    let unicodePlan = SwarmExecutionPlan(leadMemberID: leadID, workers: [workerA, workerB],
                                         tasks: unicodeTasks, checks: base.checks)
    let unicodeVerifier = RecordingVerifier()
    let unicode = try SwarmExecutionSession(plan: unicodePlan, worker: RecordingWorker(), verifier: unicodeVerifier)
    let unicodeReceipt = try await unicode.run(approvedContext: "", targetSnapshot: [
        "CAFE\u{301}": Data("normalized ancestor".utf8)
    ])
    #expect(unicodeReceipt.state == .conflict)
    #expect(await unicodeVerifier.calls == 0)
}

@Test func cancellingPublicRunTaskCancelsActiveVerifier() async throws {
    let verifier = RecordingVerifier(delay: .seconds(30))
    let session = try SwarmExecutionSession(plan: makePlan(), worker: RecordingWorker(), verifier: verifier)
    let run = Task { try await session.run(approvedContext: "", targetSnapshot: [:]) }
    for _ in 0..<200 {
        if await verifier.calls == 1 { break }
        try await Task.sleep(for: .milliseconds(5))
    }
    #expect(await verifier.calls == 1)
    run.cancel()
    let receipt = try await run.value
    #expect(receipt.state == .cancelled)
    #expect(await verifier.cancellations == 1)
    #expect(receipt.checks.isEmpty)
}
