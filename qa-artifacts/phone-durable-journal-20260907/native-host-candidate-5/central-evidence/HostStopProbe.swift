import Foundation
struct BridgePeerContext { let principal: String; let generation: UUID }
struct BridgeStopRequest { let requestID: UUID; let requestFingerprint: String }
enum TerminalState { case interrupted, cancelled, failed }
struct BridgeStopUpdate { let requestID: UUID; let accepted: Bool; let message: String; var terminalState: TerminalState? = nil }
typealias WorkspaceRunStatus = String
typealias CouncilStage = String
extension String { static var running: String { "running" } }
struct ChatTurn: Codable { let id: UUID; let answer: String }
struct WorkspaceRun { let id: UUID; let conversationID: UUID; let requestKey: String; let turn: ChatTurn; let status: String; let stage: String; let durableRevision: Int? }
enum WorkspaceRunError: Error { case storageUnavailable }
final class Bridge { func isCurrent(_ context: BridgePeerContext) -> Bool { true } }
final class Coordinator {
 var cancelCount = 0; var snapshot: WorkspaceRun?; var resolves = 0
 func requestCancel(_ id: UUID) { cancelCount += 1 }
 func existing(id: UUID, requestKey: String) throws -> WorkspaceRun? { resolves += 1; guard let snapshot, snapshot.id == id, snapshot.requestKey == requestKey else { return nil }; return snapshot }
    func resolve(reference: RemoteResultReference, requestKey: String) throws -> WorkspaceRun {
        guard let run = try existing(id: reference.workspaceRunID, requestKey: requestKey),
              run.status != .running,
              (run.durableRevision ?? 0) == reference.revision,
              SHA256Digest.hash(data: Self.terminalReferenceData(run)) == reference.resultDigest else {
            throw WorkspaceRunError.storageUnavailable
        }
        return run
    }
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
final class Memory: RemoteJournalStorage, @unchecked Sendable { let journalLeaseKey=UUID().uuidString; var data: Data?; func read() throws -> Data? { data };func writeAtomically(_ data:Data) throws {self.data=data} }
final class Host {
 let remotePrincipalOverride: String? = nil; let bridge=Bridge(); let remoteJournal: RemoteRequestJournal?
 struct Observation { let fingerprint: String; let peer: BridgePeerContext }
 var remoteObservations: [UUID: Observation] = [:]; let runCoordinator=Coordinator(); var answers:[String]=[]; var notices:[BridgeStopUpdate]=[]
 init(_ journal: RemoteRequestJournal) {remoteJournal=journal}
 static func remoteDeviceIdentity(principal:String) -> RemoteRouteIdentity { .init(providerID:"rivune-paired-device",transportID:principal,adapterID:"paired-principal-v1") }
 static func bridgeUpdate(run: WorkspaceRun) -> String {run.turn.answer}
 func sendBridgeUpdate(_ answer:String,peerContext:BridgePeerContext) {answers.append(answer)}
 func sendStopUpdate(_ update:BridgeStopUpdate,peerContext:BridgePeerContext) {notices.append(update)}
    func handleRemoteStop(_ stop: BridgeStopRequest, peerContext: BridgePeerContext) {
        if remotePrincipalOverride == nil && !bridge.isCurrent(peerContext) { return }
        guard let fingerprint = try? SHA256Digest(hex: stop.requestFingerprint),
              let journal = remoteJournal else {
            sendStopUpdate(.init(requestID: stop.requestID, accepted: false, message: "Rivune could not authorize this stop request"), peerContext: peerContext)
            return
        }
        do {
            switch try journal.requestStop(
                requestID: stop.requestID,
                requestFingerprint: fingerprint,
                owner: Self.remoteDeviceIdentity(principal: peerContext.principal)
            ) {
            case .cancelProvider:
                remoteObservations[stop.requestID] = .init(fingerprint: stop.requestFingerprint, peer: peerContext)
                runCoordinator.requestCancel(stop.requestID)
            case .settledBeforeAdmission:
                sendStopUpdate(.init(
                    requestID: stop.requestID,
                    accepted: true,
                    message: "This request was stopped before it started on your Mac.",
                    terminalState: .cancelled
                ), peerContext: peerContext)
            case .alreadyTerminal:
                guard let state = journal.record(requestID: stop.requestID)?.state else {
                    sendStopUpdate(.init(requestID: stop.requestID, accepted: true, message: "The saved terminal state is unavailable. Rivune did not run the request again.", terminalState: .interrupted), peerContext: peerContext)
                    return
                }
                switch state {
                case .completed(let reference):
                    do {
                        let run = try runCoordinator.resolve(reference: reference, requestKey: stop.requestFingerprint)
                        sendBridgeUpdate(Self.bridgeUpdate(run: run), peerContext: peerContext)
                    } catch {
                        sendStopUpdate(.init(requestID: stop.requestID, accepted: true, message: "The saved result could not be verified. Rivune did not disclose or run it again.", terminalState: .interrupted), peerContext: peerContext)
                    }
                case .cancelled:
                    sendStopUpdate(.init(requestID: stop.requestID, accepted: true, message: "The local Rivune task was already stopped.", terminalState: .cancelled), peerContext: peerContext)
                case .failed:
                    sendStopUpdate(.init(requestID: stop.requestID, accepted: true, message: "This request already failed on your Mac. It was not run again.", terminalState: .failed), peerContext: peerContext)
                case .interruptedUnknown:
                    sendStopUpdate(.init(requestID: stop.requestID, accepted: true, message: "Rivune closed before this request finished. It was not run again.", terminalState: .interrupted), peerContext: peerContext)
                case .running, .stopRequested:
                    sendStopUpdate(.init(requestID: stop.requestID, accepted: false, message: "Rivune could not confirm this request's terminal state."), peerContext: peerContext)
                }
            case .conflict:
                sendStopUpdate(.init(requestID: stop.requestID, accepted: false, message: "Stop request did not match the active request"), peerContext: peerContext)
            }
        } catch {
            sendStopUpdate(.init(requestID: stop.requestID, accepted: false, message: "Rivune could not verify this stop request"), peerContext: peerContext)
        }
    }
}

let journal=try RemoteRequestJournal(storage:Memory())
let host=Host(journal), id=UUID(), fp=SHA256Digest.hash(string:"not-yet-admitted")
let stop=BridgeStopRequest(requestID:id,requestFingerprint:fp.hex),peer=BridgePeerContext(principal:"A",generation:UUID())
host.handleRemoteStop(stop,peerContext:peer)
let update=host.notices.last!
precondition(update.accepted && update.terminalState == .cancelled && host.runCoordinator.cancelCount==0)
var pendingPhoneStopRequested=true
var isGenerating=true
if update.accepted, let terminalState=update.terminalState {
 _=terminalState;pendingPhoneStopRequested=false;isGenerating=false
}
precondition(!pendingPhoneStopRequested && !isGenerating)
for _ in 0..<3 {host.handleRemoteStop(stop,peerContext:peer)}
precondition(host.notices.allSatisfy {$0.accepted && $0.terminalState == .cancelled})
print("PASS exact host Stop method now emits cancelled terminal settlement without provider cancellation; repeated Stops remain settled")
