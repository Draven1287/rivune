import Foundation

@main
struct BridgeBudgetCheck {
    static func main() throws {
        // Quotes, backslashes, and control bytes force JSON escaping and are a
        // much harsher transport case than ordinary model prose.
        let pathological = String(repeating: "\"\\\u{0001}", count: 80_000)
        let turn = ChatTurn(
            prompt: "Bridge budget regression",
            mode: .together,
            chatGPTAnswer: AIAnswer(
                source: .chatGPT,
                content: pathological,
                responseTime: 1,
                provenance: "test"
            ),
            claudeAnswer: AIAnswer(
                source: .claude,
                content: pathological,
                responseTime: 1,
                provenance: "test"
            ),
            combinedAnswer: AIAnswer(
                source: .alloy,
                content: pathological,
                responseTime: 1,
                provenance: "test"
            ),
            executionState: .complete
        )
        let original = BridgePromptUpdate(
            requestID: UUID(),
            stage: .complete,
            turn: turn,
            isComplete: true
        )
        let originalSize = try JSONEncoder().encode(BridgeEnvelope.update(original)).count
        guard originalSize > PeerBridge.maximumMessageBytes else {
            throw CheckError.fixtureDidNotExceedLimit
        }

        let fitted = RivuneStore.fittedBridgeUpdate(original)
        let fittedSize = try JSONEncoder().encode(BridgeEnvelope.update(fitted)).count
        guard fittedSize <= PeerBridge.maximumMessageBytes - 4_096 else {
            throw CheckError.fittedEnvelopeStillTooLarge(fittedSize)
        }
        guard fitted.turn.chatGPTAnswer != nil,
              fitted.turn.claudeAnswer != nil,
              fitted.turn.combinedAnswer != nil,
              fitted.isComplete else {
            throw CheckError.resultSemanticsWereLost
        }

        print("Bridge budget check passed: \(originalSize) -> \(fittedSize) bytes")
    }
}

private enum CheckError: Error {
    case fixtureDidNotExceedLimit
    case fittedEnvelopeStillTooLarge(Int)
    case resultSemanticsWereLost
}
