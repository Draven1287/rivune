import Foundation
import XCTest
@testable import Rivune

private actor ArtifactRecordingTransport: AITextRunning {
    enum Behavior { case normal, fallback, repair, largeDrafts, failedLeads, largeOriginal }
    private var prompts: [String] = []
    private var leadCount = 0
    private var behavior: Behavior
    init(_ behavior: Behavior = .normal) { self.behavior = behavior }
    func recover() { behavior = .normal }
    func snapshot() -> [String] { prompts }
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        prompts.append(prompt)
        let lead = prompt.contains("INDEPENDENT ANSWERS JSON:")
        if lead { leadCount += 1 }
        if behavior == .failedLeads && lead { throw NSError(domain: "recording", code: 1) }
        if behavior == .fallback && lead && leadCount == 1 { throw NSError(domain: "recording", code: 1) }
        if behavior == .largeDrafts && !lead { return .init(text: String(repeating: "d", count: 55 * 1_024), elapsedSeconds: 0) }
        if behavior == .largeOriginal && lead { return .init(text: String(repeating: "word ", count: 22_000), elapsedSeconds: 0) }
        if behavior == .repair && lead { return .init(text: String(repeating: "word ", count: 100), elapsedSeconds: 0) }
        return .init(text: "Complete result", elapsedSeconds: 0)
    }
}

@MainActor
final class ArtifactContinuationTests: XCTestCase {
    private var participants: [CouncilParticipant] {
        [.init(identity: .init(id: AIExecutionRoute.codexCLI.transportID, providerID: "openai", adapterID: AIExecutionRoute.codexCLI.runtimeAdapterID, modelID: nil, displayName: "ChatGPT"), route: .codexCLI, options: .accountDefault),
         .init(identity: .init(id: AIExecutionRoute.claudeCodeCLI.transportID, providerID: "anthropic", adapterID: AIExecutionRoute.claudeCodeCLI.runtimeAdapterID, modelID: nil, displayName: "Claude"), route: .claudeCodeCLI, options: .accountDefault)]
    }
    private func fixture(content: String = String(repeating: "h", count: 32_000)) throws -> (Conversation, ArtifactContinuation) {
        let files = [ArtifactContinuation.File(path: "index.html", content: content), .init(path: "styles.css", content: String(repeating: "c", count: 1_001))]
        struct Manifest: Encodable { let summary: String; let files: [ArtifactContinuation.File] }
        let raw = String(decoding: try JSONEncoder().encode(Manifest(summary: "Selected website", files: files)), as: UTF8.self)
        let answer = AIAnswer(source: .chatGPT, content: raw, responseTime: 0)
        let turn = ChatTurn(prompt: "Build this", mode: .chatGPT, chatGPTAnswer: answer, executionState: .complete)
        let conversation = Conversation(id: UUID(), title: "Files", preview: "Files", updatedAt: .now, mode: .chatGPT, turns: [turn])
        return (conversation, try ArtifactContinuation(sourceConversationID: conversation.id, sourceTurnID: turn.id, sourceAnswerID: answer.id, sourceResponse: raw, summary: "Selected website", files: files))
    }
    private func temp() throws -> URL {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("rivune-artifact-tests-\(UUID())")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir
    }
    private func decodeSelection(_ prompt: String) throws -> ArtifactContinuation {
        let boundary = prompt.contains("\nJSON PAYLOAD\n") ? "\nJSON PAYLOAD\n" : "\nFROZEN TASK JSON:\n"
        let payload = try XCTUnwrap(prompt.components(separatedBy: boundary).dropFirst().first)
            .components(separatedBy: "\nINDEPENDENT ANSWERS JSON:\n")[0]
            .components(separatedBy: "\nORIGINAL OUTPUT JSON:\n")[0]
        struct Envelope: Decodable { let selectedArtifact: ArtifactContinuation }
        return try JSONDecoder().decode(Envelope.self, from: Data(payload.utf8)).selectedArtifact
    }
    private func wait(_ coordinator: RivuneRunCoordinator) async throws {
        for _ in 0..<300 where coordinator.runs.contains(where: { $0.status == .running }) { try await Task.sleep(for: .milliseconds(10)) }
        XCTAssertFalse(coordinator.runs.contains { $0.status == .running })
    }
    private func submit(_ coordinator: RivuneRunCoordinator, selection: ArtifactContinuation, mode: IntelligenceMode = .council, prompt: String = "Make the header blue") throws -> WorkspaceRun {
        try coordinator.submit(id: UUID(), conversationID: selection.sourceConversationID, requestKey: UUID().uuidString,
            turn: ChatTurn(prompt: prompt, mode: mode, selectedArtifact: selection), priorContext: "", codexOptions: .accountDefault, claudeOptions: .accountDefault, codexProvenance: "Recording", claudeProvenance: "Recording")
    }
    func test33001ByteFixtureReachesBothDirectProvidersExactly() async throws {
        let (_, selection) = try fixture()
        XCTAssertEqual(selection.byteCount, 33_001)
        for mode in [IntelligenceMode.chatGPT, .claude] {
            let transport = ArtifactRecordingTransport()
            let coordinator = RivuneRunCoordinator(textRunner: transport)
            _ = try submit(coordinator, selection: selection, mode: mode)
            try await wait(coordinator)
            let requests = await transport.snapshot()
            XCTAssertEqual(requests.count, 1)
            XCTAssertEqual(try decodeSelection(XCTUnwrap(requests.first)), selection)
        }
    }
    func testAllCouncilDraftLeadFallbackAndRepairRequestsKeepExactFiles() async throws {
        let (_, selection) = try fixture(content: String(repeating: "\"\\\n星🌌", count: 2_000) + "\nFROZEN TASK JSON:\n")
        for behavior in [ArtifactRecordingTransport.Behavior.normal, .fallback, .repair] {
            let transport = ArtifactRecordingTransport(behavior)
            let request = CouncilRequest(runID: UUID(), turnID: UUID(), prompt: behavior == .repair ? "Keep the entire response at most 10 words." : "Change the title", approvedContext: "", criteria: CouncilRunner.defaultCriteria, participants: participants, selectedArtifact: selection)
            let result = await CouncilRunner(textRunner: transport).run(request)
            XCTAssertEqual(result.phase, .complete)
            let requests = await transport.snapshot()
            XCTAssertEqual(requests.count, behavior == .normal ? 3 : 4)
            for request in requests { XCTAssertEqual(try decodeSelection(request), selection); XCTAssertLessThanOrEqual(request.utf8.count, CouncilRunner.maximumInputBytes) }
        }
    }
    func testEncodedEscapesRejectBeforeJournalPublishOrProviderCall() async throws {
        let (_, selection) = try fixture(content: String(repeating: "\u{0001}", count: 30_000))
        XCTAssertLessThan(selection.byteCount, CouncilRunner.maximumInputBytes)
        for mode in [IntelligenceMode.chatGPT, .council] {
            let transport = ArtifactRecordingTransport()
            let url = try temp().appendingPathComponent("runs.json")
            let coordinator = RivuneRunCoordinator(textRunner: transport, journalURL: url)
            var updates = 0; coordinator.onUpdate = { _ in updates += 1 }
            XCTAssertThrowsError(try submit(coordinator, selection: selection, mode: mode))
            XCTAssertEqual(coordinator.revision, 0); XCTAssertEqual(updates, 0); XCTAssertTrue(coordinator.runs.isEmpty)
            XCTAssertFalse(FileManager.default.fileExists(atPath: url.path))
            let requests = await transport.snapshot(); XCTAssertTrue(requests.isEmpty)
        }
    }
    func testExactDirectEnvelopeBoundaryAndHistoryCanBeDroppedWithoutFiles() throws {
        let (_, selection) = try fixture()
        let base = try selection.independentPrompt(userPrompt: "", history: "", documents: "[]")
        let remaining = CouncilRunner.maximumInputBytes - base.utf8.count
        let fitted = try selection.independentPrompt(userPrompt: String(repeating: "a", count: remaining), history: "", documents: "[]")
        XCTAssertEqual(fitted.utf8.count, CouncilRunner.maximumInputBytes)
        XCTAssertEqual(try decodeSelection(fitted), selection)
        XCTAssertThrowsError(try selection.independentPrompt(userPrompt: String(repeating: "a", count: remaining + 1), history: "", documents: "[]"))
        let withoutHistory = try selection.independentPrompt(userPrompt: "Edit", history: String(repeating: "x", count: CouncilRunner.maximumInputBytes), documents: "[]")
        XCTAssertEqual(try decodeSelection(withoutHistory), selection)
    }
    func testLaterCouncilEnvelopeFailureRetainsCompleteDrafts() async throws {
        let (_, selection) = try fixture()
        let transport = ArtifactRecordingTransport(.largeDrafts)
        let coordinator = RivuneRunCoordinator(textRunner: transport)
        _ = try submit(coordinator, selection: selection)
        try await wait(coordinator)
        let record = try XCTUnwrap(coordinator.runs.first?.turn.councilRun)
        XCTAssertEqual(record.phase, .partial); XCTAssertEqual(record.results.count, 2)
        XCTAssertTrue(record.results.allSatisfy { $0.text?.utf8.count == 55 * 1_024 })
        XCTAssertTrue(record.error?.contains("Council review phase") == true)
        let requests = await transport.snapshot(); XCTAssertEqual(requests.count, 2)
        for request in requests { XCTAssertEqual(try decodeSelection(request), selection) }
    }
    func testFrozenSelectionSurvivesJournalRestartAndCouncilRetry() async throws {
        let (_, selection) = try fixture()
        let transport = ArtifactRecordingTransport(.failedLeads)
        let url = try temp().appendingPathComponent("runs.json")
        let coordinator = RivuneRunCoordinator(textRunner: transport, journalURL: url)
        let run = try submit(coordinator, selection: selection)
        try await wait(coordinator)
        XCTAssertEqual(coordinator.runs.first?.turn.councilRun?.phase, .partial)
        let recoveryTransport = ArtifactRecordingTransport()
        let recovered = RivuneRunCoordinator(textRunner: recoveryTransport, journalURL: url)
        XCTAssertNil(recovered.storageError)
        try recovered.retryCouncil(run.id)
        try await wait(recovered)
        XCTAssertEqual(recovered.runs.first?.turn.selectedArtifact, selection)
        let requests = await recoveryTransport.snapshot(); XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(try decodeSelection(XCTUnwrap(requests.first)), selection)
    }
    func testDraftConversationSwitchRemovalAndRelaunch() throws {
        let (conversation, selection) = try fixture()
        let url = try temp().appendingPathComponent("drafts.json")
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ArtifactRecordingTransport()), draftStorageURL: url)
        store.conversations = [conversation]; store.selectConversation(conversation.id)
        store.composerText = "Keep my edit"; store.selectArtifactForContinuation(answerID: selection.sourceAnswerID)
        XCTAssertEqual(store.draftArtifact, selection)
        store.newChat(); XCTAssertNil(store.draftArtifact)
        store.selectConversation(conversation.id)
        XCTAssertEqual(store.draftArtifact, selection); XCTAssertEqual(store.composerText, "Keep my edit")
        store.presentSettings(.appearance); store.closeWorkspaceSettings(); XCTAssertEqual(store.draftArtifact, selection)
        let restored = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ArtifactRecordingTransport()), draftStorageURL: url)
        restored.conversations = [conversation]; restored.selectConversation(conversation.id)
        XCTAssertEqual(restored.draftArtifact, selection); XCTAssertEqual(restored.composerText, "Keep my edit")
        restored.draftArtifact = nil
        let removed = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ArtifactRecordingTransport()), draftStorageURL: url)
        removed.conversations = [conversation]; removed.selectConversation(conversation.id); XCTAssertNil(removed.draftArtifact)
    }
    func testMissingOrChangedSourceRejectsAndKeepsDraftWithMemoryOff() async throws {
        let (conversation, selection) = try fixture()
        let transport = ArtifactRecordingTransport()
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: transport))
        store.conversations = [conversation]; store.selectConversation(conversation.id)
        store.composerText = "Still here"; store.draftArtifact = selection; store.memoryEnabled = false
        store.codexReadiness = .ready
        store.conversations[0].turns[0].chatGPTAnswer = AIAnswer(id: selection.sourceAnswerID, source: .chatGPT, content: "Changed response", responseTime: 0)
        XCTAssertThrowsError(try store.submitWorkspaceRun(id: UUID(), conversationID: conversation.id, prompt: store.composerText, requestMode: .chatGPT, requestKey: "changed", selectedArtifact: selection))
        XCTAssertEqual(store.composerText, "Still here"); XCTAssertEqual(store.draftArtifact, selection)
        store.conversations = []
        XCTAssertThrowsError(try store.validateArtifactSource(selection))
        let requests = await transport.snapshot(); XCTAssertTrue(requests.isEmpty)
    }
    func testCorruptedSnapshotDraftAndJournalPreserveOriginalBytes() throws {
        let (_, selection) = try fixture()
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(selection)) as? [String: Any])
        object["snapshotSHA256"] = String(repeating: "0", count: 64)
        let bad = try JSONSerialization.data(withJSONObject: object)
        XCTAssertThrowsError(try JSONDecoder().decode(ArtifactContinuation.self, from: bad))
        let dir = try temp(); let draftURL = dir.appendingPathComponent("drafts.json")
        let draft = try JSONSerialization.data(withJSONObject: ["drafts": ["new": ["text": "Do not lose this", "attachments": [], "selectedArtifact": object]]])
        try draft.write(to: draftURL)
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ArtifactRecordingTransport()), draftStorageURL: draftURL)
        XCTAssertFalse(store.isWorkspaceDraftReadable); store.composerText = "New input"
        XCTAssertFalse(store.prepareForUpdate()); XCTAssertEqual(try Data(contentsOf: draftURL), draft)
        let run = WorkspaceRun(id: UUID(), conversationID: UUID(), requestKey: "bad", turn: ChatTurn(prompt: "x", mode: .chatGPT, selectedArtifact: selection), status: .running, stage: .asking, updatedAt: .now)
        var runJSON = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(run)) as? [String: Any])
        var turnJSON = try XCTUnwrap(runJSON["turn"] as? [String: Any]); turnJSON["selectedArtifact"] = object; runJSON["turn"] = turnJSON
        let bytes = try JSONSerialization.data(withJSONObject: [runJSON]); let url = dir.appendingPathComponent("runs.json"); try bytes.write(to: url)
        let recovered = RivuneRunCoordinator(textRunner: ArtifactRecordingTransport(), journalURL: url)
        XCTAssertNotNil(recovered.storageError); XCTAssertTrue(recovered.runs.isEmpty); XCTAssertEqual(recovered.revision, 0)
        XCTAssertEqual(try Data(contentsOf: url), bytes)
    }
    func testLegacyTurnWithoutSelectionDecodesUnchanged() throws {
        let old = ChatTurn(prompt: "Legacy", mode: .chatGPT)
        let decoded = try JSONDecoder().decode(ChatTurn.self, from: JSONEncoder().encode(old))
        XCTAssertNil(decoded.selectedArtifact); XCTAssertEqual(decoded, old)
    }
    func test33001BytesWithMemoryDisabledAndNewerAnswerDoesNotReplaceSelection() async throws {
        var (conversation, selection) = try fixture()
        let newer = AIAnswer(source: .chatGPT, content: "A newer unrelated answer", responseTime: 0)
        conversation.turns.append(ChatTurn(prompt: "Later", mode: .chatGPT, chatGPTAnswer: newer))
        let transport = ArtifactRecordingTransport()
        let coordinator = RivuneRunCoordinator(textRunner: transport)
        let store = RivuneStore(runCoordinator: coordinator)
        store.conversations = [conversation]; store.selectConversation(conversation.id)
        store.selectArtifactForContinuation(answerID: selection.sourceAnswerID)
        store.memoryEnabled = false; store.codexReadiness = .ready
        _ = try store.submitWorkspaceRun(id: UUID(), conversationID: conversation.id, prompt: "Change blue to green", requestMode: .chatGPT, requestKey: "exact-old", selectedArtifact: store.draftArtifact)
        try await wait(coordinator)
        let requests = await transport.snapshot()
        XCTAssertEqual(requests.count, 1); XCTAssertEqual(try decodeSelection(XCTUnwrap(requests.first)), selection)
        XCTAssertFalse(requests[0].contains("A newer unrelated answer"))
        let councilTransport = ArtifactRecordingTransport()
        let result = await CouncilRunner(textRunner: councilTransport).run(.init(runID: UUID(), turnID: UUID(), prompt: "Edit the original", approvedContext: "", criteria: CouncilRunner.defaultCriteria, participants: participants, selectedArtifact: selection))
        XCTAssertEqual(result.phase, .complete)
        let councilRequests = await councilTransport.snapshot(); XCTAssertEqual(councilRequests.count, 3)
        for request in councilRequests { XCTAssertEqual(try decodeSelection(request), selection) }
    }
    func testNativeOversizeRejectionKeepsPromptSelectionAndDraftFile() async throws {
        let (conversation, selection) = try fixture(content: String(repeating: "\u{0001}", count: 30_000))
        let transport = ArtifactRecordingTransport(); let coordinator = RivuneRunCoordinator(textRunner: transport)
        let url = try temp().appendingPathComponent("drafts.json")
        let store = RivuneStore(runCoordinator: coordinator, draftStorageURL: url)
        store.conversations = [conversation]; store.selectConversation(conversation.id)
        store.composerText = "Keep the full draft"; store.draftArtifact = selection; store.codexReadiness = .ready
        let before = try Data(contentsOf: url)
        XCTAssertThrowsError(try store.submitWorkspaceRun(id: UUID(), conversationID: conversation.id, prompt: store.composerText, requestMode: .chatGPT, requestKey: "oversize", selectedArtifact: selection))
        XCTAssertEqual(store.composerText, "Keep the full draft"); XCTAssertEqual(store.draftArtifact, selection)
        XCTAssertEqual(try Data(contentsOf: url), before); XCTAssertEqual(coordinator.revision, 0)
        let requests = await transport.snapshot(); XCTAssertTrue(requests.isEmpty)
    }
    func testCouncilJournalMismatchedSnapshotFailsBeforeNormalization() throws {
        let (_, selection) = try fixture(); let (_, other) = try fixture(content: "Another revision")
        let id = UUID(); var turn = ChatTurn(prompt: "Edit", mode: .council, selectedArtifact: selection)
        var record = CouncilRunRecord(id: id, turnID: turn.id, prompt: turn.prompt, approvedContext: "", criteria: CouncilRunner.defaultCriteria, participants: participants.map(\.identity))
        record.selectedArtifact = other; turn.councilRun = record
        let run = WorkspaceRun(id: id, conversationID: UUID(), requestKey: "mismatch", turn: turn, status: .running, stage: .asking, updatedAt: .now)
        let url = try temp().appendingPathComponent("runs.json"); let bytes = try JSONEncoder().encode([run]); try bytes.write(to: url)
        let recovered = RivuneRunCoordinator(textRunner: ArtifactRecordingTransport(), journalURL: url)
        XCTAssertNotNil(recovered.storageError); XCTAssertTrue(recovered.runs.isEmpty); XCTAssertEqual(recovered.revision, 0)
        XCTAssertEqual(try Data(contentsOf: url), bytes)
    }
    func testDirectJournalRestartKeepsCompleteSelectionWithoutCallingProvider() async throws {
        let (_, selection) = try fixture(); let url = try temp().appendingPathComponent("runs.json")
        let coordinator = RivuneRunCoordinator(textRunner: ArtifactRecordingTransport(), journalURL: url)
        _ = try submit(coordinator, selection: selection, mode: .claude); try await wait(coordinator)
        let transport = ArtifactRecordingTransport(); let recovered = RivuneRunCoordinator(textRunner: transport, journalURL: url)
        XCTAssertNil(recovered.storageError); XCTAssertEqual(recovered.runs.first?.turn.selectedArtifact, selection)
        let requests = await transport.snapshot(); XCTAssertTrue(requests.isEmpty)
    }
    func testInvalidNewHistoryFieldCannotTriggerFallbackOrOverwrite() throws {
        let (conversation, _) = try fixture()
        let root = try temp(); let file = RivuneHistoryStorage.currentFileURL(in: root)
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(conversation)) as? [String: Any])
        var turns = try XCTUnwrap(object["turns"] as? [[String: Any]])
        turns[0]["selectedArtifact"] = ["files": "corrupt"]
        object["turns"] = turns
        let bytes = try JSONSerialization.data(withJSONObject: [object]); try bytes.write(to: file)
        let backup = file.deletingLastPathComponent().appendingPathComponent("conversations.backup.json")
        let backupBytes = try JSONEncoder().encode([conversation]); try backupBytes.write(to: backup)
        XCTAssertTrue(RivuneHistoryStorage.artifactRecoveryRequired(in: root))
        XCTAssertTrue(RivuneHistoryStorage.load(from: root).isEmpty)
        XCTAssertFalse(RivuneHistoryStorage.save([conversation], in: root))
        XCTAssertEqual(try Data(contentsOf: file), bytes); XCTAssertEqual(try Data(contentsOf: backup), backupBytes)
        XCTAssertFalse(RivuneHistoryStorage.hasInvalidArtifactSelections(backupBytes), "Legacy records retain their existing recovery path")
    }
    func testOversizedRepairEnvelopeRetainsOriginalAndMakesNoRepairCall() async throws {
        let (_, selection) = try fixture()
        let transport = ArtifactRecordingTransport(.largeOriginal)
        let coordinator = RivuneRunCoordinator(textRunner: transport)
        _ = try submit(coordinator, selection: selection, prompt: "Keep the entire response at most 10 words.")
        try await wait(coordinator)
        let record = try XCTUnwrap(coordinator.runs.first?.turn.councilRun)
        XCTAssertEqual(record.phase, .partial)
        XCTAssertTrue(record.error?.contains("Council word-limit repair") == true)
        XCTAssertEqual(record.outputReceipts?.first?.output.text?.utf8.count, 110_000)
        XCTAssertNil(record.finalText)
        let requests = await transport.snapshot(); XCTAssertEqual(requests.count, 3)
        for request in requests { XCTAssertEqual(try decodeSelection(request), selection) }
    }
    func testHealthyCurrentHistoryIgnoresInvalidUnusedBackupAndLegacy() throws {
        let (conversation, _) = try fixture()
        for staleKind in ["backup", "legacy"] {
            let root = try temp(); let current = RivuneHistoryStorage.currentFileURL(in: root)
            try FileManager.default.createDirectory(at: current.deletingLastPathComponent(), withIntermediateDirectories: true)
            let healthy = try JSONEncoder().encode([conversation]); try healthy.write(to: current)
            let candidates = RivuneHistoryStorage.candidateFileURLs(in: root)
            let stale = staleKind == "backup" ? candidates[1] : candidates[2]
            try FileManager.default.createDirectory(at: stale.deletingLastPathComponent(), withIntermediateDirectories: true)
            try Data("[{\"turns\":[{\"selectedArtifact\":false}]}]".utf8).write(to: stale)
            XCTAssertFalse(RivuneHistoryStorage.artifactRecoveryRequired(in: root), staleKind)
            XCTAssertEqual(RivuneHistoryStorage.load(from: root).map(\.id), [conversation.id], staleKind)
            XCTAssertTrue(RivuneHistoryStorage.save([conversation], in: root), staleKind)
        }
    }
}
