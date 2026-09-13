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
    let idSHA256: String?
    let type: String
    let status: String?
}

struct TerminalProcessOutput: Sendable {
    let status: Int32
    let stdout: Data
    let stderr: Data
}

/// A shareable, allowlisted receipt for the documented `codex exec --json`
/// seam. It intentionally contains no prompt, answer, stdout, stderr, unknown
/// event payload, environment value, configuration value, or credential path.
struct CLIExecutionReceipt: Codable, Hashable, Sendable {
    static let currentVersion = 2
    static let parserVersion = "codex-exec-jsonl-receipt-v2"

    let version: Int
    let localExecutionID: UUID
    let providerID: String
    let transportID: String
    let promptSHA256: String
    let promptByteCount: Int
    let requestedModelSHA256: String?
    let requestedEffort: String?
    let resolvedModel: String?
    let parserVersion: String
    let cliVersion: String?
    let threadIDSHA256: String?
    let eventTypes: [String]
    let unknownEventCount: Int
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
    private static let knownItemTypes: Set<String> = ["agent_message", "reasoning"]
    private static let knownItemStatuses: Set<String> = ["started", "in_progress", "completed", "failed"]
    private static let knownEfforts: Set<String> = ["low", "medium", "high", "xhigh", "max", "ultra"]
    private static let maximumTokenCount: UInt64 = 1_000_000_000_000

    struct Validation: Sendable {
        let receipt: CLIExecutionReceipt
        let answer: String?
    }

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
        validate(
            stdout: stdout,
            stderr: stderr,
            exitStatus: exitStatus,
            prompt: prompt,
            options: options,
            localExecutionID: localExecutionID,
            cliVersion: cliVersion,
            startedAt: startedAt,
            finishedAt: finishedAt,
            elapsedSeconds: elapsedSeconds
        ).receipt
    }

    static func validate(
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
    ) -> Validation {
        var eventTypes: [String] = []
        var unknownEventCount = 0
        var items: [CLIExecutionReceiptItem] = []
        var threadIDSHA256: String?
        var inputTokens: Int?
        var cachedInputTokens: Int?
        var outputTokens: Int?
        var reasoningOutputTokens: Int?
        var answer: String?
        var completed = false
        var failed = false
        var malformed = false
        var unexpectedTool = false

        guard let stream = String(data: stdout, encoding: .utf8) else {
            return finish(
                eventTypes: [], unknownEventCount: 0, items: [], threadIDSHA256: nil,
                inputTokens: nil, cachedInputTokens: nil, outputTokens: nil, reasoningOutputTokens: nil,
                answer: nil, completed: false, failed: false, malformed: true, unexpectedTool: false,
                stdout: stdout, stderr: stderr, exitStatus: exitStatus, prompt: prompt, options: options,
                localExecutionID: localExecutionID, cliVersion: cliVersion, startedAt: startedAt,
                finishedAt: finishedAt, elapsedSeconds: elapsedSeconds
            )
        }

        for line in stream.split(whereSeparator: \.isNewline) {
            guard let bytes = String(line).data(using: .utf8),
                  let event = try? JSONSerialization.jsonObject(with: bytes) as? [String: Any],
                  let rawType = event["type"] as? String,
                  !rawType.isEmpty else {
                malformed = true
                continue
            }
            let isKnownEvent = knownEvents.contains(rawType)
            if eventTypes.count < 128 { eventTypes.append(isKnownEvent ? rawType : "unknown") }
            if !isKnownEvent {
                unknownEventCount = min(unknownEventCount + 1, 128)
            }
            switch rawType {
            case "thread.started":
                if let rawThreadID = event["thread_id"] as? String,
                   let hashed = hashOpaque(rawThreadID, limit: 2_048) {
                    threadIDSHA256 = hashed
                } else {
                    malformed = true
                }
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
            if ["item.started", "item.updated", "item.completed"].contains(rawType) {
                guard let item = event["item"] as? [String: Any],
                      let rawItemType = item["type"] as? String,
                      !rawItemType.isEmpty else {
                    malformed = true
                    continue
                }
                let itemType = knownItemTypes.contains(rawItemType) ? rawItemType : "unexpected"
                if items.count < 128 {
                    items.append(.init(
                        idSHA256: (item["id"] as? String).flatMap { hashOpaque($0, limit: 2_048) },
                        type: itemType,
                        status: canonicalStatus(item["status"] as? String)
                    ))
                }
                if !knownItemTypes.contains(rawItemType) {
                    unexpectedTool = true
                }
                if rawType == "item.completed", rawItemType == "agent_message",
                   let text = item["text"] as? String,
                   !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    answer = text.trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }
        }

        return finish(
            eventTypes: eventTypes, unknownEventCount: unknownEventCount, items: items,
            threadIDSHA256: threadIDSHA256, inputTokens: inputTokens, cachedInputTokens: cachedInputTokens,
            outputTokens: outputTokens, reasoningOutputTokens: reasoningOutputTokens, answer: answer,
            completed: completed, failed: failed, malformed: malformed, unexpectedTool: unexpectedTool,
            stdout: stdout, stderr: stderr, exitStatus: exitStatus, prompt: prompt, options: options,
            localExecutionID: localExecutionID, cliVersion: cliVersion, startedAt: startedAt,
            finishedAt: finishedAt, elapsedSeconds: elapsedSeconds
        )
    }

    private static func finish(
        eventTypes: [String], unknownEventCount: Int, items: [CLIExecutionReceiptItem],
        threadIDSHA256: String?, inputTokens: Int?, cachedInputTokens: Int?, outputTokens: Int?,
        reasoningOutputTokens: Int?, answer: String?, completed: Bool, failed: Bool,
        malformed: Bool, unexpectedTool: Bool, stdout: Data, stderr: Data, exitStatus: Int32,
        prompt: Data, options: TerminalRunOptions, localExecutionID: UUID, cliVersion: String?,
        startedAt: Date, finishedAt: Date, elapsedSeconds: Double
    ) -> Validation {
        let answerData = answer.map { Data($0.utf8) }
        let terminalState: CLIExecutionTerminalState
        if exitStatus != 0 {
            terminalState = .processFailed
        } else if malformed {
            terminalState = .malformedOutput
        } else if unexpectedTool {
            terminalState = .unexpectedToolUse
        } else if failed {
            terminalState = .providerFailed
        } else if !completed || answerData == nil {
            terminalState = .malformedOutput
        } else {
            terminalState = .completed
        }

        let receipt = CLIExecutionReceipt(
            version: CLIExecutionReceipt.currentVersion,
            localExecutionID: localExecutionID,
            providerID: TerminalProvider.codex.executionRoute.providerID,
            transportID: TerminalProvider.codex.executionRoute.transportID,
            promptSHA256: hash(prompt),
            promptByteCount: prompt.count,
            requestedModelSHA256: options.model.flatMap { hashOpaque($0, limit: 1_024) },
            requestedEffort: canonicalEffort(options.effort),
            resolvedModel: nil,
            parserVersion: CLIExecutionReceipt.parserVersion,
            cliVersion: canonicalCLIVersion(cliVersion),
            threadIDSHA256: threadIDSHA256,
            eventTypes: eventTypes,
            unknownEventCount: unknownEventCount,
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
            answerSHA256: answerData.map(hash),
            answerByteCount: answerData?.count,
            stdoutSHA256: hash(stdout),
            stderrSHA256: hash(stderr),
            diagnosticsRetained: false,
            redactionStatus: "raw_diagnostics_excluded"
        )
        return Validation(receipt: receipt, answer: terminalState == .completed ? answer : nil)
    }

    private static func token(_ value: Any?) -> Int? {
        guard let number = value as? NSNumber else { return nil }
        guard String(cString: number.objCType) != "c",
              let exact = UInt64(number.stringValue),
              exact <= maximumTokenCount,
              exact <= UInt64(Int.max) else { return nil }
        return Int(exact)
    }

    private static func hashOpaque(_ value: String, limit: Int) -> String? {
        guard !value.isEmpty, value.utf8.count <= limit else { return nil }
        return hash(Data(value.utf8))
    }

    private static func canonicalStatus(_ value: String?) -> String? {
        guard let value else { return nil }
        return knownItemStatuses.contains(value) ? value : "unknown"
    }

    private static func canonicalEffort(_ value: String?) -> String? {
        guard let value else { return nil }
        return knownEfforts.contains(value) ? value : nil
    }

    private static func canonicalCLIVersion(_ value: String?) -> String? {
        guard let value else { return nil }
        let parts = value.split(separator: " ", omittingEmptySubsequences: true)
        guard parts.count == 2, parts[0] == "codex-cli" else { return nil }
        let numbers = parts[1].split(separator: ".", omittingEmptySubsequences: false)
        guard numbers.count == 3,
              numbers.allSatisfy({ !$0.isEmpty && $0.count <= 6 && $0.allSatisfy(\.isNumber) }) else { return nil }
        return "codex-cli \(parts[1])"
    }

    private static func hash(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
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
let validation = CodexExecutionReceiptBuilder.validate(stdout:data,stderr:Data(),exitStatus:0,prompt:Data("synthetic".utf8),options:TerminalRunOptions(),localExecutionID:UUID(),cliVersion:nil,startedAt:Date(),finishedAt:Date(),elapsedSeconds:0)
let receipt = validation.receipt
let encoded = String(decoding:try JSONEncoder().encode(receipt),as:UTF8.self)
print("mode=\(mode) receipt=\(receipt.terminalState) syntheticSecretPresent=\(encoded.contains("SYNTHETIC_SECRET"))")
print("validatedAnswerPresent=\(validation.answer != nil) inputTokens=\(String(describing: receipt.inputTokens))")
