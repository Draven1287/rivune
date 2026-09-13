import Foundation
struct Request { let id: String; let body: String }
struct Stop { let requestID: String; let requestFingerprint: String }
enum Envelope { case request(Request); case stop(Stop) }
final class Bridge {
 var principal = "mac-A"
 var sent: [(String, Envelope)] = []
 func send(_ envelope: Envelope) throws { sent.append((principal, envelope)) }
}
final class Store {
 let bridge = Bridge()
 var activeBridgeRequest: Request? = Request(id: "original-run", body: "synthetic project context")
 var pendingPhoneStopRequested = false
 static func bridgeRequestFingerprint(_ request: Request) -> String { request.id }
 func exactReconnectBranch() {
                    if let request = self.activeBridgeRequest {
                        if self.pendingPhoneStopRequested {
                            try? self.bridge.send(.stop(.init(requestID: request.id, requestFingerprint: Self.bridgeRequestFingerprint(request))))
                        } else {
                            try? self.bridge.send(.request(request))
                        }
                    }

 }
}
let store = Store()
store.bridge.principal = "mac-B"
store.exactReconnectBranch()
precondition(store.bridge.sent.count == 1)
guard case .request(let request) = store.bridge.sent[0].1 else { fatalError("Expected original request") }
precondition(request.id == "original-run")
print("SOURCE-EXTRACTED REPRO: original pending request sent to mac-B after pairing change.")
print("Synthetic bridge only; no real network, app or provider execution.")
