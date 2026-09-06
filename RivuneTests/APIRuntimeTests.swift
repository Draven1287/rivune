import Foundation
import XCTest
@testable import Rivune

final class APIRuntimeTests: XCTestCase {
    func testOpenAIProbeChecksOnlyModelMetadataAndDoesNotClaimGeneration() async {
        let transport = FixtureAPITransport(body: #"{"id":"fixture-text-model","object":"model"}"#)
        let service = service(transport)
        let probe = await service.probe(.openAI)
        XCTAssertEqual(probe.readiness, .ready)
        XCTAssertFalse(probe.executionVerified)
        XCTAssertTrue(probe.detail.contains("Generation and quota"))
        let requests = await transport.requests
        XCTAssertEqual(requests.count, 1)
        XCTAssertEqual(requests[0].httpMethod, "GET")
        XCTAssertEqual(requests[0].url?.absoluteString, "https://api.openai.com/v1/models/fixture-text-model")
        XCTAssertNil(requests[0].httpBody)
        XCTAssertEqual(requests[0].value(forHTTPHeaderField: "Authorization"), "Bearer fixture-key-not-real")
    }

    func testAnthropicProbeUsesVersionAndKeyHeader() async {
        let transport = FixtureAPITransport(body: #"{"id":"resolved-fixture-model","type":"model"}"#)
        let probe = await service(transport).probe(.anthropic)
        XCTAssertEqual(probe.readiness, .ready)
        let requests = await transport.requests
        XCTAssertEqual(requests[0].url?.host, "api.anthropic.com")
        XCTAssertEqual(requests[0].value(forHTTPHeaderField: "anthropic-version"), "2023-06-01")
        XCTAssertEqual(requests[0].value(forHTTPHeaderField: "x-api-key"), "fixture-key-not-real")
        XCTAssertNil(requests[0].value(forHTTPHeaderField: "Authorization"))
    }

    func testMissingKeyAndModelDoNotMakeNetworkRequests() async {
        let transport = FixtureAPITransport(body: "{}")
        let missingKey = APIRuntimeService(credentials: FixtureAPICredentials(key: nil), transport: transport)
        let missingModel = APIRuntimeService(credentials: FixtureAPICredentials(model: nil), transport: transport)
        let keyProbe = await missingKey.probe(.openAI)
        let modelProbe = await missingModel.probe(.anthropic)
        XCTAssertEqual(keyProbe.readiness, .signedOut)
        XCTAssertEqual(modelProbe.readiness, .unavailable)
        let requestCount = await transport.requestCount()
        XCTAssertEqual(requestCount, 0)
    }

    func testProbeNeverExposesProviderErrorBodyOrKey() async {
        for status in [401, 403, 404, 429, 503] {
            let transport = FixtureAPITransport(status: status, body: #"{"error":{"message":"fixture-key-not-real echoed back"}}"#)
            let probe = await service(transport).probe(.openAI)
            XCTAssertFalse(probe.readiness.isReady)
            XCTAssertFalse(probe.detail.contains("fixture-key-not-real"))
        }
    }

    func testMalformedModelMetadataDoesNotMakeReady() async {
        let transport = FixtureAPITransport(body: #"{"id":"fixture-text-model","object":"list"}"#)
        let probe = await service(transport).probe(.openAI)
        XCTAssertEqual(probe.readiness, .unavailable)
        XCTAssertFalse(probe.executionVerified)
    }

    func testOpenAIRunBuildsTextOnlyStatelessRequestAndParsesAllMessageBlocks() async throws {
        let transport = FixtureAPITransport(body: #"{"status":"completed","output":[{"type":"reasoning"},{"type":"message","content":[{"type":"output_text","text":"First"},{"type":"output_text","text":"Second"}]}]}"#)
        let result = try await service(transport).run(.openAI, prompt: "A fixture prompt")
        XCTAssertEqual(result.text, "First\nSecond")
        let requests = await transport.requests
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.url?.path, "/v1/responses")
        XCTAssertEqual(request.httpMethod, "POST")
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(request.httpBody)) as? [String: Any])
        XCTAssertEqual(body["model"] as? String, "fixture-text-model")
        XCTAssertEqual(body["input"] as? String, "A fixture prompt")
        XCTAssertEqual(body["store"] as? Bool, false)
        XCTAssertEqual(body["stream"] as? Bool, false)
        XCTAssertNil(body["tools"])
        XCTAssertNil(body["previous_response_id"])
        XCTAssertEqual(body["max_output_tokens"] as? Int, 8_192)
    }

    func testAnthropicRunBuildsMessagesAndReturnsTextOnly() async throws {
        let transport = FixtureAPITransport(body: #"{"type":"message","role":"assistant","stop_reason":"end_turn","content":[{"type":"thinking","thinking":"private fixture"},{"type":"text","text":"Answer"}]}"#)
        let result = try await service(transport).run(.anthropic, prompt: "A fixture prompt")
        XCTAssertEqual(result.text, "Answer")
        let requests = await transport.requests
        let request = try XCTUnwrap(requests.first)
        XCTAssertEqual(request.url?.path, "/v1/messages")
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(request.httpBody)) as? [String: Any])
        let messages = try XCTUnwrap(body["messages"] as? [[String: String]])
        XCTAssertEqual(messages, [["role": "user", "content": "A fixture prompt"]])
        XCTAssertEqual(body["max_tokens"] as? Int, 8_192)
        XCTAssertNil(body["tools"])
    }

    func testToolUseIsRejectedForBothProviders() async {
        let fixtures: [(RivuneAPIProvider, String)] = [
            (.openAI, #"{"status":"completed","output":[{"type":"function_call"}]}"#),
            (.anthropic, #"{"type":"message","role":"assistant","stop_reason":"tool_use","content":[{"type":"tool_use"}]}"#)
        ]
        for (provider, body) in fixtures {
            do {
                _ = try await service(FixtureAPITransport(body: body)).run(provider, prompt: "fixture")
                XCTFail("Tool output must be rejected")
            } catch { XCTAssertEqual(error as? APIRuntimeError, .unexpectedToolUse) }
        }
    }

    func testTruncatedOutputIsNotReportedAsComplete() async {
        let fixtures: [(RivuneAPIProvider, String)] = [
            (.openAI, #"{"status":"incomplete","output":[{"type":"message","content":[{"type":"output_text","text":"Partial"}]}]}"#),
            (.anthropic, #"{"type":"message","role":"assistant","stop_reason":"max_tokens","content":[{"type":"text","text":"Partial"}]}"#)
        ]
        for (provider, body) in fixtures {
            do {
                _ = try await service(FixtureAPITransport(body: body)).run(provider, prompt: "fixture")
                XCTFail("Incomplete output must not appear complete")
            } catch { XCTAssertEqual(error as? APIRuntimeError, .incompleteResponse) }
        }
    }

    func testModelMustBeExplicitAndCannotInjectPath() async {
        let transport = FixtureAPITransport(body: "{}")
        let runtime = APIRuntimeService(credentials: FixtureAPICredentials(model: "../../responses?key=secret"), transport: transport)
        do {
            _ = try await runtime.run(.openAI, prompt: "fixture")
            XCTFail("Invalid models must be rejected")
        } catch { XCTAssertEqual(error as? APIRuntimeError, .invalidModel) }
        let requestCount = await transport.requestCount()
        XCTAssertEqual(requestCount, 0)
    }

    func testOversizePromptRejectedBeforeNetwork() async {
        let transport = FixtureAPITransport(body: "{}")
        do {
            _ = try await service(transport).run(.openAI, prompt: String(repeating: "x", count: 512_001))
            XCTFail("Oversized prompt must be rejected")
        } catch { XCTAssertEqual(error as? APIRuntimeError, .promptTooLong) }
        let requestCount = await transport.requestCount()
        XCTAssertEqual(requestCount, 0)
    }

    func testOversizedTransportResponseIsRejected() async {
        let transport = FixtureAPITransport(body: String(repeating: "x", count: 2_000_001))
        do {
            _ = try await service(transport).run(.openAI, prompt: "fixture")
            XCTFail("Oversized output must be rejected")
        } catch { XCTAssertEqual(error as? APIRuntimeError, .outputTooLarge) }
    }

    func testTimeoutCancelsPendingTransport() async {
        let transport = FixtureAPITransport(body: "{}", delay: .seconds(60))
        let runtime = APIRuntimeService(credentials: FixtureAPICredentials(), transport: transport, probeTimeout: 0.02, runTimeout: 0.02)
        do {
            _ = try await runtime.run(.openAI, prompt: "fixture")
            XCTFail("Expected bounded timeout")
        } catch { XCTAssertEqual(error as? APIRuntimeError, .timedOut) }
        let wasCancelled = await transport.wasCancelled()
        XCTAssertTrue(wasCancelled)
    }

    func testCancellationPropagatesWithoutRetry() async {
        let transport = FixtureAPITransport(body: "{}", delay: .seconds(60))
        let runtime = service(transport)
        let task = Task { try await runtime.run(.anthropic, prompt: "fixture") }
        while await transport.requestCount() == 0 { await Task.yield() }
        task.cancel()
        do { _ = try await task.value; XCTFail("Expected cancellation") }
        catch { XCTAssertTrue(error is CancellationError) }
        let requestCount = await transport.requestCount()
        XCTAssertEqual(requestCount, 1)
        let wasCancelled = await transport.wasCancelled()
        XCTAssertTrue(wasCancelled)
    }

    func testAPIRegistryAcceptsCuratedRoutesAndRejectsEndpointChanges() throws {
        let registry = AITextRuntimeRegistry.current
        for provider in [AIProviderConfiguration.openAIDefault, .anthropicDefault] {
            let transport = try XCTUnwrap(provider.transports.first { $0.kind == .api })
            XCTAssertTrue(registry.supports(providerID: provider.id, transport: transport))
            guard case .api(let configuration) = transport else { return XCTFail("Expected API") }
            let redirected = AITransportConfiguration.api(AIAPITransportConfiguration(
                id: configuration.id, displayName: configuration.displayName,
                baseURL: URL(string: "https://example.invalid/collect")!, style: configuration.style,
                authenticationScheme: configuration.authenticationScheme, credential: configuration.credential,
                runtimeAdapterID: configuration.runtimeAdapterID, implementation: .executableAdapter,
                capabilities: [.text]))
            XCTAssertFalse(registry.supports(providerID: provider.id, transport: redirected))
        }
    }

    private func service(_ transport: FixtureAPITransport) -> APIRuntimeService {
        APIRuntimeService(credentials: FixtureAPICredentials(), transport: transport)
    }
}

private struct FixtureAPICredentials: APICredentialReading {
    var key: String? = "fixture-key-not-real"
    var model: String? = "fixture-text-model"
    func configuration(for provider: RivuneAPIProvider) async -> APIConnectionConfiguration {
        APIConnectionConfiguration(hasKey: key != nil, modelID: model)
    }
    func credential(for provider: RivuneAPIProvider) async throws -> String? { key }
}

private actor FixtureAPITransport: APIHTTPTransport {
    let response: APIHTTPResponse
    let delay: Duration?
    private(set) var requests: [URLRequest] = []
    private var cancelled = false
    init(status: Int = 200, body: String, delay: Duration? = nil) {
        response = APIHTTPResponse(statusCode: status, data: Data(body.utf8))
        self.delay = delay
    }
    func send(_ request: URLRequest, maximumBytes: Int) async throws -> APIHTTPResponse {
        requests.append(request)
        if let delay {
            do { try await Task.sleep(for: delay) }
            catch { cancelled = true; throw error }
        }
        return response
    }
    func requestCount() -> Int { requests.count }
    func wasCancelled() -> Bool { cancelled }
}
