import Foundation
#if os(macOS)
import AppKit
#endif

extension IntelligenceMode {
    var workspaceID: String {
        switch self { case .chatGPT: "codex"; case .claude: "claude"; case .together: "rivune" }
    }

    init?(workspaceID: String) {
        switch workspaceID {
        case "codex": self = .chatGPT
        case "claude": self = .claude
        case "rivune": self = .together
        default: return nil
        }
    }
}

struct BrowserRunRequest: Codable, Sendable {
    let id: UUID
    let conversationID: UUID?
    let prompt: String
    let mode: String
    let shareWithTeam: Bool
    var modelSelections: [String: BrowserModelSelection]? = nil

    var requestKey: String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return (try? encoder.encode(self).base64EncodedString()) ?? ""
    }
}

struct BrowserModelSelection: Codable, Equatable, Sendable {
    let model: String
    let reasoning: String
}

/// Navigation destinations only. Never accepts URLs, shell commands, provider
/// credentials, or arbitrary view identifiers from the paired browser.
enum NativeSettingsDestination: String, Codable, CaseIterable, Sendable {
    case connections, models, privacy, devices, account
}

struct WorkspaceProviderCatalogEntry: Encodable, Sendable {
    struct Transport: Encodable, Sendable {
        let id: String
        let title: String
        let kind: String
        let supported: Bool
        let state: String
        let message: String
        let active: Bool
        let modelSettings: Bool
    }
    let id: String
    let title: String
    let workspaceProvider: String?
    let activeTransportId: String?
    let selectionPolicy = "automatic"
    let transports: [Transport]

    static func entries(registry: AIProviderRegistry = .current, checks: [RuntimeConnectionCheck], activeRoutes: [AIExecutionRoute]) -> [Self] {
        registry.registrations.map { provider in
            let transports: [Transport] = provider.transports.map { registration in
                let configuration = registration.configuration
                let check = registration.executionRoute.flatMap { route in checks.first(where: { $0.route == route }) }
                let active = registration.executionRoute.map { activeRoutes.contains($0) } ?? false
                let state: String
                let message: String
                if !registration.supportsExecution {
                    state = "adapterRequired"
                    message = "Discovery only. This build has no reviewed execution adapter for this transport."
                } else if let check {
                    state = check.readiness.workspaceState
                    message = check.detail
                } else {
                    state = "notChecked"
                    message = "Check connections on your Mac to verify this transport."
                }
                return Transport(id: configuration.id, title: configuration.displayName,
                    kind: configuration.kind == .api ? "api" : "cli", supported: registration.supportsExecution,
                    state: state, message: message, active: active, modelSettings: registration.supportsModelSettings)
            }
            return Self(id: provider.id, title: provider.displayName, workspaceProvider: provider.workspaceProvider,
                activeTransportId: transports.first(where: \.active)?.id, transports: transports)
        }
    }
}

private extension ProviderReadiness {
    var workspaceState: String {
        switch self {
        case .ready: "ready"
        case .checking: "checking"
        case .signedOut: "signInRequired"
        case .missing: "notInstalled"
        case .macRequired, .unavailable: "unavailable"
        }
    }
}

struct WorkspaceModelControl: Encodable, Sendable {
    struct Model: Encodable, Sendable {
        let id: String
        let label: String
        let reasoningIds: [String]
    }
    struct Reasoning: Encodable, Sendable { let id: String; let label: String }
    let provider: String
    let transport: String
    let selectedModel: String
    let selectedReasoning: String
    let models: [Model]
    let reasoning: [Reasoning]
    let editable: Bool
    let note: String?

    static let providerManagedReasoning = "provider-managed"
}

struct WorkspaceResolvedModelOptions: Sendable {
    var codex: TerminalRunOptions
    var claude: TerminalRunOptions
    var codexProvenance: String
    var claudeProvenance: String
}

enum WorkspaceInputError: LocalizedError {
    case invalidPrompt, unavailable, unknownConversation, sharingRequired, invalidModelSelection
    var errorDescription: String? {
        switch self {
        case .invalidPrompt: "Enter a prompt of up to 16 KB."
        case .unavailable: "Connect and sign in to the selected provider in the Mac app first."
        case .unknownConversation: "This conversation is no longer available on the Mac. Start a new chat."
        case .sharingRequired: "Allow sharing with both providers before starting a Rivune task."
        case .invalidModelSelection: "The model or reasoning choice is no longer available for this request. Refresh the workspace and choose a supported option. API models are managed in the Mac app."
        }
    }
}

extension RivuneStore {
    var workspaceProviderCatalog: [WorkspaceProviderCatalogEntry] {
        WorkspaceProviderCatalogEntry.entries(checks: connectionChecks, activeRoutes: [selectedCodexRoute, selectedClaudeRoute].compactMap { $0 })
    }
    /// Prefer installed CLI metadata, with explicitly labeled compiled fallbacks.
    /// API routes expose only their saved model.
    var workspaceModelControls: [WorkspaceModelControl] {
        [IntelligenceMode.chatGPT, .claude].map { mode in
            let isCodex = mode == .chatGPT
            let route = isCodex ? currentCodexRoute : currentClaudeRoute
            if route.transportKind == .api {
                let modelID = apiProbes[isCodex ? .openAI : .anthropic]?.modelID ?? ""
                let managed = WorkspaceModelControl.providerManagedReasoning
                return WorkspaceModelControl(provider: mode.workspaceID, transport: "api",
                    selectedModel: modelID, selectedReasoning: managed,
                    models: modelID.isEmpty ? [] : [.init(id: modelID, label: modelID, reasoningIds: [managed])],
                    reasoning: [.init(id: managed, label: "Provider managed")], editable: false,
                    note: "API model is configured in Rivune on your Mac. Reasoning is managed by the provider.")
            }
            if isCodex {
                return WorkspaceModelControl(provider: mode.workspaceID, transport: "cli",
                    selectedModel: codexModel.rawValue, selectedReasoning: codexEffort.rawValue,
                    models: availableCodexModels.map { .init(id: $0.rawValue, label: $0 == .accountDefault ? "Account default" : modelLabel($0), reasoningIds: codexEfforts(for: $0).map(\.rawValue)) },
                    reasoning: CodexReasoningEffort.allCases.map { .init(id: $0.rawValue, label: $0.title) },
                    editable: true, note: capabilityNote(for: .chatGPT))
            }
            return WorkspaceModelControl(provider: mode.workspaceID, transport: "cli",
                selectedModel: claudeModel.rawValue, selectedReasoning: claudeEffort.rawValue,
                models: availableClaudeModels.map { .init(id: $0.rawValue, label: $0.title, reasoningIds: claudeEfforts(for: $0).map(\.rawValue)) },
                reasoning: ClaudeReasoningEffort.allCases.map { .init(id: $0.rawValue, label: $0.title) },
                editable: true, note: capabilityNote(for: .claude))
        }
    }

    /// Resolve against the current route before enqueuing. Browser choices never
    /// overwrite native defaults and cannot forward CLI arguments to an API route.
    func resolveWorkspaceModelSelections(_ selections: [String: BrowserModelSelection]?, for mode: IntelligenceMode) throws -> WorkspaceResolvedModelOptions {
        var resolved = WorkspaceResolvedModelOptions(
            codex: currentCodexRoute.transportKind == .api ? .accountDefault : .init(model: codexModel.cliValue, effort: codexEffort.cliValue),
            claude: currentClaudeRoute.transportKind == .api ? .accountDefault : .init(model: claudeModel.cliValue, effort: claudeEffort.cliValue),
            codexProvenance: routeDescription(for: .chatGPT), claudeProvenance: routeDescription(for: .claude))
        let relevantProviders: Set<String> = mode == .together ? ["codex", "claude"] : [mode.workspaceID]
        for (provider, selection) in selections ?? [:] {
            guard relevantProviders.contains(provider),
                  let control = workspaceModelControls.first(where: { $0.provider == provider }) else {
                throw WorkspaceInputError.invalidModelSelection
            }
            if control.transport == "api" {
                guard !control.selectedModel.isEmpty, selection.model == control.selectedModel,
                      selection.reasoning == WorkspaceModelControl.providerManagedReasoning else {
                    throw WorkspaceInputError.invalidModelSelection
                }
            } else if provider == "codex" {
                guard let model = CodexModelChoice(rawValue: selection.model),
                      let effort = CodexReasoningEffort(rawValue: selection.reasoning),
                      control.models.contains(where: { $0.id == selection.model && $0.reasoningIds.contains(selection.reasoning) }) else { throw WorkspaceInputError.invalidModelSelection }
                resolved.codex = .init(model: model.cliValue, effort: effort.cliValue)
                resolved.codexProvenance = "Codex CLI · \(model.title) · \(effort.title)"
            } else {
                guard let model = ClaudeModelChoice(rawValue: selection.model),
                      let effort = ClaudeReasoningEffort(rawValue: selection.reasoning),
                      control.models.contains(where: { $0.id == selection.model && $0.reasoningIds.contains(selection.reasoning) }) else { throw WorkspaceInputError.invalidModelSelection }
                resolved.claude = .init(model: model.cliValue, effort: effort.cliValue)
                resolved.claudeProvenance = "Claude Code CLI · \(model.title) · \(effort.title)"
            }
        }
        return resolved
    }

    /// Both native and browser submissions enter through this method. Selection
    /// is deliberately not changed for requests originating in another surface.
    @discardableResult
    func submitWorkspaceRun(
        id: UUID, conversationID: UUID?, prompt: String, requestMode: IntelligenceMode,
        attachments: [PromptAttachment] = [], requestKey: String,
        modelSelections: [String: BrowserModelSelection]? = nil
    ) throws -> WorkspaceRun {
        if let existing = try runCoordinator.existing(id: id, requestKey: requestKey) { return existing }
        guard !isSavingProviderConnection else { throw WorkspaceInputError.unavailable }
        let cleanPrompt = prompt.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanPrompt.isEmpty, cleanPrompt.utf8.count <= 16 * 1_024,
              Self.preparedAttachmentContext(attachments) != nil else { throw WorkspaceInputError.invalidPrompt }
        let ready = switch requestMode {
        case .chatGPT: codexReadiness.isReady
        case .claude: claudeReadiness.isReady
        case .together: codexReadiness.isReady && claudeReadiness.isReady
        }
        guard ready else { throw WorkspaceInputError.unavailable }
        if let conversationID, !conversations.contains(where: { $0.id == conversationID }) {
            throw WorkspaceInputError.unknownConversation
        }
        let options = try resolveWorkspaceModelSelections(modelSelections, for: requestMode)
        let targetID = conversationID ?? UUID()
        let existingTurns = conversations.first(where: { $0.id == targetID })?.turns ?? []
        let turn = ChatTurn(prompt: cleanPrompt, mode: requestMode, attachments: attachments,
                            togetherTrace: requestMode == .together ? TogetherTrace(phase: .planning) : nil)
        return try runCoordinator.submit(
            id: id, conversationID: targetID, requestKey: requestKey, turn: turn,
            priorContext: memoryEnabled ? Self.conversationContext(from: existingTurns, mode: requestMode) : "",
            codexOptions: options.codex,
            claudeOptions: options.claude,
            codexProvenance: options.codexProvenance,
            claudeProvenance: options.claudeProvenance,
            codexRoute: currentCodexRoute, claudeRoute: currentClaudeRoute
        )
    }

    func mergeWorkspaceRun(_ run: WorkspaceRun, persist: Bool = true) {
        if let index = conversations.firstIndex(where: { $0.id == run.conversationID }) {
            if conversations[index].turns.isEmpty { conversations[index].title = String(run.turn.prompt.prefix(48)) }
            if let turnIndex = conversations[index].turns.firstIndex(where: { $0.id == run.turn.id }) {
                conversations[index].turns[turnIndex] = run.turn
            } else {
                conversations[index].turns.append(run.turn)
                conversations[index].turns.sort { $0.createdAt < $1.createdAt }
            }
            conversations[index].updatedAt = max(conversations[index].updatedAt, run.updatedAt)
            if conversations[index].turns.last?.id == run.turn.id {
                conversations[index].mode = run.turn.mode
                conversations[index].preview = Self.sidebarPreview(for: run.turn, fallback: run.stage.title)
            }
        } else {
            conversations.insert(Conversation(id: run.conversationID, title: String(run.turn.prompt.prefix(48)),
                preview: Self.sidebarPreview(for: run.turn, fallback: run.stage.title),
                updatedAt: run.updatedAt, mode: run.turn.mode, turns: [run.turn]), at: 0)
        }
        if selectedConversationID == run.conversationID {
            turns = conversations.first(where: { $0.id == run.conversationID })?.turns ?? []
            isGenerating = run.status == .running
            councilStage = run.stage
        }
        workspaceRevision += 1
        if persist { saveConversations() }
    }

    #if os(macOS)
    func startBrowserConnection() {
        refreshConnections()
        workspaceServer.start { [weak self] request in
            guard let self else { return .error(503, "The Mac workspace is unavailable.") }
            if request.path.hasPrefix("/v1/connections") { return await self.handleConnectionSettingsRequest(request) }
            return self.handleWorkspaceRequest(request)
        }
    }

    func handleWorkspaceRequest(_ request: LocalWorkspaceRequest) -> LocalWorkspaceResponse {
        do {
            if request.method == "GET", request.path == "/v1/workspace" { return try workspaceResponse() }
            if request.method == "POST", request.path == "/v1/readiness" {
                if startupPhase != .checking { refreshConnections() }
                return try workspaceResponse()
            }
            if request.method == "POST", request.path == "/v1/settings/open" {
                struct OpenSettingsRequest: Decodable { let section: NativeSettingsDestination }
                struct OpenSettingsResponse: Encodable { let opened: Bool; let section: NativeSettingsDestination }
                let input = try JSONDecoder().decode(OpenSettingsRequest.self, from: request.body)
                requestedSettingsSection = input.section
                settingsPresentationRevision &+= 1
                showSettings = true
                if !RivuneLaunchContext.isIsolated { NSApp.activate(ignoringOtherApps: true) }
                return LocalWorkspaceResponse(jsonData: try JSONEncoder().encode(OpenSettingsResponse(opened: true, section: input.section)))
            }
            if request.method == "POST", request.path == "/v1/runs" {
                guard allowsWorkspaceRequests else { return .error(403, "UI preview cannot run models.") }
                let input = try JSONDecoder().decode(BrowserRunRequest.self, from: request.body)
                guard let mode = IntelligenceMode(workspaceID: input.mode) else { return .error(400, "Choose ChatGPT, Claude, or Rivune.") }
                if mode == .together && !input.shareWithTeam { throw WorkspaceInputError.sharingRequired }
                let run = try submitWorkspaceRun(id: input.id, conversationID: input.conversationID,
                    prompt: input.prompt, requestMode: mode, requestKey: input.requestKey,
                    modelSelections: input.modelSelections)
                return LocalWorkspaceResponse(status: 200, jsonData: try JSONEncoder().encode(WorkspaceRunDTO(run: run)))
            }
            if request.method == "POST", request.path.hasPrefix("/v1/runs/"), request.path.hasSuffix("/cancel") {
                let parts = request.path.split(separator: "/")
                guard parts.count == 4, let id = UUID(uuidString: String(parts[2])),
                      runCoordinator.runs.contains(where: { $0.id == id }) else { return .error(404, "This task was not found.") }
                runCoordinator.cancel(id)
                return try workspaceResponse()
            }
            if request.method == "POST", request.path == "/v1/open" {
                struct OpenRequest: Decodable { let conversationID: UUID }
                let input = try JSONDecoder().decode(OpenRequest.self, from: request.body)
                guard conversations.contains(where: { $0.id == input.conversationID }) else { throw WorkspaceInputError.unknownConversation }
                selectConversation(input.conversationID)
                conversationPresentationRevision &+= 1
                NSApp.activate(ignoringOtherApps: true)
                return LocalWorkspaceResponse(jsonData: Data("{\"ok\":true}".utf8))
            }
            return .error(404, "This workspace action does not exist.")
        } catch let error as WorkspaceRunError {
            switch error {
            case .duplicateConflict, .busy: return .error(409, error.localizedDescription)
            case .deletedRequest: return .error(410, error.localizedDescription)
            default: return .error(503, error.localizedDescription)
            }
        } catch let error as WorkspaceInputError {
            return .error(error == .unavailable ? 409 : 400, error.localizedDescription)
        } catch is DecodingError {
            return .error(400, "The workspace request is not valid JSON for this action.")
        } catch {
            return .error(500, "Rivune could not prepare this workspace response.")
        }
    }

    private func workspaceResponse() throws -> LocalWorkspaceResponse {
        let orderedConversations = conversations.sorted { $0.updatedAt > $1.updatedAt }
        let recordedRuns = Dictionary(uniqueKeysWithValues: runCoordinator.runs.map { ($0.turn.id, $0) })
        let recentTurns = orderedConversations.flatMap { conversation in
            conversation.turns.map { (conversation.id, $0) }
        }.sorted { $0.1.createdAt > $1.1.createdAt }
        let snapshot = WorkspaceSnapshotDTO(
            revision: workspaceRevision + runCoordinator.revision,
            device: .init(name: Host.current().localizedName ?? "Rivune Mac", status: "online", execution: "local"),
            capabilities: ["googleAuth": false, "apiProviders": true, "projectEditing": false, "nativeProjectReview": true, "settingsNavigation": true, "connectionManagement": true],
            connections: [
                .init(id: "codex", provider: "codex", title: routeDescription(for: .chatGPT), readiness: codexReadiness,
                      transport: currentCodexRoute.transportKind == .api ? "api" : "cli",
                      message: connectionChecks.first(where: { $0.route == currentCodexRoute })?.detail),
                .init(id: "claude", provider: "claude", title: routeDescription(for: .claude), readiness: claudeReadiness,
                      transport: currentClaudeRoute.transportKind == .api ? "api" : "cli",
                      message: connectionChecks.first(where: { $0.route == currentClaudeRoute })?.detail)
            ],
            startup: .init(phase: startupPhase.rawValue, progress: startupProgress, message: startupStatusText),
            connectionChecks: connectionChecks.map { check in
                .init(id: check.id, provider: check.route.providerID == AIProviderConfiguration.openAIDefault.id ? "codex" : "claude",
                      title: check.title, readiness: check.readiness, transport: check.route.transportKind == .api ? "api" : "cli", message: check.detail)
            },
            modelControls: workspaceModelControls,
            providerCatalog: workspaceProviderCatalog,
            conversations: orderedConversations.prefix(200).map { .init(id: $0.id, title: $0.title, updatedAt: Self.webDate($0.updatedAt), mode: $0.mode.workspaceID) },
            runs: recentTurns.prefix(50).map { conversationID, turn in
                if let run = recordedRuns[turn.id] { return WorkspaceRunDTO(run: run) }
                let stage = Self.completionStage(for: turn)
                let status: WorkspaceRunStatus = switch turn.executionState {
                case .complete: .complete
                case .cancelled: .cancelled
                case .interrupted: .interrupted
                default: stage == .complete ? .complete : .failed
                }
                return WorkspaceRunDTO(run: WorkspaceRun(id: turn.id, conversationID: conversationID,
                    requestKey: "history", turn: turn, status: status, stage: stage, updatedAt: turn.createdAt))
            },
            hasMoreHistory: recentTurns.count > 50 || orderedConversations.count > 200
        )
        return LocalWorkspaceResponse(jsonData: try JSONEncoder().encode(snapshot))
    }
    #endif

    static func webDate(_ value: Date) -> String { ISO8601DateFormatter().string(from: value) }
}

extension WorkspaceInputError: Equatable {}

#if os(macOS)
struct WorkspaceConnectionSettings: Encodable, Sendable {
    struct API: Encodable, Sendable {
        let provider: String
        let title: String
        let hasKey: Bool
        let modelID: String?
    }
    let cli: [MacCLIEntry]
    let api: [API]
    let message: String?
}

extension RivuneStore {
    /// The HTTP parser applies the same exact-origin, loopback-host and bearer
    /// policy as chat. Credentials are never returned or added to snapshots.
    /// Tests inject an in-memory store and defaults; isolation rejects live I/O.
    func handleConnectionSettingsRequest(_ request: LocalWorkspaceRequest,
        credentials injectedCredentials: (any APIConnectionManaging)? = nil,
        defaults injectedDefaults: UserDefaults? = nil,
        searchDirectories: [URL]? = nil
    ) async -> LocalWorkspaceResponse {
        guard !RivuneLaunchContext.isIsolated || (injectedCredentials != nil && injectedDefaults != nil) else {
            return .error(403, "Connection changes are disabled in this isolated preview.")
        }
        let credentials: any APIConnectionManaging = injectedCredentials ?? APIConnectionStore.shared
        let defaults = injectedDefaults ?? .standard
        var message: String?
        do {
            switch (request.method, request.path) {
            case ("GET", "/v1/connections"), ("POST", "/v1/connections/scan"):
                break
            case ("POST", "/v1/connections/cli"):
                guard !hasActiveProviderRuns else { return .error(409, "Wait for the current task or connection change to finish.") }
                struct Input: Decodable { let title: String; let executable: String }
                let input = try JSONDecoder().decode(Input.self, from: request.body)
                try MacCLIInventory.add(title: input.title, executable: input.executable, defaults: defaults, directories: searchDirectories)
                message = "Tool added to this Mac’s CLI inventory. Only supported adapters can run chats."
            case ("POST", "/v1/connections/api"):
                guard !hasActiveProviderRuns, startupPhase != .checking else { return .error(409, "Wait for the current task or connection check to finish.") }
                struct Input: Decodable { let provider: String; let apiKey: String; let modelID: String }
                let input = try JSONDecoder().decode(Input.self, from: request.body)
                guard let provider = RivuneAPIProvider(rawValue: input.provider) else { return .error(400, "Choose a supported API provider.") }
                guard APIConnectionStore.isValidModelID(input.modelID), input.apiKey.utf8.count <= 4_096,
                    input.apiKey.isEmpty || input.apiKey.unicodeScalars.allSatisfy({ (33...126).contains($0.value) }) else {
                    return .error(400, "Enter a valid API key and exact model ID.")
                }
                isSavingProviderConnection = true
                defer { isSavingProviderConnection = false }
                try Task.checkCancellation()
                try await credentials.save(apiKey: input.apiKey, modelID: input.modelID, for: provider)
                // Configuration invalidates old readiness before any new run.
                if provider == .openAI { codexReadiness = .checking } else { claudeReadiness = .checking }
                workspaceRevision += 1
                if injectedCredentials == nil { refreshConnections() }
                message = "Saved to your Mac’s Keychain. Checking API access; no chat was sent."
            default: return .error(404, "This connection action does not exist.")
            }
            var api: [WorkspaceConnectionSettings.API] = []
            for provider in RivuneAPIProvider.allCases {
                let configuration = await credentials.configuration(for: provider)
                api.append(.init(provider: provider.rawValue, title: provider.displayName,
                    hasKey: configuration.hasKey, modelID: configuration.modelID))
            }
            let result = WorkspaceConnectionSettings(cli: MacCLIInventory.scan(defaults: defaults, directories: searchDirectories), api: api, message: message)
            return LocalWorkspaceResponse(jsonData: try JSONEncoder().encode(result))
        } catch let error as MacCLIInventoryError {
            return .error(400, error.message)
        } catch let error as APIRuntimeError {
            return .error(400, error.userMessage)
        } catch is DecodingError {
            return .error(400, "Complete the required connection fields.")
        } catch {
            return .error(500, "Could not update this connection. Check Settings on your Mac.")
        }
    }
}
#endif

struct WorkspaceSnapshotDTO: Encodable {
    let schemaVersion = 1
    let revision: Int
    struct Device: Encodable { let name: String; let status: String; let execution: String }
    let device: Device
    let capabilities: [String: Bool]
    struct Connection: Encodable {
        let id: String; let provider: String; let title: String
        let transport: String
        let state: String; let message: String
        init(id: String, provider: String, title: String, readiness: ProviderReadiness, transport: String = "cli", message: String? = nil) {
            self.id = id; self.provider = provider; self.title = title; self.transport = transport
            state = readiness.workspaceState
            self.message = message ?? readiness.label
        }
    }
    let connections: [Connection]
    struct Startup: Encodable { let phase: String; let progress: Double; let message: String }
    let startup: Startup
    let connectionChecks: [Connection]
    let modelControls: [WorkspaceModelControl]
    let providerCatalog: [WorkspaceProviderCatalogEntry]?
    struct ConversationSummary: Encodable { let id: UUID; let title: String; let updatedAt: String; let mode: String }
    let conversations: [ConversationSummary]
    let runs: [WorkspaceRunDTO]
    let hasMoreHistory: Bool
}

struct WorkspaceRunDTO: Encodable {
    let id: UUID; let conversationID: UUID; let turnID: UUID
    let status: String; let stage: String; let prompt: String
    let createdAt: String; let updatedAt: String; let mode: String
    let result: String?; let error: String?; let resultTruncated: Bool
    struct Activity: Encodable { let title: String; let body: String }
    let activities: [Activity]

    @MainActor init(run: WorkspaceRun) {
        id = run.id; conversationID = run.conversationID; turnID = run.turn.id
        status = run.status.rawValue
        stage = run.turn.mode != .together && run.status == .running ? "Waiting for the provider" : run.stage.title
        prompt = run.turn.prompt
        createdAt = RivuneStore.webDate(run.turn.createdAt); updatedAt = RivuneStore.webDate(run.updatedAt)
        mode = run.turn.mode.workspaceID
        let fullResult: String?
        switch run.turn.mode {
        case .chatGPT: fullResult = run.turn.chatGPTAnswer?.content; error = run.turn.chatGPTError
        case .claude: fullResult = run.turn.claudeAnswer?.content; error = run.turn.claudeError
        case .together: fullResult = run.turn.combinedAnswer?.content; error = run.turn.combinedError
        }
        // Bounded browser snapshots keep a large personal archive from blocking
        // connection. The UI links explicitly to the complete native transcript.
        result = fullResult.map { String($0.prefix(12_000)) }
        resultTruncated = (fullResult?.count ?? 0) > 12_000
        var events: [Activity] = []
        if let trace = run.turn.togetherTrace {
            if let plan = trace.sharedPlan { events.append(.init(title: "Shared plan", body: String(plan.prefix(2_000)))) }
            if let review = trace.chatGPTReview { events.append(.init(title: "Codex review", body: String(review.prefix(2_000)))) }
            if let review = trace.claudeReview { events.append(.init(title: "Claude review", body: String(review.prefix(2_000)))) }
        }
        activities = events
    }
}
