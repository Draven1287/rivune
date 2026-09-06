import Foundation
import Combine
import XCTest
@testable import Rivune

final class LocalWorkspaceServerTests: XCTestCase {
    private let token = String(repeating: "A", count: 43)
    private var policy: LocalWorkspaceHTTPPolicy { .init(port: 43123, token: token) }

    func testAuthenticatedSnapshotHasExactBodyAndRoute() throws {
        let parsed = try XCTUnwrap(LocalWorkspaceHTTPParser.parse(request(), policy: policy))
        XCTAssertEqual(parsed.request.method, "GET")
        XCTAssertEqual(parsed.request.path, "/v1/workspace")
        XCTAssertTrue(parsed.request.body.isEmpty)
        XCTAssertFalse(parsed.isPreflight)
    }

    func testFragmentedUnicodeJSONWaitsForDeclaredByteLength() throws {
        let body = Data("{\"prompt\":\"Review this 🧠\"}".utf8)
        let complete = request(method: "POST", path: "/v1/runs", body: body)
        XCTAssertNil(try LocalWorkspaceHTTPParser.parse(Data(complete.dropLast()), policy: policy))
        let parsed = try XCTUnwrap(LocalWorkspaceHTTPParser.parse(complete, policy: policy))
        XCTAssertEqual(parsed.request.body, body)
    }

    func testAllDataAndMutationRoutesRequireCurrentBearerToken() throws {
        for (method, path) in [("GET", "/v1/workspace"), ("POST", "/v1/runs"), ("POST", "/v1/open"),
                               ("POST", "/v1/readiness"), ("POST", "/v1/settings/open"),
                               ("GET", "/v1/connections"), ("POST", "/v1/connections/scan"),
                               ("POST", "/v1/connections/cli"), ("POST", "/v1/connections/api"),
                               ("POST", "/v1/runs/10000000-0000-0000-0000-000000000001/cancel")] {
            assertRejected(request(method: method, path: path, authorization: nil), status: 401)
            assertRejected(request(method: method, path: path, authorization: "Bearer \(String(repeating: "B", count: 43))"), status: 401)
            let valid = request(method: method, path: path)
            XCTAssertNotNil(try LocalWorkspaceHTTPParser.parse(valid, policy: policy))
            var changedPolicy = policy
            changedPolicy = .init(port: changedPolicy.port, token: "rotated-token")
            XCTAssertThrowsError(try LocalWorkspaceHTTPParser.parse(valid, policy: changedPolicy))
        }
    }

    func testSettingsAndReadinessRequireExactPostRoutesAndApprovedOrigin() throws {
        for path in ["/v1/readiness", "/v1/settings/open", "/v1/connections/scan", "/v1/connections/cli", "/v1/connections/api"] {
            let body = Data("{\"section\":\"connections\"}".utf8)
            let parsed = try XCTUnwrap(LocalWorkspaceHTTPParser.parse(request(method: "POST", path: path, body: body), policy: policy))
            XCTAssertEqual(parsed.request.path, path)
            XCTAssertEqual(parsed.request.body, body)
            assertRejected(request(method: "GET", path: path), status: 405)
            assertRejected(request(method: "POST", path: path, origin: "https://attacker.test"), status: 403)
            assertRejected(request(method: "POST", path: path, contentType: "text/plain"), status: 415)
            assertRejected(request(method: "POST", path: path + "/"), status: 404)
            assertRejected(request(method: "POST", path: path + "?command=run"), status: 400)
            let preflight = try XCTUnwrap(LocalWorkspaceHTTPParser.parse(request(method: "OPTIONS", path: path, authorization: nil,
                extra: ["Access-Control-Request-Method: POST", "Access-Control-Request-Headers: authorization, content-type"]), policy: policy))
            XCTAssertTrue(preflight.isPreflight)
        }
    }

    func testOriginIsRequiredAndExactForActualRequestsAndPreflight() {
        for origin in [nil, "null", "http://localhost:3188", "https://localhost:3187", "http://localhost:3187.attacker.test", "http://localhost:3187/"] {
            assertRejected(request(origin: origin), status: 403)
            assertRejected(request(method: "OPTIONS", authorization: nil, origin: origin,
                                   extra: ["Access-Control-Request-Method: GET"]), status: 403)
        }
    }

    func testAllowedOriginPreflightRequiresNoBearerButValidatesMethodAndHeaders() throws {
        let data = request(method: "OPTIONS", authorization: nil,
                           extra: ["Access-Control-Request-Method: GET", "Access-Control-Request-Headers: authorization, content-type",
                                   "Access-Control-Request-Private-Network: true"])
        let parsed = try XCTUnwrap(LocalWorkspaceHTTPParser.parse(data, policy: policy))
        XCTAssertTrue(parsed.isPreflight)
        XCTAssertTrue(parsed.allowsPrivateNetwork)
        assertRejected(request(method: "OPTIONS", authorization: nil, extra: ["Access-Control-Request-Method: DELETE"]), status: 405)
        assertRejected(request(method: "OPTIONS", authorization: nil, extra: ["Access-Control-Request-Method: GET", "Access-Control-Request-Headers: x-unsafe"]), status: 403)
    }

    func testHostMustBeLoopbackAndMatchEphemeralPort() throws {
        for host in ["attacker.test:43123", "127.0.0.1:43124", "127.0.0.1", "localhost:43123.attacker.test", "0.0.0.0:43123"] {
            assertRejected(request(host: host), status: 403)
        }
        XCTAssertNotNil(try LocalWorkspaceHTTPParser.parse(request(host: "localhost:43123"), policy: policy))
    }

    func testRejectsAmbiguousFramingAndPipelinedRequests() {
        assertRejected(request(extra: ["Content-Length: 0", "content-length: 0"]), status: 400)
        assertRejected(request(extra: ["Transfer-Encoding: chunked"]), status: 400)
        assertRejected(request(extra: ["Content-Length: 0, 0"]), status: 400)
        assertRejected(request(extra: ["Content-Length: +0"]), status: 400)
        assertRejected(request(extra: ["Content-Length: -1"]), status: 400)
        assertRejected(request(extra: ["Upgrade: websocket"]), status: 400)
        assertRejected(request() + request(), status: 400)
        assertRejected(request() + Data("unexpected".utf8), status: 400)
    }

    func testRejectsHeaderInjectionObsoleteFoldingAndBareLinefeeds() {
        assertRejected(request(extra: [" Origin: http://localhost:3187"]), status: 400)
        assertRejected(request(extra: ["X-Test: one\nInjected: two"]), status: 400)
        assertRejected(request(extra: ["X-Test: one\rtwo"]), status: 400)
        assertRejected(request(extra: ["X-Test : bad"]), status: 400)
        assertRejected(request(extra: ["Host: localhost:43123"]), status: 400)
    }

    func testOnlyExactWorkspaceRoutesAreAccepted() {
        for path in ["/v1/%77orkspace", "/v1/../workspace", "/v1/workspace?secret=x", "/v1/workspace#x", "http://127.0.0.1:43123/v1/workspace", "/v1\\workspace"] {
            assertRejected(request(path: path), status: 400)
        }
        for path in ["/", "/v1/workspace/", "/v1/execute", "/v1/runs/not-a-uuid/cancel"] {
            assertRejected(request(path: path), status: 404)
        }
        assertRejected(request(method: "DELETE"), status: 405)
    }

    func testRejectsOversizedHeadersAndBodyBeforeWaitingForBody() {
        assertRejected(Data(String(repeating: "x", count: 16 * 1_024 + 1).utf8), status: 431)
        assertRejected(request(extra: ["X-Large: \(String(repeating: "x", count: 16 * 1_024))"]), status: 431)
        assertRejected(request(method: "POST", path: "/v1/runs", extra: ["Content-Length: 262145"], addLength: false), status: 413)
        assertRejected(Data(repeating: 0, count: 272 * 1_024 + 1), status: 413)
    }

    func testMutationsRequireJSONAndContentLength() {
        assertRejected(request(method: "POST", path: "/v1/runs", addLength: false), status: 411)
        assertRejected(request(method: "POST", path: "/v1/runs", contentType: "text/plain"), status: 415)
        assertRejected(request(body: Data("{}".utf8), extra: ["Content-Length: 2"]), status: 400)
    }

    func testAuthErrorCanBeReadOnlyByApprovedOrigin() {
        XCTAssertThrowsError(try LocalWorkspaceHTTPParser.parse(request(authorization: nil), policy: policy)) { error in
            XCTAssertEqual((error as? LocalWorkspaceHTTPError)?.origin, "http://localhost:3187")
        }
        XCTAssertThrowsError(try LocalWorkspaceHTTPParser.parse(request(origin: "https://attacker.test"), policy: policy)) { error in
            XCTAssertNil((error as? LocalWorkspaceHTTPError)?.origin)
        }
    }

    #if os(macOS)
    @MainActor
    func testSettingsNavigationWhitelistsDestinationsAndPreservesDrafts() throws {
        guard RivuneLaunchContext.isIsolated else { return XCTFail("Settings navigation test requires isolation") }
        let store = RivuneStore()
        let conversationID = UUID()
        store.selectedConversationID = conversationID
        store.composerText = "Unsent draft"
        store.draftAttachments = [.init(name: "draft.txt", textContent: "Keep", byteCount: 4)]
        store.mode = .claude
        store.codexModel = .gpt55
        store.codexEffort = .high
        for section in NativeSettingsDestination.allCases {
            let before = store.settingsPresentationRevision
            let body = try JSONSerialization.data(withJSONObject: ["section": section.rawValue])
            let result = store.handleWorkspaceRequest(.init(method: "POST", path: "/v1/settings/open", body: body))
            XCTAssertEqual(result.status, 200)
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: result.jsonData) as? [String: Any])
            XCTAssertEqual(json["opened"] as? Bool, true)
            XCTAssertEqual(json["section"] as? String, section.rawValue)
            XCTAssertEqual(store.requestedSettingsSection, section)
            XCTAssertEqual(store.settingsPresentationRevision, before + 1)
            XCTAssertTrue(store.showSettings)
            XCTAssertEqual(store.selectedConversationID, conversationID)
            XCTAssertEqual(store.composerText, "Unsent draft")
            XCTAssertEqual(store.draftAttachments.first?.name, "draft.txt")
            XCTAssertEqual(store.mode, .claude)
            XCTAssertEqual(store.codexModel, .gpt55)
            XCTAssertEqual(store.codexEffort, .high)
        }
        let before = store.settingsPresentationRevision
        for body in ["{}", "{\"section\":\"terminal\"}", "{\"section\":\"https://example.com\"}", "{\"section\":\"connections;rm -rf\"}", "{\"section\":null}"] {
            XCTAssertEqual(store.handleWorkspaceRequest(.init(method: "POST", path: "/v1/settings/open", body: Data(body.utf8))).status, 400)
        }
        XCTAssertEqual(store.settingsPresentationRevision, before)
    }

    @MainActor
    func testLoopbackWorkspaceSubmissionRetryCancellationAndAccessChecks() async throws {
        // Never construct a live store or inspect real provider credentials if
        // this test is accidentally launched outside the isolated XCTest host.
        guard RivuneLaunchContext.isIsolated else {
            XCTFail("The loopback integration test requires an isolated test host.")
            return
        }
        let started = XCTestExpectation(description: "Injected provider received the task")
        let returned = XCTestExpectation(description: "Injected provider returned its late answer")
        let runner = LoopbackWorkspaceRunner(onStarted: { started.fulfill() }, onReturned: { returned.fulfill() })
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("rivune-loopback-\(UUID().uuidString)", isDirectory: true)
        let coordinator = RivuneRunCoordinator(textRunner: runner, journalURL: directory.appendingPathComponent("runs.json"))
        let store = RivuneStore(runCoordinator: coordinator)
        store.codexReadiness = .ready
        let server = LocalWorkspaceServer(allowsIsolatedStartup: true)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 5
        configuration.timeoutIntervalForResource = 5
        configuration.urlCache = nil
        let session = URLSession(configuration: configuration)
        defer {
            server.stop()
            for run in coordinator.runs where run.status == .running { coordinator.cancel(run.id) }
            // Releasing the fake also covers assertion/transport failures; no
            // checked continuation may outlive the test's cleanup path.
            Task { await runner.finish(text: "Test cleanup") }
            session.invalidateAndCancel()
            try? FileManager.default.removeItem(at: directory)
        }

        let ready = XCTestExpectation(description: "Loopback listener became ready")
        let readySubscription = server.$isRunning.filter { $0 }.prefix(1).sink { _ in ready.fulfill() }
        defer { readySubscription.cancel() }
        server.start { [weak store] request in
            guard let store else { return .error(503, "Test workspace was released.") }
            return store.handleWorkspaceRequest(request)
        }
        let readiness = await XCTWaiter.fulfillment(of: [ready], timeout: 5)
        guard readiness == .completed else {
            XCTFail("The loopback listener did not become ready: \(server.error ?? "timed out")")
            return
        }
        let endpoint = try XCTUnwrap(server.endpoint)
        let bearer = try XCTUnwrap(server.pairingToken)
        let id = UUID()
        let input = BrowserRunRequest(id: id, conversationID: nil, prompt: "Return the injected test response.", mode: "codex", shareWithTeam: false)
        let body = try JSONEncoder().encode(input)

        let submitted = try await Self.exchange(session, endpoint: endpoint, method: "POST", path: "/v1/runs", token: bearer, body: body)
        XCTAssertEqual(submitted.response.statusCode, 200)
        let originalRun = try JSONDecoder().decode(LoopbackRun.self, from: submitted.data)
        XCTAssertEqual(originalRun.id, id)
        XCTAssertEqual(originalRun.status, "running")
        let providerStarted = await XCTWaiter.fulfillment(of: [started], timeout: 3)
        XCTAssertEqual(providerStarted, .completed)

        let snapshot = try await Self.exchange(session, endpoint: endpoint, path: "/v1/workspace", token: bearer)
        XCTAssertEqual(snapshot.response.statusCode, 200)
        XCTAssertEqual(snapshot.response.value(forHTTPHeaderField: "Access-Control-Allow-Origin"), "http://localhost:3187")
        let matchingRun = try XCTUnwrap(JSONDecoder().decode(LoopbackSnapshot.self, from: snapshot.data).runs.first { $0.id == id })
        XCTAssertEqual(matchingRun.conversationID, originalRun.conversationID)
        XCTAssertEqual(matchingRun.status, "running")

        let duplicate = try await Self.exchange(session, endpoint: endpoint, method: "POST", path: "/v1/runs", token: bearer, body: body)
        XCTAssertEqual(duplicate.response.statusCode, 200)
        XCTAssertEqual(try JSONDecoder().decode(LoopbackRun.self, from: duplicate.data).conversationID, originalRun.conversationID)
        let changedInput = BrowserRunRequest(id: id, conversationID: nil, prompt: "A different task must not reuse this request.", mode: "codex", shareWithTeam: false)
        let conflict = try await Self.exchange(session, endpoint: endpoint, method: "POST", path: "/v1/runs", token: bearer,
                                               body: JSONEncoder().encode(changedInput))
        XCTAssertEqual(conflict.response.statusCode, 409)
        let callsAfterRetries = await runner.callCount
        XCTAssertEqual(callsAfterRetries, 1)

        let unpaired = try await Self.exchange(session, endpoint: endpoint, path: "/v1/workspace", token: nil)
        XCTAssertEqual(unpaired.response.statusCode, 401)
        let forbidden = try await Self.exchange(session, endpoint: endpoint, path: "/v1/workspace", token: bearer, origin: "https://unapproved.example")
        XCTAssertEqual(forbidden.response.statusCode, 403)
        XCTAssertNil(forbidden.response.value(forHTTPHeaderField: "Access-Control-Allow-Origin"))

        let cancelled = try await Self.exchange(session, endpoint: endpoint, method: "POST", path: "/v1/runs/\(id.uuidString)/cancel", token: bearer, body: Data("{}".utf8))
        XCTAssertEqual(cancelled.response.statusCode, 200)
        let stoppedRun = try XCTUnwrap(JSONDecoder().decode(LoopbackSnapshot.self, from: cancelled.data).runs.first { $0.id == id })
        XCTAssertEqual(stoppedRun.status, "cancelled")

        let lateMutation = XCTestExpectation(description: "A stopped run must not accept a late provider answer")
        lateMutation.isInverted = true
        let stoppedSubscription = coordinator.$runs.sink { runs in
            if let run = runs.first(where: { $0.id == id }),
               run.status != .cancelled || run.turn.chatGPTAnswer != nil { lateMutation.fulfill() }
        }
        defer { stoppedSubscription.cancel() }
        await runner.finish(text: "LATE ANSWER MUST NOT APPEAR")
        let providerReturned = await XCTWaiter.fulfillment(of: [returned], timeout: 3)
        XCTAssertEqual(providerReturned, .completed)
        // An event-driven inverted expectation gives the resumed provider task
        // time to drain without a polling or busy loop.
        let remainedStopped = await XCTWaiter.fulfillment(of: [lateMutation], timeout: 0.15)
        XCTAssertEqual(remainedStopped, .completed)
        let afterLateAnswer = try await Self.exchange(session, endpoint: endpoint, path: "/v1/workspace", token: bearer)
        let finalRun = try XCTUnwrap(JSONDecoder().decode(LoopbackSnapshot.self, from: afterLateAnswer.data).runs.first { $0.id == id })
        XCTAssertEqual(finalRun.status, "cancelled")
        XCTAssertNil(finalRun.result)
        let finalCalls = await runner.callCount
        XCTAssertEqual(finalCalls, 1)
    }

    private struct LoopbackRun: Decodable {
        let id: UUID
        let conversationID: UUID
        let status: String
        let result: String?
    }

    private struct LoopbackSnapshot: Decodable { let runs: [LoopbackRun] }

    private static func exchange(_ session: URLSession, endpoint: String, method: String = "GET", path: String,
                                 token: String?, origin: String = "http://localhost:3187", body: Data? = nil) async throws -> (data: Data, response: HTTPURLResponse) {
        var request = URLRequest(url: try XCTUnwrap(URL(string: endpoint + path)))
        request.httpMethod = method
        request.setValue(origin, forHTTPHeaderField: "Origin")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await session.data(for: request)
        return (data, try XCTUnwrap(response as? HTTPURLResponse))
    }
    #endif

    private func request(method: String = "GET", path: String = "/v1/workspace", body: Data = Data(),
                         authorization: String? = "default", origin: String? = "http://localhost:3187", host: String = "127.0.0.1:43123",
                         extra: [String] = [], addLength: Bool = true, contentType: String = "application/json") -> Data {
        var headers = ["\(method) \(path) HTTP/1.1", "Host: \(host)"]
        if let origin { headers.append("Origin: \(origin)") }
        if let authorization { headers.append("Authorization: \(authorization == "default" ? "Bearer \(token)" : authorization)") }
        if method == "POST" {
            headers.append("Content-Type: \(contentType)")
            if addLength { headers.append("Content-Length: \(body.count)") }
        }
        headers += extra
        return Data((headers.joined(separator: "\r\n") + "\r\n\r\n").utf8) + body
    }

    private func assertRejected(_ data: Data, status: Int, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertThrowsError(try LocalWorkspaceHTTPParser.parse(data, policy: policy), file: file, line: line) { error in
            XCTAssertEqual((error as? LocalWorkspaceHTTPError)?.status, status, file: file, line: line)
        }
    }
}

#if os(macOS)
/// Deliberately ignores task cancellation until the test releases it, so the
/// integration verifies the coordinator's late-answer guard, not a cooperative
/// fake that stops before reaching that guard.
private actor LoopbackWorkspaceRunner: AITextRunning {
    private let onStarted: @Sendable () -> Void
    private let onReturned: @Sendable () -> Void
    private var continuations: [CheckedContinuation<TerminalRunResult, Never>] = []
    private var releasedText: String?
    private(set) var callCount = 0

    init(onStarted: @escaping @Sendable () -> Void, onReturned: @escaping @Sendable () -> Void) {
        self.onStarted = onStarted
        self.onReturned = onReturned
    }

    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        callCount += 1
        defer { onReturned() }
        onStarted()
        if let releasedText { return TerminalRunResult(text: releasedText, elapsedSeconds: 0) }
        return await withCheckedContinuation { continuations.append($0) }
    }

    func finish(text: String) {
        releasedText = text
        let pending = continuations
        continuations.removeAll()
        for continuation in pending { continuation.resume(returning: TerminalRunResult(text: text, elapsedSeconds: 0)) }
    }
}
#endif


#if os(macOS)
private actor MemoryConnectionCredentials: APIConnectionManaging {
    private var values: [RivuneAPIProvider: APIConnectionConfiguration] = [:]
    private(set) var writes = 0
    func configuration(for provider: RivuneAPIProvider) -> APIConnectionConfiguration {
        values[provider] ?? .init(hasKey: false, modelID: nil)
    }
    func save(apiKey: String, modelID: String, for provider: RivuneAPIProvider) throws {
        if apiKey.isEmpty && values[provider]?.hasKey != true { throw APIRuntimeError.missingKey }
        writes += 1
        values[provider] = .init(hasKey: true, modelID: modelID)
    }
}

final class WorkspaceConnectionSettingsTests: XCTestCase {
    @MainActor
    func testAPIConfigurationUsesInjectedCredentialsAndNeverReturnsSecret() async throws {
        guard RivuneLaunchContext.isIsolated else { return XCTFail("Requires isolated test host") }
        let suite = "rivune-test-connections-" + UUID().uuidString
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let credentials = MemoryConnectionCredentials()
        let store = RivuneStore()
        store.startupPhase = .needsConnection
        store.composerText = "Keep my draft"
        store.mode = .claude
        store.selectedCodexRoute = .codexCLI
        let secret = "test-only-secret-not-real"
        let body = try JSONSerialization.data(withJSONObject: ["provider":"openai", "apiKey":secret, "modelID":"fixture-model"])
        let result = await store.handleConnectionSettingsRequest(.init(method:"POST", path:"/v1/connections/api", body:body), credentials:credentials, defaults:defaults, searchDirectories:[])
        XCTAssertEqual(result.status, 200)
        let text = String(decoding: result.jsonData, as: UTF8.self)
        XCTAssertFalse(text.contains(secret))
        XCTAssertFalse(text.contains("apiKey"))
        XCTAssertFalse(text.contains(NSHomeDirectory()))
        let configuration = await credentials.configuration(for: .openAI)
        XCTAssertEqual(configuration, .init(hasKey: true, modelID: "fixture-model"))
        XCTAssertEqual(store.composerText, "Keep my draft")
        XCTAssertEqual(store.mode, .claude)
        XCTAssertEqual(store.currentCodexRoute, .codexCLI)
        XCTAssertEqual(store.codexReadiness, .checking)
        XCTAssertFalse(store.isSavingProviderConnection)
        XCTAssertFalse(defaults.dictionaryRepresentation().values.contains { String(describing:$0).contains(secret) })
    }

    @MainActor
    func testConnectionInputsAndActiveWorkFailClosed() async throws {
        guard RivuneLaunchContext.isIsolated else { return XCTFail("Requires isolated test host") }
        let suite = "rivune-test-inputs-" + UUID().uuidString
        let defaults = try XCTUnwrap(UserDefaults(suiteName:suite))
        defer { defaults.removePersistentDomain(forName:suite) }
        let credentials = MemoryConnectionCredentials()
        let store = RivuneStore()
        store.startupPhase = .needsConnection
        for input in [
            ["provider":"unknown", "apiKey":"fixture", "modelID":"model"],
            ["provider":"openai", "apiKey":"has spaces", "modelID":"model"],
            ["provider":"openai", "apiKey":"fixture", "modelID":"https://attacker.test"],
            ["provider":"openai", "apiKey":"fixture", "modelID":".."],
            ["provider":"openai", "apiKey":"", "modelID":"model"]
        ] {
            let request = LocalWorkspaceRequest(method:"POST", path:"/v1/connections/api", body:try JSONSerialization.data(withJSONObject:input))
            let result = await store.handleConnectionSettingsRequest(request, credentials:credentials, defaults:defaults, searchDirectories:[])
            XCTAssertEqual(result.status, 400)
        }
        let body = try JSONSerialization.data(withJSONObject:["provider":"openai", "apiKey":"fixture", "modelID":"model"])
        store.isGenerating = true
        let busy = await store.handleConnectionSettingsRequest(.init(method:"POST", path:"/v1/connections/api", body:body), credentials:credentials, defaults:defaults, searchDirectories:[])
        XCTAssertEqual(busy.status, 409)
        let writes = await credentials.writes
        XCTAssertEqual(writes, 0)
        XCTAssertFalse(store.isSavingProviderConnection)
    }

    @MainActor
    func testIsolatedConnectionManagementNeverTouchesRealMacSettings() async {
        guard RivuneLaunchContext.isIsolated else { return XCTFail("Requires isolated test host") }
        let store = RivuneStore()
        for (method,path) in [("GET","/v1/connections"),("POST","/v1/connections/scan"),("POST","/v1/connections/api"),("POST","/v1/connections/cli")] {
            let result = await store.handleConnectionSettingsRequest(.init(method:method, path:path, body:Data()))
            XCTAssertEqual(result.status,403)
        }
    }

    func testCLIDiscoveryFindsDefaultsAndExtrasWithoutExecutingThem() throws {
        let suite = "rivune-test-cli-" + UUID().uuidString
        let defaults = try XCTUnwrap(UserDefaults(suiteName:suite))
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(suite)
        try FileManager.default.createDirectory(at:directory, withIntermediateDirectories:true)
        defer { defaults.removePersistentDomain(forName:suite); try? FileManager.default.removeItem(at:directory) }
        for name in ["codex","gemini","custom-ai"] {
            let file = directory.appendingPathComponent(name)
            try Data("#!/bin/sh\ntouch '\(directory.path)/must-not-exist'\n".utf8).write(to:file)
            try FileManager.default.setAttributes([.posixPermissions:0o755], ofItemAtPath:file.path)
        }
        try MacCLIInventory.add(title:"My AI", executable:"custom-ai", defaults:defaults, directories:[directory])
        let entries = MacCLIInventory.scan(defaults:defaults, directories:[directory])
        XCTAssertEqual(entries.map(\.command), ["codex","claude","gemini","custom-ai"])
        XCTAssertTrue(entries[0].installed)
        XCTAssertFalse(entries[1].installed)
        XCTAssertFalse(entries[2].supported)
        XCTAssertFalse(entries[3].supported)
        XCTAssertTrue(entries[3].custom)
        XCTAssertFalse(FileManager.default.fileExists(atPath:directory.appendingPathComponent("must-not-exist").path))
        XCTAssertThrowsError(try MacCLIInventory.add(title:"Bad", executable:"custom-ai --tools", defaults:defaults, directories:[directory]))
        XCTAssertThrowsError(try MacCLIInventory.add(title:"Bad", executable:"../custom-ai", defaults:defaults, directories:[directory]))
        XCTAssertThrowsError(try MacCLIInventory.add(title:"Bad", executable:"not-installed", defaults:defaults, directories:[directory]))
        try MacCLIInventory.add(title:"Cannot replace ChatGPT", executable:directory.appendingPathComponent("codex").path, defaults:defaults, directories:[directory])
        XCTAssertEqual(MacCLIInventory.saved(in:defaults).count,1)
        XCTAssertEqual(CLIProviderRegistry.current.registrations.count,2)
    }
}
#endif
