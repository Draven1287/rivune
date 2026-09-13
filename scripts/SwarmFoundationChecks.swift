// Standalone fixture executable. Never include this @main in an app target.
// Test doubles only for the existing runtime types, so the REAL new text worker
// adapter can compile/run against a recording transport without launching AI.
import Foundation

struct AIExecutionRoute: Sendable, Equatable {
    let providerID: String; let runtimeAdapterID: String
    static let codexCLI = Self(providerID: "openai", runtimeAdapterID: "alloy.terminal.codex")
    static let claudeCodeCLI = Self(providerID: "anthropic", runtimeAdapterID: "alloy.terminal.claude")
}
struct TerminalRunOptions: Sendable { let model: String?; let effort: String? }
struct TerminalRunResult: Sendable { let text: String; let elapsedSeconds: Double }
protocol AITextRunning: Sendable {
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult
}

func require(_ value: Bool, _ message: String) { if !value { fatalError(message) } }
func task(_ path: String, dependencies: [UUID] = [], provider: String = "openai") -> SwarmWorkerTask {
    .init(id: UUID(), parentLeaderID: "leader-" + provider, providerID: provider,
          adapterID: provider == "openai" ? "alloy.terminal.codex" : "alloy.terminal.claude",
          modelID: nil, dependencies: dependencies, ownedPaths: [path], brief: "Produce " + path)
}
actor RecordingWorker: SwarmWorkerExecuting {
    var requests: [SwarmWorkerRequest] = []
    var active = 0; var peak = 0; var stops = 0
    let failFirst: UUID?
    let delayed: Bool
    init(failFirst: UUID? = nil, delayed: Bool = false) { self.failFirst = failFirst; self.delayed = delayed }
    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerOutput {
        requests.append(request); active += 1; peak = max(peak, active)
        defer { active -= 1 }
        do { try await Task.sleep(for: delayed ? .seconds(30) : .milliseconds(10)) }
        catch { stops += 1; throw error }
        if request.task.id == failFirst && request.attempt == 1 { throw SwarmFailure.workerFailed }
        return .init(summary: "Produced scoped files", files: request.task.ownedPaths.map { .init(path: $0, content: "fixture-" + $0) })
    }
}
actor RecordingRuntime: AITextRunning {
    var routes: [AIExecutionRoute] = []; var prompts: [String] = []
    var optionsReceived: [TerminalRunOptions] = []
    let payload: String
    let failFirst: Bool
    init(payload: String, failFirst: Bool = false) { self.payload = payload; self.failFirst = failFirst }
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        routes.append(route); prompts.append(prompt)
        optionsReceived.append(options)
        if failFirst && routes.count == 1 { throw SwarmFailure.workerFailed }
        return .init(text: payload, elapsedSeconds: 0)
    }
}
actor ProcessFixtureWorker: SwarmWorkerExecuting {
    func execute(_ request: SwarmWorkerRequest) async throws -> SwarmWorkerOutput {
        // Fixed benign process fixture, no shell, no prompt-derived arguments.
        let process = Process(); let pipe = Pipe()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/printf")
        process.arguments = ["process-fixture-bytes"]
        process.standardOutput = pipe
        try process.run()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        require(process.terminationStatus == 0, "fixture process failed")
        return .init(summary: "Fixture process exited 0", files: [.init(path: request.task.ownedPaths[0], content: String(decoding: data, as: UTF8.self))])
    }
}

@main struct SwarmChecks {
    static func main() async throws {
        var checks = 0
        let a = task("index.html"), b = task("style.css", provider: "anthropic")
        let c = task("README.txt", dependencies: [a.id, b.id])
        let graph = SwarmTaskGraph(runID: UUID(), tasks: [a,b,c])
        try graph.validate(); checks += 1
        for bad in [SwarmTaskGraph(runID: UUID(), tasks: [a,task("INDEX.html")]),
                    SwarmTaskGraph(runID: UUID(), tasks: [task("../outside")]),
                    SwarmTaskGraph(runID: UUID(), tasks: [task("a"),task("a/b")]),
                    SwarmTaskGraph(runID: UUID(), tasks: (0..<7).map { task("\($0).txt") }),
                    SwarmTaskGraph(runID: UUID(), tasks: [task("unknown", dependencies: [UUID()])])] {
            do { try bad.validate(); fatalError("invalid graph accepted") } catch { checks += 1 }
        }
        var deep = a; deep.depth = 2
        do { try SwarmTaskGraph(runID: UUID(), tasks: [deep]).validate(); fatalError("depth") } catch { checks += 1 }
        let xID = UUID(), yID = UUID()
        let x = SwarmWorkerTask(id: xID, parentLeaderID: "p", providerID: "p", adapterID: "p", modelID: nil, dependencies: [yID], ownedPaths: ["x"], brief: "x")
        let y = SwarmWorkerTask(id: yID, parentLeaderID: "p", providerID: "p", adapterID: "p", modelID: nil, dependencies: [xID], ownedPaths: ["y"], brief: "y")
        do { try SwarmTaskGraph(runID: UUID(), tasks: [x,y]).validate(); fatalError("cycle") } catch { checks += 1 }

        let worker = RecordingWorker(), scheduler = SwarmScheduler(worker: worker)
        let receipt = try await scheduler.run(graph, approvedContext: "only approved context")
        require(receipt.completed && receipt.attempts.count == 3, "completion receipts")
        let requests = await worker.requests; let peak = await worker.peak
        require(peak == 2, "concurrency")
        require(requests[0].dependencyOutputs.isEmpty && requests[1].dependencyOutputs.isEmpty, "independence")
        require(requests[2].dependencyOutputs.count == 2, "dependency handoff")
        require(receipt.tasks.allSatisfy { $0.resolvedModelID == nil && $0.finishedAt != nil }, "honest receipt")
        checks += 4
        let staged = try SwarmOutputStaging.stage(receipt)
        defer { try? FileManager.default.removeItem(at: staged) }
        require(try String(contentsOf: staged.appendingPathComponent("files/index.html"), encoding: .utf8) == "fixture-index.html", "staged bytes")
        let restored = try JSONDecoder().decode(SwarmRunReceipt.self, from: Data(contentsOf: staged.appendingPathComponent("receipt.json")))
        require(restored.tasks[0].output?.files[0].sha256 == receipt.tasks[0].output?.files[0].sha256, "hash receipt roundtrip")
        checks += 1

        let failing = RecordingWorker(failFirst: a.id), retrying = SwarmScheduler(worker: failing)
        let partial = try await retrying.run(graph, approvedContext: "")
        require(!partial.completed && partial.tasks[1].state == .succeeded && partial.tasks[2].state == .blocked, "partial preserved")
        let repaired = try await retrying.repair(taskID: a.id, brief: "Fix assigned file")
        require(repaired.completed && repaired.attempts.count == 4, "bounded repair")
        let retryRequests = await failing.requests
        require(retryRequests.filter { $0.task.id == b.id }.count == 1, "peer not rerun")
        do { _ = try await retrying.repair(taskID: a.id, brief: "again"); fatalError("extra repair") } catch { checks += 1 }
        do { _ = try await scheduler.repair(taskID: a.id, brief: "stale"); fatalError("stale dependent") } catch { checks += 1 }
        checks += 2

        let slow = RecordingWorker(delayed: true), cancelling = SwarmScheduler(worker: slow)
        let run = Task { try await cancelling.run(graph, approvedContext: "") }
        for _ in 0..<100 { if await slow.requests.count == 2 { break }; try await Task.sleep(for: .milliseconds(5)) }
        await cancelling.cancel()
        let cancelled = try await run.value
        require(cancelled.cancelled && !cancelled.completed && cancelled.tasks.allSatisfy { $0.state == .cancelled }, "cancel receipt")
        let cancelledRequestCount = await slow.requests.count
        let stoppedWorkerCount = await slow.stops
        require(cancelledRequestCount == 2 && stoppedWorkerCount == 2, "cancel both; no dependent launch")
        checks += 1

        for item in [a,b] {
            let out = SwarmWorkerOutput(summary: "generated", files: [.init(path: item.ownedPaths[0], content: "real transport fixture")])
            let runtime = RecordingRuntime(payload: String(decoding: try JSONEncoder().encode(out), as: UTF8.self))
            let adapter = SwarmTextWorkerAdapter(runner: runtime)
            let result = try await adapter.execute(.init(runID: graph.runID, task: item, attempt: 1, approvedContext: "approved", dependencyOutputs: [:], repairBrief: nil))
            require(result == out, "production adapter output")
            require(await runtime.routes.first?.providerID == item.providerID, "route identity")
            checks += 1
        }
        let foreign = task("bad.txt", provider: "unsupported")
        let inert = RecordingRuntime(payload: "{}")
        do { _ = try await SwarmTextWorkerAdapter(runner: inert).execute(.init(runID: graph.runID, task: foreign, attempt: 1, approvedContext: "", dependencyOutputs: [:], repairBrief: nil)); fatalError("unsupported") } catch { checks += 1 }
        require(await inert.routes.isEmpty, "unsupported launched")
        let process = SwarmScheduler(worker: ProcessFixtureWorker())
        let proc = try await process.run(.init(runID: UUID(), tasks: [task("process.txt")]), approvedContext: "")
        require(proc.tasks[0].output?.files[0].content == "process-fixture-bytes", "process receipt")
        checks += 1

        // Legacy JSON genuinely lacks the added key, rather than encoding null.
        var oldJSON = try JSONSerialization.jsonObject(with: JSONEncoder().encode(a)) as! [String: Any]
        oldJSON.removeValue(forKey: "requestedEffort")
        let oldTask = try JSONDecoder().decode(SwarmWorkerTask.self, from: JSONSerialization.data(withJSONObject: oldJSON))
        require(oldTask.requestedEffort == nil && oldTask == a, "legacy task decode")
        checks += 1
        for provider in ["openai", "anthropic"] {
            var configured = SwarmWorkerTask(id: UUID(), parentLeaderID: "leader", providerID: provider,
                adapterID: provider == "openai" ? "alloy.terminal.codex" : "alloy.terminal.claude",
                modelID: "fixture-model", dependencies: [], ownedPaths: ["configured.txt"], brief: "fixture")
            configured.requestedEffort = "high"
            let roundtrip = try JSONDecoder().decode(SwarmWorkerTask.self, from: JSONEncoder().encode(configured))
            require(roundtrip == configured, "new task options decode")
            checks += 1
            let payload = SwarmWorkerOutput(summary: "fixture", files: [.init(path: "configured.txt", content: "bytes")])
            let runtime = RecordingRuntime(payload: String(decoding: try JSONEncoder().encode(payload), as: UTF8.self), failFirst: true)
            let supported = SwarmTextWorkerSelection(providerID: provider, adapterID: configured.adapterID,
                modelID: configured.modelID, requestedEffort: configured.requestedEffort)
            let adapter = SwarmTextWorkerAdapter(runner: runtime, supportedSelections: [supported])
            let scheduler = SwarmScheduler(worker: adapter)
            let failed = try await scheduler.run(.init(runID: UUID(), tasks: [configured]), approvedContext: "")
            require(failed.tasks[0].state == .failed, "recorded first failure")
            let repaired = try await scheduler.repair(taskID: configured.id, brief: "Repair fixture")
            let options = await runtime.optionsReceived
            require(repaired.completed && options.count == 2 && options.allSatisfy {
                $0.model == "fixture-model" && $0.effort == "high"
            }, "exact options forwarded on original and repair")
            let decodedReceipt = try JSONDecoder().decode(SwarmRunReceipt.self, from: JSONEncoder().encode(repaired))
            require(decodedReceipt.attempts.count == 2 && decodedReceipt.attempts.allSatisfy {
                $0.task.requestedEffort == "high" && $0.task.modelID == "fixture-model" && $0.resolvedModelID == nil
            }, "options retained in attempt receipt")
            checks += 2
            var unsupported = configured; unsupported.requestedEffort = "unsupported"
            do {
                _ = try await adapter.execute(.init(runID: UUID(), task: unsupported, attempt: 1,
                    approvedContext: "", dependencyOutputs: [:], repairBrief: nil))
                fatalError("unsupported explicit setting admitted")
            } catch SwarmFailure.unsupportedSettings { checks += 1 }
            require(await runtime.optionsReceived.count == 2, "unsupported setting launched transport")
            let missingCatalog = SwarmTextWorkerAdapter(runner: runtime)
            do {
                _ = try await missingCatalog.execute(.init(runID: UUID(), task: configured, attempt: 1,
                    approvedContext: "", dependencyOutputs: [:], repairBrief: nil))
                fatalError("explicit setting accepted without capabilities")
            } catch SwarmFailure.unsupportedSettings { checks += 1 }
            require(await runtime.optionsReceived.count == 2, "missing capabilities launched transport")
        }
        print("PASS: \(checks) Swarm foundation checks; recording transports and one fixed printf process only; no AI calls.")
    }
}
