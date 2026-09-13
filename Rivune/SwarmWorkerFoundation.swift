import Foundation
import CryptoKit

// Independent of Council/UI types. Workers return staged bytes, never permission
// to execute a shell command or mutate the user's project.
struct SwarmWorkerTask: Codable, Equatable, Sendable {
    let id: UUID
    let parentLeaderID: String
    let providerID: String
    let adapterID: String
    let modelID: String?
    let dependencies: [UUID]
    let ownedPaths: [String]
    let brief: String
    var depth = 1
    // Optional for decoding historical tasks. Nil means provider default.
    var requestedEffort: String? = nil
}

struct SwarmTaskGraph: Codable, Sendable {
    let runID: UUID
    let tasks: [SwarmWorkerTask]

    func validate() throws {
        guard (1...6).contains(tasks.count), Set(tasks.map(\.id)).count == tasks.count else { throw SwarmFailure.invalidGraph }
        let ids = Set(tasks.map(\.id))
        var owners: [String] = []
        for task in tasks {
            guard task.depth == 1, !task.parentLeaderID.isEmpty, !task.providerID.isEmpty,
                  !task.adapterID.isEmpty, !task.brief.isEmpty, task.brief.utf8.count <= 16_384,
                  task.parentLeaderID.utf8.count <= 256, task.providerID.utf8.count <= 256,
                  task.adapterID.utf8.count <= 256, (task.modelID?.utf8.count ?? 0) <= 256,
                  (task.requestedEffort?.utf8.count ?? 0) <= 64,
                  (1...32).contains(task.ownedPaths.count),
                  Set(task.dependencies).count == task.dependencies.count,
                  !task.dependencies.contains(task.id), Set(task.dependencies).isSubset(of: ids)
            else { throw SwarmFailure.invalidGraph }
            for path in task.ownedPaths {
                try SwarmWorkerOutput.validatePath(path)
                let key = path.precomposedStringWithCanonicalMapping.lowercased()
                guard !owners.contains(where: { $0 == key || $0.hasPrefix(key + "/") || key.hasPrefix($0 + "/") })
                else { throw SwarmFailure.ownershipConflict }
                owners.append(key)
            }
        }
        var visited: Set<UUID> = []
        while visited.count < tasks.count {
            let next = tasks.filter { !visited.contains($0.id) && Set($0.dependencies).isSubset(of: visited) }
            guard !next.isEmpty else { throw SwarmFailure.invalidGraph }
            visited.formUnion(next.map(\.id))
        }
    }
}

enum SwarmFailure: String, Error, Codable, Sendable {
    case invalidGraph, ownershipConflict, invalidOutput, budgetExceeded
    case unsupportedAdapter, unsupportedSettings, workerFailed, cancelled, busy, repairUnavailable
}

struct SwarmWorkerOutput: Codable, Equatable, Sendable {
    struct File: Codable, Equatable, Sendable {
        let path: String
        let content: String
        var sha256: String { SHA256.hash(data: Data(content.utf8)).map { String(format: "%02x", $0) }.joined() }
    }
    let summary: String
    let files: [File]

    static func validatePath(_ path: String) throws {
        let parts = path.split(separator: "/", omittingEmptySubsequences: false)
        guard !path.isEmpty, path.utf8.count <= 512, !path.contains("\\"), !path.contains(":"),
              !path.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }),
              parts.allSatisfy({ !$0.isEmpty && !$0.hasPrefix(".") && !$0.hasSuffix(" ") && !$0.hasSuffix(".") })
        else { throw SwarmFailure.invalidOutput }
    }

    func validate(for task: SwarmWorkerTask) throws {
        guard !summary.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, summary.utf8.count <= 8_192,
              files.count == task.ownedPaths.count, Set(files.map(\.path)) == Set(task.ownedPaths),
              files.reduce(0, { $0 + $1.content.utf8.count }) <= 262_144
        else { throw SwarmFailure.invalidOutput }
        for file in files { try Self.validatePath(file.path) }
    }
}

struct SwarmWorkerRequest: Codable, Sendable {
    let runID: UUID
    let task: SwarmWorkerTask
    let attempt: Int
    let approvedContext: String
    let dependencyOutputs: [UUID: SwarmWorkerOutput]
    let repairBrief: String?
}

protocol SwarmWorkerExecuting: Sendable {
    // Implementations must propagate Task cancellation to their owned runtime.
    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerOutput
}

enum SwarmTaskState: String, Codable, Sendable { case pending, running, succeeded, failed, blocked, cancelled }
struct SwarmTaskReceipt: Codable, Sendable {
    let task: SwarmWorkerTask
    var attempt = 0
    var state: SwarmTaskState = .pending
    var startedAt: Date?
    var finishedAt: Date?
    var output: SwarmWorkerOutput?
    var failure: SwarmFailure?
    // Requested model is task.modelID. Existing text runtime does not expose the
    // resolved model or exact usage. Never manufacture either from the request.
    var resolvedModelID: String? = nil
}
struct SwarmRunReceipt: Codable, Sendable {
    let graph: SwarmTaskGraph
    let tasks: [SwarmTaskReceipt]
    let cancelled: Bool
    let attempts: [SwarmTaskReceipt]
    var completed: Bool { !cancelled && tasks.allSatisfy { $0.state == .succeeded } }
}

actor SwarmScheduler {
    private let worker: any SwarmWorkerExecuting
    private var graph: SwarmTaskGraph?
    private var context = ""
    private var receipts: [UUID: SwarmTaskReceipt] = [:]
    private var handles: [UUID: Task<SwarmWorkerOutput, Error>] = [:]
    private var cancelled = false
    private var executing = false
    private var attempts: [SwarmTaskReceipt] = []

    init(worker: any SwarmWorkerExecuting) { self.worker = worker }

    func run(_ graph: SwarmTaskGraph, approvedContext: String) async throws -> SwarmRunReceipt {
        guard !executing, self.graph == nil else { throw SwarmFailure.busy }
        try graph.validate()
        guard approvedContext.utf8.count <= 65_536 else { throw SwarmFailure.budgetExceeded }
        self.graph = graph; context = approvedContext
        receipts = Dictionary(uniqueKeysWithValues: graph.tasks.map { ($0.id, SwarmTaskReceipt(task: $0)) })
        return await schedule(repair: [:])
    }

    func cancel() {
        cancelled = true
        for handle in handles.values { handle.cancel() }
    }

    func snapshot() -> SwarmRunReceipt? {
        guard let graph else { return nil }
        return .init(graph: graph, tasks: graph.tasks.compactMap { receipts[$0.id] }, cancelled: cancelled, attempts: attempts)
    }

    // One repair per logical task (up to 12 executions for six tasks). A repair
    // of already-consumed successful output is rejected to avoid stale dependents.
    func repair(taskID: UUID, brief: String) async throws -> SwarmRunReceipt {
        guard !executing, !cancelled, let graph, var receipt = receipts[taskID],
              receipt.attempt == 1, [.failed, .succeeded].contains(receipt.state),
              !brief.isEmpty, brief.utf8.count <= 8_192,
              !graph.tasks.contains(where: { $0.dependencies.contains(taskID) && (receipts[$0.id]?.attempt ?? 0) > 0 })
        else { throw SwarmFailure.repairUnavailable }
        receipt.state = .pending; receipt.failure = nil
        receipts[taskID] = receipt
        for task in graph.tasks where receipts[task.id]?.state == .blocked { receipts[task.id]?.state = .pending }
        return await schedule(repair: [taskID: brief])
    }

    private func schedule(repair: [UUID: String]) async -> SwarmRunReceipt {
        executing = true
        defer { executing = false }
        await withTaskCancellationHandler {
            while !cancelled && !Task.isCancelled {
                guard let graph else { break }
                let ready = graph.tasks.filter { task in
                    receipts[task.id]?.state == .pending && task.dependencies.allSatisfy { receipts[$0]?.state == .succeeded }
                }.prefix(2)
                if ready.isEmpty { break }
                for task in ready {
                    if cancelled || Task.isCancelled { break }
                    receipts[task.id]?.attempt += 1
                    receipts[task.id]?.state = .running
                    receipts[task.id]?.startedAt = Date()
                    let dependencies = Dictionary(uniqueKeysWithValues: task.dependencies.compactMap { id in
                        receipts[id]?.output.map { (id, $0) }
                    })
                    let request = SwarmWorkerRequest(runID: graph.runID, task: task,
                        attempt: receipts[task.id]!.attempt, approvedContext: context,
                        dependencyOutputs: dependencies, repairBrief: repair[task.id])
                    let worker = self.worker
                    handles[task.id] = Task { try Task.checkCancellation(); return try await worker.execute(request) }
                }
                // Both workers are already launched. Batch scheduling is bounded
                // and deterministic; a failed worker does not discard its peer.
                for task in ready {
                    guard let handle = handles[task.id] else { continue }
                    do {
                        let output = try await handle.value
                        try output.validate(for: task)
                        if !cancelled && !Task.isCancelled {
                            receipts[task.id]?.output = output; receipts[task.id]?.state = .succeeded
                            receipts[task.id]?.failure = nil
                        } else { cancelled = true; receipts[task.id]?.state = .cancelled }
                    } catch {
                        receipts[task.id]?.state = cancelled || Task.isCancelled ? .cancelled : .failed
                        receipts[task.id]?.failure = cancelled || Task.isCancelled ? .cancelled : (error as? SwarmFailure ?? .workerFailed)
                    }
                    receipts[task.id]?.finishedAt = Date(); handles[task.id] = nil
                    if let finished = receipts[task.id] { attempts.append(finished) }
                }
            }
        } onCancel: { Task { await self.cancel() } }
        if Task.isCancelled { cancelled = true }
        for id in receipts.keys where receipts[id]?.state == .pending {
            receipts[id]?.state = cancelled ? .cancelled : .blocked
        }
        return snapshot()!
    }
}

enum SwarmOutputStaging {
    // Creates an app-owned temporary proposal, never applies to a project. Caller
    // must use existing native change review/conflict checks for any final save.
    static func stage(_ receipt: SwarmRunReceipt) throws -> URL {
        try receipt.graph.validate()
        guard receipt.completed, receipt.tasks.count == receipt.graph.tasks.count,
              Set(receipt.tasks.map { $0.task.id }).count == receipt.tasks.count,
              receipt.tasks.allSatisfy({ item in receipt.graph.tasks.contains(item.task) })
        else { throw SwarmFailure.invalidOutput }
        let root = FileManager.default.temporaryDirectory.resolvingSymlinksInPath()
            .appendingPathComponent("rivune-swarm-" + UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
        do {
            for task in receipt.tasks {
                guard let output = task.output else { throw SwarmFailure.invalidOutput }
                try output.validate(for: task.task)
                for file in output.files {
                    let url = root.appendingPathComponent("files").appendingPathComponent(file.path)
                    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
                    guard !FileManager.default.fileExists(atPath: url.path) else { throw SwarmFailure.ownershipConflict }
                    try Data(file.content.utf8).write(to: url, options: .withoutOverwriting)
                    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
                }
            }
            try JSONEncoder().encode(receipt).write(to: root.appendingPathComponent("receipt.json"), options: .atomic)
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: root.appendingPathComponent("receipt.json").path)
            return root
        } catch { try? FileManager.default.removeItem(at: root); throw error }
    }
}
