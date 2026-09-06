import Foundation

/// A locally validated route from a catalog transport to reviewed runtime code.
/// The route contains identifiers only; it never carries an executable path,
/// arguments, parser, credential, or network endpoint.
struct AIExecutionRoute: Hashable, Sendable {
    let providerID: String
    let transportID: String
    let runtimeAdapterID: String
    let transportKind: AITransportKind

    static let codexCLI = Self(
        providerID: AIProviderConfiguration.openAIDefault.id,
        transportID: "openai.codex-cli",
        runtimeAdapterID: "alloy.terminal.codex",
        transportKind: .commandLine
    )

    static let claudeCodeCLI = Self(
        providerID: AIProviderConfiguration.anthropicDefault.id,
        transportID: "anthropic.claude-code-cli",
        runtimeAdapterID: "alloy.terminal.claude",
        transportKind: .commandLine
    )

    static let openAIResponsesAPI = Self(
        providerID: "openai",
        transportID: "openai.responses-api",
        runtimeAdapterID: "rivune.api.openai.responses",
        transportKind: .api
    )

    static let anthropicMessagesAPI = Self(
        providerID: "anthropic",
        transportID: "anthropic.messages-api",
        runtimeAdapterID: "rivune.api.anthropic.messages",
        transportKind: .api
    )
}

/// Setup actions are inert values for the UI to present. Rivune never executes
/// the command represented here; the current Settings surface only copies it.
enum AIProviderSetupAction: Equatable, Sendable {
    case copyCommand(String)

    var commandToCopy: String? {
        guard case .copyCommand(let command) = self else { return nil }
        return command
    }
}

/// Runtime adapters are compiled, reviewed implementations. Catalog records can
/// select an adapter by stable identifier, but cannot manufacture runtime code.
protocol AITextRuntimeAdapter: Sendable {
    var route: AIExecutionRoute { get }

    /// Validates the complete local catalog record before it is advertised as
    /// executable. Concrete adapters must reject configuration that would alter
    /// their reviewed executable or transport boundary.
    func accepts(providerID: String, transport: AITransportConfiguration) -> Bool

    func probe() async -> ProviderReadiness
    func setupAction() -> AIProviderSetupAction?
    func run(
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult
}

enum AITextRuntimeRegistryError: Error, Equatable, Sendable {
    case invalidRoute(AIExecutionRoute)
    case duplicateAdapterID(String)
    case duplicateTransportRoute(
        providerID: String,
        transportID: String,
        transportKind: AITransportKind
    )
    case adapterUnavailable(AIExecutionRoute)
}

/// The sole authority for executable provider support. The catalog describes
/// transports; this registry proves that matching reviewed code exists.
struct AITextRuntimeRegistry: Sendable {
    private let adaptersByID: [String: any AITextRuntimeAdapter]

    init(adapters: [any AITextRuntimeAdapter]) throws {
        var indexed: [String: any AITextRuntimeAdapter] = [:]
        var transportRoutes: Set<TransportRouteKey> = []

        for adapter in adapters {
            let route = adapter.route
            guard !route.providerID.isEmpty,
                  !route.transportID.isEmpty,
                  !route.runtimeAdapterID.isEmpty else {
                throw AITextRuntimeRegistryError.invalidRoute(route)
            }
            guard indexed[route.runtimeAdapterID] == nil else {
                throw AITextRuntimeRegistryError.duplicateAdapterID(route.runtimeAdapterID)
            }

            let transportRoute = TransportRouteKey(
                providerID: route.providerID,
                transportID: route.transportID,
                transportKind: route.transportKind
            )
            guard transportRoutes.insert(transportRoute).inserted else {
                throw AITextRuntimeRegistryError.duplicateTransportRoute(
                    providerID: route.providerID,
                    transportID: route.transportID,
                    transportKind: route.transportKind
                )
            }
            indexed[route.runtimeAdapterID] = adapter
        }

        adaptersByID = indexed
    }

    static let current: Self = {
        do {
            return try Self(adapters: [
                CodexCLIRuntimeAdapter(),
                ClaudeCLIRuntimeAdapter(),
                APIRuntimeAdapter(provider: .openAI),
                APIRuntimeAdapter(provider: .anthropic)
            ])
        } catch {
            preconditionFailure("The compiled AI runtime registry is invalid: \(error)")
        }
    }()

    func resolvedRoute(
        providerID: String,
        transport: AITransportConfiguration
    ) -> AIExecutionRoute? {
        guard transport.implementation == .executableAdapter,
              transport.capabilities.contains(.text),
              let runtimeAdapterID = transport.runtimeAdapterID else {
            return nil
        }

        let candidate = AIExecutionRoute(
            providerID: providerID,
            transportID: transport.id,
            runtimeAdapterID: runtimeAdapterID,
            transportKind: transport.kind
        )
        guard let adapter = adapter(for: candidate),
              adapter.accepts(providerID: providerID, transport: transport) else {
            return nil
        }
        return candidate
    }

    func supports(
        providerID: String,
        transport: AITransportConfiguration
    ) -> Bool {
        resolvedRoute(providerID: providerID, transport: transport) != nil
    }

    func probe(_ route: AIExecutionRoute) async -> ProviderReadiness {
        guard let adapter = adapter(for: route) else { return .unavailable }
        return await adapter.probe()
    }

    func setupAction(for route: AIExecutionRoute) -> AIProviderSetupAction? {
        adapter(for: route)?.setupAction()
    }

    func run(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        guard let adapter = adapter(for: route) else {
            throw AITextRuntimeRegistryError.adapterUnavailable(route)
        }
        return try await adapter.run(prompt: prompt, options: options)
    }

    private func adapter(for route: AIExecutionRoute) -> (any AITextRuntimeAdapter)? {
        guard let adapter = adaptersByID[route.runtimeAdapterID],
              adapter.route == route else {
            return nil
        }
        return adapter
    }

    private struct TransportRouteKey: Hashable, Sendable {
        let providerID: String
        let transportID: String
        let transportKind: AITransportKind
    }
}

extension AITextRuntimeRegistry: AITextRunning {}

/// Presentation inventory across CLI and API transports. Resolving a reviewed
/// adapter is the only way a catalog record becomes executable; descriptions,
/// credential references and endpoint URLs never grant runtime support.
struct AITransportRegistration: Identifiable, Sendable {
    let configuration: AITransportConfiguration
    let executionRoute: AIExecutionRoute?
    var id: String { configuration.id }
    var supportsExecution: Bool { executionRoute != nil }
    var supportsModelSettings: Bool {
        guard let executionRoute else { return false }
        return [AIExecutionRoute.codexCLI, .claudeCodeCLI, .openAIResponsesAPI, .anthropicMessagesAPI].contains(executionRoute)
    }
}

struct AIProviderRegistration: Identifiable, Sendable {
    let configuration: AIProviderConfiguration
    let transports: [AITransportRegistration]
    var id: String { configuration.id }

    /// The current conversation engine has two known participant families.
    /// Additional catalog entries remain visible without inventing chat modes.
    var workspaceProvider: String? {
        if transports.contains(where: { $0.executionRoute == .codexCLI || $0.executionRoute == .openAIResponsesAPI }) { return "codex" }
        if transports.contains(where: { $0.executionRoute == .claudeCodeCLI || $0.executionRoute == .anthropicMessagesAPI }) { return "claude" }
        return nil
    }

    var displayName: String {
        switch workspaceProvider {
        case "codex": "ChatGPT"
        case "claude": "Claude"
        default: configuration.displayName
        }
    }
}

struct AIProviderRegistry: Sendable {
    let registrations: [AIProviderRegistration]

    init(catalog: AIProviderCatalog = .currentDefaults, runtimeRegistry: AITextRuntimeRegistry = .current) {
        registrations = catalog.providers.map { provider in
            AIProviderRegistration(configuration: provider, transports: provider.transports.map { transport in
                AITransportRegistration(configuration: transport, executionRoute: runtimeRegistry.resolvedRoute(providerID: provider.id, transport: transport))
            })
        }
    }

    static let current = Self()
}

/// One command-line transport presented by Settings. Registrations come from
/// the provider catalog, so adding a provider does not require another
/// hard-coded Settings row. Only transports with a known terminal adapter can
/// execute requests in this build.
struct CLIProviderRegistration: Identifiable, Sendable {
    let provider: AIProviderConfiguration
    let transport: AICLITransportConfiguration
    let executionRoute: AIExecutionRoute?

    var id: String { "\(provider.id)::\(transport.id)" }
    var supportsExecution: Bool {
        executionRoute != nil
    }
    var supportsModelSettings: Bool {
        // The current Settings bindings exist only for these two providers.
        // A reviewed execution adapter alone does not create editable controls.
        terminalProvider != nil && !provider.models.isEmpty
    }

    /// Temporary source compatibility for the current Settings implementation.
    /// Runtime support is decided by `executionRoute`, not by this projection.
    var terminalProvider: TerminalProvider? {
        executionRoute.flatMap(TerminalProvider.init(executionRoute:))
    }
}

/// Converts the open provider catalog into runtime-neutral CLI registrations.
/// The adapter lookup is the only legacy boundary: the current engine can run
/// Codex and Claude, while every other registered CLI remains discoverable and
/// is honestly labelled as requiring an adapter.
struct CLIProviderRegistry: Sendable {
    let registrations: [CLIProviderRegistration]

    init(
        catalog: AIProviderCatalog = .currentDefaults,
        runtimeRegistry: AITextRuntimeRegistry = .current
    ) {
        registrations = catalog.providers.flatMap { provider in
            provider.transports.compactMap { transport in
                guard case .commandLine(let configuration) = transport else { return nil }
                return CLIProviderRegistration(
                    provider: provider,
                    transport: configuration,
                    executionRoute: runtimeRegistry.resolvedRoute(
                        providerID: provider.id,
                        transport: transport
                    )
                )
            }
        }
    }

    static let current = Self()
}

struct CLIExecutableInstallation: Equatable, Sendable {
    let registrationID: String
    let executableURL: URL?

    var isInstalled: Bool { executableURL != nil }
}

enum CLIProviderConnectionState: Equatable, Sendable {
    case checking
    case ready
    case signedOut
    case adapterRequired
    case missing
    case macRequired
    case unavailable

    var label: String {
        switch self {
        case .checking: "Checking"
        case .ready: "Signed in"
        case .signedOut: "Sign in required"
        case .adapterRequired: "Installed · Adapter needed"
        case .missing: "Not installed"
        case .macRequired: "Mac required"
        case .unavailable: "Status unavailable"
        }
    }
}

enum CLIProviderDiscovery {
    /// The app does not search the whole filesystem or accept arbitrary PATH
    /// directories. These are conventional, bounded installation locations for
    /// user-managed and system package managers on macOS.
    static func trustedSearchDirectories(
        homeDirectory: URL = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true),
        environmentPath: String? = ProcessInfo.processInfo.environment["PATH"]
    ) -> [URL] {
        let known = [
            homeDirectory.appendingPathComponent(".local/bin", isDirectory: true),
            homeDirectory.appendingPathComponent(".npm-global/bin", isDirectory: true),
            homeDirectory.appendingPathComponent("Library/pnpm", isDirectory: true),
            homeDirectory.appendingPathComponent(".bun/bin", isDirectory: true),
            URL(fileURLWithPath: "/opt/homebrew/bin", isDirectory: true),
            URL(fileURLWithPath: "/usr/local/bin", isDirectory: true),
            URL(fileURLWithPath: "/usr/bin", isDirectory: true),
            URL(fileURLWithPath: "/bin", isDirectory: true),
            URL(fileURLWithPath: "/Library/Apple/usr/bin", isDirectory: true)
        ].map { standardizedDirectory($0) }

        let allowedPaths = Set(known.map(\.path))
        let pathDirectories = (environmentPath ?? "")
            .split(separator: ":", omittingEmptySubsequences: true)
            .compactMap { entry -> URL? in
                let path = String(entry)
                guard path.hasPrefix("/") else { return nil }
                let directory = standardizedDirectory(URL(fileURLWithPath: path, isDirectory: true))
                return allowedPaths.contains(directory.path) ? directory : nil
            }

        var seen: Set<String> = []
        return (pathDirectories + known).filter { seen.insert($0.path).inserted }
    }

    static func resolveExecutable(
        named executableName: String,
        searchDirectories: [URL],
        fileManager: FileManager = .default
    ) -> URL? {
        guard isSafeExecutableName(executableName) else { return nil }

        for rawDirectory in searchDirectories {
            let directory = standardizedDirectory(rawDirectory)
            let candidate = directory
                .appendingPathComponent(executableName, isDirectory: false)
                .standardizedFileURL
            guard candidate.deletingLastPathComponent().path == directory.path else { continue }

            var candidateIsDirectory = ObjCBool(false)
            guard fileManager.fileExists(
                atPath: candidate.path,
                isDirectory: &candidateIsDirectory
            ), !candidateIsDirectory.boolValue,
            fileManager.isExecutableFile(atPath: candidate.path) else {
                continue
            }

            // Homebrew and other package managers commonly expose a symlink.
            // Resolve it for display and execution diagnostics, but never invoke
            // it during discovery.
            let resolved = candidate.resolvingSymlinksInPath()
            var resolvedIsDirectory = ObjCBool(false)
            guard fileManager.fileExists(
                atPath: resolved.path,
                isDirectory: &resolvedIsDirectory
            ), !resolvedIsDirectory.boolValue,
            fileManager.isExecutableFile(atPath: resolved.path) else {
                continue
            }
            return resolved
        }
        return nil
    }

    static func discover(
        registry: CLIProviderRegistry = .current,
        searchDirectories: [URL]? = nil,
        fileManager: FileManager = .default
    ) -> [CLIExecutableInstallation] {
        #if os(macOS)
        let directories = searchDirectories ?? trustedSearchDirectories()
        return registry.registrations.map { registration in
            CLIExecutableInstallation(
                registrationID: registration.id,
                executableURL: resolveExecutable(
                    named: registration.transport.executableName,
                    searchDirectories: directories,
                    fileManager: fileManager
                )
            )
        }
        #else
        return registry.registrations.map {
            CLIExecutableInstallation(registrationID: $0.id, executableURL: nil)
        }
        #endif
    }

    static func connectionState(
        registration: CLIProviderRegistration,
        installation: CLIExecutableInstallation?,
        readiness: ProviderReadiness?,
        isMac: Bool
    ) -> CLIProviderConnectionState {
        guard isMac || readiness != nil else { return .macRequired }

        guard registration.supportsExecution else {
            if !isMac { return .macRequired }
            return installation?.isInstalled == true ? .adapterRequired : .missing
        }

        switch readiness ?? .checking {
        case .checking: return .checking
        case .ready: return .ready
        case .signedOut: return .signedOut
        case .missing: return .missing
        case .macRequired: return .macRequired
        case .unavailable: return .unavailable
        }
    }

    static func isSafeExecutableName(_ name: String) -> Bool {
        guard !name.isEmpty,
              name.count <= 128,
              name != ".",
              name != "..",
              !name.contains("/"),
              !name.contains("\\") else {
            return false
        }
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.+"))
        return name.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    private static func standardizedDirectory(_ url: URL) -> URL {
        URL(fileURLWithPath: url.standardizedFileURL.path, isDirectory: true)
    }
}

/// A local inventory, not an execution registry. Finding a binary never grants
/// it permission to run or makes it eligible for a conversation.
struct MacCLIEntry: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let title: String
    let command: String
    let isDefault: Bool
    let installed: Bool
    let supported: Bool
    let custom: Bool
}

struct SavedMacCLI: Codable, Equatable, Sendable {
    let title: String
    let executable: String
}

enum MacCLIInventoryError: Error {
    case invalidName, invalidExecutable, notInstalled, limitReached
    var message: String {
        switch self {
        case .invalidName: "Enter a name of up to 60 characters."
        case .invalidExecutable: "Enter an executable name or its full path, without arguments."
        case .notInstalled: "That executable was not found. Install it first, or enter its full path."
        case .limitReached: "You can save up to 30 additional CLI tools."
        }
    }
}

enum MacCLIInventory {
    private static let storageKey = "rivune.additionalCLIs.v1"
    static let candidates: [(String, String)] = [
        ("ChatGPT", "codex"), ("Claude", "claude"), ("Gemini", "gemini"),
        ("GitHub Copilot", "copilot"), ("OpenCode", "opencode"), ("Aider", "aider"),
        ("Goose", "goose"), ("Ollama", "ollama"), ("Amp", "amp")
    ]

    static func saved(in defaults: UserDefaults) -> [SavedMacCLI] {
        guard let data = defaults.data(forKey: storageKey), data.count <= 100_000,
              let entries = try? JSONDecoder().decode([SavedMacCLI].self, from: data) else { return [] }
        return Array(entries.prefix(30))
    }

    static func searchDirectories(home: URL = URL(fileURLWithPath: NSHomeDirectory()), fileManager: FileManager = .default) -> [URL] {
        var result = CLIProviderDiscovery.trustedSearchDirectories(homeDirectory: home)
        result.append(home.appendingPathComponent(".volta/bin", isDirectory: true))
        // Bounded version-manager locations; no shell startup files are sourced.
        let nodes = home.appendingPathComponent(".nvm/versions/node", isDirectory: true)
        let versions = (try? fileManager.contentsOfDirectory(at: nodes, includingPropertiesForKeys: nil)) ?? []
        result += versions.filter { $0.lastPathComponent.hasPrefix("v") }.sorted { $0.lastPathComponent > $1.lastPathComponent }.prefix(30).map { $0.appendingPathComponent("bin", isDirectory: true) }
        return result
    }

    static func resolve(_ value: String, directories: [URL], fileManager: FileManager = .default) -> URL? {
        if value.hasPrefix("/") {
            let url = URL(fileURLWithPath: value).standardizedFileURL
            guard value.utf8.count <= 2_048, !value.contains("\n"), !value.contains("\0") else { return nil }
            return CLIProviderDiscovery.resolveExecutable(named: url.lastPathComponent, searchDirectories: [url.deletingLastPathComponent()], fileManager: fileManager)
        }
        return CLIProviderDiscovery.resolveExecutable(named: value, searchDirectories: directories, fileManager: fileManager)
    }

    static func scan(defaults: UserDefaults, directories: [URL]? = nil, fileManager: FileManager = .default) -> [MacCLIEntry] {
        let dirs = directories ?? searchDirectories(fileManager: fileManager)
        let extra = saved(in: defaults)
        var entries: [MacCLIEntry] = []
        for (title, command) in candidates {
            let installed = resolve(command, directories: dirs, fileManager: fileManager) != nil
            let isDefault = command == "codex" || command == "claude"
            if installed || isDefault {
                entries.append(.init(id: command, title: title, command: command, isDefault: isDefault, installed: installed, supported: isDefault, custom: false))
            }
        }
        for (index, item) in extra.enumerated() {
            let command = URL(fileURLWithPath: item.executable).lastPathComponent
            guard !entries.contains(where: { $0.command == command }) else { continue }
            entries.append(.init(id: "custom-\(index)", title: item.title, command: command, isDefault: false,
                installed: resolve(item.executable, directories: dirs, fileManager: fileManager) != nil, supported: false, custom: true))
        }
        return entries
    }

    static func add(title: String, executable: String, defaults: UserDefaults, directories: [URL]? = nil, fileManager: FileManager = .default) throws {
        let name = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let command = executable.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 60, !name.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains) else { throw MacCLIInventoryError.invalidName }
        guard command.hasPrefix("/") || CLIProviderDiscovery.isSafeExecutableName(command) else { throw MacCLIInventoryError.invalidExecutable }
        guard resolve(command, directories: directories ?? searchDirectories(fileManager: fileManager), fileManager: fileManager) != nil else { throw MacCLIInventoryError.notInstalled }
        var entries = saved(in: defaults)
        // The built-in adapters retain their normal resolution and cannot be
        // replaced by registering a custom tool with the same name.
        guard !["codex", "claude"].contains(URL(fileURLWithPath: command).lastPathComponent) else { return }
        let value = SavedMacCLI(title: name, executable: command)
        if let index = entries.firstIndex(where: { $0.executable == command }) { entries[index] = value }
        else {
            guard entries.count < 30 else { throw MacCLIInventoryError.limitReached }
            entries.append(value)
        }
        defaults.set(try JSONEncoder().encode(entries), forKey: storageKey)
    }
}


/// Read only public capability metadata, never authentication files. Cache
/// contents choose identifiers and effort levels, not executable instructions.
struct CLICapabilitySnapshot: Sendable {
    struct CodexModel: Sendable {
        let choice: CodexModelChoice
        let label: String
        let efforts: [CodexReasoningEffort]
    }
    var codexModels: [CodexModel] = []
    var claudeModels: [ClaudeModelChoice] = []
    var claudeEfforts: [ClaudeReasoningEffort] = []

    static func codexCache(_ data: Data) -> [CodexModel] {
        guard data.count <= 2_000_000,
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let models = object["models"] as? [[String: Any]], models.count <= 500 else { return [] }
        var seen = Set<String>()
        return models.compactMap { record in
            guard record["visibility"] as? String == "list",
                  let id = record["slug"] as? String,
                  let choice = CodexModelChoice(rawValue: id), choice != .accountDefault,
                  seen.insert(id).inserted else { return nil }
            let rawLabel = record["display_name"] as? String ?? id
            let label = String(rawLabel.unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) }.map(String.init).joined().prefix(72))
            let levels = record["supported_reasoning_levels"] as? [[String: Any]] ?? []
            let advertised = Set(levels.compactMap { ($0["effort"] as? String).flatMap(CodexReasoningEffort.init(rawValue:)) })
            let efforts = CodexReasoningEffort.allCases.filter { $0 == .automatic || advertised.contains($0) }
            return CodexModel(choice: choice, label: label.isEmpty ? id : label, efforts: efforts)
        }
    }

    #if os(macOS)
    static func localCodexModels(home: URL = FileManager.default.homeDirectoryForCurrentUser) -> [CodexModel] {
        let directory = ProcessInfo.processInfo.environment["CODEX_HOME"].map { URL(fileURLWithPath: $0, isDirectory: true) }
            ?? home.appendingPathComponent(".codex", isDirectory: true)
        let url = directory.appendingPathComponent("models_cache.json")
        guard let info = try? url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey, .contentModificationDateKey]),
              info.isRegularFile == true, (info.fileSize ?? Int.max) <= 2_000_000,
              let modified = info.contentModificationDate, Date().timeIntervalSince(modified) < 7 * 86400,
              let data = try? Data(contentsOf: url) else { return [] }
        return codexCache(data)
    }

    #endif

    static func claudeHelp(_ text: String) -> (models: [ClaudeModelChoice], efforts: [ClaudeReasoningEffort]) {
        guard text.utf8.count <= 128 * 1024 else { return ([], []) }
        func option(_ name: String) -> String {
            guard let start = text.range(of: "  --" + name + " ") else { return "" }
            let tail = text[start.lowerBound...].split(separator: "\n", omittingEmptySubsequences: false)
            return tail.prefix(12).enumerated().prefix { $0.offset == 0 || !$0.element.hasPrefix("  -") }.map { String($0.element) }.joined(separator: " ")
        }
        let modelText = option("model")
        let aliases = ClaudeModelChoice.allCases.filter { $0 != .accountDefault && (modelText.contains("'" + $0.rawValue + "'") || modelText.contains("\"" + $0.rawValue + "\"")) }
        let effortText = option("effort")
        let advertised = Set(effortText.lowercased().split { !$0.isLetter }.map(String.init))
        let efforts = ClaudeReasoningEffort.allCases.filter { $0 == .automatic || advertised.contains($0.rawValue) }
        return (aliases.isEmpty ? [] : [.accountDefault] + aliases, effortText.isEmpty ? [] : efforts)
    }
}
