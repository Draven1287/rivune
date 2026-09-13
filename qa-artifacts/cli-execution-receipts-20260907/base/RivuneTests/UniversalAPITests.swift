import Foundation
import XCTest
@testable import Rivune

final class UniversalAPITests: XCTestCase {
    private func connection(style: UniversalAPIStyle = .chatCompletions, endpoint: String = "https://provider.example/v1", key: Bool = true) -> UniversalAPIConnection {
        .init(id: UUID(), name: "Fixture AI", endpoint: URL(string: endpoint)!, style: style, model: "organization/model:version", usesKey: key)
    }
    func testEndpointRejectsCredentialsQueriesFragmentsAndRemoteHTTP() {
        for value in ["file:///tmp/key", "http://provider.example/v1", "https://user:pass@provider.example/v1", "https://provider.example/v1?key=secret", "https://provider.example/v1#secret", "https://provider.example/../collect"] {
            XCTAssertThrowsError(try UniversalAPIConnection.endpoint(value), value)
        }
        for value in ["https://provider.example/v1", "http://localhost:11434/v1", "http://127.0.0.1:1234/v1"] {
            XCTAssertNoThrow(try UniversalAPIConnection.endpoint(value))
        }
    }
    func testOnlyLoopbackAllowsNoKeyAndNamespacedModelsWork() throws {
        XCTAssertThrowsError(try connection(key: false).validated())
        XCTAssertNoThrow(try connection(endpoint: "http://localhost:11434/v1", key: false).validated())
        XCTAssertNoThrow(try connection().validated())
        let bad = UniversalAPIConnection(id: UUID(), name: "Test", endpoint: URL(string: "https://example.org")!, style: .chatCompletions, model: "../../collect?secret", usesKey: true)
        XCTAssertThrowsError(try bad.validated())
    }
    func testEachPresetHasAValidEndpointAndStyle() throws {
        XCTAssertEqual(Set(UniversalAPIPreset.all.map(\.id)).count, UniversalAPIPreset.all.count)
        for preset in UniversalAPIPreset.all where preset.id != "custom" {
            XCTAssertNoThrow(try UniversalAPIConnection.endpoint(preset.endpoint))
        }
    }
    func testChatRequestUsesSelectedDestinationModelAndCompletedHistory() async throws {
        let transport = UniversalFixtureTransport(body: #"{"choices":[{"message":{"role":"assistant","content":"New answer"},"finish_reason":"stop"}]}"#)
        let runtime = UniversalAPIRuntime(transport: transport, keys: UniversalFixtureKeys())
        let history = [UniversalAPIExchange(prompt: "Previous", answer: "Prior answer"), UniversalAPIExchange(prompt: "Failed", error: "Failed")]
        let answer = try await runtime.run(connection(), prompt: "New question", history: history)
        XCTAssertEqual(answer, "New answer")
        let requests = await transport.requests
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.url?.absoluteString, "https://provider.example/v1/chat/completions")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer fixture-not-a-real-key")
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(request.httpBody)) as? [String: Any])
        XCTAssertEqual(body["model"] as? String, "organization/model:version")
        XCTAssertEqual((body["messages"] as? [[String: String]])?.count, 3)
        XCTAssertNil(body["tools"])
        XCTAssertEqual(body["stream"] as? Bool, false)
    }
    func testResponsesAndMessagesFormatsUseTheirOwnHeadersAndParsers() async throws {
        for (style, data) in [(UniversalAPIStyle.responses, #"{"status":"completed","output":[{"type":"message","content":[{"type":"output_text","text":"OK"}]}]}"#), (.messages, #"{"type":"message","role":"assistant","stop_reason":"end_turn","content":[{"type":"text","text":"OK"}]}"#)] {
            let transport = UniversalFixtureTransport(body: data)
            let runtime = UniversalAPIRuntime(transport: transport, keys: UniversalFixtureKeys())
            let answer = try await runtime.run(connection(style: style), prompt: "Question", history: [])
            XCTAssertEqual(answer, "OK")
            let requests = await transport.requests
            let request = try XCTUnwrap(requests.first)
            XCTAssertTrue(request.url!.path.hasSuffix(style.path))
            if style == .messages {
                XCTAssertEqual(request.value(forHTTPHeaderField: "x-api-key"), "fixture-not-a-real-key")
                XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
                XCTAssertEqual(request.value(forHTTPHeaderField: "anthropic-version"), "2023-06-01")
            }
        }
    }
    func testModelListingDoesNotSendConversationOrCreateGeneration() async throws {
        let transport = UniversalFixtureTransport(body: #"{"data":[{"id":"org/model"}]}"#)
        let runtime = UniversalAPIRuntime(transport: transport, keys: UniversalFixtureKeys())
        let models = try await runtime.models(connection())
        XCTAssertEqual(models, ["org/model"])
        let requests = await transport.requests
        XCTAssertEqual(requests.first?.httpMethod, "GET")
        XCTAssertNil(requests.first?.httpBody)
        XCTAssertEqual(requests.first?.url?.path, "/v1/models")
    }
    func testLocalConnectionOmitsAuthHeader() throws {
        let runtime = UniversalAPIRuntime(keys: UniversalFixtureKeys())
        let request = try runtime.request(connection(endpoint: "http://localhost:11434/v1", key: false), path: "models")
        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
        XCTAssertNil(request.value(forHTTPHeaderField: "x-api-key"))
    }
    func testToolsTruncationAndInvalidRepliesAreRejected() async {
        for body in [
            #"{"choices":[{"message":{"role":"assistant","content":"Partial"},"finish_reason":"length"}]}"#,
            #"{"choices":[{"message":{"role":"assistant","content":"Hi","tool_calls":[{}]},"finish_reason":"stop"}]}"#,
            #"{"choices":[{"message":{"role":"assistant","content":"Hi","function_call":{}},"finish_reason":"stop"}]}"#,
            #"{"choices":[{"message":{"role":"user","content":"Wrong role"},"finish_reason":"stop"}]}"#,
            #"{"choices":[]}"#
        ] {
            do {
                _ = try await UniversalAPIRuntime(transport: UniversalFixtureTransport(body: body), keys: UniversalFixtureKeys()).run(connection(), prompt: "test", history: [])
                XCTFail("Invalid reply must be rejected")
            } catch { XCTAssertFalse(UniversalAPIRuntime.message(error).contains(body)) }
        }
    }
    func testProviderErrorsNeverExposeResponseBody() async {
        let runtime = UniversalAPIRuntime(transport: UniversalFixtureTransport(body: "echoed fixture-not-a-real-key", status: 401), keys: UniversalFixtureKeys())
        do { _ = try await runtime.run(connection(), prompt: "test", history: []); XCTFail() }
        catch { XCTAssertEqual(error as? APIRuntimeError, .authenticationFailed); XCTAssertFalse(UniversalAPIRuntime.message(error).contains("fixture-not-a-real-key")) }
    }
    func testMissingKeyAndOversizePromptFailBeforeTransport() async {
        let transport = UniversalFixtureTransport(body: "{}")
        let runtime = UniversalAPIRuntime(transport: transport, keys: UniversalFixtureKeys(value: nil))
        for prompt in ["test", String(repeating: "x", count: 256_001)] {
            do { _ = try await runtime.run(connection(), prompt: prompt, history: []); XCTFail() } catch {}
        }
        let requests = await transport.requests
        XCTAssertTrue(requests.isEmpty)
    }
    func testCancellationStopsTransport() async {
        let transport = UniversalFixtureTransport(body: "{}", delayed: true)
        let runtime = UniversalAPIRuntime(transport: transport, keys: UniversalFixtureKeys())
        let connection = connection()
        let task = Task { try await runtime.run(connection, prompt: "fixture", history: []) }
        while await transport.requests.isEmpty { await Task.yield() }
        task.cancel()
        do { _ = try await task.value; XCTFail() } catch { XCTAssertTrue(error is CancellationError) }
    }
    @MainActor
    func testUnreadableStorageIsNotOverwrittenByNewConnection() throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let file = folder.appendingPathComponent("api.json")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        try Data("unreadable snapshot".utf8).write(to: file)
        defer { try? FileManager.default.removeItem(at: folder) }
        let store = UniversalAPIWorkspaceStore(file: file, runtime: .init(keys: UniversalFixtureKeys()), isolated: true)
        XCTAssertThrowsError(try store.add(connection(), key: "fixture-key"))
        XCTAssertEqual(try String(contentsOf: file, encoding: .utf8), "unreadable snapshot")
    }
    @MainActor
    func testSavedConnectionsAndChatRestoreWithoutStoringKeys() async throws {
        let folder = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let file = folder.appendingPathComponent("api.json")
        defer { try? FileManager.default.removeItem(at: folder) }
        let keys = UniversalFixtureKeys()
        let runtime = UniversalAPIRuntime(transport: UniversalFixtureTransport(body: #"{"choices":[{"message":{"role":"assistant","content":"Saved reply"},"finish_reason":"stop"}]}"#), keys: keys)
        let store = UniversalAPIWorkspaceStore(file: file, runtime: runtime, isolated: true)
        let first = connection()
        try store.add(first, key: "fixture-not-a-real-key")
        store.draft = "Save this question"
        store.send()
        while store.runningID != nil { await Task.yield() }
        XCTAssertEqual(store.exchanges.first?.answer, "Saved reply")
        let data = try String(contentsOf: file, encoding: .utf8)
        XCTAssertFalse(data.contains("fixture-not-a-real-key"))
        let restored = UniversalAPIWorkspaceStore(file: file, runtime: runtime, isolated: true)
        XCTAssertEqual(restored.selectedID, first.id)
        XCTAssertEqual(restored.exchanges.first?.answer, "Saved reply")
        let second = connection()
        try restored.add(second, key: "another-fixture")
        XCTAssertTrue(restored.exchanges.isEmpty)
        try restored.remove(second)
        XCTAssertEqual(restored.selectedID, first.id)
        XCTAssertEqual(restored.exchanges.first?.answer, "Saved reply")
    }
}

private actor UniversalFixtureTransport: APIHTTPTransport {
    var requests: [URLRequest] = []
    let body: String
    let status: Int
    let delayed: Bool
    init(body: String, status: Int = 200, delayed: Bool = false) { self.body = body; self.status = status; self.delayed = delayed }
    func send(_ request: URLRequest, maximumBytes: Int) async throws -> APIHTTPResponse {
        requests.append(request)
        if delayed { try await Task.sleep(for: .seconds(60)) }
        return .init(statusCode: status, data: Data(body.utf8))
    }
}
private final class UniversalFixtureKeys: UniversalAPIKeyStoring, @unchecked Sendable {
    private let lock = NSLock()
    private var values: [UUID: String] = [:]
    private let value: String?
    init(value: String? = "fixture-not-a-real-key") { self.value = value }
    func key(for id: UUID) throws -> String? { lock.withLock { values[id] ?? value } }
    func save(_ value: String, for id: UUID) throws { lock.withLock { values[id] = value } }
    func remove(for id: UUID) throws { _ = lock.withLock { values.removeValue(forKey: id) } }
}
