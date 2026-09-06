import Foundation
import Combine

enum WorkspaceRunStatus: String, Codable, Sendable {
    case running, complete, failed, cancelled, interrupted
}

struct WorkspaceRun: Identifiable, Codable, Sendable {
    let id: UUID
    let conversationID: UUID
    let requestKey: String
    var turn: ChatTurn
    var status: WorkspaceRunStatus
    var stage: CouncilStage
    var updatedAt: Date
}

enum WorkspaceRunError: LocalizedError {
    case duplicateConflict, deletedRequest, busy, storageUnavailable, journalFull

    var errorDescription: String? {
        switch self {
        case .duplicateConflict: "This request ID was already used for a different task."
        case .deletedRequest: "This task was deleted. Its request ID cannot be executed again."
        case .busy: "Two tasks are already running, or this conversation has an active task. Wait or stop a task first."
        case .storageUnavailable: "Rivune cannot save its task journal. Check available storage before starting another task."
        case .journalFull: "The local task journal is full. Export or remove older conversations before continuing."
        }
    }
}

/// Owns execution for the lifetime of the app, independently of the selected
/// conversation or an attached browser. A closed app does not run in the background:
/// unfinished work is recovered as interrupted, never silently executed again.
@MainActor
final class RivuneRunCoordinator: ObservableObject {
    @Published private(set) var runs: [WorkspaceRun] = []
    @Published private(set) var revision = 0
    @Published private(set) var storageError: String?
    var onUpdate: ((WorkspaceRun) -> Void)?

    private let textRunner: any AITextRunning
    private let journalURL: URL?
    private var tasks: [UUID: Task<Void, Never>] = [:]
    private var isJournalReadable = true
    private var consumedIDs: Set<UUID> = []
    private struct Journal: Codable {
        var runs: [WorkspaceRun]
        var consumedIDs: Set<UUID>
    }

    static var defaultJournalURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent(RivuneBrand.historyDirectoryName, isDirectory: true)
            .appendingPathComponent("workspace-runs.json")
    }

    init(textRunner: any AITextRunning = TerminalAIService(), journalURL: URL? = nil) {
        self.textRunner = textRunner
        self.journalURL = journalURL
        guard let journalURL, FileManager.default.fileExists(atPath: journalURL.path) else { return }
        do {
            let size = try journalURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size <= 32 * 1_024 * 1_024 else { throw WorkspaceRunError.journalFull }
            let data = try Data(contentsOf: journalURL)
            if let journal = try? JSONDecoder().decode(Journal.self, from: data) {
                runs = journal.runs
                consumedIDs = journal.consumedIDs
            } else {
                runs = try JSONDecoder().decode([WorkspaceRun].self, from: data)
            }
            guard Set(runs.map(\.id)).count == runs.count else { throw WorkspaceRunError.storageUnavailable }
            for index in runs.indices where runs[index].status == .running {
                runs[index].status = .interrupted
                runs[index].stage = .failed
                runs[index].turn.executionState = .interrupted
                Self.setError("Rivune closed before this task finished. Start a new request to retry it.", on: &runs[index].turn)
                runs[index].updatedAt = .now
            }
            try persist()
        } catch {
            // Preserve a corrupt journal for recovery; never overwrite it or
            // reuse its unknown request IDs by starting new execution.
            isJournalReadable = false
            storageError = WorkspaceRunError.storageUnavailable.localizedDescription
        }
    }

    func activeRun(in conversationID: UUID) -> WorkspaceRun? {
        runs.first { $0.conversationID == conversationID && $0.status == .running }
    }

    func existing(id: UUID, requestKey: String) throws -> WorkspaceRun? {
        guard !consumedIDs.contains(id) else { throw WorkspaceRunError.deletedRequest }
        guard let run = runs.first(where: { $0.id == id }) else { return nil }
        guard run.requestKey == requestKey else { throw WorkspaceRunError.duplicateConflict }
        return run
    }

    @discardableResult
    func submit(
        id: UUID, conversationID: UUID, requestKey: String, turn: ChatTurn,
        priorContext: String, codexOptions: TerminalRunOptions, claudeOptions: TerminalRunOptions,
        codexProvenance: String, claudeProvenance: String,
        codexRoute: AIExecutionRoute = .codexCLI, claudeRoute: AIExecutionRoute = .claudeCodeCLI
    ) throws -> WorkspaceRun {
        guard isJournalReadable else { throw WorkspaceRunError.storageUnavailable }
        if let run = try existing(id: id, requestKey: requestKey) { return run }
        guard runs.filter({ $0.status == .running }).count < 2,
              activeRun(in: conversationID) == nil else { throw WorkspaceRunError.busy }
        guard runs.count < 1_000, consumedIDs.count < 100_000 else { throw WorkspaceRunError.journalFull }
        let run = WorkspaceRun(id: id, conversationID: conversationID, requestKey: requestKey,
                               turn: turn, status: .running, stage: .asking, updatedAt: .now)
        runs.append(run)
        do { try persist() } catch {
            runs.removeAll { $0.id == id }
            storageError = error.localizedDescription
            throw WorkspaceRunError.storageUnavailable
        }
        publish(run)
        let runner = RouteMappedTextRunner(base: textRunner, codexRoute: codexRoute, claudeRoute: claudeRoute)
        tasks[id] = Task { [weak self] in
            var finalTurn = turn
            if turn.mode == .together {
                let request = RivuneCollaborationRequest(
                    turnID: turn.id, createdAt: turn.createdAt, prompt: turn.prompt,
                    priorContext: priorContext, attachments: turn.attachments,
                    codexOptions: codexOptions, claudeOptions: claudeOptions,
                    codexProvenance: codexProvenance, claudeProvenance: claudeProvenance
                )
                finalTurn = await RivuneCollaborationRunner(textRunner: runner).run(request) { [weak self] snapshot in
                    self?.update(id: id, turn: snapshot.turn, stage: snapshot.stage, terminal: false)
                }
            } else {
                let isCodex = turn.mode == .chatGPT
                do {
                    let response = try await runner.run(
                        isCodex ? .codexCLI : .claudeCodeCLI,
                        prompt: RivuneStore.independentPrompt(userPrompt: turn.prompt, priorContext: priorContext, attachments: turn.attachments),
                        options: isCodex ? codexOptions : claudeOptions
                    )
                    try Task.checkCancellation()
                    let answer = AIAnswer(source: isCodex ? .chatGPT : .claude,
                                          content: String(response.text.prefix(240_000)),
                                          responseTime: response.elapsedSeconds,
                                          provenance: isCodex ? codexProvenance : claudeProvenance)
                    if isCodex { finalTurn.chatGPTAnswer = answer } else { finalTurn.claudeAnswer = answer }
                    finalTurn.executionState = .complete
                } catch is CancellationError {
                    finalTurn.executionState = .cancelled
                    Self.setError("Task stopped. Start a new request to retry it.", on: &finalTurn)
                } catch {
                    let engineError = error as? TerminalEngineError
                    finalTurn.executionState = engineError == .cancelled ? .cancelled : .failed
                    Self.setError(engineError?.userMessage ?? (error as? APIRuntimeError)?.userMessage ?? "The provider did not finish this task. Check its connection and retry.", on: &finalTurn)
                }
            }
            self?.update(id: id, turn: finalTurn, stage: RivuneStore.completionStage(for: finalTurn), terminal: true)
            self?.tasks[id] = nil
        }
        return run
    }

    func cancel(_ id: UUID) {
        guard let index = runs.firstIndex(where: { $0.id == id && $0.status == .running }) else { return }
        tasks[id]?.cancel()
        tasks[id] = nil
        var turn = runs[index].turn
        turn.executionState = .cancelled
        if var trace = turn.togetherTrace {
            trace.stoppedPhase = trace.phase
            trace.phase = .cancelled
            turn.togetherTrace = trace
        }
        Self.setError("Task stopped. Start a new request to retry it.", on: &turn)
        update(id: id, turn: turn, stage: .cancelled, terminal: true)
    }

    /// Removal is persisted before history deletion so recovery cannot resurrect
    /// a conversation the user removed. Late provider responses are ignored.
    func forget(conversationID: UUID) throws {
        guard isJournalReadable else { throw WorkspaceRunError.storageUnavailable }
        let removed = runs.filter { $0.conversationID == conversationID }
        let previous = runs
        let previousConsumed = consumedIDs
        consumedIDs.formUnion(removed.map(\.id))
        runs.removeAll { $0.conversationID == conversationID }
        do { try persist() } catch { runs = previous; consumedIDs = previousConsumed; throw error }
        for run in removed { tasks[run.id]?.cancel(); tasks[run.id] = nil }
        revision += 1
    }

    private func update(id: UUID, turn: ChatTurn, stage: CouncilStage, terminal: Bool) {
        guard let index = runs.firstIndex(where: { $0.id == id && $0.status == .running }) else { return }
        runs[index].turn = turn
        runs[index].stage = stage
        runs[index].updatedAt = .now
        if terminal {
            switch turn.executionState {
            case .complete: runs[index].status = .complete
            case .cancelled: runs[index].status = .cancelled
            case .interrupted: runs[index].status = .interrupted
            default: runs[index].status = .failed
            }
        }
        do { try persist() } catch {
            tasks[id]?.cancel()
            runs[index].status = .failed
            runs[index].stage = .failed
            runs[index].turn.executionState = .failed
            Self.setError("Task stopped because its progress could not be saved. Check available storage.", on: &runs[index].turn)
            storageError = WorkspaceRunError.storageUnavailable.localizedDescription
            isJournalReadable = false
        }
        publish(runs[index])
    }

    private func publish(_ run: WorkspaceRun) {
        revision += 1
        onUpdate?(run)
    }

    private func persist() throws {
        guard let journalURL else { return }
        let data = try JSONEncoder().encode(Journal(runs: runs, consumedIDs: consumedIDs))
        guard data.count <= 32 * 1_024 * 1_024 else { throw WorkspaceRunError.journalFull }
        try FileManager.default.createDirectory(at: journalURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: journalURL, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: journalURL.path)
    }

    private static func setError(_ message: String, on turn: inout ChatTurn) {
        switch turn.mode {
        case .chatGPT: turn.chatGPTError = message
        case .claude: turn.claudeError = message
        case .together: turn.combinedError = message
        }
    }
}
