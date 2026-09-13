import Foundation
import CryptoKit
struct TerminalRunOptions { var model: String?; var effort: String? }
enum TerminalProvider { case codex; var executionRoute: Route { Route() } }
struct Route { var providerID = "openai"; var transportID = "codex-cli" }
enum TerminalEngineError: Error { case unexpectedToolUse(TerminalProvider), providerError(TerminalProvider), malformedOutput(TerminalProvider) }
enum CLIExecutionTerminalState: String, Codable, Hashable, Sendable {
    case completed
    case providerFailed
    case processFailed
    case malformedOutput
    case unexpectedToolUse
}

struct CLIExecutionReceiptItem: Codable, Hashable, Sendable {
    let id: String?
    let type: String
    let status: String?
}

/// A shareable, allowlisted receipt for the documented `codex exec --json`
/// seam. It intentionally contains no prompt, answer, stdout, stderr, unknown
/// event payload, environment value, configuration value, or credential path.
struct CLIExecutionReceipt: Codable, Hashable, Sendable {
    static let currentVersion = 1
    static let parserVersion = "codex-exec-jsonl-receipt-v1"

    let version: Int
    let localExecutionID: UUID
    let providerID: String
    let transportID: String
    let promptSHA256: String
    let promptByteCount: Int
    let requestedModel: String?
    let requestedEffort: String?
    let resolvedModel: String?
    let parserVersion: String
    let cliVersion: String?
    let threadID: String?
    let eventTypes: [String]
    let unknownEventTypes: [String]
    let items: [CLIExecutionReceiptItem]
    let inputTokens: Int?
    let cachedInputTokens: Int?
    let outputTokens: Int?
    let reasoningOutputTokens: Int?
    let providerRequestID: String?
    let serviceTier: String?
    let finishReason: String?
    let billing: String?
    let exitStatus: Int32
    let startedAt: Date
    let finishedAt: Date
    let elapsedSeconds: Double
    let terminalState: CLIExecutionTerminalState
    let completionEventObserved: Bool
    let failureEventObserved: Bool
    let answerSHA256: String?
    let answerByteCount: Int?
    let stdoutSHA256: String
    let stderrSHA256: String
    let diagnosticsRetained: Bool
    let redactionStatus: String
}

struct CodexExecutionReceiptBuilder {
    private static let knownEvents: Set<String> = [
        "thread.started", "turn.started", "turn.completed", "turn.failed", "error",
        "item.started", "item.updated", "item.completed"
    ]
    private static let safeNameCharacters = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "._-"))

    static func build(
        stdout: Data,
        stderr: Data,
        exitStatus: Int32,
        prompt: Data,
        options: TerminalRunOptions,
        localExecutionID: UUID,
        cliVersion: String?,
        startedAt: Date,
        finishedAt: Date,
        elapsedSeconds: Double
    ) -> CLIExecutionReceipt {
        var eventTypes: [String] = []
        var unknownEventTypes: [String] = []
        var items: [CLIExecutionReceiptItem] = []
        var threadID: String?
        var inputTokens: Int?
        var cachedInputTokens: Int?
        var outputTokens: Int?
        var reasoningOutputTokens: Int?
        var answerSHA256: String?
        var answerByteCount: Int?
        var completed = false
        var failed = false
        var malformed = false
        var unexpectedTool = false

        for line in String(decoding: stdout, as: UTF8.self).split(whereSeparator: \.isNewline) {
            guard let bytes = String(line).data(using: .utf8),
                  let event = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  let rawType = event["type"] as? String,
                  !rawType.isEmpty else {
                malformed = true
                continue
            }
            let eventType = safeName(rawType)
            if eventTypes.count < 128 { eventTypes.append(eventType) }
            if !knownEvents.contains(rawType), unknownEventTypes.count < 32 {
                unknownEventTypes.append(eventType)
            }
            switch rawType {
            case "thread.started":
                threadID = boundedOpaque(event["thread_id"] as? String, limit: 512)
            case "turn.completed":
                completed = true
                if let usage = event["usage"] as? [String: Any] {
                    inputTokens = token(usage["input_tokens"])
                    cachedInputTokens = token(usage["cached_input_tokens"])
                    outputTokens = token(usage["output_tokens"])
                    reasoningOutputTokens = token(usage["reasoning_output_tokens"])
                }
            case "turn.failed", "error":
                failed = true
            default:
                break
            }
            if ["item.started", "item.updated", "item.completed"].contains(rawType),
               let item = event["item"] as? [String: Any],
               let rawItemType = item["type"] as? String {
                let itemType = safeName(rawItemType)
                if items.count < 128 {
                    items.append(.init(
                        id: boundedOpaque(item["id"] as? String, limit: 256),
                        type: itemType,
                        status: boundedSafeName(item["status"] as? String, limit: 80)
                    ))
                }
                if !["agent_message", "reasoning"].contains(rawItemType) {
                    unexpectedTool = true
                }
                if rawType == "item.completed", rawItemType == "agent_message",
                   let text = item["text"] as? String,
                   !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    let answer = Data(text.utf8)
                    answerSHA256 = hash(answer)
                    answerByteCount = answer.count
                }
            }
        }

        let terminalState: CLIExecutionTerminalState
        if exitStatus != 0 {
            terminalState = .processFailed
        } else if malformed {
            terminalState = .malformedOutput
        } else if unexpectedTool {
            terminalState = .unexpectedToolUse
        } else if failed {
            terminalState = .providerFailed
        } else if !completed || answerSHA256 == nil {
            terminalState = .malformedOutput
        } else {
            terminalState = .completed
        }

        return CLIExecutionReceipt(
            version: CLIExecutionReceipt.currentVersion,
            localExecutionID: localExecutionID,
            providerID: TerminalProvider.codex.executionRoute.providerID,
            transportID: TerminalProvider.codex.executionRoute.transportID,
            promptSHA256: hash(prompt),
            promptByteCount: prompt.count,
            requestedModel: boundedSafeName(options.model, limit: 256),
            requestedEffort: boundedSafeName(options.effort, limit: 80),
            resolvedModel: nil,
            parserVersion: CLIExecutionReceipt.parserVersion,
            cliVersion: boundedVersion(cliVersion),
            threadID: threadID,
            eventTypes: eventTypes,
            unknownEventTypes: unknownEventTypes,
            items: items,
            inputTokens: inputTokens,
            cachedInputTokens: cachedInputTokens,
            outputTokens: outputTokens,
            reasoningOutputTokens: reasoningOutputTokens,
            providerRequestID: nil,
            serviceTier: nil,
            finishReason: nil,
            billing: nil,
            exitStatus: exitStatus,
            startedAt: startedAt,
            finishedAt: finishedAt,
            elapsedSeconds: max(0, elapsedSeconds),
            terminalState: terminalState,
            completionEventObserved: completed,
            failureEventObserved: failed,
            answerSHA256: answerSHA256,
            answerByteCount: answerByteCount,
            stdoutSHA256: hash(stdout),
            stderrSHA256: hash(stderr),
            diagnosticsRetained: false,
            redactionStatus: "raw_diagnostics_excluded"
        )
    }

    private static func token(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber else { return nil }
        let numeric = number.doubleValue
        guard numeric.isFinite,
              numeric >= 0,
              numeric.rounded(.towardZero) == numeric,
              numeric <= Double(Int.max),
              String(cString: number.objCType) != "c" else { return nil }
        return Int(numeric)
    }

    private static func boundedOpaque(_ value: String?, limit: Int) -> String? {
        guard let value, !value.isEmpty, value.utf8.count <= limit else { return nil }
        return value
    }

    private static func boundedSafeName(_ value: String?, limit: Int) -> String? {
        guard let value, !value.isEmpty, value.utf8.count <= limit,
              value.unicodeScalars.allSatisfy({ safeNameCharacters.contains($0) }) else { return nil }
        return value
    }

    private static func boundedVersion(_ value: String?) -> String? {
        let allowed = safeNameCharacters.union(CharacterSet(charactersIn: " ()"))
        guard let value, !value.isEmpty, value.utf8.count <= 256,
              value.unicodeScalars.allSatisfy({ allowed.contains($0) }) else { return nil }
        return value
    }

    private static func safeName(_ value: String) -> String {
        boundedSafeName(value, limit: 80) ?? "unknown.invalid_name"
    }

    private static func hash(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}


struct Parser {
    static func parseCodex(_ data: Data) throws -> String {
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

}

let mode = CommandLine.arguments.last!
let success = "{\"type\":\"item.completed\",\"item\":{\"type\":\"agent_message\",\"text\":\"answer\"}}\n{\"type\":\"turn.completed\"}"
var payload = success
if mode == "privacy" { payload = "{\"type\":\"thread.started\",\"thread_id\":\"Authorization: Bearer SYNTHETIC_SECRET\"}\n{\"type\":\"item.updated\",\"item\":{\"id\":\"/private/SYNTHETIC_SECRET\",\"type\":\"reasoning\"}}\n{\"type\":\"SYNTHETIC_SECRET\"}\n" + success }
if mode == "malformed" { payload = "not-json\n" + success }
if mode == "tool" { payload = "{\"type\":\"item.updated\",\"item\":{\"type\":\"command_execution\"}}\n" + success }
if mode == "overflow" { payload = success + "\n{\"type\":\"turn.completed\",\"usage\":{\"input_tokens\":9223372036854775807}}" }
let data = Data(payload.utf8)
let receipt = CodexExecutionReceiptBuilder.build(stdout:data,stderr:Data(),exitStatus:0,prompt:Data("synthetic".utf8),options:TerminalRunOptions(),localExecutionID:UUID(),cliVersion:nil,startedAt:Date(),finishedAt:Date(),elapsedSeconds:0)
let encoded = String(decoding:try JSONEncoder().encode(receipt),as:UTF8.self)
print("mode=\(mode) receipt=\(receipt.terminalState) syntheticSecretPresent=\(encoded.contains("SYNTHETIC_SECRET"))")
do { _ = try Parser.parseCodex(data); print("productionParser=success") } catch { print("productionParser=failure") }
