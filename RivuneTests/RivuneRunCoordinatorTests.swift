import Foundation
import XCTest
@testable import Rivune

private actor ControlledWorkspaceRunner: AITextRunning {
    private(set) var count = 0
    private var waiting: [CheckedContinuation<TerminalRunResult, Error>] = []
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        count += 1
        return try await withCheckedThrowingContinuation { waiting.append($0) }
    }
    func completeAll(_ text: String = "A real test result") {
        let pending = waiting
        waiting = []
        for continuation in pending { continuation.resume(returning: .init(text: text, elapsedSeconds: 0.1)) }
    }
}

@MainActor
final class RivuneRunCoordinatorTests: XCTestCase {
    private func enqueue(_ coordinator: RivuneRunCoordinator, id: UUID = UUID(), conversation: UUID = UUID(), key: String = "request") throws -> WorkspaceRun {
        try coordinator.submit(id: id, conversationID: conversation, requestKey: key,
            turn: ChatTurn(prompt: "Explain this code", mode: .chatGPT), priorContext: "",
            codexOptions: .accountDefault, claudeOptions: .accountDefault,
            codexProvenance: "Test", claudeProvenance: "Test")
    }

    private func settle() async {
        for _ in 0..<50 { await Task.yield() }
    }

    func testDuplicateIDDoesNotExecuteTwiceAndDifferentPayloadConflicts() async throws {
        let runner = ControlledWorkspaceRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let id = UUID()
        let first = try enqueue(coordinator, id: id)
        let duplicate = try enqueue(coordinator, id: id)
        XCTAssertEqual(first.turn.id, duplicate.turn.id)
        XCTAssertThrowsError(try enqueue(coordinator, id: id, key: "changed"))
        await settle()
        let count = await runner.count
        XCTAssertEqual(count, 1)
        await runner.completeAll()
        await settle()
        XCTAssertEqual(coordinator.runs.first?.status, .complete)
    }

    func testCancellationIgnoresLateProviderSuccess() async throws {
        let runner = ControlledWorkspaceRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let run = try enqueue(coordinator)
        await settle()
        coordinator.cancel(run.id)
        await runner.completeAll("Should never replace the cancellation")
        await settle()
        XCTAssertEqual(coordinator.runs.first?.status, .cancelled)
        XCTAssertNil(coordinator.runs.first?.turn.chatGPTAnswer)
    }

    func testConcurrentLimitAndOneRunPerConversation() async throws {
        let runner = ControlledWorkspaceRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let first = try enqueue(coordinator)
        XCTAssertThrowsError(try enqueue(coordinator, conversation: first.conversationID))
        _ = try enqueue(coordinator)
        XCTAssertThrowsError(try enqueue(coordinator))
        await settle()
        await runner.completeAll()
        await settle()
        XCTAssertEqual(coordinator.runs.filter { $0.status == .complete }.count, 2)
    }

    func testRestartMarksInterruptedWithoutExecutingAndRetainsDeletedIDs() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("runs.json")
        let runner = ControlledWorkspaceRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner, journalURL: url)
        let run = try enqueue(coordinator)
        await settle()
        let recoveryRunner = ControlledWorkspaceRunner()
        let recovered = RivuneRunCoordinator(textRunner: recoveryRunner, journalURL: url)
        XCTAssertEqual(recovered.runs.first?.status, .interrupted)
        XCTAssertEqual(recovered.runs.first?.turn.executionState, .interrupted)
        let executions = await recoveryRunner.count
        XCTAssertEqual(executions, 0)
        try coordinator.forget(conversationID: run.conversationID)
        XCTAssertThrowsError(try enqueue(coordinator, id: run.id))
        let afterDeletion = RivuneRunCoordinator(textRunner: recoveryRunner, journalURL: url)
        XCTAssertTrue(afterDeletion.runs.isEmpty)
        XCTAssertThrowsError(try enqueue(afterDeletion, id: run.id))
        await runner.completeAll()
        await settle()
        XCTAssertTrue(coordinator.runs.isEmpty)
    }

    func testCorruptJournalIsPreservedAndRejectsExecution() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("runs.json")
        let original = Data("damaged journal".utf8)
        try original.write(to: url)
        let coordinator = RivuneRunCoordinator(textRunner: ControlledWorkspaceRunner(), journalURL: url)
        XCTAssertThrowsError(try enqueue(coordinator))
        XCTAssertEqual(try Data(contentsOf: url), original)
    }

    func testInitialPersistenceFailureDoesNotLaunchProvider() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try Data("not a directory".utf8).write(to: directory)
        defer { try? FileManager.default.removeItem(at: directory) }
        let runner = ControlledWorkspaceRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner, journalURL: directory.appendingPathComponent("runs.json"))
        XCTAssertThrowsError(try enqueue(coordinator))
        await settle()
        let count = await runner.count
        XCTAssertEqual(count, 0)
        XCTAssertTrue(coordinator.runs.isEmpty)
    }

    func testNativeNavigationPreservesDraftAndBackgroundResult() async throws {
        XCTAssertTrue(RivuneLaunchContext.isIsolated, "Tests must never load real history or providers")
        let runner = ControlledWorkspaceRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let store = RivuneStore(runCoordinator: coordinator)
        store.codexReadiness = .ready
        let run = try store.submitWorkspaceRun(id: UUID(), conversationID: nil, prompt: "First task",
                                               requestMode: .chatGPT, requestKey: "first")
        store.selectConversation(run.conversationID)
        store.composerText = "Keep this draft"
        store.newChat()
        store.composerText = "A different draft"
        await settle()
        await runner.completeAll("Finished while another chat was selected")
        await settle()
        XCTAssertNil(store.selectedConversationID)
        XCTAssertTrue(store.turns.isEmpty)
        XCTAssertEqual(store.composerText, "A different draft")
        store.selectConversation(run.conversationID)
        XCTAssertEqual(store.composerText, "Keep this draft")
        XCTAssertEqual(store.turns.last?.chatGPTAnswer?.content, "Finished while another chat was selected")
        XCTAssertFalse(store.isGenerating)
    }

    func testReadinessAndUnknownConversationPreventExecution() async throws {
        let runner = ControlledWorkspaceRunner()
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: runner))
        XCTAssertThrowsError(try store.submitWorkspaceRun(id: UUID(), conversationID: nil, prompt: "Hello", requestMode: .chatGPT, requestKey: "one"))
        store.codexReadiness = .ready
        XCTAssertThrowsError(try store.submitWorkspaceRun(id: UUID(), conversationID: UUID(), prompt: "Hello", requestMode: .chatGPT, requestKey: "two"))
        await settle()
        let count = await runner.count
        XCTAssertEqual(count, 0)
    }

    func testBrowserModelMetadataUsesExistingCLIChoicesAndSupportedReasoning() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ModelSelectionWorkspaceRunner()))
        let codex = try XCTUnwrap(store.workspaceModelControls.first { $0.provider == "codex" })
        let claude = try XCTUnwrap(store.workspaceModelControls.first { $0.provider == "claude" })
        XCTAssertTrue(codex.editable)
        XCTAssertEqual(codex.transport, "cli")
        XCTAssertEqual(codex.models.map(\.id), CodexModelChoice.allCases.map(\.rawValue))
        for model in CodexModelChoice.allCases {
            XCTAssertEqual(codex.models.first { $0.id == model.rawValue }?.reasoningIds, model.supportedEfforts.map(\.rawValue))
        }
        XCTAssertEqual(claude.models.map(\.id), ClaudeModelChoice.allCases.map(\.rawValue))
        XCTAssertEqual(claude.models.first { $0.id == "haiku" }?.reasoningIds, ["automatic"])
        XCTAssertEqual(codex.selectedModel, store.codexModel.rawValue)
        XCTAssertEqual(codex.selectedReasoning, store.codexEffort.rawValue)
    }

    func testProviderCatalogPreservesCustomProvidersWithoutGrantingRuntimeSupportOrExposingConfiguration() throws {
        let provider = AIProviderConfiguration(id: "custom-provider", displayName: "Custom Research AI", transports: [
            .commandLine(.init(id: "custom-provider.cli", displayName: "Research CLI", executableName: "private-executable",
                runtimeAdapterID: "alloy.terminal.codex", implementation: .executableAdapter)),
            .api(.init(id: "custom-provider.api", displayName: "Research API", baseURL: URL(string: "https://private-endpoint.example")!,
                style: .custom, authenticationScheme: .customHeader,
                credential: .init(storage: .keychain, identifier: "private-credential-reference", account: "private-account")))
        ], models: [])
        let registry = AIProviderRegistry(catalog: .init(providers: [provider]))
        let fabricated = AIExecutionRoute(providerID: provider.id, transportID: "custom-provider.cli", runtimeAdapterID: "alloy.terminal.codex", transportKind: .commandLine)
        let catalog = WorkspaceProviderCatalogEntry.entries(registry: registry,
            checks: [.init(route: fabricated, title: "Untrusted readiness", readiness: .ready, detail: "Must not become ready")], activeRoutes: [fabricated])
        let entry = try XCTUnwrap(catalog.first)
        XCTAssertEqual(entry.id, "custom-provider")
        XCTAssertEqual(entry.title, "Custom Research AI")
        XCTAssertEqual(entry.transports.map(\.kind), ["cli", "api"])
        XCTAssertEqual(entry.transports.map(\.title), ["Research CLI", "Research API"])
        XCTAssertNil(entry.workspaceProvider)
        XCTAssertNil(entry.activeTransportId)
        XCTAssertTrue(entry.transports.allSatisfy { !$0.supported && !$0.active && !$0.modelSettings && $0.state == "adapterRequired" })
        let data = try JSONEncoder().encode(catalog)
        let text = try XCTUnwrap(String(data: data, encoding: .utf8))
        for privateValue in ["private-executable", "private-endpoint", "private-credential-reference", "private-account", "runtimeAdapterID"] {
            XCTAssertFalse(text.contains(privateValue))
        }
        let json = try XCTUnwrap((JSONSerialization.jsonObject(with: data) as? [[String: Any]])?.first)
        XCTAssertNil(json["workspaceProvider"])
        XCTAssertNil(json["activeTransportId"])
    }

    func testSupportedCatalogDoesNotInventReadinessBeforeChecks() throws {
        let catalog = WorkspaceProviderCatalogEntry.entries(checks: [], activeRoutes: [])
        XCTAssertEqual(catalog.map(\.title), ["ChatGPT", "Claude"])
        XCTAssertEqual(catalog.compactMap(\.workspaceProvider), ["codex", "claude"])
        XCTAssertEqual(catalog.flatMap(\.transports).count, 4)
        XCTAssertTrue(catalog.allSatisfy { $0.activeTransportId == nil && $0.selectionPolicy == "automatic" })
        XCTAssertTrue(catalog.flatMap(\.transports).allSatisfy { $0.supported && $0.modelSettings && !$0.active && $0.state == "notChecked" })
    }

    func testAutomaticCLIToAPITransitionChangesCatalogModelsAndRejectsOldOverride() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ModelSelectionWorkspaceRunner()))
        store.codexReadiness = .ready
        store.apiProbes[.openAI] = .init(readiness: .ready, detail: "API model metadata verified", modelID: "configured-api-model")
        store.connectionChecks = [
            .init(route: .codexCLI, title: "Codex CLI", readiness: .ready, detail: "CLI sign-in verified"),
            .init(route: .openAIResponsesAPI, title: "OpenAI API", readiness: .ready, detail: "API model metadata verified")
        ]
        store.selectedCodexRoute = StartupReadinessPolicy.route(cli: .ready, api: .ready, cliRoute: .codexCLI, apiRoute: .openAIResponsesAPI)
        XCTAssertEqual(store.workspaceProviderCatalog.first?.activeTransportId, "openai.codex-cli")
        XCTAssertEqual(store.workspaceModelControls.first?.transport, "cli")
        let oldOverride = ["codex": BrowserModelSelection(model: "gpt-5.5", reasoning: "high")]
        XCTAssertNoThrow(try store.resolveWorkspaceModelSelections(oldOverride, for: .chatGPT))

        store.connectionChecks[0] = .init(route: .codexCLI, title: "Codex CLI", readiness: .signedOut, detail: "Sign in required")
        store.selectedCodexRoute = StartupReadinessPolicy.route(cli: .signedOut, api: .ready, cliRoute: .codexCLI, apiRoute: .openAIResponsesAPI)
        let provider = try XCTUnwrap(store.workspaceProviderCatalog.first)
        XCTAssertEqual(provider.activeTransportId, "openai.responses-api")
        XCTAssertEqual(provider.transports.filter(\.active).map(\.id), ["openai.responses-api"])
        XCTAssertEqual(provider.transports.first?.state, "signInRequired")
        XCTAssertEqual(store.workspaceModelControls.first?.transport, "api")
        XCTAssertEqual(store.workspaceModelControls.first?.selectedModel, "configured-api-model")
        XCTAssertFalse(store.workspaceModelControls.first?.editable ?? true)
        XCTAssertThrowsError(try store.resolveWorkspaceModelSelections(oldOverride, for: .chatGPT))
    }

    #if os(macOS)
    func testSnapshotCatalogIsAdditiveAndAdvertisesNativeSettingsNavigation() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ModelSelectionWorkspaceRunner()))
        let result = store.handleWorkspaceRequest(.init(method: "GET", path: "/v1/workspace", body: Data()))
        XCTAssertEqual(result.status, 200)
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: result.jsonData) as? [String: Any])
        XCTAssertEqual(json["schemaVersion"] as? Int, 1)
        XCTAssertEqual((json["capabilities"] as? [String: Bool])?["settingsNavigation"], true)
        XCTAssertEqual((json["providerCatalog"] as? [[String: Any]])?.count, 2)
        struct LegacySnapshot: Decodable { let schemaVersion: Int; let revision: Int }
        XCTAssertEqual(try JSONDecoder().decode(LegacySnapshot.self, from: result.jsonData).schemaVersion, 1)
    }
    #endif

    func testBrowserOverrideReachesRunnerAndKeepsNativePreferences() async throws {
        let runner = ModelSelectionWorkspaceRunner()
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: runner))
        store.codexReadiness = .ready
        store.codexModel = .gpt55
        store.codexEffort = .medium
        let run = try store.submitWorkspaceRun(id: UUID(), conversationID: nil, prompt: "Fixture",
            requestMode: .chatGPT, requestKey: "request-model-override",
            modelSelections: ["codex": .init(model: "gpt-5.6-terra", reasoning: "ultra")])
        await settle()
        let calls = await runner.calls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.route, .codexCLI)
        XCTAssertEqual(calls.first?.options, .init(model: "gpt-5.6-terra", effort: "ultra"))
        XCTAssertEqual(store.codexModel, .gpt55)
        XCTAssertEqual(store.codexEffort, .medium)
        XCTAssertEqual(store.runCoordinator.runs.first { $0.id == run.id }?.turn.chatGPTAnswer?.provenance,
                       "Codex CLI · GPT-5.6 Terra · Ultra")
    }

    func testInvalidBrowserModelOrReasoningNeverEnqueuesProvider() async throws {
        let runner = ModelSelectionWorkspaceRunner()
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: runner))
        store.codexReadiness = .ready
        store.claudeReadiness = .ready
        let invalid: [(IntelligenceMode, [String: BrowserModelSelection])] = [
            (.chatGPT, ["codex": .init(model: "unregistered-model", reasoning: "high")]),
            (.chatGPT, ["codex": .init(model: "gpt-5.6-sol", reasoning: "unregistered-effort")]),
            (.chatGPT, ["codex": .init(model: "gpt-5.5", reasoning: "ultra")]),
            (.claude, ["claude": .init(model: "haiku", reasoning: "high")]),
            (.chatGPT, ["claude": .init(model: "sonnet", reasoning: "high")]),
            (.together, ["unknown": .init(model: "default", reasoning: "automatic")])
        ]
        for (mode, selections) in invalid {
            XCTAssertThrowsError(try store.submitWorkspaceRun(id: UUID(), conversationID: nil, prompt: "Fixture",
                requestMode: mode, requestKey: UUID().uuidString, modelSelections: selections)) { error in
                XCTAssertEqual(error as? WorkspaceInputError, .invalidModelSelection)
            }
        }
        await settle()
        let count = await runner.calls.count
        XCTAssertEqual(count, 0)
        XCTAssertTrue(store.runCoordinator.runs.isEmpty)
    }

    func testOmittedBrowserSelectionsDecodeAndPreserveNativeDefaults() throws {
        let legacy = BrowserRunRequest(id: UUID(), conversationID: nil, prompt: "Fixture", mode: "codex", shareWithTeam: false)
        let data = try JSONEncoder().encode(legacy)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        XCTAssertNil(object["modelSelections"])
        XCTAssertNil(try JSONDecoder().decode(BrowserRunRequest.self, from: data).modelSelections)

        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ModelSelectionWorkspaceRunner()))
        store.codexModel = .gpt55; store.codexEffort = .high
        store.claudeModel = .sonnet; store.claudeEffort = .medium
        let options = try store.resolveWorkspaceModelSelections(nil, for: .together)
        XCTAssertEqual(options.codex, .init(model: "gpt-5.5", effort: "high"))
        XCTAssertEqual(options.claude, .init(model: "sonnet", effort: "medium"))
    }

    func testTeamOverridesResolveIndependentlyAndAutomaticUsesNoArgument() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ModelSelectionWorkspaceRunner()))
        let options = try store.resolveWorkspaceModelSelections([
            "codex": .init(model: "default", reasoning: "automatic"),
            "claude": .init(model: "haiku", reasoning: "automatic")
        ], for: .together)
        XCTAssertEqual(options.codex, .accountDefault)
        XCTAssertEqual(options.claude, .init(model: "haiku", effort: nil))
        XCTAssertEqual(store.claudeModel, .accountDefault)
    }

    func testAPIModelMetadataIsReadOnlyAndMatchingSelectionDoesNotForwardOptions() async throws {
        let runner = ModelSelectionWorkspaceRunner()
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: runner))
        store.codexReadiness = .ready
        store.selectedCodexRoute = .openAIResponsesAPI
        store.apiProbes[.openAI] = .init(readiness: .ready, detail: "Fixture", modelID: "configured-api-model")
        let control = try XCTUnwrap(store.workspaceModelControls.first { $0.provider == "codex" })
        XCTAssertFalse(control.editable)
        XCTAssertEqual(control.transport, "api")
        XCTAssertEqual(control.selectedModel, "configured-api-model")
        XCTAssertEqual(control.models.map(\.id), ["configured-api-model"])
        XCTAssertEqual(control.selectedReasoning, "provider-managed")
        XCTAssertEqual(control.models.first?.reasoningIds, ["provider-managed"])
        _ = try store.submitWorkspaceRun(id: UUID(), conversationID: nil, prompt: "Fixture",
            requestMode: .chatGPT, requestKey: "api-model-selection",
            modelSelections: ["codex": .init(model: "configured-api-model", reasoning: "provider-managed")])
        await settle()
        let calls = await runner.calls
        XCTAssertEqual(calls.count, 1)
        XCTAssertEqual(calls.first?.route, .openAIResponsesAPI)
        XCTAssertEqual(calls.first?.options, .accountDefault)
    }

    func testStaleRouteAndUnsupportedAPISelectionsAreRejected() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: ModelSelectionWorkspaceRunner()))
        store.selectedCodexRoute = .openAIResponsesAPI
        store.apiProbes[.openAI] = .init(readiness: .ready, detail: "Fixture", modelID: "new-api-model")
        for selection in [BrowserModelSelection(model: "old-api-model", reasoning: "provider-managed"),
                          .init(model: "new-api-model", reasoning: "high"),
                          .init(model: "gpt-5.6-sol", reasoning: "automatic")] {
            XCTAssertThrowsError(try store.resolveWorkspaceModelSelections(["codex": selection], for: .chatGPT))
        }
        store.selectedCodexRoute = .codexCLI
        XCTAssertThrowsError(try store.resolveWorkspaceModelSelections([
            "codex": .init(model: "new-api-model", reasoning: "provider-managed")
        ], for: .chatGPT))
    }

    func testBrowserRequestIdentityIncludesSelectionsAndDuplicateDoesNotExecuteTwice() async throws {
        let runner = ModelSelectionWorkspaceRunner()
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: runner))
        store.codexReadiness = .ready
        var request = BrowserRunRequest(id: UUID(), conversationID: nil, prompt: "Fixture", mode: "codex", shareWithTeam: false,
            modelSelections: ["codex": .init(model: "gpt-5.5", reasoning: "high")])
        let decoded = try JSONDecoder().decode(BrowserRunRequest.self, from: JSONEncoder().encode(request))
        XCTAssertEqual(decoded.modelSelections, request.modelSelections)
        let originalKey = request.requestKey
        let original = try store.submitWorkspaceRun(id: request.id, conversationID: nil, prompt: request.prompt,
            requestMode: .chatGPT, requestKey: request.requestKey, modelSelections: request.modelSelections)
        store.codexModel = .gpt56Sol
        store.codexEffort = .ultra
        let duplicate = try store.submitWorkspaceRun(id: request.id, conversationID: nil, prompt: request.prompt,
            requestMode: .chatGPT, requestKey: request.requestKey, modelSelections: request.modelSelections)
        XCTAssertEqual(original.turn.id, duplicate.turn.id)
        request.modelSelections = ["codex": .init(model: "gpt-5.5", reasoning: "low")]
        XCTAssertNotEqual(originalKey, request.requestKey)
        XCTAssertThrowsError(try store.submitWorkspaceRun(id: request.id, conversationID: nil, prompt: request.prompt,
            requestMode: .chatGPT, requestKey: request.requestKey, modelSelections: request.modelSelections)) { error in
            guard case WorkspaceRunError.duplicateConflict = error else {
                return XCTFail("Changed model selection must conflict with the accepted request")
            }
        }
        await settle()
        let count = await runner.calls.count
        XCTAssertEqual(count, 1)
    }
}

private actor ModelSelectionWorkspaceRunner: AITextRunning {
    struct Call: Sendable { let route: AIExecutionRoute; let options: TerminalRunOptions }
    private(set) var calls: [Call] = []
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        calls.append(.init(route: route, options: options))
        return .init(text: "Injected model-selection fixture", elapsedSeconds: 0)
    }
}
