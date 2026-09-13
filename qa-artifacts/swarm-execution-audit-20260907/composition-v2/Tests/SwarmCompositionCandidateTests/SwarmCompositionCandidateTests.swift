import Foundation
import Testing
@testable import SwarmCompositionCandidate
import SwarmExecutionCandidate
import SwarmFilesystemAdapter

private struct Worker: SwarmWorkerExecuting {
    let failMember: String?
    let delay: Bool
    init(failMember: String? = nil, delay: Bool = false) { self.failMember = failMember; self.delay = delay }
    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerResult {
        if delay { try await Task.sleep(for: .seconds(10)) }
        if request.worker.memberID == failMember { throw SwarmExecutionError.workerFailed }
        return .init(summary: "done", files: request.task.ownedPaths.map {
            .init(path: $0.path, bytes: Data("new-\($0.path)".utf8))
        })
    }
}

private actor CountingDelayedWorker: SwarmWorkerExecuting {
    private var calls = 0
    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerResult {
        calls += 1
        try await Task.sleep(for: .milliseconds(150))
        return .init(summary: "done", files: request.task.ownedPaths.map {
            .init(path: $0.path, bytes: Data("new-\($0.path)".utf8))
        })
    }
    func callCount() -> Int { calls }
}

private struct Verifier: SwarmCandidateVerifying {
    let mutate: (@Sendable () throws -> Void)?
    init(mutate: (@Sendable () throws -> Void)? = nil) { self.mutate = mutate }
    func verify(_ candidate: SwarmIntegratedCandidate, checks: [SwarmCheckSpec]) async throws -> [SwarmCheckObservation] {
        try mutate?()
        return checks.map { .init(checkID: $0.checkID, passed: true, boundedEvidence: Data("pass".utf8)) }
    }
}

private struct LaterEditFault: SwarmFilesystemFaultInjecting {
    let project: URL
    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .afterFile(index: 0, path: "a.txt") {
            try Data("user-edit".utf8).write(to: project.appendingPathComponent("a.txt"), options: .atomic)
            throw SwarmFilesystemError.applyFailed
        }
    }
}

private struct SlowApplyFault: SwarmFilesystemFaultInjecting {
    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .beforeFile(index: 0, path: "a.txt") { Thread.sleep(forTimeInterval: 0.2) }
    }
}

private struct Fixture {
    let root: URL
    let project: URL
    let staging: URL
    init() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("rivune-compose-\(UUID().uuidString)")
        project = root.appendingPathComponent("project")
        staging = root.appendingPathComponent("staging")
        try FileManager.default.createDirectory(at: project, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: staging, withIntermediateDirectories: true)
        try Data("old-a".utf8).write(to: project.appendingPathComponent("a.txt"))
    }
    func cleanup() { try? FileManager.default.removeItem(at: root) }
}

private func makePlan() -> SwarmExecutionPlan {
    let a = SwarmChildTask(parentLeaderID: "lead", workerMemberID: "one",
                           ownedPaths: [.init(path: "a.txt", expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("old-a".utf8)))], brief: "write a")
    let b = SwarmChildTask(parentLeaderID: "lead", workerMemberID: "two",
                           ownedPaths: [.init(path: "b.txt", expectedBaseSHA256: nil)], brief: "write b")
    return .init(leadMemberID: "lead",
                 workers: [.init(memberID: "one", providerID: "p1", adapterID: "cli"),
                           .init(memberID: "two", providerID: "p2", adapterID: "cli")],
                 tasks: [a, b], checks: [.init(checkID: "review", description: "review")])
}

@Test func completeExecutionStagesExactArtifactsThenApplies() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(), verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)])
    let staged = await session.execute(approvedContext: "approved")
    #expect(staged.state == .staged)
    #expect(staged.finalArtifacts.map(\.path) == ["a.txt", "b.txt"])
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("a.txt")), as: UTF8.self) == "old-a")
    let applied = try await session.apply()
    #expect(applied.state == .complete)
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("a.txt")), as: UTF8.self) == "new-a.txt")
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("b.txt")), as: UTF8.self) == "new-b.txt")
}

@Test func failedExecutionNeverStagesOrClaimsSuccess() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(failMember: "one"), verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)])
    let result = await session.execute(approvedContext: "approved")
    #expect(result.state == .failed)
    #expect(result.filesystem == nil)
    #expect(result.finalArtifacts.isEmpty)
    await #expect(throws: SwarmCompositionError.invalidState) { try await session.apply() }
}

@Test func cancellationPropagatesWithoutStaging() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(delay: true), verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)])
    let task = Task { await session.execute(approvedContext: "approved") }
    try await Task.sleep(for: .milliseconds(50))
    task.cancel()
    let result = await task.value
    #expect(result.state == .cancelled)
    #expect(result.filesystem == nil)
    #expect(result.finalArtifacts.isEmpty)
}

@Test func projectMutationAfterReviewBlocksStaging() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let verifier = Verifier(mutate: {
        try Data("changed-after-review".utf8).write(to: fixture.project.appendingPathComponent("a.txt"), options: .atomic)
    })
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(), verifier: verifier,
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)])
    let result = await session.execute(approvedContext: "approved")
    #expect(result.state == .failed)
    #expect(result.filesystem == nil)
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("a.txt")), as: UTF8.self) == "changed-after-review")
}

@Test func recoveryRequiredPropagatesAndBlocksAutomaticRetry() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(), verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)],
        filesystemFaults: LaterEditFault(project: fixture.project))
    #expect(await session.execute(approvedContext: "approved").state == .staged)
    let result = try await session.apply()
    #expect(result.state == .recoveryRequired)
    #expect(result.userFacingStatus.contains("automatic retry is blocked"))
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("a.txt")), as: UTF8.self) == "user-edit")
    await #expect(throws: SwarmCompositionError.invalidState) { try await session.apply() }
}

@Test func duplicateExecuteDispatchesOneTeamAndRejectsConflictingContext() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let worker = CountingDelayedWorker()
    let session = SwarmCompositionSession(plan: makePlan(), worker: worker, verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)])
    let first = Task { await session.execute(approvedContext: "frozen-context") }
    try await Task.sleep(for: .milliseconds(30))
    let duplicate = await session.execute(approvedContext: "frozen-context")
    let conflicting = await session.execute(approvedContext: "different-context")
    #expect(duplicate.state == .running)
    #expect(conflicting.state == .busy)
    #expect(await first.value.state == .staged)
    #expect(await worker.callCount() == 2)
}

@Test func alreadyCancelledApplyDoesNotWriteAndLeavesStageUsable() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(), verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)])
    #expect(await session.execute(approvedContext: "approved").state == .staged)
    let attempt = Task {
        withUnsafeCurrentTask { $0?.cancel() }
        return try await session.apply()
    }
    let rejected = try await attempt.value
    #expect(rejected.state == .cancelled)
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("a.txt")), as: UTF8.self) == "old-a")
    #expect(try await session.apply().state == .complete)
}

@Test func overlappingApplyObservesOneReservedOperation() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = SwarmCompositionSession(plan: makePlan(), worker: Worker(), verifier: Verifier(),
        projectRoot: fixture.project, stagingParent: fixture.staging, targetSnapshot: ["a.txt": Data("old-a".utf8)],
        filesystemFaults: SlowApplyFault())
    #expect(await session.execute(approvedContext: "approved").state == .staged)
    let first = Task { try await session.apply() }
    try await Task.sleep(for: .milliseconds(30))
    let overlapping = try await session.apply()
    #expect(overlapping.state == .applying)
    #expect(try await first.value.state == .complete)
    #expect(String(decoding: try Data(contentsOf: fixture.project.appendingPathComponent("a.txt")), as: UTF8.self) == "new-a.txt")
}
