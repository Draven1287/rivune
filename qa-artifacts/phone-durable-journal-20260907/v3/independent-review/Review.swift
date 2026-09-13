import Foundation
@main struct Review {
 static func main() throws {
  let u=URL(fileURLWithPath:CommandLine.arguments[1])
  if CommandLine.arguments.count>2 {
   do { let s=try FileRemoteJournalStorage(url:u);withExtendedLifetime(s) {print("childUnexpectedOwner")} ; exit(2) } catch RemoteStorageError.writerAlreadyOwned { print("childBlockedByOSLock");return }
  }
  let s=try FileRemoteJournalStorage(url:u)
  var first:RemoteRequestJournal?=try RemoteRequestJournal(storage:s)
  do {_=try RemoteRequestJournal(storage:s);print("secondJournalUnexpectedOwner");exit(3)}catch RemoteJournalError.journalAlreadyOwned{print("secondJournalRejected")}
  let id=RemoteAcceptedIdentity(requestID:UUID(),turnID:UUID(),mode:.chatGPT,routes:[.init(providerID:"openai",transportID:"codex-cli",adapterID:"codex-runtime")],requestedModelIDs:["sk-SYNTHETIC_SECRET"],requestedEfforts:["high"],contextVersion:2,attachmentSetDigest:.hash(string:"attachments"))
  let fp=SHA256Digest.hash(string:"request")
  if case .dispatch=try first!.admit(identity:id,requestFingerprint:fp){print("firstDispatch")}
  first=nil
  var reopened:RemoteRequestJournal?=try RemoteRequestJournal(storage:s)
  if case .reattach(let r)=try reopened!.admit(identity:id,requestFingerprint:fp),r.state == .interruptedUnknown {print("restartNoRedispatch") }else{exit(4)}
  reopened=nil
  let saved=try s.read()!
  try s.writeAtomically(Data("{bad-json".utf8))
  do {_=try RemoteRequestJournal(storage:s);exit(5)}catch RemoteJournalError.corruptOrUnreadable {print("invalidReadRejected")}
  try s.writeAtomically(saved)
  var recovery:RemoteRequestJournal?=try RemoteRequestJournal(storage:s)
  print("leaseReleasedAfterReadFailure=\(recovery != nil)");recovery=nil
  var root=try JSONSerialization.jsonObject(with:saved) as! [String:Any]
  var records=root["records"] as! [[String:Any]];var identity=records[0]["identity"] as! [String:Any];identity["contextVersion"]=0;records[0]["identity"]=identity;root["records"]=records
  try s.writeAtomically(JSONSerialization.data(withJSONObject:root))
  do {_=try RemoteRequestJournal(storage:s);exit(6)}catch RemoteJournalError.invalidMetadata { print("semanticFailureRejected") }
  try s.writeAtomically(saved);let final=try RemoteRequestJournal(storage:s);withExtendedLifetime(final){print("leaseReleasedAfterValidationFailure")}
  let child=Process();child.executableURL=URL(fileURLWithPath:CommandLine.arguments[0]);child.arguments=[u.path,"child"];try child.run();child.waitUntilExit();print("childExit=\(child.terminationStatus)");if child.terminationStatus != 0 {exit(7)}
 }
}
