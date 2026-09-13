import Foundation
import SwiftUI

// MARK: - Open provider configuration

/// Capabilities are declared independently from a provider or transport so an
/// open-source build can describe a model without teaching Rivune about every
/// vendor in advance. A transport's capabilities are the subset the installed
/// runtime adapter actually exposes; they must not be inferred from the model.
enum AIProviderCapability: String, CaseIterable, Codable, Hashable, Sendable {
    case text
    case imageInput
    case documentInput
    case audioInput
    case audioOutput
    case streaming
    case toolUse
    case structuredOutput
}

/// Only a lookup reference is persisted in provider configuration. The secret
/// value belongs in Keychain (or another credential broker), never in Codable
/// settings, bridge messages, logs, or source control.
struct AISecretReference: Codable, Hashable, Sendable {
    enum Storage: String, Codable, Hashable, Sendable {
        case keychain
        case externalCredentialBroker
    }

    let storage: Storage
    let identifier: String
    let account: String?

    init(storage: Storage, identifier: String, account: String? = nil) {
        self.storage = storage
        self.identifier = identifier
        self.account = account
    }
}

enum AITransportKind: String, CaseIterable, Codable, Hashable, Sendable {
    case commandLine
    case api

    var title: String {
        switch self {
        case .commandLine: "CLI"
        case .api: "API"
        }
    }
}

/// `executableAdapter` means this build contains code that can execute the
/// transport. `configurationPreview` is intentionally data-only until a
/// runtime adapter with the matching identifier is implemented and registered.
enum AITransportImplementation: String, Codable, Hashable, Sendable {
    case executableAdapter
    case configurationPreview
}

enum AIAPIStyle: String, Codable, Hashable, Sendable {
    case openAIResponses
    case anthropicMessages
    case openAICompatible
    case custom
}

enum AIAPIAuthenticationScheme: String, Codable, Hashable, Sendable {
    case bearerToken
    case xAPIKey
    case customHeader
}

struct AICLITransportConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let displayName: String
    let executableName: String
    let runtimeAdapterID: String?
    let implementation: AITransportImplementation
    let providerManagedAuthentication: Bool
    let capabilities: Set<AIProviderCapability>

    init(
        id: String,
        displayName: String,
        executableName: String,
        runtimeAdapterID: String? = nil,
        implementation: AITransportImplementation = .configurationPreview,
        providerManagedAuthentication: Bool = true,
        capabilities: Set<AIProviderCapability> = [.text]
    ) {
        self.id = id
        self.displayName = displayName
        self.executableName = executableName
        self.runtimeAdapterID = runtimeAdapterID
        self.implementation = implementation
        self.providerManagedAuthentication = providerManagedAuthentication
        self.capabilities = capabilities
    }
}

struct AIAPITransportConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let displayName: String
    let baseURL: URL
    let style: AIAPIStyle
    let authenticationScheme: AIAPIAuthenticationScheme
    let credential: AISecretReference
    let runtimeAdapterID: String?
    let implementation: AITransportImplementation
    let capabilities: Set<AIProviderCapability>

    init(
        id: String,
        displayName: String,
        baseURL: URL,
        style: AIAPIStyle,
        authenticationScheme: AIAPIAuthenticationScheme,
        credential: AISecretReference,
        runtimeAdapterID: String? = nil,
        implementation: AITransportImplementation = .configurationPreview,
        capabilities: Set<AIProviderCapability> = [.text]
    ) {
        self.id = id
        self.displayName = displayName
        self.baseURL = baseURL
        self.style = style
        self.authenticationScheme = authenticationScheme
        self.credential = credential
        self.runtimeAdapterID = runtimeAdapterID
        self.implementation = implementation
        self.capabilities = capabilities
    }
}

enum AITransportConfiguration: Identifiable, Codable, Hashable, Sendable {
    case commandLine(AICLITransportConfiguration)
    case api(AIAPITransportConfiguration)

    var id: String {
        switch self {
        case .commandLine(let configuration): configuration.id
        case .api(let configuration): configuration.id
        }
    }

    var displayName: String {
        switch self {
        case .commandLine(let configuration): configuration.displayName
        case .api(let configuration): configuration.displayName
        }
    }

    var kind: AITransportKind {
        switch self {
        case .commandLine: .commandLine
        case .api: .api
        }
    }

    var implementation: AITransportImplementation {
        switch self {
        case .commandLine(let configuration): configuration.implementation
        case .api(let configuration): configuration.implementation
        }
    }

    var runtimeAdapterID: String? {
        switch self {
        case .commandLine(let configuration): configuration.runtimeAdapterID
        case .api(let configuration): configuration.runtimeAdapterID
        }
    }

    var capabilities: Set<AIProviderCapability> {
        switch self {
        case .commandLine(let configuration): configuration.capabilities
        case .api(let configuration): configuration.capabilities
        }
    }
}

/// Effort values remain strings at the provider boundary so a custom adapter
/// can add a vendor-specific level without requiring an Rivune app release.
struct AIEffortConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let displayName: String
    let transportValue: String?

    init(id: String, displayName: String, transportValue: String?) {
        self.id = id
        self.displayName = displayName
        self.transportValue = transportValue
    }

    static let automatic = Self(id: "automatic", displayName: "Provider default", transportValue: nil)
    static let none = Self(id: "none", displayName: "None", transportValue: "none")
    static let low = Self(id: "low", displayName: "Low", transportValue: "low")
    static let medium = Self(id: "medium", displayName: "Medium", transportValue: "medium")
    static let high = Self(id: "high", displayName: "High", transportValue: "high")
    static let extraHigh = Self(id: "xhigh", displayName: "Extra High", transportValue: "xhigh")
    static let maximum = Self(id: "max", displayName: "Max", transportValue: "max")
    static let ultra = Self(id: "ultra", displayName: "Ultra", transportValue: "ultra")
}

struct AIModelConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let displayName: String
    let capabilities: Set<AIProviderCapability>
    let efforts: [AIEffortConfiguration]
    let recommendedEffortID: String?

    init(
        id: String,
        displayName: String,
        capabilities: Set<AIProviderCapability>,
        efforts: [AIEffortConfiguration] = [.automatic],
        recommendedEffortID: String? = AIEffortConfiguration.automatic.id
    ) {
        self.id = id
        self.displayName = displayName
        self.capabilities = capabilities
        self.efforts = efforts
        self.recommendedEffortID = recommendedEffortID
    }
}

struct AIProviderConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let displayName: String
    let transports: [AITransportConfiguration]
    let models: [AIModelConfiguration]
    let recommendedModelID: String?

    init(
        id: String,
        displayName: String,
        transports: [AITransportConfiguration],
        models: [AIModelConfiguration],
        recommendedModelID: String? = nil
    ) {
        self.id = id
        self.displayName = displayName
        self.transports = transports
        self.models = models
        self.recommendedModelID = recommendedModelID
    }
}

enum AIParticipantRoleKind: String, CaseIterable, Codable, Hashable, Sendable {
    case contributor
    case critic
    case synthesizer
    case verifier
    case coordinator
    case custom
}

struct AIParticipantRoleConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let displayName: String
    let kind: AIParticipantRoleKind
    let instruction: String?

    init(
        id: String,
        displayName: String,
        kind: AIParticipantRoleKind,
        instruction: String? = nil
    ) {
        self.id = id
        self.displayName = displayName
        self.kind = kind
        self.instruction = instruction
    }

    static let contributor = Self(id: "contributor", displayName: "Contributor", kind: .contributor)
    static let critic = Self(id: "critic", displayName: "Critic", kind: .critic)
    static let synthesizer = Self(id: "synthesizer", displayName: "Synthesizer", kind: .synthesizer)
    static let verifier = Self(id: "verifier", displayName: "Verifier", kind: .verifier)
    static let coordinator = Self(id: "coordinator", displayName: "Coordinator", kind: .coordinator)
}

/// A council is deliberately an array rather than a ChatGPT/Claude pair. The
/// current engine still consumes only its legacy two-provider request fields;
/// this record is the forward-compatible handoff for a future adapter registry.
struct AIParticipantConfiguration: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    var displayName: String
    var providerID: String
    var transportID: String
    var modelID: String?
    var effortID: String?
    var roles: [AIParticipantRoleConfiguration]
    var isEnabled: Bool

    init(
        id: UUID = UUID(),
        displayName: String,
        providerID: String,
        transportID: String,
        modelID: String? = nil,
        effortID: String? = nil,
        roles: [AIParticipantRoleConfiguration] = [.contributor],
        isEnabled: Bool = true
    ) {
        self.id = id
        self.displayName = displayName
        self.providerID = providerID
        self.transportID = transportID
        self.modelID = modelID
        self.effortID = effortID
        self.roles = roles
        self.isEnabled = isEnabled
    }
}

struct AICouncilConfiguration: Identifiable, Codable, Hashable, Sendable {
    static let currentSchemaVersion = 1

    let id: UUID
    var name: String
    var participants: [AIParticipantConfiguration]
    let schemaVersion: Int

    init(
        id: UUID = UUID(),
        name: String,
        participants: [AIParticipantConfiguration],
        schemaVersion: Int = Self.currentSchemaVersion
    ) {
        self.id = id
        self.name = name
        self.participants = participants
        self.schemaVersion = schemaVersion
    }

    var enabledParticipants: [AIParticipantConfiguration] {
        participants.filter(\.isEnabled)
    }
}

struct AIProviderCatalog: Codable, Hashable, Sendable {
    static let currentSchemaVersion = 1

    let schemaVersion: Int
    var providers: [AIProviderConfiguration]

    init(
        schemaVersion: Int = Self.currentSchemaVersion,
        providers: [AIProviderConfiguration]
    ) {
        self.schemaVersion = schemaVersion
        self.providers = providers
    }

    func provider(id: String) -> AIProviderConfiguration? {
        providers.first { $0.id == id }
    }

    /// These defaults mirror this build's current curated provider choices.
    /// They are configuration records, not proof of account access. Only the
    /// CLI and API transports marked executable have compiled runtime code;
    /// account readiness is checked separately.
    static let currentDefaults = Self(providers: [.openAIDefault, .anthropicDefault])

    static let currentCLICompatibleCouncil = AICouncilConfiguration(
        name: "Rivune mode",
        participants: [
            AIParticipantConfiguration(
                displayName: "ChatGPT",
                providerID: AIProviderConfiguration.openAIDefault.id,
                transportID: "openai.codex-cli",
                roles: [.contributor, .critic, .synthesizer]
            ),
            AIParticipantConfiguration(
                displayName: "Claude",
                providerID: AIProviderConfiguration.anthropicDefault.id,
                transportID: "anthropic.claude-code-cli",
                roles: [.contributor, .critic]
            )
        ]
    )
}

extension AIProviderConfiguration {
    static let openAIDefault = Self(
        id: "openai",
        displayName: "OpenAI",
        transports: [
            .commandLine(AICLITransportConfiguration(
                id: "openai.codex-cli",
                displayName: "Codex CLI",
                executableName: "codex",
                runtimeAdapterID: "alloy.terminal.codex",
                implementation: .executableAdapter,
                capabilities: [.text, .documentInput]
            )),
            .api(AIAPITransportConfiguration(
                id: "openai.responses-api",
                displayName: "Responses API",
                baseURL: URL(string: "https://api.openai.com/v1")!,
                style: .openAIResponses,
                authenticationScheme: .bearerToken,
                credential: AISecretReference(
                    storage: .keychain,
                    identifier: "alloy.provider.openai.api"
                ),
                runtimeAdapterID: "rivune.api.openai.responses",
                implementation: .executableAdapter,
                capabilities: [.text]
            ))
        ],
        models: [
            AIModelConfiguration(
                id: "gpt-5.6-sol",
                displayName: "GPT-5.6 Sol",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse, .structuredOutput],
                efforts: [.automatic, .low, .medium, .high, .extraHigh, .maximum, .ultra],
                recommendedEffortID: AIEffortConfiguration.medium.id
            ),
            AIModelConfiguration(
                id: "gpt-5.6-terra",
                displayName: "GPT-5.6 Terra",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse, .structuredOutput],
                efforts: [.automatic, .low, .medium, .high, .extraHigh, .maximum, .ultra],
                recommendedEffortID: AIEffortConfiguration.medium.id
            ),
            AIModelConfiguration(
                id: "gpt-5.6-luna",
                displayName: "GPT-5.6 Luna",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse, .structuredOutput],
                efforts: [.automatic, .low, .medium, .high, .extraHigh, .maximum],
                recommendedEffortID: AIEffortConfiguration.medium.id
            )
        ],
        recommendedModelID: "gpt-5.6-sol"
    )

    static let anthropicDefault = Self(
        id: "anthropic",
        displayName: "Anthropic",
        transports: [
            .commandLine(AICLITransportConfiguration(
                id: "anthropic.claude-code-cli",
                displayName: "Claude Code CLI",
                executableName: "claude",
                runtimeAdapterID: "alloy.terminal.claude",
                implementation: .executableAdapter,
                capabilities: [.text, .documentInput]
            )),
            .api(AIAPITransportConfiguration(
                id: "anthropic.messages-api",
                displayName: "Messages API",
                baseURL: URL(string: "https://api.anthropic.com")!,
                style: .anthropicMessages,
                authenticationScheme: .xAPIKey,
                credential: AISecretReference(
                    storage: .keychain,
                    identifier: "alloy.provider.anthropic.api"
                ),
                runtimeAdapterID: "rivune.api.anthropic.messages",
                implementation: .executableAdapter,
                capabilities: [.text]
            ))
        ],
        models: [
            AIModelConfiguration(
                id: "claude-fable-5",
                displayName: "Claude Fable 5",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse, .structuredOutput],
                efforts: [.automatic, .low, .medium, .high, .extraHigh, .maximum],
                recommendedEffortID: AIEffortConfiguration.high.id
            ),
            AIModelConfiguration(
                id: "claude-opus-5",
                displayName: "Claude Opus 5",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse, .structuredOutput],
                efforts: [.automatic, .low, .medium, .high, .extraHigh, .maximum],
                recommendedEffortID: AIEffortConfiguration.high.id
            ),
            AIModelConfiguration(
                id: "claude-sonnet-5",
                displayName: "Claude Sonnet 5",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse, .structuredOutput],
                efforts: [.automatic, .low, .medium, .high, .extraHigh, .maximum],
                recommendedEffortID: AIEffortConfiguration.high.id
            ),
            AIModelConfiguration(
                id: "claude-haiku-4-5-20251001",
                displayName: "Claude Haiku 4.5",
                capabilities: [.text, .imageInput, .documentInput, .streaming, .toolUse],
                efforts: [.automatic]
            )
        ],
        recommendedModelID: "claude-opus-5"
    )
}

enum IntelligenceMode: String, CaseIterable, Identifiable, Codable, Sendable {
    // Rivune is intentionally first so every system-provided picker treats the
    // collaborative workspace as the primary choice. The raw value remains
    // "Together" for saved-history and bridge compatibility.
    case together = "Together"
    case chatGPT = "ChatGPT"
    case claude = "Claude"

    var id: String { rawValue }

    /// Keep the legacy raw value for saved-history and bridge compatibility,
    /// while presenting the coordinated experience as the product's namesake.
    var displayName: String {
        switch self {
        case .together: "Rivune"
        default: rawValue
        }
    }

    var symbol: String {
        return switch self {
        case .chatGPT: "terminal"
        case .together: "arrow.triangle.merge"
        case .claude: "text.bubble"
        }
    }

    var accent: Color {
        switch self {
        case .chatGPT: RivunePalette.openAI
        case .together: RivunePalette.rivune
        case .claude: RivunePalette.claude
        }
    }

    var shortDescription: String {
        switch self {
        case .chatGPT: "Ask ChatGPT directly"
        case .together: "Connected models review one result"
        case .claude: "Ask Claude directly"
        }
    }
}

/// A user-facing destination in the provider switcher. Availability comes
/// from executable catalog transports. Multiple transports for one provider
/// share a destination; connection readiness selects the actual route.
struct IntelligenceModeSelectionOption: Identifiable, Hashable, Sendable {
    let mode: IntelligenceMode
    let title: String
    let detail: String
    let symbol: String

    var id: IntelligenceMode { mode }

    static func available(
        in catalog: AIProviderCatalog = .currentDefaults
    ) -> [Self] {
        var options = [Self(
            mode: .together,
            title: "Rivune",
            detail: "Models collaborate by default",
            symbol: IntelligenceMode.together.symbol
        )]
        var includedModes: Set<IntelligenceMode> = [.together]

        for provider in catalog.providers {
            for transport in provider.transports where transport.implementation == .executableAdapter {
                guard transport.runtimeAdapterID != nil,
                      let mode = directMode(providerID: provider.id, transportID: transport.id),
                      includedModes.insert(mode).inserted else {
                    continue
                }

                options.append(Self(
                    mode: mode,
                    title: directTitle(for: mode),
                    detail: "\(provider.displayName) · \(transport.displayName)",
                    symbol: mode.symbol
                ))
            }
        }

        return options
    }

    private static func directMode(
        providerID: String,
        transportID: String
    ) -> IntelligenceMode? {
        switch (providerID, transportID) {
        case (AIProviderConfiguration.openAIDefault.id, "openai.codex-cli"),
             (AIProviderConfiguration.openAIDefault.id, "openai.responses-api"):
            .chatGPT
        case (AIProviderConfiguration.anthropicDefault.id, "anthropic.claude-code-cli"),
             (AIProviderConfiguration.anthropicDefault.id, "anthropic.messages-api"):
            .claude
        default:
            nil
        }
    }

    private static func directTitle(for mode: IntelligenceMode) -> String {
        switch mode {
        case .together: "Rivune"
        case .chatGPT: "ChatGPT"
        case .claude: "Claude"
        }
    }
}

/// String coding preserves existing history while allowing models discovered
/// from the installed CLI to appear without shipping a new enum case.
struct CodexModelChoice: RawRepresentable, CaseIterable, Identifiable, Codable, Hashable, Sendable {
    let rawValue: String
    init?(rawValue: String) {
        guard !rawValue.isEmpty, rawValue.utf8.count <= 160,
              rawValue.first?.isLetter == true,
              rawValue.unicodeScalars.allSatisfy({ CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.:").contains($0) }) else { return nil }
        self.rawValue = rawValue
    }
    static let accountDefault = Self(rawValue: "default")!
    static let gpt56Sol = Self(rawValue: "gpt-5.6-sol")!
    static let gpt56Terra = Self(rawValue: "gpt-5.6-terra")!
    static let gpt56Luna = Self(rawValue: "gpt-5.6-luna")!
    static let gpt55 = Self(rawValue: "gpt-5.5")!
    static let gpt54 = Self(rawValue: "gpt-5.4")!
    static let allCases: [Self] = [.accountDefault, .gpt56Sol, .gpt56Terra, .gpt56Luna, .gpt55, .gpt54]
    var id: String { rawValue }
    var title: String {
        switch self {
        case .accountDefault: "Account default"
        case .gpt56Sol: "GPT-5.6 Sol"
        case .gpt56Terra: "GPT-5.6 Terra"
        case .gpt56Luna: "GPT-5.6 Luna"
        case .gpt55: "GPT-5.5"
        case .gpt54: "GPT-5.4"
        default: rawValue
        }
    }
    var cliValue: String? { self == .accountDefault ? nil : rawValue }
    var compactTitle: String {
        switch self {
        case .accountDefault: "Default"
        case .gpt56Sol: "Sol"
        case .gpt56Terra: "Terra"
        case .gpt56Luna: "Luna"
        default: title
        }
    }
    var supportedEfforts: [CodexReasoningEffort] {
        switch self {
        case .gpt56Sol, .gpt56Terra: CodexReasoningEffort.allCases
        case .gpt56Luna: CodexReasoningEffort.allCases.filter { $0 != .ultra }
        case .gpt55, .gpt54, .accountDefault: CodexReasoningEffort.allCases.filter { ![.max, .ultra].contains($0) }
        default: CodexReasoningEffort.allCases
        }
    }
    init(from decoder: any Decoder) throws {
        let container = try decoder.singleValueContainer()
        let value = try container.decode(String.self)
        guard let model = Self(rawValue: value) else { throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid model identifier") }
        self = model
    }
    func encode(to encoder: any Encoder) throws { var container = encoder.singleValueContainer(); try container.encode(rawValue) }
}

enum ClaudeModelChoice: String, CaseIterable, Identifiable, Codable, Sendable {
    case accountDefault = "default"
    case best
    case fable
    case opus
    case sonnet
    case haiku

    var id: String { rawValue }

    var title: String {
        switch self {
        case .accountDefault: "Account default"
        case .best: "Best available"
        case .fable: "Fable"
        case .opus: "Opus"
        case .sonnet: "Sonnet"
        case .haiku: "Haiku"
        }
    }

    var cliValue: String? { self == .accountDefault ? nil : rawValue }

    var compactTitle: String {
        switch self {
        case .accountDefault: "Default"
        case .best: "Best"
        case .fable: "Fable"
        case .opus: "Opus"
        case .sonnet: "Sonnet"
        case .haiku: "Haiku"
        }
    }

    var supportedEfforts: [ClaudeReasoningEffort] {
        switch self {
        case .haiku:
            [.automatic]
        default:
            ClaudeReasoningEffort.allCases
        }
    }
}

enum CodexReasoningEffort: String, CaseIterable, Identifiable, Codable, Sendable {
    case automatic
    case low
    case medium
    case high
    case xhigh
    case max
    case ultra

    var id: String { rawValue }

    var title: String {
        switch self {
        case .automatic: "Automatic"
        case .low: "Low"
        case .medium: "Medium"
        case .high: "High"
        case .xhigh: "Extra High"
        case .max: "Max"
        case .ultra: "Ultra"
        }
    }

    var cliValue: String? { self == .automatic ? nil : rawValue }

    var compactTitle: String {
        switch self {
        case .automatic: "Auto"
        case .xhigh: "X-High"
        default: title
        }
    }
}

enum ClaudeReasoningEffort: String, CaseIterable, Identifiable, Codable, Sendable {
    case automatic
    case low
    case medium
    case high
    case xhigh
    case max

    var id: String { rawValue }

    var title: String {
        switch self {
        case .automatic: "Automatic"
        case .low: "Low"
        case .medium: "Medium"
        case .high: "High"
        case .xhigh: "Extra High"
        case .max: "Max"
        }
    }

    var cliValue: String? { self == .automatic ? nil : rawValue }

    var compactTitle: String {
        switch self {
        case .automatic: "Auto"
        case .xhigh: "X-High"
        default: title
        }
    }
}

enum AnswerSource: String, Codable, Hashable, Sendable {
    case chatGPT = "ChatGPT"
    case claude = "Claude"
    /// Retains the legacy serialized value so existing conversation history and
    /// bridge payloads continue to decode after the product rename.
    case alloy = "Alloy"

    var symbol: String {
        switch self {
        case .chatGPT: "terminal"
        case .claude: "text.bubble"
        case .alloy: "arrow.triangle.merge"
        }
    }

    var eyebrow: String {
        switch self {
        case .chatGPT: "CODEX RESPONSE"
        case .claude: "CLAUDE RESPONSE"
        case .alloy: "COMBINED ANSWER"
        }
    }

    var accent: Color {
        switch self {
        case .chatGPT: RivunePalette.openAI
        case .claude: RivunePalette.claude
        case .alloy: RivunePalette.rivune
        }
    }
}

struct AIAnswer: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let source: AnswerSource
    let content: String
    let responseTime: Double
    let provenance: String?

    init(
        id: UUID = UUID(),
        source: AnswerSource,
        content: String,
        responseTime: Double,
        provenance: String? = nil
    ) {
        self.id = id
        self.source = source
        self.content = content
        self.responseTime = responseTime
        self.provenance = provenance
    }
}

struct PromptAttachment: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let name: String
    let textContent: String
    let byteCount: Int

    init(
        id: UUID = UUID(),
        name: String,
        textContent: String,
        byteCount: Int
    ) {
        self.id = id
        self.name = name
        self.textContent = textContent
        self.byteCount = byteCount
    }

    var sizeLabel: String {
        ByteCountFormatter.string(fromByteCount: Int64(byteCount), countStyle: .file)
    }
}

enum TurnExecutionState: String, Codable, Hashable, Sendable {
    case pending
    case complete
    case failed
    case cancelled
    case interrupted

    var councilStage: CouncilStage {
        switch self {
        case .pending:
            .asking
        case .complete:
            .complete
        case .failed, .interrupted:
            .failed
        case .cancelled:
            .cancelled
        }
    }
}

enum TogetherPhase: String, Codable, Hashable, Sendable {
    case planning
    case contributing
    case reviewing
    case integrating
    case complete
    case failed
    case cancelled

    var title: String {
        switch self {
        case .planning: "Creating and challenging the work plan"
        case .contributing: "Working on assigned responsibilities"
        case .reviewing: "Challenging gaps and conflicts"
        case .integrating: "Resolving the final deliverable"
        case .complete: "Collaboration complete"
        case .failed: "Collaboration needs attention"
        case .cancelled: "Collaboration stopped"
        }
    }

    var symbol: String {
        switch self {
        case .planning: "list.bullet.clipboard"
        case .contributing: "person.2.fill"
        case .reviewing: "arrow.left.arrow.right"
        case .integrating: "square.stack.3d.up.fill"
        case .complete: "checkmark.circle.fill"
        case .failed: "exclamationmark.circle.fill"
        case .cancelled: "stop.circle.fill"
        }
    }
}

/// The collaboration pattern Rivune selects before either provider begins
/// substantive work. Raw values are intentionally stable because the chosen
/// shape is persisted in conversation history and may cross the Mac/iPhone
/// bridge.
enum TogetherCollaborationShape: String, Codable, Hashable, Sendable {
    case directResponse
    case complementaryWorkstreams
    case evidenceAndVerification
    case comparisonAndDecision
    case solutionAndChallenge

    var title: String {
        switch self {
        case .directResponse: "Direct response"
        case .complementaryWorkstreams: "Complementary workstreams"
        case .evidenceAndVerification: "Research and verification"
        case .comparisonAndDecision: "Comparison and decision"
        case .solutionAndChallenge: "Solution and challenge"
        }
    }

    var planningGuidance: String {
        switch self {
        case .directResponse:
            "Answer naturally and concisely; a task split is unnecessary."
        case .complementaryWorkstreams:
            "Divide the requested deliverable into compatible parts that can be assembled into one finished result. Give each provider real production work and make every dependency explicit."
        case .evidenceAndVerification:
            "Give one provider the primary investigation or explanation and the other independent verification, counterevidence, boundary checks, and missing-context analysis."
        case .comparisonAndDecision:
            "Treat any current proposal as the incumbent. Separate decision criteria and option analysis from adversarial tradeoff testing, then require a clear resolved recommendation tied to the user's priorities. A valid outcome may be that no alternative beats the incumbent."
        case .solutionAndChallenge:
            "Give one provider the primary solution and the other a genuinely independent derivation, edge-case challenge, assumption check, and correction path. Do not force a different answer when the original survives the challenge."
        }
    }
}

struct TogetherTrace: Codable, Hashable, Sendable {
    var phase: TogetherPhase
    var collaborationShape: TogetherCollaborationShape?
    var sharedPlan: String?
    var chatGPTReview: String?
    var claudeReview: String?
    var failedPhase: TogetherPhase?
    var stoppedPhase: TogetherPhase?

    init(
        phase: TogetherPhase,
        collaborationShape: TogetherCollaborationShape? = nil,
        sharedPlan: String? = nil,
        chatGPTReview: String? = nil,
        claudeReview: String? = nil,
        failedPhase: TogetherPhase? = nil,
        stoppedPhase: TogetherPhase? = nil
    ) {
        self.phase = phase
        self.collaborationShape = collaborationShape
        self.sharedPlan = sharedPlan
        self.chatGPTReview = chatGPTReview
        self.claudeReview = claudeReview
        self.failedPhase = failedPhase
        self.stoppedPhase = stoppedPhase
    }
}

struct ChatTurn: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    let prompt: String
    let mode: IntelligenceMode
    let createdAt: Date
    var chatGPTAnswer: AIAnswer?
    var claudeAnswer: AIAnswer?
    var combinedAnswer: AIAnswer?
    var chatGPTError: String?
    var claudeError: String?
    var combinedError: String?
    var attachments: [PromptAttachment]
    // Optional so older history and older bridge peers can ignore the richer
    // coordinated-Together trace without losing the turn.
    var togetherTrace: TogetherTrace?
    // Optional so history written before execution states were introduced
    // continues to decode. RivuneHistoryStorage normalizes legacy values.
    var executionState: TurnExecutionState?

    init(
        id: UUID = UUID(),
        prompt: String,
        mode: IntelligenceMode,
        createdAt: Date = .now,
        chatGPTAnswer: AIAnswer? = nil,
        claudeAnswer: AIAnswer? = nil,
        combinedAnswer: AIAnswer? = nil,
        chatGPTError: String? = nil,
        claudeError: String? = nil,
        combinedError: String? = nil,
        attachments: [PromptAttachment] = [],
        togetherTrace: TogetherTrace? = nil,
        executionState: TurnExecutionState? = .pending
    ) {
        self.id = id
        self.prompt = prompt
        self.mode = mode
        self.createdAt = createdAt
        self.chatGPTAnswer = chatGPTAnswer
        self.claudeAnswer = claudeAnswer
        self.combinedAnswer = combinedAnswer
        self.chatGPTError = chatGPTError
        self.claudeError = claudeError
        self.combinedError = combinedError
        self.attachments = attachments
        self.togetherTrace = togetherTrace
        self.executionState = executionState
    }
}

struct Conversation: Identifiable, Codable, Hashable, Sendable {
    let id: UUID
    var title: String
    var preview: String
    var updatedAt: Date
    var mode: IntelligenceMode
    var isFavorite: Bool
    var isArchived: Bool
    var projectID: UUID?
    var turns: [ChatTurn]

    init(
        id: UUID = UUID(),
        title: String,
        preview: String,
        updatedAt: Date,
        mode: IntelligenceMode,
        isFavorite: Bool = false,
        isArchived: Bool = false,
        turns: [ChatTurn] = [],
        projectID: UUID? = nil
    ) {
        self.id = id
        self.title = title
        self.preview = preview
        self.updatedAt = updatedAt
        self.mode = mode
        self.isFavorite = isFavorite
        self.isArchived = isArchived
        self.turns = turns
        self.projectID = projectID
    }
}

enum CouncilStage: Equatable, Codable, Sendable {
    case idle
    case asking
    case comparing
    case synthesizing
    case complete
    case failed
    case cancelled

    var title: String {
        switch self {
        case .idle: "Ready"
        case .asking: "Coordinating both intelligences"
        case .comparing: "Debating the combined work"
        case .synthesizing: "Integrating the final answer"
        case .complete: "Resolved"
        case .failed: "Needs attention"
        case .cancelled: "Stopped"
        }
    }

    var symbol: String {
        switch self {
        case .idle: "circle"
        case .asking: "arrow.trianglehead.2.clockwise.rotate.90"
        case .comparing: "arrow.left.arrow.right"
        case .synthesizing: "wand.and.stars"
        case .complete: "checkmark.circle.fill"
        case .failed: "exclamationmark.circle.fill"
        case .cancelled: "stop.circle.fill"
        }
    }
}

struct BridgePeer: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
}

enum BridgeLinkState: Equatable, Sendable {
    case off
    case searching
    case connecting(String)
    case connected(String)

    var label: String {
        switch self {
        case .off:
            "Off"
        case .searching:
            "Looking for Mac"
        case .connecting(let name):
            "Connecting to \(name)"
        case .connected(let name):
            "Connected to \(name)"
        }
    }

    var isConnected: Bool {
        if case .connected = self { return true }
        return false
    }

    var connectedPeerName: String? {
        guard case .connected(let name) = self else { return nil }
        return name
    }
}

struct BridgeReadiness: Codable, Sendable {
    let codex: ProviderReadiness
    let claude: ProviderReadiness
    let togetherWorkflowVersion: Int?

    init(
        codex: ProviderReadiness,
        claude: ProviderReadiness,
        togetherWorkflowVersion: Int? = BridgePromptRequest.currentTogetherWorkflowVersion
    ) {
        self.codex = codex
        self.claude = claude
        self.togetherWorkflowVersion = togetherWorkflowVersion
    }
}

struct BridgePromptRequest: Codable, Sendable {
    static let currentTogetherWorkflowVersion = 2

    let id: UUID
    let turnID: UUID
    let prompt: String
    let mode: IntelligenceMode
    let attachments: [PromptAttachment]
    let priorContext: String
    let codexModel: CodexModelChoice
    let claudeModel: ClaudeModelChoice
    let codexEffort: CodexReasoningEffort
    let claudeEffort: ClaudeReasoningEffort
    let togetherWorkflowVersion: Int?
    // Optional for wire compatibility. The current engine continues to execute
    // the legacy Codex/Claude fields until the adapter registry is connected.
    let providerPlan: AICouncilConfiguration?

    init(
        id: UUID,
        turnID: UUID,
        prompt: String,
        mode: IntelligenceMode,
        attachments: [PromptAttachment],
        priorContext: String,
        codexModel: CodexModelChoice,
        claudeModel: ClaudeModelChoice,
        codexEffort: CodexReasoningEffort,
        claudeEffort: ClaudeReasoningEffort,
        togetherWorkflowVersion: Int? = Self.currentTogetherWorkflowVersion,
        providerPlan: AICouncilConfiguration? = nil
    ) {
        self.id = id
        self.turnID = turnID
        self.prompt = prompt
        self.mode = mode
        self.attachments = attachments
        self.priorContext = priorContext
        self.codexModel = codexModel
        self.claudeModel = claudeModel
        self.codexEffort = codexEffort
        self.claudeEffort = claudeEffort
        self.togetherWorkflowVersion = togetherWorkflowVersion
        self.providerPlan = providerPlan
    }
}

struct BridgePromptUpdate: Codable, Sendable {
    let requestID: UUID
    let stage: CouncilStage
    let turn: ChatTurn
    let isComplete: Bool
}

struct BridgeReconnectCredential: Codable, Sendable {
    let serviceID: String
    let identity: Data
    let secret: Data
}

enum BridgeMessageKind: String, Codable, Sendable {
    case pairingCredential
    case pairingAccepted
    case readinessRequest
    case readiness
    case promptRequest
    case promptUpdate
    case cancel
}

struct BridgeEnvelope: Codable, Sendable {
    static let currentProtocolVersion = 1

    let protocolVersion: Int
    let kind: BridgeMessageKind
    let readiness: BridgeReadiness?
    let request: BridgePromptRequest?
    let update: BridgePromptUpdate?
    let cancellationID: UUID?
    let pairingCredential: BridgeReconnectCredential?

    private init(
        kind: BridgeMessageKind,
        readiness: BridgeReadiness? = nil,
        request: BridgePromptRequest? = nil,
        update: BridgePromptUpdate? = nil,
        cancellationID: UUID? = nil,
        pairingCredential: BridgeReconnectCredential? = nil
    ) {
        protocolVersion = Self.currentProtocolVersion
        self.kind = kind
        self.readiness = readiness
        self.request = request
        self.update = update
        self.cancellationID = cancellationID
        self.pairingCredential = pairingCredential
    }

    static func readinessRequest() -> Self {
        Self(kind: .readinessRequest)
    }

    static func readiness(_ value: BridgeReadiness) -> Self {
        Self(kind: .readiness, readiness: value)
    }

    static func request(_ value: BridgePromptRequest) -> Self {
        Self(kind: .promptRequest, request: value)
    }

    static func update(_ value: BridgePromptUpdate) -> Self {
        Self(kind: .promptUpdate, update: value)
    }

    static func cancel(_ requestID: UUID) -> Self {
        Self(kind: .cancel, cancellationID: requestID)
    }

    static func pairingCredential(_ value: BridgeReconnectCredential) -> Self {
        Self(kind: .pairingCredential, pairingCredential: value)
    }

    static func pairingAccepted() -> Self {
        Self(kind: .pairingAccepted)
    }
}

extension CouncilStage {
    func title(for mode: IntelligenceMode) -> String {
        guard mode != .together else { return title }

        return switch self {
        case .idle: "Ready"
        case .asking, .comparing, .synthesizing: "Asking \(mode.displayName)"
        case .complete: "Complete"
        case .failed: "Needs attention"
        case .cancelled: "Stopped"
        }
    }
}

enum SidebarDestination: String, CaseIterable, Identifiable {
    case chats = "Chats"
    case starred = "Starred"
    case archive = "Archive"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .chats: "bubble.left.and.bubble.right"
        case .starred: "star"
        case .archive: "archivebox"
        }
    }
}
