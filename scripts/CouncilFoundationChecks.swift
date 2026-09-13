import Foundation

actor CouncilRecordingRunner: AITextRunning {
    var calls: [(AIExecutionRoute, String)] = []
    var failDraft: AIExecutionRoute?
    var failFirstLead: Bool
    var slow: Bool
    init(failDraft: AIExecutionRoute? = nil, failFirstLead: Bool = false, slow: Bool = false) {
        self.failDraft = failDraft; self.failFirstLead = failFirstLead; self.slow = slow
    }
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        calls.append((route, prompt))
        if slow { try await Task.sleep(for: .seconds(5)) }
        let synthesis = prompt.contains("INDEPENDENT ANSWERS JSON:")
        if !synthesis && route == failDraft { throw CheckError.failed }
        if synthesis && failFirstLead { failFirstLead = false; throw CheckError.failed }
        return .init(text: synthesis ? "Reviewed final" : (route == .codexCLI ? "DRAFT_A_UNIQUE" : "DRAFT_B_UNIQUE"), elapsedSeconds: 0.01)
    }
    func snapshot() -> [(AIExecutionRoute, String)] { calls }
}
enum CheckError: Error { case failed }

@main struct CouncilFoundationChecks {
    static func require(_ condition: Bool, _ message: String) {
        precondition(condition, message)
    }
    static func main() async throws {
        let participants = [CouncilParticipant(identity: .init(id: "a", providerID: "openai", adapterID: AIExecutionRoute.codexCLI.runtimeAdapterID, modelID: nil, displayName: "ChatGPT"), route: .codexCLI, options: .accountDefault),
                            CouncilParticipant(identity: .init(id: "b", providerID: "anthropic", adapterID: AIExecutionRoute.claudeCodeCLI.runtimeAdapterID, modelID: nil, displayName: "Claude"), route: .claudeCodeCLI, options: .accountDefault)]
        let request = CouncilRequest(runID: UUID(), turnID: UUID(), prompt: "Compare conflicting facts", approvedContext: "Only supplied evidence", criteria: CouncilRunner.defaultCriteria, participants: participants)
        let transport = CouncilRecordingRunner()
        let record = await CouncilRunner(textRunner: transport).run(request)
        let calls = await transport.snapshot()
        require(record.phase == .complete && calls.count == 3, "Two drafts then one lead")
        require(calls[0].1 == calls[1].1, "Independent participants receive identical context")
        require(!calls[0].1.contains("DRAFT_A_UNIQUE") && !calls[1].1.contains("DRAFT_B_UNIQUE"), "Drafts cannot see each other")
        require(calls[2].1.contains("DRAFT_A_UNIQUE") && calls[2].1.contains("DRAFT_B_UNIQUE"), "Lead sees all drafts")
        require(calls[2].1.contains("state the uncertainty"), "Conflicts cannot be hidden")
        require(record.appointments[0].reason.contains("not a quality ranking"), "Disclosed fallback")
        let encoded = try JSONEncoder().encode(record)
        require(try JSONDecoder().decode(CouncilRunRecord.self, from: encoded) == record, "Identity and exact results round trip")
        require(record.results.allSatisfy { $0.resolvedModelID == nil }, "Unknown models remain unknown")
        let partialTransport = CouncilRecordingRunner(failDraft: .claudeCodeCLI)
        let partial = await CouncilRunner(textRunner: partialTransport).run(request)
        require(partial.phase == .partial && partial.finalText == nil, "One answer is partial, never a final")
        require(await partialTransport.snapshot().count == 2, "Partial run has no synthesis")
        var retryRequest = request; retryRequest.previous = partial
        let retryTransport = CouncilRecordingRunner()
        let recovered = await CouncilRunner(textRunner: retryTransport).run(retryRequest)
        require(recovered.phase == .complete, "Retry completes")
        require(await retryTransport.snapshot().count == 2, "Retry only missing participant then synthesis")
        let failLead = CouncilRecordingRunner(failFirstLead: true)
        let fallback = await CouncilRunner(textRunner: failLead).run(request)
        require(fallback.phase == .complete && fallback.appointments.count == 2, "Failed lead replaced")
        require(fallback.appointments[1].replacesParticipantID == fallback.appointments[0].participant.id, "Replacement recorded")
        let slow = CouncilRecordingRunner(slow: true)
        let task = Task { await CouncilRunner(textRunner: slow).run(request) }
        try await Task.sleep(for: .milliseconds(50)); task.cancel()
        let stopped = await task.value
        require(stopped.phase == .cancelled && stopped.finalText == nil, "Cancelled stays cancelled")
        require(await slow.snapshot().allSatisfy { !$0.1.contains("INDEPENDENT ANSWERS JSON:") }, "Cancellation starts no synthesis")
        print("Council foundation checks passed: independence, complete context, lead fallback, partial recovery, persistence, cancellation")
    }
}
