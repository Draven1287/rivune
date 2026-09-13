import Foundation
struct BridgePeerContext: Equatable { let principal:String;let generation:UUID }
struct Request {let id:String}
struct Stop {let requestID:String;let requestFingerprint:String}
enum Envelope {case request(Request);case stop(Stop)}
struct Failure:Error{}
final class Bridge {
 var peer:BridgePeerContext?;var sent:[Envelope]=[];var targets:[BridgePeerContext]=[];var throwOnSend=false
 func currentPeerContext()->BridgePeerContext? {peer}
 func send(_ envelope:Envelope,to peer:BridgePeerContext)throws {if throwOnSend {throw Failure()};sent.append(envelope);targets.append(peer)}
}
final class Store {
 let bridge=Bridge();var activeRequestID:String?="run";var activeBridgeRequest:Request?=Request(id:"run")
 var pendingPhoneHostPrincipal:String?="mac-A";var pendingPhoneStopRequested=false;var bridgeRequestWatchdog:Task<Void,Never>?
 var saves:[(String,Bool,String)]=[];var persistenceSucceeds=true;var notices:[String]=[]
 func showPrototypeNotice(_ s:String){notices.append(s)}
 func persistPendingPhoneRequest(_ r:Request,stopRequested:Bool,hostPrincipal:String)->Bool {if persistenceSucceeds{saves.append((r.id,stopRequested,hostPrincipal))};return persistenceSucceeds}
 static func bridgeRequestFingerprint(_ r:Request)->String{r.id}
    nonisolated static func shouldResumePendingPhoneOperation(originalHost: String?, currentPeer: BridgePeerContext?) -> Bool {
        guard let originalHost, let currentPeer else { return false }
        return !originalHost.isEmpty && currentPeer.principal == originalHost
    }

    enum PendingPhoneStopTransport: Equatable {
        case legacyUnbound
        case queuedForOriginalHost(String)
        case send(BridgePeerContext)
    }

    /// A Stop belongs to the host captured when the request was first saved.
    /// Persistence happens before this transport decision; a missing or foreign
    /// live peer therefore queues the Stop instead of reverting to the request.
    nonisolated static func pendingPhoneStopTransport(
        originalHost: String?,
        currentPeer: BridgePeerContext?
    ) -> PendingPhoneStopTransport {
        guard let originalHost, !originalHost.isEmpty else { return .legacyUnbound }
        guard let currentPeer, currentPeer.principal == originalHost else {
            return .queuedForOriginalHost(originalHost)
        }
        return .send(currentPeer)
    }


func stop(){
        guard let requestID = activeRequestID, let request = activeBridgeRequest else { return }
        guard let originalHost = pendingPhoneHostPrincipal, !originalHost.isEmpty else {
            showPrototypeNotice("This older saved request is not bound to a Mac. Start a new request to use Stop safely.")
            return
        }
        guard persistPendingPhoneRequest(request, stopRequested: true, hostPrincipal: originalHost) else {
            showPrototypeNotice("Rivune could not save the Stop request. It was not sent.")
            return
        }
        pendingPhoneStopRequested = true
        bridgeRequestWatchdog?.cancel()
        bridgeRequestWatchdog = nil
        guard case .send(let peerContext) = Self.pendingPhoneStopTransport(
            originalHost: originalHost,
            currentPeer: bridge.currentPeerContext()
        ) else {
            showPrototypeNotice("Stop saved. Reconnect the original Mac to finish stopping this request.")
            return
        }
        do {
            try bridge.send(.stop(.init(requestID: requestID, requestFingerprint: Self.bridgeRequestFingerprint(request))), to: peerContext)
            showPrototypeNotice("Stop requested on your Mac…")
        } catch {
            // Keep the durable pending Stop so reconnect cannot fall back to
            // resending the original request.
            showPrototypeNotice("Waiting to reconnect before stopping this request")
        }

}
func resume(){
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

func onlyStops(_ store:Store) -> Bool {store.bridge.sent.allSatisfy {if case .stop = $0{return true};return false}}
for wasDispatched in [false,true] {
 let store=Store()
 if wasDispatched {store.bridge.sent.append(.request(Request(id:"run")))}
 let prior=store.bridge.sent.count
 store.stop()
 precondition(store.saves.count==1 && store.saves[0].1 && store.saves[0].2=="mac-A" && store.pendingPhoneStopRequested)
 precondition(store.bridge.sent.count==prior)
 store.bridge.peer = .init(principal:"mac-B",generation:UUID());store.resume()
 precondition(store.bridge.sent.count==prior)
 store.bridge.peer = .init(principal:"mac-A",generation:UUID());store.resume()
 precondition(store.bridge.sent.count==prior+1)
 guard case .stop = store.bridge.sent.last! else {fatalError("request fallback")}
 print("PASS offline Stop persists before reconnect; dispatched=\(wasDispatched), foreign host blocked, original receives Stop")
}
let foreign=Store();foreign.bridge.peer = .init(principal:"mac-B",generation:UUID());foreign.stop()
precondition(foreign.pendingPhoneStopRequested && foreign.saves.count==1 && foreign.bridge.sent.isEmpty)
print("PASS Stop while connected to another Mac queues original host")
let reconnected=Store();let newContext=BridgePeerContext(principal:"mac-A",generation:UUID());reconnected.bridge.peer=newContext;reconnected.stop()
precondition(reconnected.saves.count==1 && onlyStops(reconnected) && reconnected.bridge.targets==[newContext])
print("PASS original host new generation sends Stop after persistence")
let failure=Store();failure.persistenceSucceeds=false;failure.bridge.peer=newContext;failure.stop()
precondition(!failure.pendingPhoneStopRequested && failure.saves.isEmpty && failure.bridge.sent.isEmpty)
print("PASS persistence failure does not claim or transmit Stop")
let legacy=Store();legacy.pendingPhoneHostPrincipal=nil;legacy.bridge.peer=newContext;legacy.stop();legacy.resume()
precondition(legacy.saves.isEmpty && legacy.bridge.sent.isEmpty && !legacy.pendingPhoneStopRequested)
print("PASS legacy nil host fails closed")
let transport=Store();transport.bridge.peer=newContext;transport.bridge.throwOnSend=true;transport.stop()
precondition(transport.pendingPhoneStopRequested && transport.saves.count==1 && transport.bridge.sent.isEmpty)
transport.bridge.throwOnSend=false;transport.resume()
precondition(transport.bridge.sent.count==1 && onlyStops(transport))
print("PASS send failure retains durable Stop and reconnect never sends original request")
