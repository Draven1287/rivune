import Foundation
import SwiftUI

enum EvaluationCandidateKind: String, CaseIterable, Codable, Hashable, Sendable {
    case codex
    case claude
    case rivune

    var displayName: String {
        switch self {
        case .codex: "Codex"
        case .claude: "Claude"
        case .rivune: "Rivune"
        }
    }

    var symbol: String {
        switch self {
        case .codex: "terminal"
        case .claude: "text.bubble"
        case .rivune: "arrow.triangle.merge"
        }
    }
}

enum EvaluationRunState: String, Codable, Hashable, Sendable {
    case runningBaselines
    case runningRivune
    case awaitingSelection
    case revealed
    case needsAttention
    case cancelled
    case interrupted

    var title: String {
        switch self {
        case .runningBaselines: "Running independent answers"
        case .runningRivune: "Running full collaboration"
        case .awaitingSelection: "Choose the strongest answer"
        case .revealed: "Comparison revealed"
        case .needsAttention: "Comparison needs attention"
        case .cancelled: "Comparison stopped"
        case .interrupted: "Comparison interrupted"
        }
    }

    var isRunning: Bool {
        self == .runningBaselines || self == .runningRivune
    }
}

struct EvaluationConfiguration: Codable, Hashable, Sendable {
    let codexModel: CodexModelChoice
    let codexEffort: CodexReasoningEffort
    let claudeModel: ClaudeModelChoice
    let claudeEffort: ClaudeReasoningEffort

    var summary: String {
        "\(codexModel.title) · \(codexEffort.title)  +  \(claudeModel.title) · \(claudeEffort.title)"
    }
}

struct EvaluationRun: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let prompt: String
    let createdAt: Date
    var updatedAt: Date
    let configuration: EvaluationConfiguration
    let candidateOrder: [EvaluationCandidateKind]
    var codexAnswer: AIAnswer?
    var claudeAnswer: AIAnswer?
    var rivuneTurn: ChatTurn?
    var codexError: String?
    var claudeError: String?
    var rivuneError: String?
    var state: EvaluationRunState
    var selectedSlotIndex: Int?
    var abstained: Bool
    var revealedAt: Date?

    init(
        id: UUID = UUID(),
        prompt: String,
        createdAt: Date = .now,
        configuration: EvaluationConfiguration,
        candidateOrder: [EvaluationCandidateKind]? = nil
    ) {
        self.id = id
        self.prompt = prompt
        self.createdAt = createdAt
        updatedAt = createdAt
        self.configuration = configuration
        self.candidateOrder = candidateOrder ?? Self.blindOrder(for: id)
        state = .runningBaselines
        abstained = false
    }

    var hasEveryCandidate: Bool {
        codexAnswer != nil && claudeAnswer != nil && rivuneTurn?.combinedAnswer != nil
    }

    var winner: EvaluationCandidateKind? {
        guard let selectedSlotIndex,
              candidateOrder.indices.contains(selectedSlotIndex) else { return nil }
        return candidateOrder[selectedSlotIndex]
    }

    func answer(for kind: EvaluationCandidateKind) -> AIAnswer? {
        switch kind {
        case .codex: codexAnswer
        case .claude: claudeAnswer
        case .rivune: rivuneTurn?.combinedAnswer
        }
    }

    func error(for kind: EvaluationCandidateKind) -> String? {
        switch kind {
        case .codex: codexError
        case .claude: claudeError
        case .rivune: rivuneError
        }
    }

    static func blindOrder(for id: UUID) -> [EvaluationCandidateKind] {
        let permutations: [[EvaluationCandidateKind]] = [
            [.codex, .claude, .rivune],
            [.codex, .rivune, .claude],
            [.claude, .codex, .rivune],
            [.claude, .rivune, .codex],
            [.rivune, .codex, .claude],
            [.rivune, .claude, .codex]
        ]
        return permutations[Int(id.uuid.0) % permutations.count]
    }
}

struct EvaluationCandidatePresentation: Identifiable, Equatable, Sendable {
    let slotIndex: Int
    let title: String
    let content: String
    let revealedIdentity: String?
    let metadata: String?
    let isSelected: Bool

    var id: Int { slotIndex }

    static func candidates(for run: EvaluationRun) -> [Self] {
        run.candidateOrder.enumerated().compactMap { index, kind in
            guard let answer = run.answer(for: kind) else { return nil }
            let isRevealed = run.state == .revealed
            return Self(
                slotIndex: index,
                title: "Answer \(Self.slotLetter(index))",
                content: answer.content,
                revealedIdentity: isRevealed ? kind.displayName : nil,
                metadata: isRevealed
                    ? [answer.provenance, Self.duration(answer.responseTime)]
                        .compactMap { $0 }
                        .joined(separator: " · ")
                    : nil,
                isSelected: run.selectedSlotIndex == index
            )
        }
    }

    static func slotLetter(_ index: Int) -> String {
        String(UnicodeScalar(65 + max(0, min(index, 25)))!)
    }

    private static func duration(_ seconds: Double) -> String? {
        guard seconds > 0 else { return nil }
        if seconds >= 60 {
            return String(format: "%.1f min", seconds / 60)
        }
        return String(format: "%.1f sec", seconds)
    }
}

struct EvaluationScorecard: Equatable, Sendable {
    let judged: Int
    let rivuneWins: Int
    let codexWins: Int
    let claudeWins: Int
    let abstentions: Int

    init(runs: [EvaluationRun]) {
        let revealed = runs.filter { $0.state == .revealed }
        judged = revealed.filter { $0.winner != nil }.count
        rivuneWins = revealed.filter { $0.winner == .rivune }.count
        codexWins = revealed.filter { $0.winner == .codex }.count
        claudeWins = revealed.filter { $0.winner == .claude }.count
        abstentions = revealed.filter(\.abstained).count
    }

    var rivuneWinRate: Int? {
        guard judged > 0 else { return nil }
        return Int((Double(rivuneWins) / Double(judged) * 100).rounded())
    }
}

enum EvaluationHistoryStorageError: Error {
    case applicationSupportUnavailable
}

struct EvaluationHistorySnapshot: Codable, Equatable, Sendable {
    let revision: UInt64
    let runs: [EvaluationRun]
}

enum EvaluationHistoryStorage {
    static let maximumStoredRuns = 40
    static let maximumAnswerBytes = 240_000

    private static var defaultApplicationSupportDirectory: URL? {
        FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first
    }

    static func currentFileURL(in applicationSupport: URL) -> URL {
        applicationSupport
            .appendingPathComponent(RivuneBrand.historyDirectoryName, isDirectory: true)
            .appendingPathComponent("evaluations.json")
    }

    static func backupFileURL(in applicationSupport: URL) -> URL {
        currentFileURL(in: applicationSupport)
            .deletingLastPathComponent()
            .appendingPathComponent("evaluations.backup.json")
    }

    static func load() -> [EvaluationRun] {
        guard let root = defaultApplicationSupportDirectory else { return [] }
        return load(from: root)
    }

    static func load(from applicationSupport: URL) -> [EvaluationRun] {
        let urls = [currentFileURL(in: applicationSupport), backupFileURL(in: applicationSupport)]
        let stored = urls.compactMap(storedSnapshot(at:))
        guard let newest = stored.max(by: { lhs, rhs in
            if lhs.snapshot.revision != rhs.snapshot.revision {
                return lhs.snapshot.revision < rhs.snapshot.revision
            }
            return lhs.modifiedAt < rhs.modifiedAt
        }) else { return [] }

        var runs = newest.snapshot.runs.filter {
            $0.candidateOrder.count == EvaluationCandidateKind.allCases.count
                && Set($0.candidateOrder) == Set(EvaluationCandidateKind.allCases)
        }
        var changed = runs.count != newest.snapshot.runs.count
            || stored.count != urls.count
            || stored.contains { $0.snapshot != newest.snapshot }
        for index in runs.indices {
            let bounded = boundedRun(runs[index])
            if bounded != runs[index] {
                runs[index] = bounded
                changed = true
            }

            if runs[index].hasEveryCandidate && runs[index].state != .revealed {
                runs[index].state = .awaitingSelection
                runs[index].updatedAt = .now
                changed = true
            } else if runs[index].state.isRunning {
                runs[index].state = .interrupted
                runs[index].updatedAt = .now
                changed = true
            } else if runs[index].state == .awaitingSelection
                        && !runs[index].hasEveryCandidate {
                runs[index].state = .needsAttention
                runs[index].updatedAt = .now
                changed = true
            }
        }

        runs.sort { $0.updatedAt > $1.updatedAt }
        if runs.count > maximumStoredRuns {
            runs = Array(runs.prefix(maximumStoredRuns))
            changed = true
        }
        if changed { try? save(runs, in: applicationSupport) }
        return runs
    }

    static func save(_ runs: [EvaluationRun]) throws {
        guard let root = defaultApplicationSupportDirectory else {
            throw EvaluationHistoryStorageError.applicationSupportUnavailable
        }
        try save(runs, in: root)
    }

    static func save(_ runs: [EvaluationRun], in applicationSupport: URL) throws {
        let primary = currentFileURL(in: applicationSupport)
        let backup = backupFileURL(in: applicationSupport)
        let boundedRuns = Array(runs.prefix(maximumStoredRuns)).map(boundedRun)
        let currentRevision = [primary, backup]
            .compactMap(storedSnapshot(at:))
            .map(\.snapshot.revision)
            .max() ?? 0
        let nextRevision = currentRevision == UInt64.max ? currentRevision : currentRevision + 1
        let data = try JSONEncoder().encode(
            EvaluationHistorySnapshot(revision: nextRevision, runs: boundedRuns)
        )
        try FileManager.default.createDirectory(
            at: primary.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )

        // The recovery copy is replaced first. If that cannot succeed, the
        // canonical file is left untouched and the caller can keep its prior
        // in-memory state. If the canonical replacement then fails, remove its
        // stale copy; the newly written recovery copy remains authoritative.
        try data.write(to: backup, options: [.atomic])
        do {
            try data.write(to: primary, options: [.atomic])
        } catch {
            try? FileManager.default.removeItem(at: primary)
            guard (try? Data(contentsOf: backup)) == data else { throw error }
        }

        for url in [primary, backup] where FileManager.default.fileExists(atPath: url.path) {
            try? FileManager.default.setAttributes(
                [.posixPermissions: 0o600],
                ofItemAtPath: url.path
            )
            #if os(iOS)
            try? FileManager.default.setAttributes(
                [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                ofItemAtPath: url.path
            )
            #endif
        }
    }

    private static func storedSnapshot(at url: URL) -> StoredEvaluationSnapshot? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        let decoder = JSONDecoder()
        let snapshot: EvaluationHistorySnapshot
        if let decoded = try? decoder.decode(EvaluationHistorySnapshot.self, from: data) {
            snapshot = decoded
        } else if let legacyRuns = try? decoder.decode([EvaluationRun].self, from: data) {
            snapshot = EvaluationHistorySnapshot(revision: 0, runs: legacyRuns)
        } else {
            return nil
        }
        let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
        let modifiedAt = attributes?[.modificationDate] as? Date ?? .distantPast
        return StoredEvaluationSnapshot(snapshot: snapshot, modifiedAt: modifiedAt)
    }

    private static func boundedRun(_ original: EvaluationRun) -> EvaluationRun {
        var run = original
        run.codexAnswer = boundedAnswer(run.codexAnswer)
        run.claudeAnswer = boundedAnswer(run.claudeAnswer)
        if var turn = run.rivuneTurn {
            turn.chatGPTAnswer = boundedAnswer(turn.chatGPTAnswer)
            turn.claudeAnswer = boundedAnswer(turn.claudeAnswer)
            turn.combinedAnswer = boundedAnswer(turn.combinedAnswer)
            run.rivuneTurn = turn
        }
        return run
    }

    private static func boundedAnswer(_ answer: AIAnswer?) -> AIAnswer? {
        guard let answer else { return nil }
        let content = boundedText(answer.content, byteLimit: maximumAnswerBytes)
        guard content != answer.content else { return answer }
        return AIAnswer(
            id: answer.id,
            source: answer.source,
            content: content,
            responseTime: answer.responseTime,
            provenance: answer.provenance
        )
    }

    static func boundedText(_ text: String, byteLimit: Int) -> String {
        let data = Data(text.utf8)
        guard data.count > byteLimit else { return text }
        let suffix = "\n\n[truncated]"
        let suffixBytes = suffix.utf8.count
        var end = max(0, byteLimit - suffixBytes)
        while end > 0 {
            if let prefix = String(data: data.prefix(end), encoding: .utf8) {
                return prefix + suffix
            }
            end -= 1
        }
        return String(suffix.prefix(byteLimit))
    }
}

private struct StoredEvaluationSnapshot {
    let snapshot: EvaluationHistorySnapshot
    let modifiedAt: Date
}
@MainActor
final class EvaluationLabStore: ObservableObject {
    static let maximumPromptBytes = 16 * 1_024

    @Published var prompt = ""
    @Published private(set) var runs: [EvaluationRun]
    @Published var selectedRunID: UUID?
    @Published private(set) var activeRunID: UUID?
    @Published private(set) var progressDetail = ""
    @Published private(set) var storageError: String?
    @Published private(set) var validationError: String?

    private let service: any AITextRunning
    private let collaborationRunner: RivuneCollaborationRunner
    private let historyRoot: URL?
    private var task: Task<Void, Never>?

    init(
        service: any AITextRunning = AITextRuntimeRegistry.current,
        historyRoot: URL? = nil
    ) {
        self.service = service
        self.historyRoot = historyRoot
        collaborationRunner = RivuneCollaborationRunner(textRunner: service)
        runs = historyRoot.map(EvaluationHistoryStorage.load(from:))
            ?? EvaluationHistoryStorage.load()
        selectedRunID = runs.first?.id
    }

    var isRunning: Bool { activeRunID != nil }
    var selectedRun: EvaluationRun? {
        guard let selectedRunID else { return nil }
        return runs.first { $0.id == selectedRunID }
    }
    var scorecard: EvaluationScorecard { .init(runs: runs) }

    func start(configuration: EvaluationConfiguration) {
        let cleanPrompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanPrompt.isEmpty, !isRunning else { return }
        guard cleanPrompt.utf8.count <= Self.maximumPromptBytes else {
            validationError = "Please shorten this evaluation prompt to 16 KB or less."
            return
        }
        validationError = nil
        let run = EvaluationRun(prompt: cleanPrompt, configuration: configuration)
        runs.insert(run, at: 0)
        if runs.count > EvaluationHistoryStorage.maximumStoredRuns {
            runs = Array(runs.prefix(EvaluationHistoryStorage.maximumStoredRuns))
        }
        selectedRunID = run.id
        activeRunID = run.id
        prompt = ""
        progressDetail = "Preparing two isolated baseline requests"
        persist()
        task = Task { [weak self] in
            await self?.execute(runID: run.id)
        }
    }

    func retryMissingCandidates(_ runID: UUID) {
        guard !isRunning,
              let index = runs.firstIndex(where: { $0.id == runID }),
              !runs[index].hasEveryCandidate else { return }
        runs[index].state = .runningBaselines
        runs[index].updatedAt = .now
        activeRunID = runID
        progressDetail = "Retrying only unfinished candidates"
        persist()
        task = Task { [weak self] in
            await self?.execute(runID: runID)
        }
    }

    func continueToJudging(_ runID: UUID) {
        guard !isRunning,
              let index = runs.firstIndex(where: { $0.id == runID }),
              runs[index].hasEveryCandidate,
              runs[index].state != .revealed else { return }
        let originalRuns = runs
        runs[index].state = .awaitingSelection
        runs[index].updatedAt = .now
        if !persist() { runs = originalRuns }
    }

    func cancel() {
        guard let activeRunID else { return }
        task?.cancel()
        task = nil
        if let index = runs.firstIndex(where: { $0.id == activeRunID }) {
            runs[index].state = .cancelled
            runs[index].updatedAt = .now
        }
        self.activeRunID = nil
        progressDetail = ""
        persist()
    }

    func select(slotIndex: Int, in runID: UUID) {
        guard let index = runs.firstIndex(where: { $0.id == runID }),
              runs[index].state == .awaitingSelection,
              runs[index].candidateOrder.indices.contains(slotIndex) else { return }
        let originalRuns = runs
        runs[index].selectedSlotIndex = slotIndex
        runs[index].abstained = false
        runs[index].revealedAt = .now
        runs[index].state = .revealed
        runs[index].updatedAt = .now
        if !persist() { runs = originalRuns }
    }

    func revealWithoutSelecting(_ runID: UUID) {
        guard let index = runs.firstIndex(where: { $0.id == runID }),
              runs[index].state == .awaitingSelection else { return }
        let originalRuns = runs
        runs[index].selectedSlotIndex = nil
        runs[index].abstained = true
        runs[index].revealedAt = .now
        runs[index].state = .revealed
        runs[index].updatedAt = .now
        if !persist() { runs = originalRuns }
    }

    func delete(_ runID: UUID) {
        guard activeRunID != runID else { return }
        let remainingRuns = runs.filter { $0.id != runID }
        guard remainingRuns.count != runs.count,
              persist(remainingRuns) else { return }
        runs = remainingRuns
        if selectedRunID == runID { selectedRunID = runs.first?.id }
    }

    private func execute(runID: UUID) async {
        guard activeRunID == runID,
              let initial = runs.first(where: { $0.id == runID }) else { return }
        let configuration = initial.configuration
        let cleanPrompt = initial.prompt
        let baselinePrompt = Self.blindBaselinePrompt(userPrompt: cleanPrompt)

        let needsCodex = initial.codexAnswer == nil
        let needsClaude = initial.claudeAnswer == nil
        if needsCodex || needsClaude {
            update(runID) {
                $0.state = .runningBaselines
                $0.codexError = needsCodex ? nil : $0.codexError
                $0.claudeError = needsClaude ? nil : $0.claudeError
            }
            progressDetail = "Codex and Claude are answering independently"
            async let codex = needsCodex
                ? Self.runBaseline(
                    service: service,
                    route: .codexCLI,
                    source: .chatGPT,
                    prompt: baselinePrompt,
                    userPrompt: cleanPrompt,
                    options: .init(
                        model: configuration.codexModel.cliValue,
                        effort: configuration.codexEffort.cliValue
                    ),
                    provenance: "\(configuration.codexModel.title) · \(configuration.codexEffort.title)"
                )
                : nil
            async let claude = needsClaude
                ? Self.runBaseline(
                    service: service,
                    route: .claudeCodeCLI,
                    source: .claude,
                    prompt: baselinePrompt,
                    userPrompt: cleanPrompt,
                    options: .init(
                        model: configuration.claudeModel.cliValue,
                        effort: configuration.claudeEffort.cliValue
                    ),
                    provenance: "\(configuration.claudeModel.title) · \(configuration.claudeEffort.title)"
                )
                : nil
            let outcomes = await (codex, claude)
            guard !Task.isCancelled else {
                finishCancelled(runID)
                return
            }
            update(runID) { run in
                if let outcome = outcomes.0 {
                    run.codexAnswer = outcome.answer
                    run.codexError = outcome.error
                }
                if let outcome = outcomes.1 {
                    run.claudeAnswer = outcome.answer
                    run.claudeError = outcome.error
                }
            }
        }

        guard let refreshed = runs.first(where: { $0.id == runID }) else { return }
        if refreshed.rivuneTurn?.combinedAnswer == nil {
            update(runID) {
                $0.state = .runningRivune
                $0.rivuneError = nil
            }
            progressDetail = "Rivune is planning and challenging the work split"
            let request = RivuneCollaborationRequest(
                turnID: UUID(),
                createdAt: initial.createdAt,
                prompt: cleanPrompt,
                priorContext: "",
                attachments: [],
                codexOptions: .init(
                    model: configuration.codexModel.cliValue,
                    effort: configuration.codexEffort.cliValue
                ),
                claudeOptions: .init(
                    model: configuration.claudeModel.cliValue,
                    effort: configuration.claudeEffort.cliValue
                ),
                codexProvenance: "\(configuration.codexModel.title) · \(configuration.codexEffort.title)",
                claudeProvenance: "\(configuration.claudeModel.title) · \(configuration.claudeEffort.title)"
            )
            let turn = await collaborationRunner.run(request) { [weak self] snapshot in
                guard let self, activeRunID == runID else { return }
                progressDetail = Self.progressText(for: snapshot.turn.togetherTrace?.phase)
                update(runID) { $0.rivuneTurn = Self.evaluationSafeTurn(snapshot.turn) }
            }
            guard !Task.isCancelled else {
                finishCancelled(runID)
                return
            }
            update(runID) { run in
                let safeTurn = Self.evaluationSafeTurn(turn)
                run.rivuneTurn = safeTurn
                run.rivuneError = safeTurn.combinedError
            }
        }

        guard activeRunID == runID else { return }
        update(runID) { run in
            run.state = run.hasEveryCandidate ? .awaitingSelection : .needsAttention
            run.updatedAt = .now
        }
        activeRunID = nil
        task = nil
        progressDetail = ""
    }

    private func finishCancelled(_ runID: UUID) {
        guard activeRunID == runID else { return }
        update(runID) {
            $0.state = .cancelled
            $0.updatedAt = .now
        }
        activeRunID = nil
        task = nil
        progressDetail = ""
    }

    private func update(_ runID: UUID, mutation: (inout EvaluationRun) -> Void) {
        guard let index = runs.firstIndex(where: { $0.id == runID }) else { return }
        mutation(&runs[index])
        runs[index].updatedAt = .now
        persist()
    }

    @discardableResult
    private func persist(_ value: [EvaluationRun]? = nil) -> Bool {
        do {
            let value = value ?? runs
            if let historyRoot {
                try EvaluationHistoryStorage.save(value, in: historyRoot)
            } else {
                try EvaluationHistoryStorage.save(value)
            }
            storageError = nil
            return true
        } catch {
            storageError = "Evaluation history could not be saved locally."
            return false
        }
    }

    nonisolated static func blindBaselinePrompt(userPrompt: String) -> String {
        let envelope = RivuneStore.independentPrompt(
            userPrompt: userPrompt,
            priorContext: "",
            attachments: []
        )
        return envelope + """

        For this blind comparison, do not name or identify yourself, your provider, your model, Rivune, candidate letters, or the evaluation process. Return only the polished answer.
        """
    }

    private nonisolated static func runBaseline(
        service: any AITextRunning,
        route: AIExecutionRoute,
        source: AnswerSource,
        prompt: String,
        userPrompt: String,
        options: TerminalRunOptions,
        provenance: String
    ) async -> BaselineOutcome {
        do {
            let result = try await service.run(route, prompt: prompt, options: options)
            let cleaned = result.text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleaned.isEmpty,
                  !RivuneStore.containsInternalCoordinationLeak(
                      cleaned,
                      userPrompt: userPrompt
                  ),
                  !containsIdentityDisclosure(cleaned) else {
                return .init(answer: nil, error: "The baseline answer could not be displayed safely.")
            }
            return .init(
                answer: AIAnswer(
                    source: source,
                    content: EvaluationHistoryStorage.boundedText(
                        cleaned,
                        byteLimit: EvaluationHistoryStorage.maximumAnswerBytes
                    ),
                    responseTime: result.elapsedSeconds,
                    provenance: provenance
                ),
                error: nil
            )
        } catch let error as TerminalEngineError {
            return .init(answer: nil, error: error.userMessage)
        } catch {
            return .init(answer: nil, error: "The baseline request did not finish.")
        }
    }

    nonisolated static func containsIdentityDisclosure(_ text: String) -> Bool {
        let normalized = text
            .folding(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)
            .lowercased()
            .replacingOccurrences(of: "’", with: "'")
        let disclosures = [
            "as claude", "i am claude", "i'm claude", "this is claude", "claude here",
            "as chatgpt", "i am chatgpt", "i'm chatgpt", "this is chatgpt", "chatgpt here",
            "as codex", "i am codex", "i'm codex", "this is codex", "codex here",
            "as rivune", "i am rivune", "i'm rivune", "this is rivune", "rivune here",
            "as an anthropic assistant", "as an anthropic ai", "as an anthropic model",
            "i am an anthropic assistant", "i'm an anthropic assistant",
            "as an openai assistant", "as an openai ai", "as an openai model",
            "i am an openai assistant", "i'm an openai assistant",
            "i come from anthropic", "i am from anthropic", "i'm from anthropic",
            "i come from openai", "i am from openai", "i'm from openai",
            "my provider is anthropic", "my creator is anthropic", "i was created by anthropic",
            "my provider is openai", "my creator is openai", "i was created by openai"
        ]
        return disclosures.contains(where: normalized.contains)
    }

    nonisolated static func evaluationSafeTurn(_ original: ChatTurn) -> ChatTurn {
        guard let answer = original.combinedAnswer,
              containsIdentityDisclosure(answer.content) else { return original }
        var turn = original
        turn.combinedAnswer = nil
        turn.combinedError = "The Rivune candidate identified its source, so the blind comparison withheld it. Retry that candidate."
        turn.executionState = .failed
        turn.togetherTrace?.failedPhase = .integrating
        turn.togetherTrace?.phase = .failed
        return turn
    }

    private nonisolated static func progressText(for phase: TogetherPhase?) -> String {
        switch phase {
        case .planning: "Rivune is creating and challenging the work plan"
        case .contributing: "Both models are completing complementary work"
        case .reviewing: "Both models are checking each other's work"
        case .integrating: "Rivune is resolving the final candidate"
        case .complete: "The blind candidates are ready"
        case .failed: "The Rivune candidate needs attention"
        case .cancelled: "The comparison was stopped"
        case nil: "Rivune is preparing the collaboration"
        }
    }

}

private struct BaselineOutcome: Sendable {
    let answer: AIAnswer?
    let error: String?
}

struct EvaluationLabView: View {
    @ObservedObject var store: RivuneStore
    @StateObject private var lab = EvaluationLabStore()
    @Environment(\.dismiss) private var dismiss
    @State private var pendingConfiguration: EvaluationConfiguration?
    @State private var pendingDeletionID: UUID?

    var body: some View {
        #if os(macOS)
        NavigationSplitView {
            historySidebar
                .navigationSplitViewColumnWidth(min: 220, ideal: 250, max: 290)
        } detail: {
            VStack(spacing: 0) {
                if let message = lab.storageError ?? lab.validationError {
                    Label(message, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.orange)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 10)
                        .background(Color.orange.opacity(0.10))
                }
                detail
            }
        }
        .frame(minWidth: 980, minHeight: 680)
        .background(RivuneBackground())
        .preferredColorScheme(.dark)
        .interactiveDismissDisabled(lab.isRunning)
        .confirmationDialog(
            "Run a blind comparison?",
            isPresented: Binding(
                get: { pendingConfiguration != nil },
                set: { if !$0 { pendingConfiguration = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Run deep benchmark") {
                guard let pendingConfiguration else { return }
                lab.start(configuration: pendingConfiguration)
                self.pendingConfiguration = nil
            }
            Button("Cancel", role: .cancel) { pendingConfiguration = nil }
        } message: {
            Text("The same fresh prompt is sent to Codex alone, Claude alone, and the full Rivune workflow. A substantial comparison normally uses nine CLI requests, may use a tenth fallback request, and can take several minutes. Candidate answers appear together when all three are ready; identities and run metadata stay hidden until you choose or reveal them.")
        }
        .confirmationDialog(
            "Delete this evaluation?",
            isPresented: Binding(
                get: { pendingDeletionID != nil },
                set: { if !$0 { pendingDeletionID = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete evaluation", role: .destructive) {
                guard let pendingDeletionID else { return }
                lab.delete(pendingDeletionID)
                self.pendingDeletionID = nil
            }
            Button("Cancel", role: .cancel) { pendingDeletionID = nil }
        } message: {
            Text("This permanently removes the prompt, all three answers, the Rivune workflow trace, and your selection from both local history copies.")
        }
        #else
        VStack(spacing: 18) {
            RivuneOrb(size: 72, motionEnabled: false)
            Text("Evaluation Lab runs on your Mac")
                .font(.title2.bold())
            Text("The blind benchmark uses both installed CLI clients and the complete Rivune workflow. Open Evaluation Lab on your paired Mac for this first version.")
                .foregroundStyle(RivunePalette.secondaryText)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 420)
            Button("Done") { dismiss() }
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RivuneBackground())
        .preferredColorScheme(.dark)
        #endif
    }

    #if os(macOS)
    private var historySidebar: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Evaluation Lab")
                        .font(.headline)
                    Text("Local blind comparisons")
                        .font(.caption)
                        .foregroundStyle(RivunePalette.tertiaryText)
                }
                Spacer()
                Button {
                    lab.selectedRunID = nil
                } label: {
                    Image(systemName: "plus")
                }
                .buttonStyle(.plain)
                .disabled(lab.isRunning)
                .accessibilityLabel("New evaluation")
            }
            .padding(16)

            if lab.selectedRun.map({ $0.state.isRunning || $0.state == .awaitingSelection }) == true {
                Label("Past results are hidden while you judge", systemImage: "eye.slash")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(RivunePalette.secondaryText)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
            } else {
                scorecard
                    .padding(.horizontal, 12)
                    .padding(.bottom, 12)
            }

            Divider().overlay(RivunePalette.hairline)

            ScrollView {
                LazyVStack(spacing: 4) {
                    ForEach(lab.runs) { run in
                        Button {
                            lab.selectedRunID = run.id
                        } label: {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(run.prompt)
                                    .font(.subheadline.weight(.medium))
                                    .lineLimit(2)
                                HStack(spacing: 5) {
                                    Circle()
                                        .fill(statusColor(run.state))
                                        .frame(width: 6, height: 6)
                                    Text(run.state.title)
                                        .font(.caption2)
                                        .foregroundStyle(RivunePalette.tertiaryText)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(
                                lab.selectedRunID == run.id
                                    ? RivunePalette.surfaceRaised
                                    : .clear,
                                in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                            )
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(lab.selectedRunID == run.id ? .isSelected : [])
                        .contextMenu {
                            if !run.state.isRunning {
                                Button("Delete", systemImage: "trash", role: .destructive) {
                                    pendingDeletionID = run.id
                                }
                            }
                        }
                    }
                }
                .padding(8)
            }

            Divider().overlay(RivunePalette.hairline)
            Button("Close", systemImage: "xmark") { dismiss() }
                .buttonStyle(.plain)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .disabled(lab.isRunning)
        }
        .background(RivunePalette.sidebar)
    }

    private var scorecard: some View {
        let score = lab.scorecard
        return VStack(alignment: .leading, spacing: 9) {
            HStack {
                Text("Your blind preferences")
                    .font(.caption.weight(.semibold))
                Spacer()
                Text(score.rivuneWinRate.map { "Rivune \($0)%" } ?? "No picks yet")
                    .font(.caption2)
                    .foregroundStyle(RivunePalette.tertiaryText)
            }
            LazyVGrid(
                columns: [GridItem(.flexible()), GridItem(.flexible())],
                alignment: .leading,
                spacing: 8
            ) {
                metric("Judged", value: "\(score.judged)")
                metric("Rivune", value: "\(score.rivuneWins)")
                metric("Codex", value: "\(score.codexWins)")
                metric("Claude", value: "\(score.claudeWins)")
                metric("No choice", value: "\(score.abstentions)")
            }
        }
        .padding(10)
        .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .stroke(RivunePalette.hairline, lineWidth: 0.7)
        }
    }

    private func metric(_ title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value).font(.subheadline.weight(.semibold).monospacedDigit())
            Text(title).font(.caption2).foregroundStyle(RivunePalette.tertiaryText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var detail: some View {
        if let run = lab.selectedRun {
            runDetail(run)
        } else {
            newEvaluation
        }
    }

    private var newEvaluation: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Run a blind answer comparison")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                    Text("Ask one fresh prompt three ways, compare the anonymous results, then reveal which workflow produced each answer.")
                        .font(.title3)
                        .foregroundStyle(RivunePalette.secondaryText)
                        .frame(maxWidth: 700, alignment: .leading)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Evaluation prompt")
                        .font(.headline)
                    TextEditor(text: $lab.prompt)
                        .font(.body)
                        .scrollContentBackground(.hidden)
                        .padding(12)
                        .frame(minHeight: 170)
                        .background(RivunePalette.composer, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(RivunePalette.hairline, lineWidth: 0.8)
                        }

                    HStack(alignment: .firstTextBaseline) {
                        Text("Judge correctness, honesty about uncertainty, completeness, and usefulness—not writing style alone.")
                            .font(.caption)
                            .foregroundStyle(RivunePalette.secondaryText)
                        Spacer()
                        Text("\(lab.prompt.utf8.count / 1_024) / 16 KB")
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(
                                lab.prompt.utf8.count > EvaluationLabStore.maximumPromptBytes
                                    ? .orange
                                    : RivunePalette.tertiaryText
                            )
                    }

                    HStack {
                        Label("Fresh context · no attachments", systemImage: "shield.lefthalf.filled")
                            .font(.caption)
                            .foregroundStyle(RivunePalette.secondaryText)
                        Spacer()
                        Button("Run blind comparison", systemImage: "play.fill") {
                            pendingConfiguration = currentConfiguration
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.white)
                        .foregroundStyle(.black)
                        .disabled(
                            lab.prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                                || lab.isRunning
                                || lab.prompt.utf8.count > EvaluationLabStore.maximumPromptBytes
                                || store.codexReadiness != .ready
                                || store.claudeReadiness != .ready
                        )
                        .accessibilityHint(runButtonHint)
                    }

                    HStack(spacing: 12) {
                        Label(
                            "Codex: \(store.codexReadiness.label)",
                            systemImage: store.codexReadiness == .ready ? "checkmark.circle.fill" : "exclamationmark.circle"
                        )
                        Label(
                            "Claude: \(store.claudeReadiness.label)",
                            systemImage: store.claudeReadiness == .ready ? "checkmark.circle.fill" : "exclamationmark.circle"
                        )
                        Spacer()
                        Button("Refresh connections", systemImage: "arrow.clockwise") {
                            store.refreshConnections()
                        }
                        .buttonStyle(.plain)
                    }
                    .font(.caption)
                    .foregroundStyle(RivunePalette.tertiaryText)
                }
                .padding(20)
                .rivuneGlass(cornerRadius: 20)

                VStack(alignment: .leading, spacing: 10) {
                    Text("Frozen configuration")
                        .font(.headline)
                    Text(currentConfiguration.summary)
                        .foregroundStyle(RivunePalette.secondaryText)
                    Text("The two baseline prompts are byte-identical. Their answers never enter the Rivune workflow.")
                        .font(.caption)
                        .foregroundStyle(RivunePalette.tertiaryText)
                    Text("This is a local preference test, not proof of objective model quality. Up to 40 prompts, answers, settings, selections, and workflow receipts are stored in Rivune's private Application Support folder until you delete them.")
                        .font(.caption)
                        .foregroundStyle(RivunePalette.tertiaryText)
                }
            }
            .frame(maxWidth: 820, alignment: .leading)
            .padding(34)
        }
        .background(RivunePalette.canvas)
    }

    private func runDetail(_ run: EvaluationRun) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 7) {
                        Text(run.prompt)
                            .font(.title2.bold())
                        if run.state == .revealed {
                            Text(run.configuration.summary)
                                .font(.caption)
                                .foregroundStyle(RivunePalette.tertiaryText)
                        } else if run.state == .awaitingSelection {
                            Label("Identities and run metadata hidden", systemImage: "eye.slash")
                                .font(.caption)
                                .foregroundStyle(RivunePalette.tertiaryText)
                        }
                    }
                    Spacer()
                    stateBadge(run.state)
                }

                switch run.state {
                case .runningBaselines, .runningRivune:
                    runningView(run)
                case .awaitingSelection, .revealed:
                    candidatesView(run)
                case .needsAttention, .cancelled, .interrupted:
                    attentionView(run)
                }
            }
            .frame(maxWidth: 900, alignment: .leading)
            .padding(30)
        }
        .background(RivunePalette.canvas)
    }

    private func runningView(_ run: EvaluationRun) -> some View {
        VStack(spacing: 18) {
            ProgressView()
                .controlSize(.large)
            Text(lab.progressDetail.isEmpty ? run.state.title : lab.progressDetail)
                .font(.headline)
            Text("All answers stay hidden until every candidate is ready.")
                .font(.subheadline)
                .foregroundStyle(RivunePalette.secondaryText)
            Button("Stop evaluation", role: .destructive) { lab.cancel() }
                .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 70)
        .rivuneGlass(cornerRadius: 22)
    }

    private func candidatesView(_ run: EvaluationRun) -> some View {
        let candidates = EvaluationCandidatePresentation.candidates(for: run)
        return VStack(alignment: .leading, spacing: 16) {
            Text("Compare the usable result. Prefer the answer that is correct, candid about uncertainty, complete, and practical.")
                .font(.subheadline)
                .foregroundStyle(RivunePalette.secondaryText)

            Text("All three answers are shown in one comparison so you can inspect details without relying on memory.")
                .font(.caption)
                .foregroundStyle(RivunePalette.tertiaryText)

            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: 14) {
                    ForEach(candidates) { candidate in
                        candidateComparisonColumn(candidate, run: run)
                            .frame(minWidth: 280, maxWidth: .infinity, alignment: .top)
                    }
                }

                VStack(spacing: 14) {
                    ForEach(candidates) { candidate in
                        candidateComparisonColumn(candidate, run: run)
                    }
                }
            }

            if run.state == .awaitingSelection {
                Button("Reveal identities without choosing") {
                    lab.revealWithoutSelecting(run.id)
                }
                .buttonStyle(.plain)
                .foregroundStyle(RivunePalette.secondaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
            } else if run.abstained {
                Label("Revealed without a selection", systemImage: "equal.circle")
                    .foregroundStyle(RivunePalette.secondaryText)
            } else if let winner = run.winner {
                Label("You chose \(winner.displayName)", systemImage: "checkmark.seal.fill")
                    .foregroundStyle(RivunePalette.success)
            }
        }
    }

    private func candidateComparisonColumn(
        _ candidate: EvaluationCandidatePresentation,
        run: EvaluationRun
    ) -> some View {
        VStack(spacing: 10) {
            candidateCard(candidate, run: run)

            if run.state == .awaitingSelection {
                Button("Choose \(candidate.title)") {
                    lab.select(slotIndex: candidate.slotIndex, in: run.id)
                }
                .buttonStyle(.borderedProminent)
                .tint(.white)
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityHint("Commits your judgment, then reveals the source and run metadata for every answer")
            }
        }
    }

    private func candidateCard(
        _ candidate: EvaluationCandidatePresentation,
        run: EvaluationRun
    ) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 9) {
                Text(candidate.title)
                    .font(.headline)
                if let identity = candidate.revealedIdentity {
                    Text(identity)
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(RivunePalette.control, in: Capsule())
                }
                if candidate.isSelected {
                    Text("Your choice")
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(RivunePalette.success.opacity(0.18), in: Capsule())
                        .foregroundStyle(RivunePalette.success)
                }
                Spacer()
                if let metadata = candidate.metadata {
                    Text(metadata)
                        .font(.caption2)
                        .foregroundStyle(RivunePalette.tertiaryText)
                }
            }

            MarkdownResponseText(content: candidate.content)

            if run.state == .revealed,
               run.candidateOrder[candidate.slotIndex] == .rivune,
               let trace = run.rivuneTurn?.togetherTrace {
                Divider().overlay(RivunePalette.hairline)
                if trace.collaborationShape == .directResponse {
                    Label("Direct response path · reciprocal review was not required", systemImage: "minus.circle")
                        .font(.caption)
                        .foregroundStyle(RivunePalette.secondaryText)
                } else {
                    HStack(spacing: 14) {
                        Label(trace.collaborationShape?.title ?? "Rivune workflow", systemImage: "arrow.triangle.branch")
                        Label(
                            trace.chatGPTReview == nil ? "Codex review missing" : "Codex review saved",
                            systemImage: trace.chatGPTReview == nil ? "exclamationmark.circle" : "checkmark.circle.fill"
                        )
                        Label(
                            trace.claudeReview == nil ? "Claude review missing" : "Claude review saved",
                            systemImage: trace.claudeReview == nil ? "exclamationmark.circle" : "checkmark.circle.fill"
                        )
                    }
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                }
            }
        }
        .padding(22)
        .rivuneGlass(cornerRadius: 20)
    }

    private func attentionView(_ run: EvaluationRun) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Label(run.state.title, systemImage: "exclamationmark.triangle")
                .font(.headline)
            Text("Completed candidates were kept locally. Retry runs only the missing candidates with the original frozen model settings.")
                .foregroundStyle(RivunePalette.secondaryText)
            ForEach(EvaluationCandidateKind.allCases, id: \.self) { kind in
                HStack {
                    Image(systemName: run.answer(for: kind) == nil ? "xmark.circle" : "checkmark.circle.fill")
                    Text(kind.displayName)
                    Spacer()
                    Text(run.answer(for: kind) == nil ? (run.error(for: kind) ?? "Not completed") : "Saved")
                        .font(.caption)
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .lineLimit(1)
                }
            }
            Button(
                run.hasEveryCandidate ? "Continue to judging" : "Retry missing candidates",
                systemImage: run.hasEveryCandidate ? "checkmark.circle" : "arrow.clockwise"
            ) {
                if run.hasEveryCandidate {
                    lab.continueToJudging(run.id)
                } else {
                    lab.retryMissingCandidates(run.id)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(lab.isRunning)
        }
        .padding(22)
        .rivuneGlass(cornerRadius: 20)
    }

    private var currentConfiguration: EvaluationConfiguration {
        .init(
            codexModel: store.codexModel,
            codexEffort: store.codexEffort,
            claudeModel: store.claudeModel,
            claudeEffort: store.claudeEffort
        )
    }

    private var runButtonHint: String {
        if lab.prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return "Enter a prompt first."
        }
        if lab.prompt.utf8.count > EvaluationLabStore.maximumPromptBytes {
            return "Shorten the prompt to 16 KB or less."
        }
        if store.codexReadiness != .ready || store.claudeReadiness != .ready {
            return "Both Codex and Claude must be signed in on this Mac."
        }
        return "Runs two isolated baselines and the full Rivune collaboration."
    }

    private func stateBadge(_ state: EvaluationRunState) -> some View {
        Label(state.title, systemImage: stateSymbol(state))
            .font(.caption.weight(.semibold))
            .foregroundStyle(state == .revealed ? RivunePalette.success : RivunePalette.secondaryText)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(RivunePalette.surface, in: Capsule())
    }

    private func statusColor(_ state: EvaluationRunState) -> Color {
        switch state {
        case .revealed: RivunePalette.success
        case .awaitingSelection: RivunePalette.rivune
        case .runningBaselines, .runningRivune: RivunePalette.ultra
        case .needsAttention, .cancelled, .interrupted: .orange
        }
    }

    private func stateSymbol(_ state: EvaluationRunState) -> String {
        switch state {
        case .runningBaselines, .runningRivune: "circle.dotted"
        case .awaitingSelection: "eye.slash"
        case .revealed: "checkmark.circle.fill"
        case .needsAttention: "exclamationmark.triangle.fill"
        case .cancelled: "stop.circle.fill"
        case .interrupted: "bolt.slash.circle.fill"
        }
    }
    #endif
}
