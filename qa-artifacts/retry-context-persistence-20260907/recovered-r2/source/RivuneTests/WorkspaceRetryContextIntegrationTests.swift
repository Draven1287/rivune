// Reconstructed after reboot. Native integration tests; NOT yet executed.
import Foundation
import XCTest
@testable import Rivune

private actor RetryContextRecordingRunner: AITextRunning {
    private var prompts: [String] = []
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        prompts.append(prompt)
        return .init(text: "A considered fixture response.", elapsedSeconds: 0.01)
    }
    func recordedPrompts() -> [String] { prompts }
}

@MainActor
final class WorkspaceRetryContextIntegrationTests: XCTestCase {
    private func context() -> ApprovedPromptContext {
        .init(priorConversation: .roleAware(.init(messages: [
            .init(turnID: UUID(), role: .user, content: "Original history A"),
            .init(turnID: UUID(), role: .assistant, content: "Original answer A")
        ])), approvedProjectInstructions: "Project A: keep the approved accessibility requirements.",
        userSelectedDocuments: [.init(name: "approved.txt", textContent: "Approved file A", byteCount: 15)])
    }

    private func finish(_ id: UUID, coordinator: RivuneRunCoordinator) async throws -> WorkspaceRun {
        let deadline = ContinuousClock.now + .seconds(3)
        while ContinuousClock.now < deadline {
            if let run = coordinator.runs.first(where: { $0.id == id }), run.status != .running { return run }
            try await Task.sleep(for: .milliseconds(5))
        }
        XCTFail("The recording-runner request did not finish")
        return try XCTUnwrap(coordinator.runs.first(where: { $0.id == id }))
    }

    func testHistoryReloadThenRetryReplaysOriginalProviderPrompt() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let runner = RetryContextRecordingRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let approved = context(), conversationID = UUID(), runID = UUID()
        _ = try coordinator.submit(id: runID, conversationID: conversationID, requestKey: UUID().uuidString,
            turn: ChatTurn(prompt: "Build the accessible page", mode: .chatGPT, attachments: approved.userSelectedDocuments),
            promptContext: approved, codexOptions: .accountDefault, claudeOptions: .accountDefault,
            codexProvenance: "fixture", claudeProvenance: "fixture")
        let completed = try await finish(runID, coordinator: coordinator)
        XCTAssertEqual(completed.status, .complete)
        let saved = Conversation(id: conversationID, title: "Original", preview: "Done", updatedAt: .now,
            mode: .chatGPT, turns: [completed.turn])
        XCTAssertTrue(RivuneHistoryStorage.save([saved], in: root))
        let loaded = try XCTUnwrap(RivuneHistoryStorage.load(from: root).first)
        let original = try XCTUnwrap(loaded.turns.first)
        XCTAssertEqual(original.retryContext?.context, approved)
        let retryCoordinator = RivuneRunCoordinator(textRunner: runner)
        let store = RivuneStore(runCoordinator: retryCoordinator, draftStorageURL: root.appendingPathComponent("drafts.json"))
        store.conversations = [loaded]
        store.conversations[0].turns.append(ChatTurn(prompt: "Later history C must not enter retry", mode: .chatGPT))
        store.selectConversation(conversationID)
        store.mode = .claude
        store.composerText = "Keep this unfinished draft"
        store.codexReadiness = .ready
        store.retry(original)
        let admitted = try XCTUnwrap(retryCoordinator.runs.first)
        let retried = try await finish(admitted.id, coordinator: retryCoordinator)
        XCTAssertEqual(retried.status, .complete)
        let prompts = await runner.recordedPrompts()
        XCTAssertEqual(prompts.count, 2)
        XCTAssertEqual(prompts.first, prompts.last)
        XCTAssertFalse(prompts.last?.contains("Later history C") ?? true)
        XCTAssertTrue(prompts.last?.contains("Project A") ?? false)
        XCTAssertEqual(retried.turn.retryContext?.context, approved)
        XCTAssertEqual(store.composerText, "Keep this unfinished draft")
        XCTAssertEqual(store.mode, .claude)
    }

    func testTogetherProgressAndTerminalJournalKeepAdmittedContext() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let journal = root.appendingPathComponent("runs.json")
        let runner = RetryContextRecordingRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner, journalURL: journal)
        var observed: [WorkspaceRun] = []
        coordinator.onUpdate = { observed.append($0) }
        let approved = context(), id = UUID()
        let admitted = try coordinator.submit(id: id, conversationID: UUID(), requestKey: UUID().uuidString,
            turn: ChatTurn(prompt: "Compare two practical approaches to improving a reading club", mode: .together,
                attachments: approved.userSelectedDocuments), promptContext: approved,
            codexOptions: .accountDefault, claudeOptions: .accountDefault,
            codexProvenance: "fixture", claudeProvenance: "fixture")
        let terminal = try await finish(id, coordinator: coordinator)
        XCTAssertNotEqual(terminal.status, .running)
        XCTAssertGreaterThan(observed.count, 1)
        for update in observed { XCTAssertEqual(update.turn.retryContext, admitted.turn.retryContext) }
        XCTAssertEqual(terminal.turn.retryContext?.context, approved)
        let reopened = RivuneRunCoordinator(textRunner: runner, journalURL: journal)
        XCTAssertTrue(reopened.isJournalReadable)
        XCTAssertEqual(reopened.runs.first?.turn.retryContext, admitted.turn.retryContext)
    }

    func testCorruptHistoryCannotFallbackOrOverwriteOriginal() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: root) }
        let approved = context(), conversationID = UUID()
        var turn = ChatTurn(prompt: "Original", mode: .chatGPT, attachments: approved.userSelectedDocuments)
        turn.retryContext = try WorkspaceRetryContext(conversationID: conversationID, turnID: turn.id, prompt: turn.prompt, context: approved)
        let conversation = Conversation(id: conversationID, title: "Original", preview: "", updatedAt: .now, mode: .chatGPT, turns: [turn])
        XCTAssertTrue(RivuneHistoryStorage.save([conversation], in: root))
        XCTAssertTrue(RivuneHistoryStorage.save([conversation], in: root))
        let file = RivuneHistoryStorage.currentFileURL(in: root)
        let backup = file.deletingLastPathComponent().appendingPathComponent("conversations.backup.json")
        let beforeBackup = try Data(contentsOf: backup)
        var raw = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [[String: Any]])
        var turns = try XCTUnwrap(raw[0]["turns"] as? [[String: Any]])
        var retry = try XCTUnwrap(turns[0]["retryContext"] as? [String: Any])
        retry["snapshotSHA256"] = "corrupted"
        turns[0]["retryContext"] = retry; raw[0]["turns"] = turns
        let damaged = try JSONSerialization.data(withJSONObject: raw)
        try damaged.write(to: file)
        XCTAssertTrue(RivuneHistoryStorage.artifactRecoveryRequired(in: root))
        XCTAssertTrue(RivuneHistoryStorage.load(from: root).isEmpty)
        XCTAssertFalse(RivuneHistoryStorage.save([], in: root))
        XCTAssertEqual(try Data(contentsOf: file), damaged)
        XCTAssertEqual(try Data(contentsOf: backup), beforeBackup)
    }

    func testLegacyRetryCannotDispatchOrReplaceDraft() async throws {
        let runner = RetryContextRecordingRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let turn = ChatTurn(prompt: "Legacy request", mode: .chatGPT, chatGPTError: "Offline")
        let conversation = Conversation(title: "Old", preview: "", updatedAt: .now, mode: .chatGPT, turns: [turn])
        let store = RivuneStore(runCoordinator: coordinator)
        store.conversations = [conversation]
        store.selectConversation(conversation.id)
        store.composerText = "My current draft"
        store.codexReadiness = .ready
        store.retry(turn)
        XCTAssertTrue(coordinator.runs.isEmpty)
        XCTAssertEqual(store.composerText, "My current draft")
        XCTAssertEqual(store.showActionNotice, WorkspaceRetryContextError.unavailable.localizedDescription)
        let prompts = await runner.recordedPrompts()
        XCTAssertTrue(prompts.isEmpty)
    }
}
