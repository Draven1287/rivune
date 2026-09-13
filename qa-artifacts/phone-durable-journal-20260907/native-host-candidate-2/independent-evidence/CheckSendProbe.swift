import Foundation
struct BridgeEnvelope: Codable { let answer: String }
struct BridgePeerContext { let principal:String;let generation:UUID }
enum PeerBridgeError: Error {case notConnected,encodingFailed,messageTooLarge}
enum RivuneLaunchContext {static let isIsolated=false}
enum Completion {case contentProcessed((Error?)->Void)}
final class Connection {
 let principal:String;var sends=0
 init(_ principal:String){self.principal=principal}
 func send(content:Data,completion: Completion) {sends+=1}
 func cancel() {}
}
final class PeerBridge: @unchecked Sendable {
 static let maximumMessageBytes=1_048_576
 var authenticatedPrincipal:String?;var connectionGeneration:UUID?
 let queue=DispatchQueue(label:"probe")
 var connection:Connection?
 func publishError(_ message:String) {}
 static func frame(_ data:Data)->Data {data}
    func send(_ envelope: BridgeEnvelope) throws {
        guard !RivuneLaunchContext.isIsolated else { throw PeerBridgeError.notConnected }
        guard let data = try? JSONEncoder().encode(envelope) else {
            throw PeerBridgeError.encodingFailed
        }
        guard data.count <= Self.maximumMessageBytes else {
            throw PeerBridgeError.messageTooLarge
        }
        let activeConnection = queue.sync { connection }
        guard let activeConnection else {
            throw PeerBridgeError.notConnected
        }

        let frame = Self.frame(data)
        activeConnection.send(content: frame, completion: .contentProcessed { [weak self, weak activeConnection] error in
            guard let self, let activeConnection, error != nil else { return }
            self.queue.async { [self] in
                guard self.connection === activeConnection else { return }
                self.publishError("The encrypted Mac connection could not send that message.")
                activeConnection.cancel()
            }
        })
    }
    func isCurrent(_ context: BridgePeerContext) -> Bool {
        authenticatedPrincipal == context.principal && connectionGeneration == context.generation
    }

}
let bridge=PeerBridge(),old=BridgePeerContext(principal:"phone-A",generation:UUID())
bridge.authenticatedPrincipal=old.principal;bridge.connectionGeneration=old.generation
// Queue-owned transport switched; its asynchronous main publication has not run yet.
let successor=Connection("phone-B");bridge.queue.sync {bridge.connection=successor}
precondition(bridge.isCurrent(old))
try bridge.send(BridgeEnvelope(answer:"phone-A private answer"))
precondition(successor.sends==1)
print("CONFIRMED: exact cached isCurrent + unbound send accepts phone-A context and selects phone-B connection while main identity publication is pending")
