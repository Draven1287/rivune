import Foundation

#if os(macOS)
import Darwin
#endif

enum TerminalProvider: String, Sendable {
    case codex = "Codex"
    case claude = "Claude Code"

    var executionRoute: AIExecutionRoute {
        switch self {
        case .codex:
            .codexCLI
        case .claude:
            .claudeCodeCLI
        }
    }

    init?(executionRoute: AIExecutionRoute) {
        switch executionRoute {
        case TerminalProvider.codex.executionRoute:
            self = .codex
        case TerminalProvider.claude.executionRoute:
            self = .claude
        default:
            return nil
        }
    }
}

enum ProviderReadiness: Equatable, Codable, Sendable {
    case checking
    case ready
    case signedOut
    case missing
    case macRequired
    case unavailable

    var label: String {
        switch self {
        case .checking: "Checking"
        case .ready: "Signed in"
        case .signedOut: "Sign in required"
        case .missing: "Not installed"
        case .macRequired: "Mac required"
        case .unavailable: "Unavailable"
        }
    }

    var isReady: Bool { self == .ready }
}

struct TerminalRunResult: Sendable {
    let text: String
    let elapsedSeconds: Double
}

struct TerminalRunOptions: Codable, Hashable, Sendable {
    var model: String?
    var effort: String?

    static let accountDefault = TerminalRunOptions(model: nil, effort: nil)
}

/// The route-based execution seam shared by normal chat, collaboration, and
/// deterministic evaluation fixtures. A caller selects identifiers; only the
/// compiled runtime registry can turn them into executable behavior.
protocol AITextRunning: Sendable {
    func run(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult

}

enum TerminalEngineError: Error, Equatable, Sendable {
    case adapterUnavailable
    case executionFailed
    case macRequired
    case executableMissing(TerminalProvider)
    case notAuthenticated(TerminalProvider)
    case promptTooLong
    case launchFailed(TerminalProvider)
    case processFailed(TerminalProvider, Int32)
    case providerError(TerminalProvider)
    case malformedOutput(TerminalProvider)
    case outputTooLarge(TerminalProvider)
    case unexpectedToolUse(TerminalProvider)
    case timedOut(TerminalProvider)
    case cancelled

    var userMessage: String {
        switch self {
        case .adapterUnavailable:
            "No reviewed runtime adapter is registered for this provider."
        case .executionFailed:
            "Rivune could not complete this request. Try again, and check the connection in Settings if the problem continues."
        case .macRequired:
            "Keep your Mac awake and connect it to use Rivune on iPhone."
        case .executableMissing(let provider):
            "\(provider.rawValue) is not installed in a supported location on this Mac."
        case .notAuthenticated(.codex):
            "Codex needs a ChatGPT login. Run `codex login` in Terminal, then refresh the connection."
        case .notAuthenticated(.claude):
            "Claude Code needs a Claude login. Open Settings for the one-time sign-in command."
        case .promptTooLong:
            "This prompt is too long for the terminal engine. Shorten it and try again."
        case .launchFailed(let provider):
            "Rivune could not start \(provider.rawValue). Check the connection in Settings."
        case .processFailed(let provider, let code):
            "\(provider.rawValue) stopped before returning an answer (exit \(code)). Check your network and sign-in."
        case .providerError(let provider):
            "\(provider.rawValue) reported that the request failed. Check your selected model, network, and account access."
        case .malformedOutput(let provider):
            "\(provider.rawValue) returned output Rivune could not read."
        case .outputTooLarge(let provider):
            "\(provider.rawValue) returned more text than Rivune can safely display."
        case .unexpectedToolUse(let provider):
            "\(provider.rawValue) tried to use a tool, so Rivune stopped this text-only request."
        case .timedOut(let provider):
            "\(provider.rawValue) took too long to finish, so Rivune stopped the request."
        case .cancelled:
            "Request stopped."
        }
    }
}

struct TerminalAIService: Sendable {
    // User input is capped much lower in RivuneStore. This larger envelope allows
    // JSON escaping plus the bounded drafts/critiques used by Together without
    // silently clipping the user's original request.
    private static let promptLimit = 128 * 1_024
    private static let outputLimit = 8 * 1_024 * 1_024

    func readCLICapabilities() async -> CLICapabilitySnapshot {
        var snapshot = CLICapabilitySnapshot()
        #if os(macOS)
        snapshot.codexModels = CLICapabilitySnapshot.localCodexModels()
        if let executable = Self.executableURL(for: .claude) {
            let job = TerminalProcessJob(provider: .claude, executable: executable, arguments: ["--help"], stdin: nil, outputLimit: 128 * 1024)
            if let output = try? await job.value(timeout: .seconds(4)), output.status == 0 {
                let help = CLICapabilitySnapshot.claudeHelp(String(decoding: output.stdout, as: UTF8.self))
                snapshot.claudeModels = help.models; snapshot.claudeEfforts = help.efforts
            }
        }
        #endif
        return snapshot
    }

    func probe(_ provider: TerminalProvider) async -> ProviderReadiness {
        await probe(provider.executionRoute)
    }

    func probe(_ route: AIExecutionRoute) async -> ProviderReadiness {
        await AITextRuntimeRegistry.current.probe(route)
    }

    fileprivate func probeKnownProvider(_ provider: TerminalProvider) async -> ProviderReadiness {
        #if os(macOS)
        guard let executable = Self.executableURL(for: provider) else { return .missing }

        let arguments: [String] = switch provider {
        case .codex: ["login", "status"]
        case .claude: ["auth", "status", "--json"]
        }

        let job = TerminalProcessJob(
            provider: provider,
            executable: executable,
            arguments: arguments,
            stdin: nil,
            outputLimit: 256 * 1_024
        )

        do {
            let output = try await job.value(timeout: .seconds(8))
            switch provider {
            case .codex:
                return output.status == 0 ? .ready : .signedOut
            case .claude:
                guard output.status == 0,
                      let object = try? JSONSerialization.jsonObject(with: output.stdout) as? [String: Any],
                      object["loggedIn"] as? Bool == true else {
                    return .signedOut
                }
                return .ready
            }
        } catch {
            return .unavailable
        }
        #else
        return .macRequired
        #endif
    }

    func setupAction(for route: AIExecutionRoute) -> AIProviderSetupAction? {
        AITextRuntimeRegistry.current.setupAction(for: route)
    }

    func authenticationCommand(for provider: TerminalProvider) -> String? {
        setupAction(for: provider.executionRoute)?.commandToCopy
    }

    fileprivate func authenticationCommandForKnownProvider(
        _ provider: TerminalProvider
    ) -> String? {
        #if os(macOS)
        guard let executable = Self.executableURL(for: provider) else { return nil }
        let quotedPath = "'\(executable.path.replacingOccurrences(of: "'", with: "'\\''"))'"
        switch provider {
        case .codex:
            return "\(quotedPath) login"
        case .claude:
            return "\(quotedPath) auth login --claudeai"
        }
        #else
        return nil
        #endif
    }

    func run(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions = .accountDefault
    ) async throws -> TerminalRunResult {
        try await AITextRuntimeRegistry.current.run(
            route,
            prompt: prompt,
            options: options
        )
    }

    func run(
        _ provider: TerminalProvider,
        prompt: String,
        options: TerminalRunOptions = .accountDefault
    ) async throws -> TerminalRunResult {
        try await run(provider.executionRoute, prompt: prompt, options: options)
    }

    fileprivate func runKnownProvider(
        _ provider: TerminalProvider,
        prompt: String,
        options: TerminalRunOptions = .accountDefault
    ) async throws -> TerminalRunResult {
        guard let promptData = prompt.data(using: .utf8),
              promptData.count <= Self.promptLimit else {
            throw TerminalEngineError.promptTooLong
        }

        #if os(macOS)
        guard let executable = Self.executableURL(for: provider) else {
            throw TerminalEngineError.executableMissing(provider)
        }

        let runRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("RivuneEngine", isDirectory: true)
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: runRoot, withIntermediateDirectories: true)

        let arguments: [String]
        switch provider {
        case .codex:
            var codexArguments = [
                "--ask-for-approval", "never",
                "--disable", "shell_tool",
                "--disable", "unified_exec",
                "--disable", "shell_zsh_fork",
                "--disable", "unified_exec_zsh_fork",
                "--disable", "apps",
                "--disable", "browser_use",
                "--disable", "browser_use_external",
                "--disable", "browser_use_full_cdp_access",
                "--disable", "in_app_browser",
                "--disable", "computer_use",
                "--disable", "image_generation",
                "--disable", "multi_agent",
                "--disable", "multi_agent_v2",
                "--disable", "code_mode",
                "--disable", "code_mode_host",
                "--disable", "plugins",
                "--disable", "remote_plugin",
                "--disable", "tool_suggest",
                "--disable", "workspace_dependencies",
            ]
            if let model = options.model {
                codexArguments += ["--model", model]
            }
            if let effort = options.effort {
                codexArguments += ["--config", "model_reasoning_effort=\"\(effort)\""]
            }
            codexArguments += [
                "exec",
                "--sandbox", "read-only",
                "--ephemeral",
                "--ignore-user-config",
                "--ignore-rules",
                "--skip-git-repo-check",
                "--color", "never",
                "--json",
                "--cd", runRoot.path,
                "-"
            ]
            arguments = codexArguments
        case .claude:
            var claudeArguments = [
                "-p",
                "--input-format", "text",
                "--output-format", "json",
                "--no-session-persistence",
                "--permission-mode", "dontAsk",
                "--tools", "",
                "--safe-mode",
                "--no-chrome",
                "--disable-slash-commands"
            ]
            if let model = options.model {
                claudeArguments += ["--model", model]
            }
            if let effort = options.effort {
                claudeArguments += ["--effort", effort]
            }
            arguments = claudeArguments
        }

        let startedAt = ContinuousClock.now
        let job = TerminalProcessJob(
            provider: provider,
            executable: executable,
            arguments: arguments,
            stdin: promptData,
            workingDirectory: runRoot,
            outputLimit: Self.outputLimit
        )

        defer { try? FileManager.default.removeItem(at: runRoot) }

        let output: TerminalProcessOutput
        do {
            let timeout: Duration = options.effort == "ultra" ? .seconds(900) : .seconds(600)
            output = try await job.value(timeout: timeout)
        } catch is CancellationError {
            throw TerminalEngineError.cancelled
        } catch let error as TerminalEngineError {
            throw error
        } catch {
            throw TerminalEngineError.launchFailed(provider)
        }

        guard !Task.isCancelled else { throw TerminalEngineError.cancelled }

        if output.status != 0 {
            let diagnostic = String(decoding: output.stderr + output.stdout, as: UTF8.self).lowercased()
            if diagnostic.contains("not logged in")
                || diagnostic.contains("login required")
                || diagnostic.contains("please login")
                || diagnostic.contains("authentication") {
                throw TerminalEngineError.notAuthenticated(provider)
            }
            throw TerminalEngineError.processFailed(provider, output.status)
        }

        let text: String
        switch provider {
        case .codex:
            text = try Self.parseCodex(output.stdout)
        case .claude:
            text = try Self.parseClaude(output.stdout)
        }

        return TerminalRunResult(
            text: text,
            elapsedSeconds: startedAt.duration(to: .now).seconds
        )
        #else
        throw TerminalEngineError.macRequired
        #endif
    }

    #if os(macOS)
    private static func executableURL(for provider: TerminalProvider) -> URL? {
        CLIProviderDiscovery.resolveExecutable(named: provider == .codex ? "codex" : "claude", searchDirectories: MacCLIInventory.searchDirectories())
    }

    private static func parseCodex(_ data: Data) throws -> String {
        let raw = String(decoding: data, as: UTF8.self)
        var finalMessage: String?
        var sawToolUse = false
        var completedTurn = false
        var failedTurn = false

        for line in raw.split(whereSeparator: \.isNewline) {
            guard let lineData = String(line).data(using: .utf8),
                  let event = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any],
                  let eventType = event["type"] as? String else { continue }

            if eventType == "turn.completed" {
                completedTurn = true
            }
            if eventType == "turn.failed" || eventType == "error" {
                failedTurn = true
            }

            if eventType == "item.started" || eventType == "item.completed",
               let item = event["item"] as? [String: Any],
               let itemType = item["type"] as? String {
                if itemType == "agent_message", eventType == "item.completed",
                   let message = item["text"] as? String,
                   !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    finalMessage = message
                }

                if !["agent_message", "reasoning"].contains(itemType) {
                    sawToolUse = true
                }
            }
        }

        if sawToolUse { throw TerminalEngineError.unexpectedToolUse(.codex) }
        if failedTurn { throw TerminalEngineError.providerError(.codex) }
        guard completedTurn else { throw TerminalEngineError.malformedOutput(.codex) }
        guard let finalMessage else { throw TerminalEngineError.malformedOutput(.codex) }
        return finalMessage.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func parseClaude(_ data: Data) throws -> String {
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              object["is_error"] as? Bool != true,
              let result = object["result"] as? String,
              !result.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw TerminalEngineError.providerError(.claude)
        }
        if let subtype = object["subtype"] as? String,
           !["success", "completed", "result"].contains(subtype.lowercased()) {
            throw TerminalEngineError.providerError(.claude)
        }
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    #endif
}

extension TerminalAIService: AITextRunning {}

struct CodexCLIRuntimeAdapter: AITextRuntimeAdapter {
    let route = TerminalProvider.codex.executionRoute
    private let service = TerminalAIService()

    func accepts(providerID: String, transport: AITransportConfiguration) -> Bool {
        acceptsCLITransport(
            providerID: providerID,
            transport: transport,
            expectedRoute: route,
            expectedExecutableName: "codex"
        )
    }

    func probe() async -> ProviderReadiness {
        await service.probeKnownProvider(.codex)
    }

    func setupAction() -> AIProviderSetupAction? {
        service.authenticationCommandForKnownProvider(.codex)
            .map(AIProviderSetupAction.copyCommand)
    }

    func run(
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        try await service.runKnownProvider(.codex, prompt: prompt, options: options)
    }
}

struct ClaudeCLIRuntimeAdapter: AITextRuntimeAdapter {
    let route = TerminalProvider.claude.executionRoute
    private let service = TerminalAIService()

    func accepts(providerID: String, transport: AITransportConfiguration) -> Bool {
        acceptsCLITransport(
            providerID: providerID,
            transport: transport,
            expectedRoute: route,
            expectedExecutableName: "claude"
        )
    }

    func probe() async -> ProviderReadiness {
        await service.probeKnownProvider(.claude)
    }

    func setupAction() -> AIProviderSetupAction? {
        service.authenticationCommandForKnownProvider(.claude)
            .map(AIProviderSetupAction.copyCommand)
    }

    func run(
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        try await service.runKnownProvider(.claude, prompt: prompt, options: options)
    }
}

private func acceptsCLITransport(
    providerID: String,
    transport: AITransportConfiguration,
    expectedRoute: AIExecutionRoute,
    expectedExecutableName: String
) -> Bool {
    guard providerID == expectedRoute.providerID,
          transport.kind == expectedRoute.transportKind,
          transport.id == expectedRoute.transportID,
          transport.runtimeAdapterID == expectedRoute.runtimeAdapterID,
          transport.implementation == .executableAdapter,
          transport.capabilities.contains(.text),
          case .commandLine(let configuration) = transport else {
        return false
    }

    return configuration.executableName == expectedExecutableName
        && configuration.providerManagedAuthentication
}

private extension Duration {
    var seconds: Double {
        let components = self.components
        return Double(components.seconds) + Double(components.attoseconds) / 1_000_000_000_000_000_000
    }
}

#if os(macOS)
private struct TerminalProcessOutput: Sendable {
    let status: Int32
    let stdout: Data
    let stderr: Data
}

private final class TerminalProcessJob: @unchecked Sendable {
    private let provider: TerminalProvider
    private let executable: URL
    private let arguments: [String]
    private let stdin: Data?
    private let workingDirectory: URL?
    private let outputLimit: Int
    private let lock = NSLock()
    private var process: Process?
    private var cancellationRequested = false
    private var timeoutRequested = false

    init(
        provider: TerminalProvider,
        executable: URL,
        arguments: [String],
        stdin: Data?,
        workingDirectory: URL? = nil,
        outputLimit: Int
    ) {
        self.provider = provider
        self.executable = executable
        self.arguments = arguments
        self.stdin = stdin
        self.workingDirectory = workingDirectory
        self.outputLimit = outputLimit
    }

    func value(timeout: Duration) async throws -> TerminalProcessOutput {
        try await withThrowingTaskGroup(of: TerminalProcessOutput.self) { group in
            group.addTask { [self] in
                try await valueWithoutTimeout()
            }
            group.addTask { [self] in
                try await Task.sleep(for: timeout)
                timeOut()
                throw TerminalEngineError.timedOut(provider)
            }

            defer { group.cancelAll() }
            guard let first = try await group.next() else {
                throw TerminalEngineError.launchFailed(provider)
            }
            return first
        }
    }

    private func valueWithoutTimeout() async throws -> TerminalProcessOutput {
        try await withTaskCancellationHandler {
            try await Task.detached(priority: .userInitiated) { [self] in
                try execute()
            }.value
        } onCancel: { [self] in
            cancel()
        }
    }

    private func execute() throws -> TerminalProcessOutput {
        let fileManager = FileManager.default
        let ioRoot = fileManager.temporaryDirectory
            .appendingPathComponent("RivuneProcessIO", isDirectory: true)
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try fileManager.createDirectory(at: ioRoot, withIntermediateDirectories: true)
        defer { try? fileManager.removeItem(at: ioRoot) }

        let stdoutURL = ioRoot.appendingPathComponent("stdout")
        let stderrURL = ioRoot.appendingPathComponent("stderr")
        fileManager.createFile(atPath: stdoutURL.path, contents: nil)
        fileManager.createFile(atPath: stderrURL.path, contents: nil)

        let stdoutHandle = try FileHandle(forWritingTo: stdoutURL)
        let stderrHandle = try FileHandle(forWritingTo: stderrURL)
        let inputPipe = Pipe()
        defer {
            try? stdoutHandle.close()
            try? stderrHandle.close()
            try? inputPipe.fileHandleForWriting.close()
        }

        let process = Process()
        process.executableURL = executable
        process.arguments = arguments
        process.currentDirectoryURL = workingDirectory
        process.environment = Self.safeEnvironment
        process.standardInput = inputPipe
        process.standardOutput = stdoutHandle
        process.standardError = stderrHandle

        lock.lock()
        self.process = process
        let initialCancellation = cancellationRequested
        let initialTimeout = timeoutRequested
        lock.unlock()

        if initialTimeout { throw TerminalEngineError.timedOut(provider) }
        if initialCancellation { throw CancellationError() }

        do {
            try process.run()
        } catch {
            throw error
        }

        // A cancellation can arrive after the pre-launch snapshot but before
        // Process.run() publishes a live PID. Re-check immediately so that
        // race cannot leave an unobserved terminal request running.
        let postLaunchStopState = currentStopState
        if postLaunchStopState.timedOut || postLaunchStopState.cancelled {
            cancel()
            try? inputPipe.fileHandleForWriting.close()
            process.waitUntilExit()
            if postLaunchStopState.timedOut {
                throw TerminalEngineError.timedOut(provider)
            }
            throw CancellationError()
        }

        if let stdin {
            try inputPipe.fileHandleForWriting.write(contentsOf: stdin)
        }
        try inputPipe.fileHandleForWriting.close()

        var exceededOutputLimit = false
        while process.isRunning {
            let stdoutSize = fileSize(at: stdoutURL, fileManager: fileManager)
            let stderrSize = fileSize(at: stderrURL, fileManager: fileManager)
            if stdoutSize > outputLimit || stderrSize > outputLimit {
                exceededOutputLimit = true
                cancel()
                break
            }
            Thread.sleep(forTimeInterval: 0.05)
        }
        process.waitUntilExit()
        try stdoutHandle.synchronize()
        try stderrHandle.synchronize()
        try stdoutHandle.close()
        try stderrHandle.close()

        let stopState = currentStopState
        if stopState.timedOut { throw TerminalEngineError.timedOut(provider) }
        if exceededOutputLimit { throw TerminalEngineError.outputTooLarge(provider) }
        if stopState.cancelled { throw CancellationError() }

        let stdoutSize = fileSize(at: stdoutURL, fileManager: fileManager)
        let stderrSize = fileSize(at: stderrURL, fileManager: fileManager)
        guard stdoutSize <= outputLimit, stderrSize <= outputLimit else {
            throw TerminalEngineError.outputTooLarge(provider)
        }

        return TerminalProcessOutput(
            status: process.terminationStatus,
            stdout: try Data(contentsOf: stdoutURL),
            stderr: try Data(contentsOf: stderrURL)
        )
    }

    private func fileSize(at url: URL, fileManager: FileManager) -> Int {
        (try? fileManager.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
    }

    private var currentStopState: (cancelled: Bool, timedOut: Bool) {
        lock.lock()
        defer { lock.unlock() }
        return (cancellationRequested, timeoutRequested)
    }

    private func timeOut() {
        lock.lock()
        timeoutRequested = true
        lock.unlock()
        cancel()
    }

    private func cancel() {
        lock.lock()
        cancellationRequested = true
        let pid = process?.isRunning == true ? process?.processIdentifier : nil
        lock.unlock()

        guard let pid else { return }
        Darwin.kill(pid, SIGINT)

        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.75) { [weak self] in
            self?.escalateCancellation(pid: pid)
        }
    }

    private func escalateCancellation(pid: Int32) {
        lock.lock()
        let stillRunning = process?.isRunning == true && process?.processIdentifier == pid
        lock.unlock()
        guard stillRunning else { return }
        Darwin.kill(pid, SIGTERM)

        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.75) { [weak self] in
            guard let self else { return }
            lock.lock()
            let mustKill = process?.isRunning == true && process?.processIdentifier == pid
            lock.unlock()
            if mustKill { Darwin.kill(pid, SIGKILL) }
        }
    }

    private static var safeEnvironment: [String: String] {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let source = ProcessInfo.processInfo.environment
        return [
            "HOME": home,
            "USER": NSUserName(),
            "TMPDIR": NSTemporaryDirectory(),
            "PATH": "\(home)/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
            "LANG": source["LANG"] ?? "en_US.UTF-8",
            "LC_ALL": source["LC_ALL"] ?? source["LANG"] ?? "en_US.UTF-8",
            "TERM": "dumb",
            "NO_COLOR": "1"
        ]
    }
}
#endif
