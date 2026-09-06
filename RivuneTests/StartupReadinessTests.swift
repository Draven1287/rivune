import XCTest
@testable import Rivune

final class StartupReadinessTests: XCTestCase {
    func testArrivalDoesNotSkipPreparationForAnAlreadyReadyConnection() {
        for elapsed in [0.0, 0.5, 2.7, 8, StartupArrivalPolicy.duration - 0.01] {
            XCTAssertLessThan(StartupArrivalPolicy.percentage(elapsed: elapsed), 100)
            XCTAssertNil(StartupArrivalPolicy.destination(elapsed: elapsed, phase: .ready, readyProviderCount: 1))
        }
        XCTAssertEqual(StartupArrivalPolicy.percentage(elapsed: StartupArrivalPolicy.duration), 100)
        XCTAssertEqual(StartupArrivalPolicy.destination(elapsed: StartupArrivalPolicy.duration, phase: .ready, readyProviderCount: 1), .workspace)
    }

    func testCompletedArrivalOpensSetupWhenConnectionsFailOrKeepChecking() {
        for phase in [StartupPhase.checking, .needsConnection] {
            XCTAssertEqual(StartupArrivalPolicy.percentage(elapsed: 60), 100)
            XCTAssertEqual(StartupArrivalPolicy.destination(elapsed: 60, phase: phase, readyProviderCount: 1), .setup)
        }
        XCTAssertEqual(StartupArrivalPolicy.destination(elapsed: 60, phase: .ready, readyProviderCount: 0), .setup)
        XCTAssertEqual(StartupArrivalPolicy.percentage(elapsed: StartupArrivalPolicy.duration / 2), 50)
        for elapsed in [Double.nan, .infinity, -1] {
            XCTAssertEqual(StartupArrivalPolicy.percentage(elapsed: elapsed), 0)
            XCTAssertNil(StartupArrivalPolicy.destination(elapsed: elapsed, phase: .ready, readyProviderCount: 1))
        }
    }

    func testSignedOutCLIFallsBackToReadyAPI() {
        XCTAssertEqual(StartupReadinessPolicy.route(cli: .signedOut, api: .ready, cliRoute: .codexCLI, apiRoute: .openAIResponsesAPI), .openAIResponsesAPI)
        XCTAssertEqual(StartupReadinessPolicy.effective(cli: .missing, api: .ready), .ready)
    }

    func testCLIIsPreferredOnlyWhenAuthenticated() {
        XCTAssertEqual(StartupReadinessPolicy.route(cli: .ready, api: .ready, cliRoute: .claudeCodeCLI, apiRoute: .anthropicMessagesAPI), .claudeCodeCLI)
        XCTAssertNil(StartupReadinessPolicy.route(cli: .signedOut, api: .unavailable, cliRoute: .claudeCodeCLI, apiRoute: .anthropicMessagesAPI))
    }

    func testCheckingAndFailedRoutesDoNotBecomeReady() {
        XCTAssertEqual(StartupReadinessPolicy.effective(cli: .missing, api: .checking), .checking)
        XCTAssertFalse(StartupReadinessPolicy.effective(cli: .unavailable, api: .unavailable).isReady)
    }

    func testOneProviderSelectsUsableSingleMode() {
        XCTAssertEqual(StartupReadinessPolicy.usableMode(preferred: .together, codex: false, claude: true), .claude)
        XCTAssertEqual(StartupReadinessPolicy.usableMode(preferred: .claude, codex: true, claude: false), .chatGPT)
        XCTAssertEqual(StartupReadinessPolicy.usableMode(preferred: .together, codex: true, claude: true), .together)
        XCTAssertNil(StartupReadinessPolicy.usableMode(preferred: .together, codex: false, claude: false))
    }

    func testNewWorkspaceStartsWithSetup() {
        XCTAssertTrue(ConnectionSetupPresentationPolicy.requiresInitialSetup(setupCompleted: false, hasLocalHistory: false))
    }

    func testExistingWorkspaceMigrationDoesNotRequireOnboardingAgain() {
        XCTAssertFalse(ConnectionSetupPresentationPolicy.requiresInitialSetup(setupCompleted: true, hasLocalHistory: false))
        XCTAssertFalse(ConnectionSetupPresentationPolicy.requiresInitialSetup(setupCompleted: false, hasLocalHistory: true))
        XCTAssertFalse(ConnectionSetupPresentationPolicy.requiresInitialSetup(setupCompleted: true, hasLocalHistory: true))
    }

    @MainActor
    func testSetupCompletionCannotDismissWithoutAReadyProvider() {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        store.showAccountSetup = true
        store.showConnections = true
        store.hasCompletedStartup = false
        for readiness in [ProviderReadiness.checking, .signedOut, .missing, .unavailable] {
            store.codexReadiness = readiness
            store.claudeReadiness = readiness
            XCTAssertFalse(store.completeConnectionSetup())
            XCTAssertTrue(store.showAccountSetup)
            XCTAssertTrue(store.showConnections)
            XCTAssertFalse(store.hasCompletedStartup)
        }
    }

    @MainActor
    func testOneReadyProviderCompletesSetupAndReplayPreservesDraft() {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        let conversationID = UUID()
        let attachment = PromptAttachment(name: "draft.txt", textContent: "Keep this context", byteCount: 17)
        store.selectedConversationID = conversationID
        store.mode = .claude
        store.composerText = "Keep my unsent message"
        store.draftAttachments = [attachment]
        store.codexReadiness = .unavailable
        store.claudeReadiness = .ready
        store.startupPhase = .ready
        store.showAccountSetup = true
        store.hasCompletedStartup = false

        XCTAssertTrue(store.completeConnectionSetup())
        XCTAssertTrue(store.hasCompletedStartup)
        XCTAssertFalse(store.showAccountSetup)
        store.finishStartup()
        store.replayStartup()
        XCTAssertFalse(store.hasCompletedStartup)
        XCTAssertEqual(store.mode, .claude)
        XCTAssertEqual(store.selectedConversationID, conversationID)
        XCTAssertEqual(store.composerText, "Keep my unsent message")
        XCTAssertEqual(store.draftAttachments, [attachment])
    }

    @MainActor
    func testStartupCannotFinishWhileOnlyAnIncompleteCheckReportsReady() {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        store.hasCompletedStartup = false
        store.codexReadiness = .ready
        store.startupPhase = .checking
        XCTAssertFalse(store.completeConnectionSetup())
        store.finishStartup()
        XCTAssertFalse(store.hasCompletedStartup)
        store.startupPhase = .ready
        store.finishStartup()
        XCTAssertTrue(store.hasCompletedStartup)
    }

    @MainActor
    func testHistoryExportRoundTripsSavedMessagesWithoutChangingWorkspace() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let turn = ChatTurn(prompt: "A saved question", mode: .claude, createdAt: date)
        let conversation = Conversation(title: "Saved conversation", preview: "A saved question", updatedAt: date, mode: .claude, turns: [turn])
        store.conversations = [conversation]
        store.composerText = "An unsent draft"
        let export = try RivuneHistoryExport(conversations: store.conversations)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let restored = try decoder.decode([Conversation].self, from: export.data)
        XCTAssertEqual(restored, [conversation])
        XCTAssertEqual(store.conversations, [conversation])
        XCTAssertEqual(store.composerText, "An unsent draft")
        XCTAssertFalse(String(decoding: export.data, as: UTF8.self).contains("An unsent draft"))
    }

    func testAPIRouteMappingDoesNotForwardCLIModelOrEffort() async throws {
        let recorder = RouteRecorder()
        let runner = RouteMappedTextRunner(base: recorder, codexRoute: .openAIResponsesAPI, claudeRoute: .claudeCodeCLI)
        _ = try await runner.run(.codexCLI, prompt: "A test", options: .init(model: "cli-only-model", effort: "ultra"))
        let route = await recorder.route
        let options = await recorder.options
        XCTAssertEqual(route, .openAIResponsesAPI)
        XCTAssertEqual(options, .accountDefault)
        _ = try await runner.run(.claudeCodeCLI, prompt: "A test", options: .init(model: "sonnet", effort: "high"))
        let cliRoute = await recorder.route
        let cliOptions = await recorder.options
        XCTAssertEqual(cliRoute, .claudeCodeCLI)
        XCTAssertEqual(cliOptions, .init(model: "sonnet", effort: "high"))
    }

    @MainActor
    func testActiveAPIModelSummaryDoesNotAdvertiseCLIModelOrEffort() {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        store.mode = .chatGPT
        store.selectedCodexRoute = .openAIResponsesAPI
        store.apiProbes[.openAI] = APIConnectionProbe(readiness: .ready, detail: "Fixture", modelID: "my-api-model")
        store.codexReadiness = .ready
        XCTAssertEqual(store.activeConfigurationSummary, "my-api-model · API")
        XCTAssertEqual(store.compactConfigurationSummary, "my-api-model · API")
        XCTAssertFalse(store.activeConfigurationSummary.contains(store.codexModel.title))
        XCTAssertEqual(store.connectionSummary, "ChatGPT API · Access checked")
    }

    @MainActor
    func testMixedTeamSummariesDescribeEachSelectedTransport() {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        store.codexModel = .gpt56Sol
        store.mode = .together
        store.selectedCodexRoute = .openAIResponsesAPI
        store.selectedClaudeRoute = .claudeCodeCLI
        store.apiProbes[.openAI] = APIConnectionProbe(readiness: .ready, detail: "Fixture", modelID: "my-api-model")
        XCTAssertTrue(store.activeConfigurationSummary.contains("my-api-model · API"))
        XCTAssertTrue(store.activeConfigurationSummary.contains(store.claudeModel.title))
        XCTAssertFalse(store.activeConfigurationSummary.contains(store.codexModel.title))
    }

    @MainActor
    func testBackgroundRunLocksConnectionSettingsUntilStopped() throws {
        let coordinator = RivuneRunCoordinator(textRunner: RouteRecorder())
        let store = RivuneStore(runCoordinator: coordinator)
        XCTAssertFalse(store.hasActiveProviderRuns)
        let run = try coordinator.submit(id: UUID(), conversationID: UUID(), requestKey: "background-fixture",
            turn: ChatTurn(prompt: "Fixture", mode: .chatGPT), priorContext: "",
            codexOptions: .accountDefault, claudeOptions: .accountDefault,
            codexProvenance: "Fixture", claudeProvenance: "Fixture")
        XCTAssertNil(store.selectedConversationID)
        XCTAssertFalse(store.isGenerating)
        XCTAssertTrue(store.hasActiveProviderRuns)
        coordinator.cancel(run.id)
        XCTAssertFalse(store.hasActiveProviderRuns)
    }
}

private actor RouteRecorder: AITextRunning {
    var route: AIExecutionRoute?
    var options: TerminalRunOptions?
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        self.route = route; self.options = options
        return TerminalRunResult(text: "fixture", elapsedSeconds: 0)
    }
}

final class CLICapabilityTests: XCTestCase {
    @MainActor
    func testBrowserAndNativeUseTheSameDiscoveredCapabilities() throws {
        let store = RivuneStore(runCoordinator: RivuneRunCoordinator(textRunner: RouteRecorder()))
        let future = try XCTUnwrap(CodexModelChoice(rawValue: "gpt-future"))
        store.applyCapabilities(.init(codexModels: [.init(choice: future, label: "Future model", efforts: [.automatic, .high])]))
        XCTAssertEqual(store.availableCodexModels, [.accountDefault, future])
        let control = try XCTUnwrap(store.workspaceModelControls.first { $0.provider == "codex" })
        XCTAssertEqual(control.models.map(\.id), ["default", "gpt-future"])
        XCTAssertEqual(control.models.last?.reasoningIds, ["automatic", "high"])
        let resolved = try store.resolveWorkspaceModelSelections(["codex": .init(model: "gpt-future", reasoning: "high")], for: .chatGPT)
        XCTAssertEqual(resolved.codex.model, "gpt-future")
        XCTAssertThrowsError(try store.resolveWorkspaceModelSelections(["codex": .init(model: "gpt-future", reasoning: "ultra")], for: .chatGPT))
        XCTAssertThrowsError(try store.resolveWorkspaceModelSelections(["codex": .init(model: "gpt-unlisted", reasoning: "high")], for: .chatGPT))
    }
    func testVisibleModelsAndAdvertisedEffortsOnly() throws {
        let data = Data(#"{"models":[{"slug":"gpt-future","display_name":"Future","visibility":"list","supported_reasoning_levels":[{"effort":"high"},{"effort":"unsupported"}]},{"slug":"gpt-hidden","visibility":"hide"},{"slug":"--bad","visibility":"list"},{"slug":"gpt-future","visibility":"list"}]}"#.utf8)
        let models = CLICapabilitySnapshot.codexCache(data)
        XCTAssertEqual(models.map(\.choice.rawValue), ["gpt-future"])
        XCTAssertEqual(models.first?.efforts, [.automatic, .high])
        XCTAssertEqual(models.first?.label, "Future")
    }
    func testFutureModelPreservesStringPersistenceAndRejectsArguments() throws {
        let model = try JSONDecoder().decode(CodexModelChoice.self, from: Data(#""gpt-next-model""#.utf8))
        XCTAssertEqual(model.rawValue, "gpt-next-model")
        XCTAssertEqual(String(data: try JSONEncoder().encode(model), encoding: .utf8), #""gpt-next-model""#)
        XCTAssertNil(CodexModelChoice(rawValue: "--model=x"))
        XCTAssertNil(CodexModelChoice(rawValue: "gpt model"))
    }
    func testClaudeOptionsAreScopedToTheirFlags() {
        let text = "  --effort <level> Effort (low, high, max)\n  --model <model> Alias 'opus' or 'sonnet'\n  --other <text> 'haiku' medium xhigh\n"
        let result = CLICapabilitySnapshot.claudeHelp(text)
        XCTAssertEqual(Set(result.models), Set([.accountDefault, .opus, .sonnet]))
        XCTAssertEqual(result.efforts, [.automatic, .low, .high, .max])
        XCTAssertTrue(CLICapabilitySnapshot.claudeHelp("unrecognized version").models.isEmpty)
        XCTAssertTrue(CLICapabilitySnapshot.codexCache(Data("{}".utf8)).isEmpty)
    }
}

final class RivuneAccountConfigurationTests: XCTestCase {
    private var valid: [String: Any] {
        ["Enabled": true, "URL": "https://example.supabase.co", "PublishableKey": "sb_publishable_public_test_value", "email": true]
    }
    func testDisabledConfigurationCannotEnableSignIn() {
        var values = valid
        values["Enabled"] = false
        XCTAssertNil(RivuneAccountConfiguration(values: values))
        XCTAssertNil(RivuneAccountConfiguration(values: [:]))
    }
    func testRejectsSecretsAndUnsafeEndpoints() {
        for key in ["sb_secret_do_not_bundle", "service_role", "", "eyJhbGciOiJIUzI1NiJ9"] {
            var values = valid; values["PublishableKey"] = key
            XCTAssertNil(RivuneAccountConfiguration(values: values))
        }
        for url in ["http://example.supabase.co", "https://example.supabase.co.evil.test", "https://user@example.supabase.co", "https://example.supabase.co/other", "https://example.supabase.co?key=x"] {
            var values = valid; values["URL"] = url
            XCTAssertNil(RivuneAccountConfiguration(values: values))
        }
    }
    func testMethodsAreExplicitlyEnabled() {
        let configuration = RivuneAccountConfiguration(values: valid)
        XCTAssertEqual(configuration?.methods, ["email"])
        XCTAssertEqual(RivuneAccountConfiguration.callback.absoluteString, "rivune://auth/callback")
    }
    @MainActor
    func testUnconfiguredAccountNeverCreatesIdentityOrChallenge() async {
        let account = RivuneAccount(configuration: nil)
        await account.restore()
        await account.sendCode(email: "someone@example.com")
        await account.verify(code: "123456")
        await account.signOut()
        XCTAssertNil(account.identity)
        XCTAssertNil(account.challengeEmail)
        XCTAssertFalse(account.busy)
        XCTAssertFalse(account.supports("email"))
    }
}

final class RivuneAccountCallbackTests: XCTestCase {
    @MainActor func testOnlyExactPKCECallbackAccepted() {
        XCTAssertTrue(RivuneAccount.acceptsCallback(URL(string: "rivune://auth/callback?code=test")!))
        for url in ["rivune://evil/callback?code=x", "https://auth/callback?code=x", "rivune://auth/other?code=x", "rivune://auth/callback", "rivune://auth/callback?code=x&code=y", "rivune://auth/callback#access_token=x"] {
            XCTAssertFalse(RivuneAccount.acceptsCallback(URL(string: url)!))
        }
    }
}
