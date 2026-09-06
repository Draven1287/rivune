import Foundation
import Security
import LocalAuthentication

/// Provider presets only supply public endpoint information. Every saved
/// connection has a separate Keychain credential and a fixed destination.
enum UniversalAPIStyle: String, Codable, CaseIterable, Identifiable {
    case chatCompletions, responses, messages
    var id: String { rawValue }
    var title: String {
        switch self {
        case .chatCompletions: "OpenAI-compatible Chat Completions"
        case .responses: "OpenAI Responses"
        case .messages: "Anthropic Messages"
        }
    }
    var path: String {
        switch self {
        case .chatCompletions: "chat/completions"
        case .responses: "responses"
        case .messages: "messages"
        }
    }
}

struct UniversalAPIPreset: Identifiable {
    let id: String
    let name: String
    let endpoint: String
    var style: UniversalAPIStyle = .chatCompletions
    var local = false
    static let all: [Self] = [
        .init(id: "openrouter", name: "OpenRouter", endpoint: "https://openrouter.ai/api/v1"),
        .init(id: "openai", name: "OpenAI", endpoint: "https://api.openai.com/v1", style: .responses),
        .init(id: "anthropic", name: "Anthropic", endpoint: "https://api.anthropic.com/v1", style: .messages),
        .init(id: "gemini", name: "Google Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai"),
        .init(id: "xai", name: "xAI / Grok", endpoint: "https://api.x.ai/v1"),
        .init(id: "deepseek", name: "DeepSeek", endpoint: "https://api.deepseek.com"),
        .init(id: "mistral", name: "Mistral", endpoint: "https://api.mistral.ai/v1"),
        .init(id: "groq", name: "Groq", endpoint: "https://api.groq.com/openai/v1"),
        .init(id: "together", name: "Together AI", endpoint: "https://api.together.ai/v1"),
        .init(id: "ollama", name: "Ollama", endpoint: "http://localhost:11434/v1", local: true),
        .init(id: "custom", name: "Custom endpoint", endpoint: "")
    ]
}

struct UniversalAPIConnection: Codable, Equatable, Identifiable, Sendable {
    let id: UUID
    let name: String
    let endpoint: URL
    let style: UniversalAPIStyle
    let model: String
    let usesKey: Bool

    static func isLoopback(_ url: URL) -> Bool {
        ["localhost", "127.0.0.1", "::1", "[::1]"].contains(url.host?.lowercased() ?? "")
    }
    static func endpoint(_ raw: String) throws -> URL {
        guard raw.count <= 2_048, let parts = URLComponents(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
              let url = parts.url, let host = url.host, !host.isEmpty,
              parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
              url.scheme == "https" || (url.scheme == "http" && isLoopback(url)),
              !parts.path.components(separatedBy: "/").contains("..") else {
            throw UniversalAPIError.invalidEndpoint
        }
        return url
    }
    func validated() throws -> Self {
        _ = try Self.endpoint(endpoint.absoluteString)
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.count <= 80 else { throw UniversalAPIError.invalidName }
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:/@+")
        guard !model.isEmpty, model.count <= 256, model.unicodeScalars.allSatisfy({ allowed.contains($0) }),
              !model.components(separatedBy: "/").contains("..") else { throw APIRuntimeError.invalidModel }
        guard usesKey || Self.isLoopback(endpoint) else { throw APIRuntimeError.missingKey }
        return self
    }
}

enum UniversalAPIError: Error, LocalizedError {
    case invalidEndpoint, invalidName, storage, limit, modelNotListed
    var errorDescription: String? {
        switch self {
        case .invalidEndpoint: "Enter the provider’s HTTPS base URL, without credentials, query parameters, or an endpoint suffix. HTTP is allowed only for a server on this Mac."
        case .invalidName: "Give this connection a name of up to 80 characters."
        case .storage: "Rivune could not save this connection on your Mac. Try again."
        case .limit: "You can save up to 30 API connections."
        case .modelNotListed: "This model was not returned by the provider. Check its ID, or send a message if your provider does not list all models."
        }
    }
}

protocol UniversalAPIKeyStoring: Sendable {
    func key(for id: UUID) throws -> String?
    func save(_ value: String, for id: UUID) throws
    func remove(for id: UUID) throws
}

struct UniversalAPIKeychain: UniversalAPIKeyStoring {
    private func query(_ id: UUID) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "com.rivune.custom-api.v1",
         kSecAttrAccount as String: id.uuidString, kSecAttrSynchronizable as String: false]
    }
    func key(for id: UUID) throws -> String? {
        var q = query(id)
        let context = LAContext(); context.interactionNotAllowed = true
        q[kSecUseAuthenticationContext as String] = context
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data, let key = String(data: data, encoding: .utf8) else { throw APIRuntimeError.credentialUnavailable }
        return key
    }
    func save(_ value: String, for id: UUID) throws {
        guard !value.isEmpty, value.utf8.count <= 4_096,
              value.unicodeScalars.allSatisfy({ (33...126).contains($0.value) }) else { throw APIRuntimeError.invalidKey }
        let attributes: [String: Any] = [kSecValueData as String: Data(value.utf8), kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let q = query(id)
        let status = SecItemUpdate(q as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = q; attributes.forEach { item[$0.key] = $0.value }
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw APIRuntimeError.credentialUnavailable }
        } else if status != errSecSuccess { throw APIRuntimeError.credentialUnavailable }
    }
    func remove(for id: UUID) throws {
        let status = SecItemDelete(query(id) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw APIRuntimeError.credentialUnavailable }
    }
}

struct UniversalAPIExchange: Codable, Identifiable, Equatable, Sendable {
    var id = UUID()
    let prompt: String
    var answer: String?
    var error: String?
}

struct UniversalAPIRuntime: Sendable {
    var transport: any APIHTTPTransport = APIURLSessionTransport()
    var keys: any UniversalAPIKeyStoring = UniversalAPIKeychain()

    func request(_ connection: UniversalAPIConnection, path: String) throws -> URLRequest {
        _ = try connection.validated()
        var request = URLRequest(url: connection.endpoint.appendingPathComponent(path), timeoutInterval: 120)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if connection.usesKey {
            guard let key = try keys.key(for: connection.id) else { throw APIRuntimeError.missingKey }
            if connection.style == .messages {
                request.setValue(key, forHTTPHeaderField: "x-api-key")
            } else { request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization") }
        }
        if connection.style == .messages { request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version") }
        return request
    }

    func models(_ connection: UniversalAPIConnection) async throws -> [String] {
        var req = try request(connection, path: "models")
        req.httpMethod = "GET"; req.timeoutInterval = 15
        let response = try await transport.send(req, maximumBytes: 2_000_000)
        try APIRuntimeService.validateStatus(response.statusCode)
        guard response.data.count <= 2_000_000 else { throw APIRuntimeError.outputTooLarge }
        struct List: Decodable { struct Model: Decodable { let id: String }; let data: [Model] }
        return try JSONDecoder().decode(List.self, from: response.data).data.map(\.id).sorted()
    }

    func run(_ connection: UniversalAPIConnection, prompt: String, history: [UniversalAPIExchange]) async throws -> String {
        try Task.checkCancellation()
        var messages: [[String: String]] = []
        for exchange in history {
            if let answer = exchange.answer {
                messages.append(["role": "user", "content": exchange.prompt])
                messages.append(["role": "assistant", "content": answer])
            }
        }
        messages.append(["role": "user", "content": prompt])
        guard !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              messages.reduce(0, { $0 + ($1["content"]?.utf8.count ?? 0) }) <= 256_000 else { throw APIRuntimeError.promptTooLong }
        var req = try request(connection, path: connection.style.path)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        var body: [String: Any] = ["model": connection.model, "stream": false]
        switch connection.style {
        case .chatCompletions: body["messages"] = messages
        case .responses:
            body["input"] = messages; body["store"] = false; body["max_output_tokens"] = 8_192
        case .messages:
            body["messages"] = messages; body["max_tokens"] = 8_192
        }
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let response = try await transport.send(req, maximumBytes: 2_000_000)
        try Task.checkCancellation()
        try APIRuntimeService.validateStatus(response.statusCode)
        guard response.data.count <= 2_000_000 else { throw APIRuntimeError.outputTooLarge }
        switch connection.style {
        case .responses: return try APIRuntimeService.text(from: response.data, provider: .openAI)
        case .messages: return try APIRuntimeService.text(from: response.data, provider: .anthropic)
        case .chatCompletions:
            struct Response: Decodable {
                struct Choice: Decodable {
                    struct Message: Decodable {
                        let role: String
                        let content: String?
                        let refusal: String?
                        let tool_calls: [Tool]?
                        let function_call: Tool?
                        struct Tool: Decodable {}
                    }
                    let message: Message
                    let finish_reason: String?
                }
                let choices: [Choice]
            }
            let decoded = try JSONDecoder().decode(Response.self, from: response.data)
            guard let choice = decoded.choices.first, choice.message.role == "assistant" else { throw APIRuntimeError.malformedResponse }
            guard choice.message.tool_calls?.isEmpty != false, choice.message.function_call == nil else { throw APIRuntimeError.unexpectedToolUse }
            guard choice.finish_reason == "stop" else { throw APIRuntimeError.incompleteResponse }
            let answer = (choice.message.content ?? choice.message.refusal ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            guard !answer.isEmpty else { throw APIRuntimeError.malformedResponse }
            return answer
        }
    }
    static func message(_ error: Error) -> String {
        if error is CancellationError || (error as? URLError)?.code == .cancelled { return "Stopped. You can send another message when you’re ready." }
        if let error = error as? UniversalAPIError { return error.localizedDescription }
        return APIRuntimeService.safeError(error).userMessage
    }
}

@MainActor
final class UniversalAPIWorkspaceStore: ObservableObject {
    struct Snapshot: Codable {
        var connections: [UniversalAPIConnection] = []
        var exchanges: [String: [UniversalAPIExchange]] = [:]
    }
    @Published private(set) var snapshot = Snapshot()
    @Published var selectedID: UUID?
    @Published var draft = ""
    @Published var notice: String?
    @Published private(set) var runningID: UUID?
    @Published private(set) var isChecking = false
    @Published private(set) var modelIDs: [String] = []
    private var task: Task<Void, Never>?
    private var readableStorage = true
    private let file: URL?
    private let runtime: UniversalAPIRuntime
    var selected: UniversalAPIConnection? { snapshot.connections.first { $0.id == selectedID } }
    var exchanges: [UniversalAPIExchange] { selectedID.flatMap { snapshot.exchanges[$0.uuidString] } ?? [] }

    init(file: URL? = nil, runtime: UniversalAPIRuntime = .init(), isolated: Bool = RivuneLaunchContext.isIsolated) {
        self.runtime = runtime
        self.file = isolated ? file : (file ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("Rivune/api-workspace-v1.json"))
        if let file = self.file, FileManager.default.fileExists(atPath: file.path) {
            do {
                let data = try Data(contentsOf: file)
                guard data.count <= 32_000_000 else { throw UniversalAPIError.storage }
                let saved = try JSONDecoder().decode(Snapshot.self, from: data)
                guard saved.connections.count <= 30 else { throw UniversalAPIError.limit }
                for connection in saved.connections { _ = try connection.validated() }
                snapshot = saved
            } catch { readableStorage = false; notice = "Saved API connections could not be opened. The existing file has been left in place." }
        }
        selectedID = snapshot.connections.first?.id
    }
    private func persist(_ next: Snapshot) throws {
        guard readableStorage else { throw UniversalAPIError.storage }
        if let file {
            let data = try JSONEncoder().encode(next)
            guard data.count <= 32_000_000 else { throw UniversalAPIError.storage }
            try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
            try data.write(to: file, options: [.atomic, .completeFileProtectionUnlessOpen])
            try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
        }
        snapshot = next
    }
    func add(_ connection: UniversalAPIConnection, key: String) throws {
        guard snapshot.connections.count < 30 else { throw UniversalAPIError.limit }
        _ = try connection.validated()
        if connection.usesKey { try runtime.keys.save(key, for: connection.id) }
        var next = snapshot; next.connections.append(connection)
        do { try persist(next) }
        catch { try? runtime.keys.remove(for: connection.id); throw UniversalAPIError.storage }
        selectedID = connection.id; draft = ""; notice = "Connection saved. Send a message to verify model access."; modelIDs = []
    }
    func remove(_ connection: UniversalAPIConnection) throws {
        guard runningID == nil, !isChecking else { return }
        var next = snapshot
        next.connections.removeAll { $0.id == connection.id }
        next.exchanges.removeValue(forKey: connection.id.uuidString)
        try runtime.keys.remove(for: connection.id)
        try persist(next)
        selectedID = snapshot.connections.first?.id; modelIDs = []
    }
    func replaceKey(_ value: String) throws {
        guard let connection = selected, runningID == nil, !isChecking else { return }
        try runtime.keys.save(value.trimmingCharacters(in: .whitespacesAndNewlines), for: connection.id)
        notice = "API key updated in Keychain. Send a message to verify access."
    }
    func clearConversation() throws {
        guard let selectedID, runningID == nil else { return }
        var next = snapshot; next.exchanges[selectedID.uuidString] = []
        try persist(next)
    }
    func checkModels() async {
        guard let connection = selected, !isChecking, runningID == nil else { return }
        isChecking = true; notice = nil
        defer { isChecking = false }
        do {
            let models = try await runtime.models(connection)
            guard selectedID == connection.id else { return }
            modelIDs = models
            notice = models.contains(connection.model) ? "Model found. Generation and API-key access are verified when you send." : UniversalAPIError.modelNotListed.localizedDescription
        } catch { notice = UniversalAPIRuntime.message(error) }
    }
    func send() {
        guard let connection = selected, runningID == nil, !isChecking else { return }
        let prompt = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty else { return }
        let previous = exchanges
        let exchange = UniversalAPIExchange(prompt: prompt)
        var next = snapshot; next.exchanges[connection.id.uuidString, default: []].append(exchange)
        do { try persist(next) } catch { notice = "Could not save your message. Nothing was sent."; return }
        draft = ""; runningID = connection.id; notice = nil
        task = Task { [weak self, runtime] in
            let answer: String?; let failure: String?
            do { answer = try await runtime.run(connection, prompt: prompt, history: previous); failure = nil }
            catch { answer = nil; failure = UniversalAPIRuntime.message(error) }
            guard let self else { return }
            var next = self.snapshot
            if let index = next.exchanges[connection.id.uuidString]?.firstIndex(where: { $0.id == exchange.id }) {
                next.exchanges[connection.id.uuidString]?[index].answer = answer
                next.exchanges[connection.id.uuidString]?[index].error = failure
            }
            do { try self.persist(next) }
            catch { self.snapshot = next; self.notice = "The reply is visible, but could not be saved. Copy it before closing." }
            self.runningID = nil; self.task = nil
        }
    }
    func stop() { task?.cancel() }
}
