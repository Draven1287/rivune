import Foundation
// Exact extracted production methods; storage and execution are inert test doubles.
enum IntelligenceMode: String { case chatGPT, claude, council }
enum Stage { case idle }
struct ExecutionState { var councilStage: Stage = .idle }
struct Turn { var executionState: ExecutionState? = nil }
struct Conversation { var id: UUID; var mode: IntelligenceMode; var turns: [Turn] = [] }
struct ActiveRun { var id = UUID(); var stage: Stage = .idle }
struct Coordinator { func activeRun(in: UUID) -> ActiveRun? { nil } }
final class DraftHarness {
 var mode: IntelligenceMode = .chatGPT
 var selectedConversationID: UUID?
 var newConversationFocusRequest: UUID?
 var includeProjectContext = false
 var restoringDraft = false
 var isGenerating = false
 var activeRequestID: UUID?
 var composerText = ""
 var draftAttachments: [String] = []
 var draftArtifact: String?
 var turns: [Turn] = []
 var conversations: [Conversation] = []
 var councilStage: Stage = .idle
 var runCoordinator = Coordinator()
 struct ComposerDraft { var text: String; var attachments: [String]; var selectedArtifact: String? }
 var conversationDrafts: [String:ComposerDraft] = [:]
 func persistWorkspaceDraft() {} // No filesystem writes by the extracted methods.
 static func completionStage(for: Turn) -> Stage { .idle }
func selectConversation(_ id: UUID?) {
        guard id != selectedConversationID else { return }
        if id != nil { newConversationFocusRequest = nil }
        includeProjectContext = false
        let wasRestoring = restoringDraft
        if !wasRestoring { saveDraft() }
        restoringDraft = true
        defer { restoringDraft = wasRestoring; persistWorkspaceDraft() }
        #if os(iOS)
        cancelGeneration()
        #endif
        isGenerating = false
        activeRequestID = nil
        draftAttachments = []
        selectedConversationID = id
        restoreDraft()
        guard let id, let conversation = conversations.first(where: { $0.id == id }) else {
            turns = []
            return
        }
        mode = conversation.mode
        turns = conversation.turns
        councilStage = conversation.turns.last?.executionState?.councilStage
            ?? conversation.turns.last.map(Self.completionStage(for:))
            ?? .idle
        #if os(macOS)
        if let run = runCoordinator.activeRun(in: id) {
            isGenerating = true
            activeRequestID = run.id
            councilStage = run.stage
        }
        #endif
    }
private func saveDraft() {
        conversationDrafts[selectedConversationID?.uuidString ?? "new"] = ComposerDraft(text: composerText, attachments: draftAttachments, selectedArtifact: draftArtifact)
    }
private func restoreDraft() {
        let draft = conversationDrafts[selectedConversationID?.uuidString ?? "new"]
        composerText = draft?.text ?? ""
        draftAttachments = draft?.attachments ?? []
        draftArtifact = draft?.selectedArtifact
    }
}
let a=UUID(), b=UUID();let store=DraftHarness()
store.conversations=[Conversation(id:a,mode:.chatGPT),Conversation(id:b,mode:.chatGPT)]
store.selectConversation(a)
store.mode = .claude
store.composerText = "Synthetic draft for Claude"
store.draftAttachments = ["synthetic-note.txt"]
store.draftArtifact = "synthetic-artifact-id"
store.selectConversation(b)
store.selectConversation(a)
print("requestedProviderBeforeNavigation=claude")
print("restoredProvider=\(store.mode.rawValue)")
let draftPreserved = store.composerText == "Synthetic draft for Claude"
print("draftPreserved=\(draftPreserved)")
print("attachmentsPreserved=\(store.draftAttachments == ["synthetic-note.txt"])" )
print("artifactPreserved=\(store.draftArtifact == "synthetic-artifact-id")")
precondition(store.mode == .chatGPT && draftPreserved)
