import Foundation

enum WorkspaceRetryContextError: LocalizedError {
    case unavailable, invalid, changedSource
    var errorDescription: String? {
        switch self {
        case .unavailable:
            "The original context was not saved for this older response. Start a new request with the context you want to use. Your draft is retained."
        case .invalid:
            "The request context is invalid. No request was sent. Your draft and saved responses are retained."
        case .changedSource:
            "The source request has changed or is unavailable. Open its conversation and choose Retry again. Your draft is retained."
        }
    }
}

/// Immutable admitted context for one original direct request. A checksum detects
/// accidental history changes; it is not authority to bypass new-run admission.
struct WorkspaceRetryContext: Codable, Hashable, Sendable {
    let version: Int
    let conversationID: UUID
    let turnID: UUID
    let promptSHA256: String
    let context: ApprovedPromptContext
    let snapshotSHA256: String

    private struct Content: Encodable {
        let version: Int
        let conversationID: UUID
        let turnID: UUID
        let promptSHA256: String
        let context: ApprovedPromptContext
    }
    private var content: Content {
        .init(version: version, conversationID: conversationID, turnID: turnID,
              promptSHA256: promptSHA256, context: context)
    }
    private enum CodingKeys: String, CodingKey {
        case version, conversationID, turnID, promptSHA256, context, snapshotSHA256
    }

    init(conversationID: UUID, turnID: UUID, prompt: String, context: ApprovedPromptContext) throws {
        try Self.validateContext(context)
        version = 1
        self.conversationID = conversationID; self.turnID = turnID
        promptSHA256 = ArtifactContinuation.hash(Data(prompt.utf8))
        self.context = context
        let value = Content(version: 1, conversationID: conversationID, turnID: turnID,
                            promptSHA256: promptSHA256, context: context)
        snapshotSHA256 = ArtifactContinuation.hash(try ArtifactContinuation.encode(value))
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        version = try c.decode(Int.self, forKey: .version)
        conversationID = try c.decode(UUID.self, forKey: .conversationID)
        turnID = try c.decode(UUID.self, forKey: .turnID)
        promptSHA256 = try c.decode(String.self, forKey: .promptSHA256)
        context = try c.decode(ApprovedPromptContext.self, forKey: .context)
        snapshotSHA256 = try c.decode(String.self, forKey: .snapshotSHA256)
        try validate()
    }

    func validate() throws {
        try Self.validateContext(context)
        guard version == 1, promptSHA256.count == 64,
              promptSHA256.allSatisfy({ "0123456789abcdef".contains($0) }),
              snapshotSHA256 == ArtifactContinuation.hash(try ArtifactContinuation.encode(content)) else {
            throw WorkspaceRetryContextError.invalid
        }
    }

    func validatedContext(conversationID: UUID, turnID: UUID, prompt: String,
                          attachments: [PromptAttachment], selectedArtifact: ArtifactContinuation?) throws -> ApprovedPromptContext {
        try validate()
        guard self.conversationID == conversationID, self.turnID == turnID,
              promptSHA256 == ArtifactContinuation.hash(Data(prompt.utf8)),
              context.userSelectedDocuments == attachments,
              context.selectedArtifactReference == selectedArtifact else {
            throw WorkspaceRetryContextError.changedSource
        }
        return context
    }

    static func validateContext(_ context: ApprovedPromptContext) throws {
        // Bound metadata before the existing structural validator sums it.
        // Independently count actual text so a stale size label cannot expand
        // the approved document budget or overflow arithmetic on load.
        guard context.userSelectedDocuments.count <= 6,
              context.userSelectedDocuments.allSatisfy({ (0...20_000).contains($0.byteCount)
                  && $0.textContent.utf8.count <= 20_000 }),
              (context.approvedProjectInstructions?.utf8.count ?? 0) <= 8_000 else {
            throw WorkspaceRetryContextError.invalid
        }
        let total = context.userSelectedDocuments.reduce(0) { $0 + $1.textContent.utf8.count }
            + (context.approvedProjectInstructions?.utf8.count ?? 0)
        guard total <= 20_000, context.isStructurallyValid,
              (context.priorConversation.legacyReference?.utf8.count ?? 0) <= 12_000 else {
            throw WorkspaceRetryContextError.invalid
        }
        do { try context.selectedArtifactReference?.validate() }
        catch { throw WorkspaceRetryContextError.invalid }
    }
}
