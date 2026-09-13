import Foundation
import CryptoKit

public enum SwarmExecutionError: String, Error, Codable, Sendable {
    case invalidPlan
    case ownershipConflict
    case invalidWorkerOutput
    case unsupportedWorker
    case workerFailed
    case cancelled
    case busy
    case retryUnavailable
    case integrationConflict
    case invalidVerification
}

public struct SwarmWorkerIdentity: Codable, Hashable, Sendable {
    public let memberID: String
    public let providerID: String
    public let adapterID: String
    public let requestedModelID: String?
    public let requestedEffort: String?

    public init(memberID: String, providerID: String, adapterID: String,
                requestedModelID: String? = nil, requestedEffort: String? = nil) {
        self.memberID = memberID
        self.providerID = providerID
        self.adapterID = adapterID
        self.requestedModelID = requestedModelID
        self.requestedEffort = requestedEffort
    }

    fileprivate func validate() throws {
        let required = [memberID, providerID, adapterID]
        guard required.allSatisfy({ !$0.isEmpty && $0.utf8.count <= 128 && !$0.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains) }),
              [requestedModelID, requestedEffort].allSatisfy({ value in
                  value == nil || (!value!.isEmpty && value!.utf8.count <= 256 && !value!.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains))
              }) else { throw SwarmExecutionError.invalidPlan }
    }
}

public struct SwarmOwnedPath: Codable, Hashable, Sendable {
    public let path: String
    /// Nil means the path must not exist in the target snapshot.
    public let expectedBaseSHA256: String?

    public init(path: String, expectedBaseSHA256: String?) {
        self.path = path
        self.expectedBaseSHA256 = expectedBaseSHA256
    }
}

public struct SwarmChildTask: Codable, Hashable, Sendable {
    public let taskID: UUID
    public let parentLeaderID: String
    public let workerMemberID: String
    public let dependencies: [UUID]
    public let ownedPaths: [SwarmOwnedPath]
    public let brief: String
    public let depth: Int

    public init(taskID: UUID = UUID(), parentLeaderID: String, workerMemberID: String,
                dependencies: [UUID] = [], ownedPaths: [SwarmOwnedPath], brief: String,
                depth: Int = 1) {
        self.taskID = taskID
        self.parentLeaderID = parentLeaderID
        self.workerMemberID = workerMemberID
        self.dependencies = dependencies
        self.ownedPaths = ownedPaths
        self.brief = brief
        self.depth = depth
    }
}

public struct SwarmCheckSpec: Codable, Hashable, Sendable {
    public let checkID: String
    public let description: String

    public init(checkID: String, description: String) {
        self.checkID = checkID
        self.description = description
    }
}

public struct SwarmExecutionPlan: Codable, Hashable, Sendable {
    public let schemaVersion: Int
    public let runID: UUID
    public let leadMemberID: String
    public let workers: [SwarmWorkerIdentity]
    public let tasks: [SwarmChildTask]
    public let checks: [SwarmCheckSpec]

    public init(schemaVersion: Int = 1, runID: UUID = UUID(), leadMemberID: String,
                workers: [SwarmWorkerIdentity], tasks: [SwarmChildTask], checks: [SwarmCheckSpec]) {
        self.schemaVersion = schemaVersion
        self.runID = runID
        self.leadMemberID = leadMemberID
        self.workers = workers
        self.tasks = tasks
        self.checks = checks
    }

    public func validate() throws {
        guard schemaVersion == 1, !leadMemberID.isEmpty, leadMemberID.utf8.count <= 128,
              workers.count == 2, Set(workers.map(\.memberID)).count == 2,
              !workers.contains(where: { $0.memberID == leadMemberID }),
              (2...6).contains(tasks.count), Set(tasks.map(\.taskID)).count == tasks.count,
              (1...8).contains(checks.count), Set(checks.map(\.checkID)).count == checks.count
        else { throw SwarmExecutionError.invalidPlan }

        try workers.forEach { try $0.validate() }
        let workerIDs = Set(workers.map(\.memberID))
        guard workerIDs.allSatisfy({ id in tasks.contains(where: { $0.workerMemberID == id }) }),
              checks.allSatisfy({ !$0.checkID.isEmpty && $0.checkID.utf8.count <= 128 &&
                  !$0.description.isEmpty && $0.description.utf8.count <= 2_048 })
        else { throw SwarmExecutionError.invalidPlan }

        let taskIDs = Set(tasks.map(\.taskID))
        var ownershipKeys: [String] = []
        for task in tasks {
            guard task.depth == 1, task.parentLeaderID == leadMemberID,
                  workerIDs.contains(task.workerMemberID),
                  !task.brief.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  task.brief.utf8.count <= 16_384,
                  (1...32).contains(task.ownedPaths.count),
                  Set(task.dependencies).count == task.dependencies.count,
                  !task.dependencies.contains(task.taskID),
                  Set(task.dependencies).isSubset(of: taskIDs)
            else { throw SwarmExecutionError.invalidPlan }

            for owned in task.ownedPaths {
                try Self.validateRelativePath(owned.path)
                if let digest = owned.expectedBaseSHA256 { try Self.validateDigest(digest) }
                let key = Self.ownershipKey(owned.path)
                guard !ownershipKeys.contains(where: { $0 == key || $0.hasPrefix(key + "/") || key.hasPrefix($0 + "/") })
                else { throw SwarmExecutionError.ownershipConflict }
                ownershipKeys.append(key)
            }
        }

        var visited: Set<UUID> = []
        while visited.count < tasks.count {
            let next = tasks.filter { !visited.contains($0.taskID) && Set($0.dependencies).isSubset(of: visited) }
            guard !next.isEmpty else { throw SwarmExecutionError.invalidPlan }
            visited.formUnion(next.map(\.taskID))
        }
    }

    fileprivate static func ownershipKey(_ path: String) -> String {
        path.precomposedStringWithCanonicalMapping.lowercased()
    }

    fileprivate static func validateRelativePath(_ path: String) throws {
        let parts = path.split(separator: "/", omittingEmptySubsequences: false)
        guard !path.isEmpty, path.utf8.count <= 512, !path.contains("\\"), !path.contains(":"),
              !path.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains),
              parts.allSatisfy({ !$0.isEmpty && $0 != "." && $0 != ".." && !$0.hasPrefix(".") && !$0.hasSuffix(" ") && !$0.hasSuffix(".") })
        else { throw SwarmExecutionError.invalidPlan }
    }

    fileprivate static func validateDigest(_ value: String) throws {
        guard value.count == 64, value.unicodeScalars.allSatisfy({ scalar in
            ("0"..."9").contains(Character(scalar)) || ("a"..."f").contains(Character(scalar))
        }) else { throw SwarmExecutionError.invalidPlan }
    }
}

public struct SwarmWorkerRequest: Sendable {
    public let runID: UUID
    public let task: SwarmChildTask
    public let worker: SwarmWorkerIdentity
    public let attempt: Int
    public let approvedContext: String
    public let dependencyManifests: [UUID: [SwarmFileManifest]]
    public let repairBrief: String?
}

public struct SwarmProposedFile: Equatable, Sendable {
    public let path: String
    public let bytes: Data

    public init(path: String, bytes: Data) {
        self.path = path
        self.bytes = bytes
    }
}

public struct SwarmWorkerResult: Equatable, Sendable {
    public let summary: String
    public let files: [SwarmProposedFile]

    public init(summary: String, files: [SwarmProposedFile]) {
        self.summary = summary
        self.files = files
    }
}

public protocol SwarmWorkerExecuting: Sendable {
    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerResult
}

public struct SwarmIntegratedCandidate: Sendable {
    public let runID: UUID
    public let files: [String: Data]
}

public struct SwarmCheckObservation: Equatable, Sendable {
    public let checkID: String
    public let passed: Bool
    public let boundedEvidence: Data

    public init(checkID: String, passed: Bool, boundedEvidence: Data) {
        self.checkID = checkID
        self.passed = passed
        self.boundedEvidence = boundedEvidence
    }
}

public protocol SwarmCandidateVerifying: Sendable {
    func verify(_ candidate: SwarmIntegratedCandidate, checks: [SwarmCheckSpec]) async throws -> [SwarmCheckObservation]
}

public struct SwarmFileManifest: Codable, Hashable, Sendable {
    public let path: String
    public let baseSHA256: String?
    public let proposedSHA256: String
    public let byteCount: Int
}

public enum SwarmTaskState: String, Codable, Sendable {
    case pending, running, succeeded, failed, blocked, cancelled
}

public struct SwarmAttemptReceipt: Codable, Hashable, Sendable {
    public let attemptID: UUID
    public let attempt: Int
    public let state: SwarmTaskState
    public let outputManifest: [SwarmFileManifest]
    public let failure: SwarmExecutionError?
}

public struct SwarmTaskReceipt: Codable, Hashable, Sendable {
    public let taskID: UUID
    public let parentLeaderID: String
    public let workerMemberID: String
    public let attempts: [SwarmAttemptReceipt]
    public let state: SwarmTaskState
}

public struct SwarmCheckReceipt: Codable, Hashable, Sendable {
    public let checkID: String
    public let passed: Bool
    public let evidenceSHA256: String
}

public enum SwarmRunState: String, Codable, Sendable {
    case complete, partial, conflict, cancelled
}

public struct SwarmIntegrationReceipt: Codable, Hashable, Sendable {
    public let schemaVersion: Int
    public let runID: UUID
    public let planSHA256: String
    public let leadMemberID: String
    public let workers: [SwarmWorkerIdentity]
    public let tasks: [SwarmTaskReceipt]
    public let integratedFiles: [SwarmFileManifest]
    public let checks: [SwarmCheckReceipt]
    public let state: SwarmRunState
    public let receiptSHA256: String

    public var workerMemberIDs: [String] { workers.map(\.memberID) }

    public func verifyIntegrity() -> Bool {
        guard schemaVersion == 1,
              (try? SwarmExecutionPlan.validateDigest(planSHA256)) != nil,
              (try? SwarmExecutionPlan.validateDigest(receiptSHA256)) != nil
        else { return false }
        return receiptSHA256 == sha256(Data(canonicalReceiptPayload(
            runID: runID, planSHA256: planSHA256, lead: leadMemberID, workers: workers,
            tasks: tasks, integrated: integratedFiles, checks: checks, state: state
        ).utf8))
    }
}

private struct MutableTaskReceipt: Sendable {
    let task: SwarmChildTask
    var state: SwarmTaskState = .pending
    var attempts: [SwarmAttemptReceipt] = []
    var output: SwarmWorkerResult?
}

public actor SwarmExecutionSession {
    private let plan: SwarmExecutionPlan
    private let worker: any SwarmWorkerExecuting
    private let verifier: any SwarmCandidateVerifying
    private var receipts: [UUID: MutableTaskReceipt]
    private var handles: [UUID: Task<SwarmWorkerResult, Error>] = [:]
    private var verificationHandle: Task<[SwarmCheckObservation], Error>?
    private var cancelled = false
    private var executing = false
    private var approvedContext = ""
    private var targetByOwnershipKey: [String: Data] = [:]

    public init(plan: SwarmExecutionPlan, worker: any SwarmWorkerExecuting,
                verifier: any SwarmCandidateVerifying) throws {
        try plan.validate()
        self.plan = plan
        self.worker = worker
        self.verifier = verifier
        self.receipts = Dictionary(uniqueKeysWithValues: plan.tasks.map { ($0.taskID, MutableTaskReceipt(task: $0)) })
    }

    public func run(approvedContext: String, targetSnapshot: [String: Data]) async throws -> SwarmIntegrationReceipt {
        guard !executing, receipts.values.allSatisfy({ $0.attempts.isEmpty }) else { throw SwarmExecutionError.busy }
        guard approvedContext.utf8.count <= 65_536,
              targetSnapshot.keys.allSatisfy({ (try? SwarmExecutionPlan.validateRelativePath($0)) != nil }),
              Set(targetSnapshot.keys.map(SwarmExecutionPlan.ownershipKey)).count == targetSnapshot.count,
              targetSnapshot.values.reduce(0, { $0 + $1.count }) <= 4_194_304
        else { throw SwarmExecutionError.invalidPlan }
        self.approvedContext = approvedContext
        self.targetByOwnershipKey = Dictionary(uniqueKeysWithValues: targetSnapshot.map {
            (SwarmExecutionPlan.ownershipKey($0.key), $0.value)
        })
        return await schedule(repair: [:])
    }

    public func retryFailed(taskID: UUID, repairBrief: String) async throws -> SwarmIntegrationReceipt {
        guard !executing, !cancelled, var receipt = receipts[taskID], receipt.state == .failed,
              receipt.attempts.count == 1, !repairBrief.isEmpty, repairBrief.utf8.count <= 8_192,
              !plan.tasks.contains(where: { $0.dependencies.contains(taskID) && !(receipts[$0.taskID]?.attempts.isEmpty ?? true) })
        else { throw SwarmExecutionError.retryUnavailable }
        receipt.state = .pending
        receipts[taskID] = receipt
        for id in receipts.keys where receipts[id]?.state == .blocked { receipts[id]?.state = .pending }
        return await schedule(repair: [taskID: repairBrief])
    }

    public func cancel() {
        cancelled = true
        for handle in handles.values { handle.cancel() }
        verificationHandle?.cancel()
    }

    private func schedule(repair: [UUID: String]) async -> SwarmIntegrationReceipt {
        executing = true
        defer { executing = false }
        await withTaskCancellationHandler {
            while !cancelled && !Task.isCancelled {
                let ready = plan.tasks.filter { task in
                    receipts[task.taskID]?.state == .pending && task.dependencies.allSatisfy { receipts[$0]?.state == .succeeded }
                }.prefix(2)
                if ready.isEmpty { break }

                for task in ready {
                    guard !cancelled && !Task.isCancelled,
                          let identity = plan.workers.first(where: { $0.memberID == task.workerMemberID })
                    else { break }
                    receipts[task.taskID]?.state = .running
                    let dependencyManifests = Dictionary(uniqueKeysWithValues: task.dependencies.compactMap { id in
                        receipts[id]?.attempts.last.map { (id, $0.outputManifest) }
                    })
                    let request = SwarmWorkerRequest(runID: plan.runID, task: task, worker: identity,
                        attempt: (receipts[task.taskID]?.attempts.count ?? 0) + 1,
                        approvedContext: approvedContext, dependencyManifests: dependencyManifests,
                        repairBrief: repair[task.taskID])
                    let adapter = worker
                    handles[task.taskID] = Task {
                        try Task.checkCancellation()
                        return try await adapter.execute(request)
                    }
                }

                for task in ready {
                    guard let handle = handles[task.taskID] else { continue }
                    let attemptNumber = (receipts[task.taskID]?.attempts.count ?? 0) + 1
                    let attemptID = UUID()
                    do {
                        let output = try await handle.value
                        let manifest = try Self.validate(output: output, for: task)
                        if cancelled || Task.isCancelled {
                            cancelled = true
                            receipts[task.taskID]?.state = .cancelled
                            receipts[task.taskID]?.attempts.append(.init(attemptID: attemptID, attempt: attemptNumber,
                                state: .cancelled, outputManifest: [], failure: .cancelled))
                        } else {
                            receipts[task.taskID]?.state = .succeeded
                            receipts[task.taskID]?.output = output
                            receipts[task.taskID]?.attempts.append(.init(attemptID: attemptID, attempt: attemptNumber,
                                state: .succeeded, outputManifest: manifest, failure: nil))
                        }
                    } catch {
                        let wasCancelled = cancelled || Task.isCancelled || error is CancellationError
                        if wasCancelled { cancelled = true }
                        let failure = wasCancelled ? SwarmExecutionError.cancelled : (error as? SwarmExecutionError ?? .workerFailed)
                        receipts[task.taskID]?.state = wasCancelled ? .cancelled : .failed
                        receipts[task.taskID]?.attempts.append(.init(attemptID: attemptID, attempt: attemptNumber,
                            state: wasCancelled ? .cancelled : .failed, outputManifest: [], failure: failure))
                    }
                    handles[task.taskID] = nil
                }
            }
        } onCancel: { Task { await self.cancel() } }

        if Task.isCancelled { cancelled = true }
        for id in receipts.keys where receipts[id]?.state == .pending || receipts[id]?.state == .running {
            receipts[id]?.state = cancelled ? .cancelled : .blocked
        }
        return await integrateIfPossible()
    }

    private static func validate(output: SwarmWorkerResult, for task: SwarmChildTask) throws -> [SwarmFileManifest] {
        guard !output.summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              output.summary.utf8.count <= 8_192,
              output.files.count == task.ownedPaths.count,
              Set(output.files.map(\.path)) == Set(task.ownedPaths.map(\.path)),
              output.files.reduce(0, { $0 + $1.bytes.count }) <= 262_144
        else { throw SwarmExecutionError.invalidWorkerOutput }
        let scope = Dictionary(uniqueKeysWithValues: task.ownedPaths.map { ($0.path, $0.expectedBaseSHA256) })
        return try output.files.map { file in
            try SwarmExecutionPlan.validateRelativePath(file.path)
            guard let expected = scope[file.path] else { throw SwarmExecutionError.invalidWorkerOutput }
            return .init(path: file.path, baseSHA256: expected,
                proposedSHA256: sha256(file.bytes), byteCount: file.bytes.count)
        }.sorted { $0.path < $1.path }
    }

    private func integrateIfPossible() async -> SwarmIntegrationReceipt {
        if cancelled { return makeReceipt(state: .cancelled, integrated: [], checks: []) }
        guard receipts.values.allSatisfy({ $0.state == .succeeded }) else {
            return makeReceipt(state: .partial, integrated: [], checks: [])
        }

        var staged: [String: Data] = [:]
        var manifests: [SwarmFileManifest] = []
        for task in plan.tasks {
            guard let output = receipts[task.taskID]?.output,
                  let latest = receipts[task.taskID]?.attempts.last else {
                return makeReceipt(state: .partial, integrated: [], checks: [])
            }
            for file in output.files {
                let expected = task.ownedPaths.first(where: { $0.path == file.path })!.expectedBaseSHA256
                let actual = targetByOwnershipKey[SwarmExecutionPlan.ownershipKey(file.path)].map(sha256)
                guard actual == expected, staged[file.path] == nil else {
                    return makeReceipt(state: .conflict, integrated: [], checks: [])
                }
                staged[file.path] = file.bytes
            }
            manifests.append(contentsOf: latest.outputManifest)
        }

        let observations: [SwarmCheckObservation]
        do {
            let verifier = verifier
            let candidate = SwarmIntegratedCandidate(runID: plan.runID, files: staged)
            let checks = plan.checks
            let handle = Task {
                try Task.checkCancellation()
                return try await verifier.verify(candidate, checks: checks)
            }
            verificationHandle = handle
            observations = try await handle.value
            verificationHandle = nil
            guard !cancelled && !Task.isCancelled else {
                return makeReceipt(state: .cancelled, integrated: manifests.sorted { $0.path < $1.path }, checks: [])
            }
            guard observations.count == plan.checks.count,
                  Set(observations.map(\.checkID)) == Set(plan.checks.map(\.checkID)),
                  observations.allSatisfy({ $0.boundedEvidence.count <= 16_384 })
            else { return makeReceipt(state: .partial, integrated: manifests, checks: []) }
        } catch {
            verificationHandle = nil
            if cancelled || Task.isCancelled || error is CancellationError {
                return makeReceipt(state: .cancelled, integrated: manifests.sorted { $0.path < $1.path }, checks: [])
            }
            return makeReceipt(state: .partial, integrated: manifests, checks: [])
        }
        let checkReceipts = observations.map {
            SwarmCheckReceipt(checkID: $0.checkID, passed: $0.passed, evidenceSHA256: sha256($0.boundedEvidence))
        }.sorted { $0.checkID < $1.checkID }
        return makeReceipt(state: checkReceipts.allSatisfy(\.passed) ? .complete : .partial,
                           integrated: manifests.sorted { $0.path < $1.path }, checks: checkReceipts)
    }

    private func makeReceipt(state: SwarmRunState, integrated: [SwarmFileManifest],
                             checks: [SwarmCheckReceipt]) -> SwarmIntegrationReceipt {
        let taskReceipts = plan.tasks.map { task -> SwarmTaskReceipt in
            let item = receipts[task.taskID]!
            return .init(taskID: task.taskID, parentLeaderID: task.parentLeaderID,
                         workerMemberID: task.workerMemberID, attempts: item.attempts, state: item.state)
        }
        let planDigest = encodedSHA256(plan)
        let boundPayload = canonicalReceiptPayload(runID: plan.runID, planSHA256: planDigest,
            lead: plan.leadMemberID, workers: plan.workers, tasks: taskReceipts,
            integrated: integrated, checks: checks, state: state)
        return .init(schemaVersion: 1, runID: plan.runID, planSHA256: planDigest,
                     leadMemberID: plan.leadMemberID, workers: plan.workers, tasks: taskReceipts,
                     integratedFiles: integrated, checks: checks, state: state,
                     receiptSHA256: sha256(Data(boundPayload.utf8)))
    }

}

private func canonicalReceiptPayload(runID: UUID, planSHA256: String, lead: String,
                                     workers: [SwarmWorkerIdentity], tasks: [SwarmTaskReceipt],
                                     integrated: [SwarmFileManifest], checks: [SwarmCheckReceipt],
                                     state: SwarmRunState) -> String {
        var fields = ["v1", runID.uuidString.lowercased(), planSHA256, lead, state.rawValue]
        for worker in workers.sorted(by: { $0.memberID < $1.memberID }) {
            fields.append(["worker", worker.memberID, worker.providerID, worker.adapterID,
                           worker.requestedModelID ?? "default", worker.requestedEffort ?? "default"].joined(separator: ":"))
        }
        for task in tasks.sorted(by: { $0.taskID.uuidString < $1.taskID.uuidString }) {
            fields.append([task.taskID.uuidString.lowercased(), task.parentLeaderID, task.workerMemberID,
                           task.state.rawValue, String(task.attempts.count)].joined(separator: ":"))
            for attempt in task.attempts {
                fields.append([attempt.attemptID.uuidString.lowercased(), String(attempt.attempt), attempt.state.rawValue,
                               attempt.failure?.rawValue ?? ""].joined(separator: ":"))
                for file in attempt.outputManifest.sorted(by: { $0.path < $1.path }) {
                    fields.append([file.path, file.baseSHA256 ?? "new", file.proposedSHA256, String(file.byteCount)].joined(separator: ":"))
                }
            }
        }
        for file in integrated.sorted(by: { $0.path < $1.path }) {
            fields.append(["integrated", file.path, file.baseSHA256 ?? "new", file.proposedSHA256, String(file.byteCount)].joined(separator: ":"))
        }
        for check in checks.sorted(by: { $0.checkID < $1.checkID }) {
            fields.append(["check", check.checkID, String(check.passed), check.evidenceSHA256].joined(separator: ":"))
        }
        return fields.joined(separator: "\n")
}

public func sha256(_ data: Data) -> String {
    SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
}

private func encodedSHA256<T: Encodable>(_ value: T) -> String {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
    return sha256((try? encoder.encode(value)) ?? Data())
}
