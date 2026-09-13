import Foundation
import Security
import LocalAuthentication

enum RivuneAPIProvider: String, CaseIterable, Identifiable, Hashable, Sendable {
    case openAI = "openai"
    case anthropic

    var id: String { rawValue }
    var displayName: String { self == .openAI ? "OpenAI" : "Anthropic" }
    var executionRoute: AIExecutionRoute {
        self == .openAI ? .openAIResponsesAPI : .anthropicMessagesAPI
    }
    fileprivate var credentialIdentifier: String { "alloy.provider.\(rawValue).api" }
    fileprivate var baseURL: URL {
        URL(string: self == .openAI ? "https://api.openai.com/v1" : "https://api.anthropic.com/v1")!
    }
}

/// Safe to display or persist. A configuration never contains the API key.
struct APIConnectionConfiguration: Equatable, Codable, Sendable {
    let hasKey: Bool
    let modelID: String?
}

struct APIConnectionProbe: Equatable, Sendable {
    let readiness: ProviderReadiness
    let detail: String
    let modelID: String?
    /// Startup only checks model metadata; it never creates a billable response.
    let executionVerified: Bool

    init(readiness: ProviderReadiness, detail: String, modelID: String? = nil, executionVerified: Bool = false) {
        self.readiness = readiness
        self.detail = detail
        self.modelID = modelID
        self.executionVerified = executionVerified
    }
}

enum APIRuntimeError: Error, Equatable, Sendable, LocalizedError {
    case missingKey, modelRequired, invalidKey, invalidModel, credentialUnavailable
    case authenticationFailed, permissionDenied, modelUnavailable, rateLimited
    case providerUnavailable, rejectedRequest, timedOut, connectionFailed
    case malformedResponse, incompleteResponse, unexpectedToolUse, outputTooLarge, promptTooLong

    var errorDescription: String? { userMessage }
    var userMessage: String {
        switch self {
        case .missingKey: "Add an API key in Connections."
        case .modelRequired: "Choose an API model ID in Connections."
        case .invalidKey: "Enter a valid API key without spaces or line breaks."
        case .invalidModel: "Enter the model ID exactly as shown in your provider account."
        case .credentialUnavailable: "Rivune could not access the API key in Keychain. Unlock your device and try again."
        case .authenticationFailed: "The provider rejected this API key. Update it in Connections."
        case .permissionDenied: "This API key does not have permission for this request. Check its access in your provider account."
        case .modelUnavailable: "This API model is unavailable to the connected key. Check the model ID and access."
        case .rateLimited: "The provider reported an API rate or quota limit. Check API usage and billing, then try again."
        case .providerUnavailable: "The API provider is temporarily unavailable. Try again shortly."
        case .rejectedRequest: "The API rejected this request. Check that the selected model supports this text endpoint."
        case .timedOut: "The API connection timed out. Try again."
        case .connectionFailed: "The API could not be reached. Check your connection and try again."
        case .malformedResponse: "The API returned a response Rivune could not read."
        case .incompleteResponse: "The API did not finish its answer. Try a shorter request."
        case .unexpectedToolUse: "The API reported tool use, which this text connection does not support."
        case .outputTooLarge: "The API response exceeded Rivune’s size limit."
        case .promptTooLong: "This request is too long. Shorten it and try again."
        }
    }
}

/// This seam lets tests supply credentials without accessing the user's Keychain.
protocol APICredentialReading: Sendable {
    func configuration(for provider: RivuneAPIProvider) async -> APIConnectionConfiguration
    func credential(for provider: RivuneAPIProvider) async throws -> String?
}

protocol APIConnectionManaging: Sendable {
    func configuration(for provider: RivuneAPIProvider) async -> APIConnectionConfiguration
    func save(apiKey: String, modelID: String, for provider: RivuneAPIProvider) async throws
}

actor APIConnectionStore: APICredentialReading, APIConnectionManaging {
    static let shared = APIConnectionStore()
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    func configuration(for provider: RivuneAPIProvider) -> APIConnectionConfiguration {
        var query = keychainQuery(for: provider)
        query[kSecReturnAttributes as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        let context = LAContext()
        context.interactionNotAllowed = true
        query[kSecUseAuthenticationContext as String] = context
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return APIConnectionConfiguration(
            hasKey: status == errSecSuccess,
            modelID: defaults.string(forKey: modelKey(provider))
        )
    }

    /// A blank key retains an existing key while updating the model selection.
    func save(apiKey: String, modelID: String, for provider: RivuneAPIProvider) throws {
        let model = modelID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard Self.isValidModelID(model) else { throw APIRuntimeError.invalidModel }
        let key = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        if key.isEmpty {
            guard try credential(for: provider) != nil else { throw APIRuntimeError.missingKey }
        } else {
            guard key.utf8.count <= 4_096,
                  key.unicodeScalars.allSatisfy({ (33...126).contains($0.value) }) else {
                throw APIRuntimeError.invalidKey
            }
            let query = keychainQuery(for: provider)
            let attributes: [String: Any] = [
                kSecValueData as String: Data(key.utf8),
                kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            ]
            let updated = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            if updated == errSecItemNotFound {
                var item = query
                attributes.forEach { item[$0.key] = $0.value }
                guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else {
                    throw APIRuntimeError.credentialUnavailable
                }
            } else if updated != errSecSuccess {
                throw APIRuntimeError.credentialUnavailable
            }
        }
        defaults.set(model, forKey: modelKey(provider))
    }

    func remove(for provider: RivuneAPIProvider) throws {
        let status = SecItemDelete(keychainQuery(for: provider) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw APIRuntimeError.credentialUnavailable
        }
        defaults.removeObject(forKey: modelKey(provider))
    }

    /// Only the reviewed runtime consumes the returned secret; it is never logged.
    func credential(for provider: RivuneAPIProvider) throws -> String? {
        var query = keychainQuery(for: provider)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        let context = LAContext()
        context.interactionNotAllowed = true
        query[kSecUseAuthenticationContext as String] = context
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data,
              let key = String(data: data, encoding: .utf8), !key.isEmpty else {
            throw APIRuntimeError.credentialUnavailable
        }
        return key
    }

    static func isValidModelID(_ value: String) -> Bool {
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:")
        return !value.isEmpty && value.count <= 256 && value != "." && value != ".."
            && value.unicodeScalars.allSatisfy { allowed.contains($0) }
    }

    private func modelKey(_ provider: RivuneAPIProvider) -> String { "rivune.api.\(provider.rawValue).model" }
    private func keychainQuery(for provider: RivuneAPIProvider) -> [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: provider.credentialIdentifier,
         kSecAttrAccount as String: "api-key",
         kSecAttrSynchronizable as String: false]
    }
}

struct APIHTTPResponse: Sendable {
    let statusCode: Int
    let data: Data
}

protocol APIHTTPTransport: Sendable {
    func send(_ request: URLRequest, maximumBytes: Int) async throws -> APIHTTPResponse
}

private final class APIRejectRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        // Do not forward an API key, especially x-api-key, to redirected origins.
        completionHandler(nil)
    }
}

struct APIURLSessionTransport: APIHTTPTransport {
    private let session: URLSession

    init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        configuration.urlCredentialStorage = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 120
        configuration.timeoutIntervalForResource = 120
        session = URLSession(configuration: configuration, delegate: APIRejectRedirects(), delegateQueue: nil)
    }

    func send(_ request: URLRequest, maximumBytes: Int) async throws -> APIHTTPResponse {
        let (bytes, response) = try await session.bytes(for: request)
        guard let response = response as? HTTPURLResponse else { throw APIRuntimeError.malformedResponse }
        defer { bytes.task.cancel() }
        guard response.expectedContentLength <= maximumBytes else { throw APIRuntimeError.outputTooLarge }
        var data = Data()
        for try await byte in bytes {
            try Task.checkCancellation()
            guard data.count < maximumBytes else { throw APIRuntimeError.outputTooLarge }
            data.append(byte)
        }
        return APIHTTPResponse(statusCode: response.statusCode, data: data)
    }
}

struct APIRuntimeService: Sendable {
    static let shared = APIRuntimeService()
    private let credentials: any APICredentialReading
    private let transport: any APIHTTPTransport
    private let probeTimeout: TimeInterval
    private let runTimeout: TimeInterval

    init(credentials: any APICredentialReading = APIConnectionStore.shared,
         transport: any APIHTTPTransport = APIURLSessionTransport(),
         probeTimeout: TimeInterval = 10, runTimeout: TimeInterval = 120) {
        self.credentials = credentials
        self.transport = transport
        self.probeTimeout = probeTimeout
        self.runTimeout = runTimeout
    }

    func probe(_ provider: RivuneAPIProvider) async -> APIConnectionProbe {
        let configuration = await credentials.configuration(for: provider)
        do {
            try Task.checkCancellation()
            guard let key = try await credentials.credential(for: provider) else { throw APIRuntimeError.missingKey }
            guard let model = configuration.modelID else { throw APIRuntimeError.modelRequired }
            guard APIConnectionStore.isValidModelID(model) else { throw APIRuntimeError.invalidModel }
            var request = request(provider, path: "models/\(model)", key: key, timeout: probeTimeout)
            request.httpMethod = "GET"
            let response = try await send(request, timeout: probeTimeout, maximumBytes: 262_144)
            try Self.validateStatus(response.statusCode)
            let metadata = try JSONDecoder().decode(APIModelMetadata.self, from: response.data)
            guard !metadata.id.isEmpty, metadata.object == "model" || metadata.type == "model" else {
                throw APIRuntimeError.malformedResponse
            }
            return APIConnectionProbe(readiness: .ready,
                detail: "API key and model access checked. Generation and quota are confirmed when you send a message.",
                modelID: model)
        } catch {
            let failure = Self.safeError(error)
            return APIConnectionProbe(
                readiness: failure == .missingKey || failure == .authenticationFailed ? .signedOut : .unavailable,
                detail: error is CancellationError ? "Connection check cancelled." : failure.userMessage,
                modelID: configuration.modelID)
        }
    }

    func run(_ provider: RivuneAPIProvider, prompt: String) async throws -> TerminalRunResult {
        let started = ContinuousClock.now
        do {
            try Task.checkCancellation()
            guard !prompt.isEmpty, prompt.utf8.count <= 512_000 else { throw APIRuntimeError.promptTooLong }
            let configuration = await credentials.configuration(for: provider)
            guard let model = configuration.modelID else { throw APIRuntimeError.modelRequired }
            guard APIConnectionStore.isValidModelID(model) else { throw APIRuntimeError.invalidModel }
            guard let key = try await credentials.credential(for: provider) else { throw APIRuntimeError.missingKey }
            var request = request(provider, path: provider == .openAI ? "responses" : "messages", key: key, timeout: runTimeout)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if provider == .openAI {
                request.httpBody = try JSONEncoder().encode(OpenAITextRequest(model: model, input: prompt))
            } else {
                request.httpBody = try JSONEncoder().encode(AnthropicTextRequest(model: model, messages: [.init(role: "user", content: prompt)]))
            }
            let response = try await send(request, timeout: runTimeout, maximumBytes: 2_000_000)
            try Self.validateStatus(response.statusCode)
            let text = try Self.text(from: response.data, provider: provider)
            try Task.checkCancellation()
            let elapsed = started.duration(to: .now).components
            return TerminalRunResult(text: text, elapsedSeconds: Double(elapsed.seconds) + Double(elapsed.attoseconds) / 1e18)
        } catch is CancellationError {
            throw CancellationError()
        } catch let error as URLError where error.code == .cancelled {
            throw CancellationError()
        } catch { throw Self.safeError(error) }
    }

    private func request(_ provider: RivuneAPIProvider, path: String, key: String, timeout: TimeInterval) -> URLRequest {
        var request = URLRequest(url: provider.baseURL.appendingPathComponent(path), timeoutInterval: timeout)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if provider == .openAI {
            request.setValue("Bearer \(key)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue(key, forHTTPHeaderField: "x-api-key")
            request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        }
        return request
    }

    private func send(_ request: URLRequest, timeout: TimeInterval, maximumBytes: Int) async throws -> APIHTTPResponse {
        try await withThrowingTaskGroup(of: APIHTTPResponse.self) { group in
            group.addTask { try await transport.send(request, maximumBytes: maximumBytes) }
            group.addTask {
                try await Task.sleep(for: .seconds(timeout))
                throw APIRuntimeError.timedOut
            }
            defer { group.cancelAll() }
            guard let response = try await group.next() else { throw APIRuntimeError.connectionFailed }
            guard response.data.count <= maximumBytes else { throw APIRuntimeError.outputTooLarge }
            return response
        }
    }

    static func validateStatus(_ status: Int) throws {
        switch status {
        case 200...299: return
        case 401: throw APIRuntimeError.authenticationFailed
        case 403: throw APIRuntimeError.permissionDenied
        case 404: throw APIRuntimeError.modelUnavailable
        case 408, 504: throw APIRuntimeError.timedOut
        case 429: throw APIRuntimeError.rateLimited
        case 500...599: throw APIRuntimeError.providerUnavailable
        default: throw APIRuntimeError.rejectedRequest
        }
    }

    static func safeError(_ error: Error) -> APIRuntimeError {
        if let failure = error as? APIRuntimeError { return failure }
        if error is DecodingError { return .malformedResponse }
        if let error = error as? URLError, error.code == .timedOut { return .timedOut }
        return .connectionFailed
    }

    static func text(from data: Data, provider: RivuneAPIProvider) throws -> String {
        let text: String
        if provider == .openAI {
            let response = try JSONDecoder().decode(OpenAITextResponse.self, from: data)
            guard response.status == "completed" else { throw APIRuntimeError.incompleteResponse }
            guard response.output.allSatisfy({ ["message", "reasoning"].contains($0.type) }) else {
                throw APIRuntimeError.unexpectedToolUse
            }
            let content = response.output.filter { $0.type == "message" }.flatMap { $0.content ?? [] }
            guard content.allSatisfy({ ["output_text", "refusal"].contains($0.type) }) else {
                throw APIRuntimeError.malformedResponse
            }
            text = content.compactMap { $0.type == "refusal" ? $0.refusal : $0.text }.joined(separator: "\n")
        } else {
            let response = try JSONDecoder().decode(AnthropicTextResponse.self, from: data)
            guard response.type == "message", response.role == "assistant" else { throw APIRuntimeError.malformedResponse }
            guard response.content.allSatisfy({ ["text", "thinking", "redacted_thinking"].contains($0.type) }) else {
                throw APIRuntimeError.unexpectedToolUse
            }
            guard ["end_turn", "stop_sequence", "refusal"].contains(response.stop_reason ?? "") else {
                throw APIRuntimeError.incompleteResponse
            }
            text = response.content.filter { $0.type == "text" }.compactMap(\.text).joined(separator: "\n")
        }
        let answer = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !answer.isEmpty else { throw APIRuntimeError.malformedResponse }
        return answer
    }
}

struct APIRuntimeAdapter: AITextRuntimeAdapter {
    let provider: RivuneAPIProvider
    private let service = APIRuntimeService.shared
    var route: AIExecutionRoute { provider.executionRoute }

    func accepts(providerID: String, transport: AITransportConfiguration) -> Bool {
        guard providerID == route.providerID, transport.id == route.transportID,
              transport.runtimeAdapterID == route.runtimeAdapterID,
              transport.implementation == .executableAdapter,
              transport.capabilities == [.text], case .api(let configuration) = transport else { return false }
        let isOpenAI = provider == .openAI
        let expectedURL = URL(string: isOpenAI ? "https://api.openai.com/v1" : "https://api.anthropic.com")!
        return configuration.baseURL == expectedURL
            && configuration.style == (isOpenAI ? .openAIResponses : .anthropicMessages)
            && configuration.authenticationScheme == (isOpenAI ? .bearerToken : .xAPIKey)
            && configuration.credential == AISecretReference(storage: .keychain, identifier: provider.credentialIdentifier)
    }

    func probe() async -> ProviderReadiness { await service.probe(provider).readiness }
    func setupAction() -> AIProviderSetupAction? { nil }
    func run(prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        // CLI aliases/effort levels cannot override the separately saved API model.
        try await service.run(provider, prompt: prompt)
    }
}

private struct APIModelMetadata: Decodable { let id: String; let object: String?; let type: String? }
private struct OpenAITextRequest: Encodable {
    let model: String
    let input: String
    let store = false
    let stream = false
    let max_output_tokens = 8_192
}
private struct AnthropicTextRequest: Encodable {
    struct Message: Encodable { let role: String; let content: String }
    let model: String
    let messages: [Message]
    let max_tokens = 8_192
    let stream = false
}
private struct APITextContent: Decodable {
    let type: String
    let text: String?
    let refusal: String?
}
private struct OpenAITextResponse: Decodable {
    struct Output: Decodable { let type: String; let content: [APITextContent]? }
    let status: String
    let output: [Output]
}
private struct AnthropicTextResponse: Decodable {
    let type: String
    let role: String
    let stop_reason: String?
    let content: [APITextContent]
}
