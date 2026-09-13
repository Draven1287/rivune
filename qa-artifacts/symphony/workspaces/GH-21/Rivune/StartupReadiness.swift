import Foundation

enum StartupPhase: String, Sendable { case checking, ready, needsConnection }
enum StartupArrivalDestination: Equatable { case workspace, setup }

enum StartupArrivalPolicy {
    static let duration: TimeInterval = 12
    static let handoffDelay: TimeInterval = 0.9

    static func percentage(elapsed: TimeInterval) -> Int {
        let elapsed = elapsed.isFinite ? max(0, elapsed) : 0
        return Int(min(1, elapsed / duration) * 100)
    }

    static func destination(elapsed: TimeInterval, phase: StartupPhase, readyProviderCount: Int) -> StartupArrivalDestination? {
        guard elapsed.isFinite, elapsed >= duration else { return nil }
        return phase == .ready && readyProviderCount > 0 ? .workspace : .setup
    }
}

struct RuntimeConnectionCheck: Identifiable, Sendable {
    let route: AIExecutionRoute
    let title: String
    let readiness: ProviderReadiness
    let detail: String
    var id: String { route.transportID }
}

/// Startup selects a usable transport before work begins. An installed but
/// signed-out CLI must never hide a validated API connection.
enum StartupReadinessPolicy {
    static func route(cli: ProviderReadiness, api: ProviderReadiness, cliRoute: AIExecutionRoute, apiRoute: AIExecutionRoute) -> AIExecutionRoute? {
        if cli.isReady { return cliRoute }
        if api.isReady { return apiRoute }
        return nil
    }

    static func effective(cli: ProviderReadiness, api: ProviderReadiness) -> ProviderReadiness {
        if cli.isReady || api.isReady { return .ready }
        if cli == .checking || api == .checking { return .checking }
        if cli == .signedOut || api == .signedOut { return .signedOut }
        return cli == .missing ? .missing : .unavailable
    }

    static func usableMode(preferred: IntelligenceMode, codex: Bool, claude: Bool) -> IntelligenceMode? {
        if codex && claude { return preferred }
        if codex { return .chatGPT }
        if claude { return .claude }
        return nil
    }
}

/// A run captures its routes once. Refreshing connections cannot switch the
/// transport halfway through a multi-step collaboration.
struct RouteMappedTextRunner: AITextRunning {
    let base: any AITextRunning
    let codexRoute: AIExecutionRoute
    let claudeRoute: AIExecutionRoute

    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        let selected = route == .codexCLI ? codexRoute : route == .claudeCodeCLI ? claudeRoute : route
        let resolvedOptions = selected.transportKind == .api ? TerminalRunOptions.accountDefault : options
        return try await base.run(selected, prompt: prompt, options: resolvedOptions)
    }
}

extension RivuneStore {
    func checkStartupReadiness() async {
        guard !RivuneLaunchContext.isIsolated else { return }
        if connectionTask == nil { refreshConnections() }
        await connectionTask?.value
    }

    func finishStartup() {
        guard startupPhase == .ready, readyProviderCount > 0 else { return }
        hasCompletedStartup = true
        if let readyMode = StartupReadinessPolicy.usableMode(preferred: mode, codex: codexReadiness.isReady, claude: claudeReadiness.isReady), !isGenerating {
            mode = readyMode
        }
    }

    func replayStartup() {
        showConnections = false
        showSettings = false
        hasCompletedStartup = false
    }

    var currentCodexRoute: AIExecutionRoute { selectedCodexRoute ?? .codexCLI }
    var currentClaudeRoute: AIExecutionRoute { selectedClaudeRoute ?? .claudeCodeCLI }
    var routedTextRunner: RouteMappedTextRunner {
        RouteMappedTextRunner(base: terminalService, codexRoute: currentCodexRoute, claudeRoute: currentClaudeRoute)
    }

    func routeDescription(for mode: IntelligenceMode) -> String {
        switch mode {
        case .chatGPT:
            currentCodexRoute.transportKind == .api ? "OpenAI API · \(apiProbes[.openAI]?.modelID ?? "Configured model")" : "Codex CLI · \(codexModel.title)"
        case .claude:
            currentClaudeRoute.transportKind == .api ? "Anthropic API · \(apiProbes[.anthropic]?.modelID ?? "Configured model")" : "Claude Code CLI · \(claudeModel.title)"
        case .together: "\(routeDescription(for: .chatGPT)) + \(routeDescription(for: .claude))"
        }
    }

    func launchConnectionChecks() {
        connectionTask?.cancel()
        let checkID = UUID()
        connectionCheckID = checkID
        startupPhase = .checking
        startupProgress = 0
        startupStatusText = "Checking your connections"
        codexReadiness = .checking
        claudeReadiness = .checking
        codexCLIReadiness = .checking
        claudeCLIReadiness = .checking
        selectedCodexRoute = nil
        selectedClaudeRoute = nil
        apiProbes = [:]
        connectionChecks = []
        #if os(macOS)
        let service = terminalService
        connectionTask = Task { [weak self] in
            async let capabilities = service.readCLICapabilities()
            await withTaskGroup(of: RuntimeConnectionCheck.self) { group in
                for (route, title) in [(AIExecutionRoute.codexCLI, "ChatGPT · Codex CLI"), (.claudeCodeCLI, "Claude · Claude Code CLI")] {
                    group.addTask {
                        let readiness = await service.probe(route)
                        let detail = readiness.isReady ? "CLI sign-in checked. Availability and limits are confirmed when you send." : readiness.label
                        return RuntimeConnectionCheck(route: route, title: title, readiness: readiness, detail: detail)
                    }
                }
                for provider in RivuneAPIProvider.allCases {
                    group.addTask {
                        let probe = await APIRuntimeService.shared.probe(provider)
                        return RuntimeConnectionCheck(route: provider.executionRoute, title: "\(provider.displayName) API", readiness: probe.readiness, detail: probe.detail)
                    }
                }
                for await check in group {
                    guard !Task.isCancelled, let self, self.connectionCheckID == checkID else { group.cancelAll(); return }
                    self.connectionChecks.append(check)
                    switch check.route {
                    case .codexCLI: self.codexCLIReadiness = check.readiness
                    case .claudeCodeCLI: self.claudeCLIReadiness = check.readiness
                    case .openAIResponsesAPI, .anthropicMessagesAPI:
                        let provider: RivuneAPIProvider = check.route == .openAIResponsesAPI ? .openAI : .anthropic
                        let configuration = await APIConnectionStore.shared.configuration(for: provider)
                        guard !Task.isCancelled, self.connectionCheckID == checkID else { group.cancelAll(); return }
                        self.apiProbes[provider] = APIConnectionProbe(readiness: check.readiness, detail: check.detail, modelID: configuration.modelID)
                    default: break
                    }
                    self.startupProgress = Double(self.connectionChecks.count) / 4 * 0.9
                    self.startupStatusText = "Checked \(self.connectionChecks.count) of 4 connection routes"
                    self.refreshEffectiveReadiness()
                    self.workspaceRevision += 1
                }
            }
            guard !Task.isCancelled, let self, self.connectionCheckID == checkID else { return }
            let snapshot = await capabilities
            guard !Task.isCancelled, self.connectionCheckID == checkID else { return }
            self.applyCapabilities(snapshot)
            self.completeReadinessChecks()
            self.connectionTask = nil
        }
        #else
        connectionTask = Task { [weak self] in
            guard let self else { return }
            guard self.bridge.state.isConnected else {
                self.codexReadiness = .macRequired; self.claudeReadiness = .macRequired
                self.completeReadinessChecks(); self.connectionTask = nil; return
            }
            do { try self.bridge.send(.readinessRequest()) } catch {
                self.codexReadiness = .macRequired; self.claudeReadiness = .macRequired
            }
            for _ in 0..<40 {
                if self.codexReadiness != .checking && self.claudeReadiness != .checking { break }
                do { try await Task.sleep(for: .milliseconds(200)) } catch { return }
            }
            guard !Task.isCancelled, self.connectionCheckID == checkID else { return }
            if self.codexReadiness == .checking { self.codexReadiness = .unavailable }
            if self.claudeReadiness == .checking { self.claudeReadiness = .unavailable }
            self.completeReadinessChecks(); self.connectionTask = nil
        }
        #endif
    }

    private func refreshEffectiveReadiness() {
        let openAI = apiProbes[.openAI]?.readiness ?? .checking
        let anthropic = apiProbes[.anthropic]?.readiness ?? .checking
        codexReadiness = StartupReadinessPolicy.effective(cli: codexCLIReadiness, api: openAI)
        claudeReadiness = StartupReadinessPolicy.effective(cli: claudeCLIReadiness, api: anthropic)
        selectedCodexRoute = StartupReadinessPolicy.route(cli: codexCLIReadiness, api: openAI, cliRoute: .codexCLI, apiRoute: .openAIResponsesAPI)
        selectedClaudeRoute = StartupReadinessPolicy.route(cli: claudeCLIReadiness, api: anthropic, cliRoute: .claudeCodeCLI, apiRoute: .anthropicMessagesAPI)
    }

    private func completeReadinessChecks() {
        startupPhase = engineIsOnline ? .ready : .needsConnection
        startupProgress = engineIsOnline ? 1 : 0.9
        startupStatusText = engineIsOnline
            ? (readyProviderCount == 2 ? "Your connections are ready" : "One provider is ready. You can start a conversation.")
            : "Connect a CLI or API to start chatting"
        workspaceRevision += 1
        sendBridgeReadiness()
    }
}
