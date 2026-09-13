import Foundation
// Recording-only dependency doubles. CouncilRunner.swift is an exact source copy.
struct AIExecutionRoute: Hashable, Sendable {
 let providerID: String; let transportID: String; let runtimeAdapterID: String
 static let codexCLI = Self(providerID: "openai", transportID: "openai.codex-cli", runtimeAdapterID: "alloy.terminal.codex")
 static let claudeCodeCLI = Self(providerID: "anthropic", transportID: "anthropic.claude-code-cli", runtimeAdapterID: "alloy.terminal.claude")
}
struct TerminalRunOptions: Codable, Hashable, Sendable {
 var model: String?; var effort: String?
 static let accountDefault = TerminalRunOptions(model:nil, effort:nil)
}
struct TerminalRunResult: Sendable { let text:String; let elapsedSeconds:Double }
protocol AITextRunning: Sendable { func run(_ route:AIExecutionRoute,prompt:String,options:TerminalRunOptions) async throws -> TerminalRunResult }
enum TerminalEngineError: Error { case fixture; var userMessage:String { "fixture failure" } }
