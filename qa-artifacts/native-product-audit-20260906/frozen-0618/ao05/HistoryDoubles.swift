import Foundation
// Minimal inert data containers for the extracted request/history methods.
enum IntelligenceMode: String, Codable {case chatGPT, claude, together, council, swarm}
struct AIAnswer: Codable {let content:String}
struct ChatTurn: Codable {let prompt:String;var chatGPTAnswer:AIAnswer?;var claudeAnswer:AIAnswer?;var combinedAnswer:AIAnswer?}
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
