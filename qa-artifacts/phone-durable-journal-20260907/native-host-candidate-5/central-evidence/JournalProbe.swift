import Foundation
func check(_ condition: @autoclosure () throws -> Bool) throws { let valid = try condition(); precondition(valid) }
let root=URL(fileURLWithPath:"/private/tmp/rivune-central-phone5").appendingPathComponent(UUID().uuidString)
try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
let url=root.appendingPathComponent("journal.json")
let owner=RemoteRouteIdentity(providerID:"synthetic-phone",transportID:"paired",adapterID:"one")
let foreign=RemoteRouteIdentity(providerID:"synthetic-phone",transportID:"paired",adapterID:"two")
let id=UUID();let fp=SHA256Digest.hash(string:"synthetic-request")
func identity(_ route:RemoteRouteIdentity)->RemoteAcceptedIdentity { .init(requestID:id,turnID:id,mode:.chatGPT,routes:[route],requestedModelIDs:[],requestedEfforts:[],contextVersion:1,attachmentSetDigest:.hash(string:"empty")) }
do {
 let storage=try FileRemoteJournalStorage(url:url)
 let journal=try RemoteRequestJournal(storage:storage)
 try check(try journal.requestStop(requestID:id,requestFingerprint:fp,owner:owner) == .settledBeforeAdmission)
 try check(try journal.requestStop(requestID:id,requestFingerprint:fp,owner:owner) == .settledBeforeAdmission)
 try check(try journal.requestStop(requestID:id,requestFingerprint:fp,owner:foreign) == .conflict)
 try check(try journal.admit(identity:identity(owner),requestFingerprint:fp) == .cancelledBeforeDispatch)
 try check(try journal.admit(identity:identity(foreign),requestFingerprint:fp) == .conflict)
 try check(try journal.admit(identity:identity(owner),requestFingerprint:.hash(string:"changed")) == .conflict)
}
do {
 let journal=try RemoteRequestJournal(storage:FileRemoteJournalStorage(url:url))
 try check(try journal.admit(identity:identity(owner),requestFingerprint:fp) == .cancelledBeforeDispatch)
 try check(try journal.requestStop(requestID:id,requestFingerprint:fp,owner:owner) == .settledBeforeAdmission)
}
print("PASS 8 pre-admission Stop/identity/restart journal checks using exact production source and disposable disk storage")
final class FailingStorage: RemoteJournalStorage, @unchecked Sendable {
 let journalLeaseKey=UUID().uuidString
 var bytes:Data?;var fail=true
 func read() throws -> Data? {bytes}
 func writeAtomically(_ data:Data) throws {if fail {throw RemoteJournalError.storageUnavailable};bytes=data}
}
do {
 let storage=FailingStorage();let journal=try RemoteRequestJournal(storage:storage,maxTombstones:1)
 do {_ = try journal.requestStop(requestID:id,requestFingerprint:fp,owner:owner);fatalError("unexpected successful failed write")} catch RemoteJournalError.storageUnavailable {}
 precondition(storage.bytes == nil)
 storage.fail=false
 try check(try journal.requestStop(requestID:id,requestFingerprint:fp,owner:owner) == .settledBeforeAdmission)
 do {_ = try journal.requestStop(requestID:UUID(),requestFingerprint:fp,owner:owner);fatalError("unexpected marker eviction")} catch RemoteJournalError.journalFull {}
 try check(try journal.admit(identity:identity(owner),requestFingerprint:fp) == .cancelledBeforeDispatch)
}
print("PASS storage-failure retry and full-marker-budget preserve fail-closed cancellation")
