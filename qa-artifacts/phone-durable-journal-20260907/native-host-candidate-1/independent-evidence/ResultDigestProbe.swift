import Foundation
import CryptoKit
typealias WorkspaceRunStatus = String
typealias CouncilStage = String
struct Turn { let id: UUID; let answer: String }
struct WorkspaceRun { let id: UUID; let conversationID: UUID; let requestKey: String; let turn: Turn; let status: String; let stage: String; let durableRevision: Int? }
enum Probe {
    static func terminalReferenceData(_ run: WorkspaceRun) -> Data {
        struct Payload: Codable {
            let id: UUID; let conversationID: UUID; let requestKey: String
            let turnID: UUID; let status: WorkspaceRunStatus; let stage: CouncilStage; let revision: Int
        }
        let payload = Payload(id: run.id, conversationID: run.conversationID, requestKey: run.requestKey,
                              turnID: run.turn.id, status: run.status, stage: run.stage,
                              revision: run.durableRevision ?? 0)
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return (try? encoder.encode(payload)) ?? Data()
    }

}
let id = UUID(), conversation = UUID(), turn = UUID()
let a = WorkspaceRun(id:id, conversationID:conversation, requestKey:"synthetic", turn:Turn(id:turn, answer:"Original verified answer"), status:"complete", stage:"complete", durableRevision:2)
let b = WorkspaceRun(id:id, conversationID:conversation, requestKey:"synthetic", turn:Turn(id:turn, answer:"Different corrupted answer"), status:"complete", stage:"complete", durableRevision:2)
let da = SHA256.hash(data:Probe.terminalReferenceData(a))
let db = SHA256.hash(data:Probe.terminalReferenceData(b))
precondition(da == db)
print("CONFIRMED: extracted production terminalReferenceData yields identical digest for different result text")
