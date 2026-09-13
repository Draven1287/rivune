import Foundation
struct BridgeEnvelope: Codable { let answer: String }
struct BridgePeerContext { let principal: String; let generation: UUID }
enum PeerBridgeError: Error { case notConnected, encodingFailed, messageTooLarge, peerChanged }
enum RivuneLaunchContext { static let isIsolated = false }
enum Completion { case contentProcessed((Error?) -> Void) }
struct Failure: Error {}
final class NWConnection {
 let principal: String; var sends = 0; var cancellations = 0; var callback: ((Error?) -> Void)?; var beforeActualSend: (() -> Void)?
 init(_ principal: String) { self.principal = principal }
 func send(content: Data, completion: Completion) { beforeActualSend?(); sends += 1; if case let .contentProcessed(body) = completion { callback = body } }
 func cancel() { cancellations += 1 }
}
final class PeerBridge: @unchecked Sendable {
 static let maximumMessageBytes = 1_048_576
 let queue = DispatchQueue(label: "probe")
 var activePrincipal: String?; var activeConnectionGeneration: UUID?; var connection: NWConnection?
 var publishedPrincipal: String?; var errors = 0
 func publishError(_ value: String) { errors += 1 }
 static func frame(_ data: Data) -> Data { data }
    func send(_ envelope: BridgeEnvelope, to peerContext: BridgePeerContext) throws {
        guard !RivuneLaunchContext.isIsolated else { throw PeerBridgeError.notConnected }
        guard let data = try? JSONEncoder().encode(envelope) else { throw PeerBridgeError.encodingFailed }
        guard data.count <= Self.maximumMessageBytes else { throw PeerBridgeError.messageTooLarge }
        let activeConnection = queue.sync { () -> NWConnection? in
            guard activePrincipal == peerContext.principal,
                  activeConnectionGeneration == peerContext.generation else { return nil }
            return connection
        }
        guard let activeConnection else { throw PeerBridgeError.peerChanged }
        activeConnection.send(content: Self.frame(data), completion: .contentProcessed { [weak self, weak activeConnection] error in
            guard let self, let activeConnection, error != nil else { return }
            self.queue.async { [self] in
                guard self.connection === activeConnection else { return }
                self.publishError("The encrypted connection could not send that message.")
                activeConnection.cancel()
            }
        })
    }
    func isCurrent(_ context: BridgePeerContext) -> Bool {
        queue.sync {
            activePrincipal == context.principal && activeConnectionGeneration == context.generation
        }
    }
}
let bridge = PeerBridge(), a = NWConnection("A"), b = NWConnection("B")
let ctxA = BridgePeerContext(principal: "A", generation: UUID()), ctxB = BridgePeerContext(principal: "B", generation: UUID())
bridge.publishedPrincipal = "A"
bridge.queue.sync { bridge.activePrincipal="B"; bridge.activeConnectionGeneration=ctxB.generation; bridge.connection=b }
precondition(!bridge.isCurrent(ctxA))
do { try bridge.send(.init(answer: "A private result"), to: ctxA); fatalError("stale A sent") } catch PeerBridgeError.peerChanged {}
precondition(b.sends == 0 && b.cancellations == 0)
print("PASS: queue-owned B rejects stale A despite stale published A; B not sent/cancelled")
bridge.queue.sync { bridge.activePrincipal="A"; bridge.activeConnectionGeneration=ctxA.generation; bridge.connection=a }
try bridge.send(.init(answer: "A result"), to: ctxA)
precondition(a.sends == 1 && b.sends == 0)
bridge.queue.sync { bridge.activePrincipal="B"; bridge.activeConnectionGeneration=ctxB.generation; bridge.connection=b }
a.callback?(Failure())
bridge.queue.sync {}
precondition(b.cancellations == 0 && bridge.errors == 0)
print("PASS: late A send failure does not cancel successor B")
let obsolete = BridgePeerContext(principal: "B", generation: UUID())
precondition(!bridge.isCurrent(obsolete))
do { try bridge.send(.init(answer: "old generation"), to: obsolete); fatalError("old generation sent") } catch PeerBridgeError.peerChanged {}
precondition(b.sends == 0)
print("PASS: same-principal stale generation rejected before send")

bridge.queue.sync { bridge.activePrincipal="A"; bridge.activeConnectionGeneration=ctxA.generation; bridge.connection=a }
a.beforeActualSend = { bridge.queue.sync { bridge.activePrincipal="B"; bridge.activeConnectionGeneration=ctxB.generation; bridge.connection=b } }
try bridge.send(.init(answer: "still bound to A"), to: ctxA)
precondition(a.sends == 2 && b.sends == 0)
print("PASS: replacement after authorized selection does not redirect the captured A connection to B")
