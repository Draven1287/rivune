import Foundation
import CryptoKit
typealias WorkspaceRunStatus = String
typealias CouncilStage = String
struct ChatTurn: Codable { let id:UUID;let answer:String }
struct WorkspaceRun { let id:UUID;let conversationID:UUID;let requestKey:String;let turn:ChatTurn;let status:String;let stage:String;let durableRevision:Int? }
enum Probe {
    static func terminalReferenceData(_ run: WorkspaceRun) -> Data {
        struct Payload: Codable {
            let id: UUID; let conversationID: UUID; let requestKey: String
            let turn: ChatTurn; let status: WorkspaceRunStatus; let stage: CouncilStage; let revision: Int
        }
        let payload = Payload(id: run.id, conversationID: run.conversationID, requestKey: run.requestKey,
                              turn: run.turn, status: run.status, stage: run.stage,
                              revision: run.durableRevision ?? 0)
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return (try? encoder.encode(payload)) ?? Data()
    }

}
let id=UUID(),conversation=UUID(),turn=UUID()
let a=WorkspaceRun(id:id,conversationID:conversation,requestKey:"fixture",turn:.init(id:turn,answer:"original"),status:"complete",stage:"complete",durableRevision:2)
let b=WorkspaceRun(id:id,conversationID:conversation,requestKey:"fixture",turn:.init(id:turn,answer:"tampered"),status:"complete",stage:"complete",durableRevision:2)
precondition(SHA256.hash(data:Probe.terminalReferenceData(a)) != SHA256.hash(data:Probe.terminalReferenceData(b)))
print("PASS: candidate2 exact digest method binds changed answer bytes")
