import Foundation
struct BridgePeerContext { let principal: String }
struct Request { let id: String }
struct Stop { let requestID: String; let requestFingerprint: String }
enum Envelope { case request(Request); case stop(Stop) }
final class Bridge {
 var peer: BridgePeerContext?
 var sent: [Envelope] = []
 func currentPeerContext() -> BridgePeerContext? { peer }
 func send(_ envelope: Envelope, to peer: BridgePeerContext) throws { sent.append(envelope) }
}
final class Store {
 let bridge = Bridge()
 var activeRequestID: String? = "original-run"
 var activeBridgeRequest: Request? = Request(id: "original-run")
 var pendingPhoneHostPrincipal: String? = "mac-A"
 var pendingPhoneStopRequested = false
 var bridgeRequestWatchdog: Task<Void, Never>?
 var persistedStops = 0
 var notices: [String] = []
 func showPrototypeNotice(_ message: String) { notices.append(message) }
 func persistPendingPhoneRequest(_ request: Request, stopRequested: Bool, hostPrincipal: String) -> Bool { if stopRequested { persistedStops += 1 }; return true }
 static func bridgeRequestFingerprint(_ request: Request) -> String { request.id }
    nonisolated static func shouldResumePendingPhoneOperation(originalHost: String?, currentPeer: BridgePeerContext?) -> Bool {
        guard let originalHost, let currentPeer else { return false }
        return !originalHost.isEmpty && currentPeer.principal == originalHost
    }

 func exactStopBranch() {
        guard let requestID = activeRequestID, let request = activeBridgeRequest else { return }
        bridgeRequestWatchdog?.cancel()
        bridgeRequestWatchdog = nil
        guard let peerContext = bridge.currentPeerContext(),
              let originalHost = pendingPhoneHostPrincipal,
              peerContext.principal == originalHost else {
            showPrototypeNotice("Reconnect the original Mac before stopping this request")
            return
        }
        guard persistPendingPhoneRequest(request, stopRequested: true, hostPrincipal: originalHost) else {
            showPrototypeNotice("Rivune could not save the Stop request. It was not sent.")
            return
        }
        pendingPhoneStopRequested = true
        do {
            try bridge.send(.stop(.init(requestID: requestID, requestFingerprint: Self.bridgeRequestFingerprint(request))), to: peerContext)
            showPrototypeNotice("Stop requested on your Mac…")
        } catch {
            // Keep the durable pending request so reconnect can retry/reattach.
            showPrototypeNotice("Waiting to reconnect before stopping this request")
        }

 }
 func exactResumeBranch() {
                    if let request = self.activeBridgeRequest {
                        let context = self.bridge.currentPeerContext()
                        guard Self.shouldResumePendingPhoneOperation(originalHost: self.pendingPhoneHostPrincipal, currentPeer: context),
                              let context else {
                            self.showPrototypeNotice("This unfinished request belongs to a different Mac. Reconnect the original Mac to resume it.")
                            return
                        }
                        do {
                            if self.pendingPhoneStopRequested {
                                try self.bridge.send(.stop(.init(requestID: request.id, requestFingerprint: Self.bridgeRequestFingerprint(request))), to: context)
                            } else {
                                try self.bridge.send(.request(request), to: context)
                            }
                        } catch {
                            self.showPrototypeNotice("Waiting to reconnect to the original Mac")
                        }
                    }

 }
}
let store = Store()
store.exactStopBranch()
precondition(store.persistedStops == 0 && !store.pendingPhoneStopRequested)
store.bridge.peer = BridgePeerContext(principal: "mac-A")
store.exactResumeBranch()
precondition(store.bridge.sent.count == 1)
guard case .request = store.bridge.sent[0] else { fatalError("Expected original request instead of requested Stop") }
print("REPRODUCED: offline Stop is not persisted; reconnect sends original request instead of Stop.")
print("Exact source-extracted branches with synthetic dependencies, no network/provider/UI execution.")
