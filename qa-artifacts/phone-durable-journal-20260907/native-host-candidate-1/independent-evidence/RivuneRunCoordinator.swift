import Foundation
import Combine
import CryptoKit

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
    /// Monotonic persisted revision used by durable remote result references.
    var durableRevision: Int? = nil
}

enum WorkspaceRunError: LocalizedError {
    case duplicateConflict, deletedRequest, busy, storageUnavailable, journalFull, modeUnavailable, invalidPromptContext
    case councilRetryUnavailable(String)

    var errorDescription: String? {
        switch self {
        case .councilRetryUnavailable(let explanation): explanation
        case .modeUnavailable: "This mode is not available through the selected adapters yet."
        case .invalidPromptContext: "The approved conversation context is invalid or exceeds its limits. Review the selected context and try again."
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
    /// Called only after the corresponding run mutation is durably persisted.
    var onDurableUpdate: ((WorkspaceRun) -> Void)?
    var onForgotten: ((WorkspaceRun) -> Void)?

    private let textRunner: any AITextRunning
    private let councilGate = CouncilCallGate()
    private var teamEvidence: () -> TeamAdmissionEvidence
    private let journalURL: URL?
    private var tasks: [UUID: Task<Void, Never>] = [:]
    private var isJournalReadable = true
    private var consumedIDs: Set<UUID> = []
    private struct Journal: Codable {
        var runs: [WorkspaceRun]
        var consumedIDs: Set<UUID>
    }

    nonisolated private static func encodedReference(_ context: ApprovedPromptContext) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return String(decoding: (try? encoder.encode(context)) ?? Data("{}".utf8), as: UTF8.self)
    }

    static var defaultJournalURL: URL? {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?
            .appendingPathComponent(RivuneBrand.historyDirectoryName, isDirectory: true)
            .appendingPathComponent("workspace-runs.json")
    }

    init(textRunner: any AITextRunning = TerminalAIService(), journalURL: URL? = nil, teamEvidence: @escaping () -> TeamAdmissionEvidence = { .init() }) {
        self.textRunner = textRunner
        self.teamEvidence = teamEvidence
        self.journalURL = journalURL
        guard let journalURL, FileManager.default.fileExists(atPath: journalURL.path) else { return }
        do {
            let size = try journalURL.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard size <= 32 * 1_024 * 1_024 else { throw WorkspaceRunError.journalFull }
            let data = try Data(contentsOf: journalURL)
            let loadedRuns: [WorkspaceRun]
            let loadedConsumedIDs: Set<UUID>
            if let journal = try? JSONDecoder().decode(Journal.self, from: data) {
                loadedRuns = journal.runs
                loadedConsumedIDs = journal.consumedIDs
            } else {
                loadedRuns = try JSONDecoder().decode([WorkspaceRun].self, from: data)
                loadedConsumedIDs = []
            }
            // New explicit file fields are validated before exposing loaded runs.
            // Keep legacy nil-field recovery behavior unchanged.
            for run in loadedRuns {
                guard (run.durableRevision ?? 0) >= 0 else { throw WorkspaceRunError.storageUnavailable }
                if run.turn.selectedArtifact != nil || run.turn.councilRun?.selectedArtifact != nil {
                    try run.turn.selectedArtifact?.validate()
                    try run.turn.councilRun?.selectedArtifact?.validate()
                    guard [.chatGPT, .claude, .council].contains(run.turn.mode),
                          run.turn.councilRun == nil || run.turn.councilRun?.selectedArtifact == run.turn.selectedArtifact else { throw ArtifactContinuationError.invalidSnapshot }
                }
            }
            runs = loadedRuns
            consumedIDs = loadedConsumedIDs
            guard Set(runs.map(\.id)).count == runs.count else { throw WorkspaceRunError.storageUnavailable }
            for run in runs {
                try run.turn.selectedArtifact?.validate()
                if run.turn.selectedArtifact != nil && ![IntelligenceMode.chatGPT, .claude, .council].contains(run.turn.mode) { throw ArtifactContinuationError.unsupportedMode }
                guard let council = run.turn.councilRun else { continue }
                guard run.turn.mode == .council, council.id == run.id,
                      council.turnID == run.turn.id, council.prompt == run.turn.prompt, council.selectedArtifact == run.turn.selectedArtifact else {
                    throw CouncilRecordValidationError.invalidSavedResults
                }
                try council.validateSavedResults()
                if council.teamConfiguration == nil {
                    guard council.participants.allSatisfy({ identity in
                        [AIExecutionRoute.codexCLI, .claudeCodeCLI].contains {
                            identity.id == $0.transportID && identity.providerID == $0.providerID && identity.adapterID == $0.runtimeAdapterID
                        }
                    }) else { throw CouncilRecordValidationError.invalidSavedResults }
                }
                if let team = council.teamConfiguration {
                    try team.validate()
                    guard team.members.map(\.identity) == council.participants else {
                        throw CouncilRecordValidationError.invalidSavedResults
                    }
                }
            }
            let hasInterruptedRuns = runs.contains { $0.status == .running }
            for index in runs.indices where runs[index].status == .running {
                runs[index].status = .interrupted
                runs[index].stage = .failed
                runs[index].turn.executionState = .interrupted
                runs[index].turn.councilRun?.phase = .interrupted
                Self.setError("Rivune closed before this task finished. Start a new request to retry it.", on: &runs[index].turn)
                runs[index].updatedAt = .now
            }
            if hasInterruptedRuns { try persist() }
        } catch {
            // Preserve a corrupt journal for recovery; never overwrite it or
            // reuse its unknown request IDs by starting new execution.
            isJournalReadable = false
            storageError = WorkspaceRunError.storageUnavailable.localizedDescription
        }
    }

    func setTeamEvidence(_ evidence: @escaping () -> TeamAdmissionEvidence) { teamEvidence = evidence }

    func run(id: UUID, requestKey: String) throws -> WorkspaceRun? {
        try existing(id: id, requestKey: requestKey)
    }

    func remoteSnapshot(id: UUID) -> WorkspaceRun? {
        runs.first { $0.id == id }
    }

    func terminalReference(id: UUID, requestKey: String) throws -> RemoteResultReference? {
        guard let run = try existing(id: id, requestKey: requestKey), run.status != .running else { return nil }
        let revision = run.durableRevision ?? 0
        guard revision >= 0 else { throw WorkspaceRunError.storageUnavailable }
        return try RemoteResultReference(workspaceRunID: run.id, revision: revision,
            resultDigest: .hash(data: Self.terminalReferenceData(run)))
    }

    func resolve(reference: RemoteResultReference, requestKey: String) throws -> WorkspaceRun {
        guard let run = try existing(id: reference.workspaceRunID, requestKey: requestKey),
              run.status != .running,
              (run.durableRevision ?? 0) == reference.revision,
              SHA256Digest.hash(data: Self.terminalReferenceData(run)) == reference.resultDigest else {
            throw WorkspaceRunError.storageUnavailable
        }
        return run
    }

    nonisolated private static func terminalReferenceData(_ run: WorkspaceRun) -> Data {
        struct Payload: Codable {
            let id: UUID; let conversationID: UUID; let requestKey: String
            let turnID: UUID; let status: WorkspaceRunStatus; let stage: CouncilStage; let revision: Int
        }
        let payload = Payload(id: run.id, conversationID: run.conversationID, requestKey: run.requestKey,
                              turnID: run.turn.id, status: run.status, stage: run.stage,
                              revision: run.durableRevision ?? 0)
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return (try? encoder.encode(payload)) ?? Data()
    }

    func activeRun(in conversationID: UUID) -> WorkspaceRun? {
        runs.first { $0.conversationID == conversationID && $0.status == .running }
    }

    func canAcceptRemote(conversationID: UUID) -> Bool {
        isJournalReadable && runs.filter { $0.status == .running }.count < 2 && activeRun(in: conversationID) == nil
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
        codexRoute: AIExecutionRoute = .codexCLI, claudeRoute: AIExecutionRoute = .claudeCodeCLI,
        teamConfiguration: TeamRunConfiguration? = nil
    ) throws -> WorkspaceRun {
        try submit(id: id, conversationID: conversationID, requestKey: requestKey, turn: turn,
            promptContext: ApprovedPromptContext(
                priorConversation: priorContext.isEmpty ? .roleAware(.init(messages: [])) : .legacyUntrusted(String(decoding: priorContext.utf8.prefix(12_000), as: UTF8.self)),
                userSelectedDocuments: turn.attachments,
                selectedArtifactReference: turn.selectedArtifact
            ), codexOptions: codexOptions, claudeOptions: claudeOptions,
            codexProvenance: codexProvenance, claudeProvenance: claudeProvenance,
            codexRoute: codexRoute, claudeRoute: claudeRoute, teamConfiguration: teamConfiguration)
    }

    @discardableResult
    func submit(
        id: UUID, conversationID: UUID, requestKey: String, turn: ChatTurn,
        promptContext: ApprovedPromptContext, codexOptions: TerminalRunOptions, claudeOptions: TerminalRunOptions,
        codexProvenance: String, claudeProvenance: String,
        codexRoute: AIExecutionRoute = .codexCLI, claudeRoute: AIExecutionRoute = .claudeCodeCLI,
        teamConfiguration: TeamRunConfiguration? = nil
    ) throws -> WorkspaceRun {
        guard promptContext.isStructurallyValid,
              promptContext.userSelectedDocuments == turn.attachments,
              promptContext.selectedArtifactReference == turn.selectedArtifact else {
            throw WorkspaceRunError.invalidPromptContext
        }
        try turn.selectedArtifact?.validate()
        if turn.selectedArtifact != nil {
            guard [.chatGPT, .claude, .council].contains(turn.mode) else { throw ArtifactContinuationError.unsupportedMode }
            guard turn.prompt.utf8.count <= 16 * 1_024, !turn.prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  RivuneStore.preparedAttachmentContext(turn.attachments) != nil else { throw ArtifactContinuationError.tooLarge("request and documents") }
        }
        guard turn.mode != .swarm, turn.mode != .council || teamConfiguration != nil || (codexRoute == .codexCLI && claudeRoute == .claudeCodeCLI) else { throw WorkspaceRunError.modeUnavailable }
        guard isJournalReadable else { throw WorkspaceRunError.storageUnavailable }
        if let run = try existing(id: id, requestKey: requestKey) {
            guard run.turn.councilRun?.teamConfiguration == teamConfiguration, run.turn.selectedArtifact == turn.selectedArtifact else { throw WorkspaceRunError.duplicateConflict }
            return run
        }
        guard runs.filter({ $0.status == .running }).count < 2,
              activeRun(in: conversationID) == nil else { throw WorkspaceRunError.busy }
        guard runs.count < 1_000, consumedIDs.count < 100_000 else { throw WorkspaceRunError.journalFull }
        guard teamConfiguration == nil || turn.mode == .council else { throw TeamConfigurationError.invalidConfiguration }
        let configuredParticipants = try teamConfiguration?.participants(admittedBy: teamEvidence())
        let participants = configuredParticipants ?? [
            CouncilParticipant(identity: .init(id: codexRoute.transportID, providerID: codexRoute.providerID, adapterID: codexRoute.runtimeAdapterID, modelID: codexOptions.model, displayName: "ChatGPT", requestedEffort: codexOptions.effort), route: codexRoute, options: codexOptions),
            CouncilParticipant(identity: .init(id: claudeRoute.transportID, providerID: claudeRoute.providerID, adapterID: claudeRoute.runtimeAdapterID, modelID: claudeOptions.model, displayName: "Claude", requestedEffort: claudeOptions.effort), route: claudeRoute, options: claudeOptions)
        ]
        let approvedContext = ""
        let directPrompt = RivuneStore.independentPrompt(userPrompt: turn.prompt, context: promptContext)
        if turn.mode != .council, turn.selectedArtifact != nil,
           directPrompt.utf8.count > CouncilRunner.maximumInputBytes {
            throw ArtifactContinuationError.tooLarge("direct request")
        }
        var admittedTurn = turn
        if turn.mode == .council && (teamConfiguration != nil || turn.selectedArtifact != nil) {
            // Admission finishes before journaling, publication, or provider work.
            var frozen = CouncilRunRecord(id: id, turnID: turn.id, prompt: turn.prompt,
                approvedContext: approvedContext, criteria: CouncilRunner.defaultCriteria, participants: participants.map(\.identity))
            frozen.approvedPromptContext = promptContext
            frozen.teamConfiguration = teamConfiguration
            frozen.selectedArtifact = turn.selectedArtifact
            try frozen.validateSavedResults()
            if turn.selectedArtifact != nil, CouncilRunner.draftPrompt(frozen).utf8.count > CouncilRunner.maximumInputBytes {
                throw ArtifactContinuationError.tooLarge("Council draft")
            }
            admittedTurn.councilRun = frozen
        }
        let run = WorkspaceRun(id: id, conversationID: conversationID, requestKey: requestKey,
                               turn: admittedTurn, status: .running, stage: .asking, updatedAt: .now, durableRevision: 1)
        runs.append(run)
        do { try persist() } catch {
            runs.removeAll { $0.id == id }
            storageError = error.localizedDescription
            throw WorkspaceRunError.storageUnavailable
        }
        publish(run, durable: true)
        let runner = RouteMappedTextRunner(base: textRunner, codexRoute: codexRoute, claudeRoute: claudeRoute)
        let councilRunner = GatedCouncilTextRunner(base: runner, gate: councilGate)
        tasks[id] = Task { [weak self] in
            var finalTurn = admittedTurn
            if turn.mode == .council {
                let request = CouncilRequest(runID: id, turnID: turn.id, prompt: turn.prompt,
                    approvedContext: approvedContext, approvedPromptContext: promptContext,
                    criteria: CouncilRunner.defaultCriteria, participants: participants,
                    teamConfiguration: teamConfiguration, selectedArtifact: turn.selectedArtifact)
                let record = await CouncilRunner(textRunner: councilRunner).run(request) { [weak self] record in
                    await self?.updateCouncil(id: id, original: turn, record: record)
                }
                finalTurn = Self.councilTurn(original: turn, record: record)
            } else if turn.mode == .together {
                let request = RivuneCollaborationRequest(
                    turnID: turn.id, createdAt: turn.createdAt, prompt: turn.prompt,
                    priorContext: Self.encodedReference(promptContext), attachments: turn.attachments,
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
                        prompt: directPrompt,
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

    func retryCouncil(_ id: UUID) throws {
        guard isJournalReadable else { throw WorkspaceRunError.storageUnavailable }
        guard let index = runs.firstIndex(where: { $0.id == id }),
              runs[index].status == .failed,
              let previous = runs[index].turn.councilRun,
              previous.phase == .partial || previous.phase == .failed else { throw WorkspaceRunError.modeUnavailable }
        guard runs[index].turn.mode == .council, previous.id == runs[index].id,
              previous.turnID == runs[index].turn.id, previous.prompt == runs[index].turn.prompt,
              previous.selectedArtifact == runs[index].turn.selectedArtifact else {
            throw CouncilRecordValidationError.invalidSavedResults
        }
        try previous.validateSavedResults()
        if previous.selectedArtifact != nil, CouncilRunner.draftPrompt(previous).utf8.count > CouncilRunner.maximumInputBytes {
            throw ArtifactContinuationError.tooLarge("Council retry")
        }
        guard previous.retryEligibility.allowsRetry else {
            throw WorkspaceRunError.councilRetryUnavailable(previous.retryEligibility.explanation ?? "Edit the prompt and start a new request.")
        }
        guard runs.filter({ $0.status == .running }).count < 2,
              activeRun(in: runs[index].conversationID) == nil else { throw WorkspaceRunError.busy }
        let participants: [CouncilParticipant]
        if let team = previous.teamConfiguration {
            participants = try team.participants(admittedBy: teamEvidence())
            guard participants.map(\.identity) == previous.participants else { throw TeamConfigurationError.invalidConfiguration }
        } else {
            // Historical transport-based identities are not migrated into teams.
            participants = try previous.participants.map { identity in
                guard identity.routeRef == nil, let route = [AIExecutionRoute.codexCLI, .claudeCodeCLI].first(where: {
                    $0.providerID == identity.providerID && $0.runtimeAdapterID == identity.adapterID && $0.transportID == identity.id
                }) else { throw WorkspaceRunError.modeUnavailable }
                return .init(identity: identity, route: route, options: .init(model: identity.modelID, effort: identity.requestedEffort))
            }
        }
        try CouncilRunner.validateRuntimeParticipants(participants, team: previous.teamConfiguration)
        let original = runs[index]
        runs[index].status = .running; runs[index].stage = .asking
        runs[index].turn.executionState = .pending
        runs[index].turn.combinedError = nil
        guard let nextRevision = Self.nextDurableRevision(after: runs[index].durableRevision) else {
            runs[index] = original; throw WorkspaceRunError.storageUnavailable
        }
        runs[index].durableRevision = nextRevision
        do { try persist() } catch { runs[index] = original; throw WorkspaceRunError.storageUnavailable }
        publish(runs[index], durable: true)
        let request = CouncilRequest(runID: id, turnID: previous.turnID, prompt: previous.prompt,
            approvedContext: previous.approvedContext, criteria: previous.criteria, participants: participants, previous: previous, teamConfiguration: previous.teamConfiguration, selectedArtifact: previous.selectedArtifact)
        var roleAwareRequest = request
        roleAwareRequest.approvedPromptContext = previous.approvedPromptContext
        let gated = GatedCouncilTextRunner(base: textRunner, gate: councilGate)
        tasks[id] = Task { [weak self] in
            let record = await CouncilRunner(textRunner: gated).run(roleAwareRequest) { [weak self] record in
                await self?.updateCouncil(id: id, original: original.turn, record: record)
            }
            let turn = Self.councilTurn(original: original.turn, record: record)
            self?.update(id: id, turn: turn, stage: RivuneStore.completionStage(for: turn), terminal: true)
            self?.tasks[id] = nil
        }
    }

    func cancel(_ id: UUID) {
        guard let index = runs.firstIndex(where: { $0.id == id && $0.status == .running }) else { return }
        tasks[id]?.cancel()
        tasks[id] = nil
        var turn = runs[index].turn
        turn.executionState = .cancelled
        turn.councilRun?.phase = .cancelled
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
        for run in removed {
            onForgotten?(run)
            tasks[run.id]?.cancel(); tasks[run.id] = nil
        }
        revision += 1
    }

    private func updateCouncil(id: UUID, original: ChatTurn, record: CouncilRunRecord) {
        let turn = Self.councilTurn(original: original, record: record)
        update(id: id, turn: turn, stage: record.phase == .answering ? .asking : record.phase == .reviewing ? .synthesizing : RivuneStore.completionStage(for: turn), terminal: false)
    }

    private static func councilTurn(original: ChatTurn, record: CouncilRunRecord) -> ChatTurn {
        var turn = original
        turn.councilRun = record
        turn.combinedError = record.error
        if let text = record.finalText, record.phase == .complete {
            let lead = record.appointments.last?.participant
            turn.combinedAnswer = AIAnswer(id: record.turnID, source: .alloy, content: text, responseTime: record.elapsedSeconds,
                provenance: "Council lead: \(lead?.displayName ?? "Unknown") · Requested model: \(lead?.modelID ?? "Account default"); resolved model unknown")
        }
        switch record.phase {
        case .answering, .reviewing: turn.executionState = .pending
        case .complete: turn.executionState = .complete
        case .cancelled: turn.executionState = .cancelled
        case .interrupted: turn.executionState = .interrupted
        case .partial, .failed: turn.executionState = .failed
        }
        return turn
    }

    private func update(id: UUID, turn: ChatTurn, stage: CouncilStage, terminal: Bool) {
        guard let index = runs.firstIndex(where: { $0.id == id && $0.status == .running }) else { return }
        let previous = runs[index]
        runs[index].turn = turn
        runs[index].stage = stage
        runs[index].updatedAt = .now
        guard let nextRevision = Self.nextDurableRevision(after: runs[index].durableRevision) else {
            tasks[id]?.cancel(); runs[index] = previous
            storageError = WorkspaceRunError.storageUnavailable.localizedDescription
            isJournalReadable = false
            return
        }
        runs[index].durableRevision = nextRevision
        if terminal {
            switch turn.executionState {
            case .complete: runs[index].status = .complete
            case .cancelled: runs[index].status = .cancelled
            case .interrupted: runs[index].status = .interrupted
            default: runs[index].status = .failed
            }
        }
        do {
            try persist()
            publish(runs[index], durable: true)
        } catch {
            tasks[id]?.cancel()
            runs[index] = previous
            storageError = WorkspaceRunError.storageUnavailable.localizedDescription
            isJournalReadable = false
        }
    }

    private func publish(_ run: WorkspaceRun, durable: Bool = false) {
        revision += 1
        onUpdate?(run)
        if durable { onDurableUpdate?(run) }
    }

    nonisolated private static func nextDurableRevision(after current: Int?) -> Int? {
        let value = current ?? 0
        guard value >= 0, value < Int.max else { return nil }
        return value + 1
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
        case .together, .council, .swarm: turn.combinedError = message
        }
    }
}
