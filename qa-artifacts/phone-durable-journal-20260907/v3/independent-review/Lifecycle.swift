import Foundation
@main struct Lifecycle {
 static func main() throws {
  let s=try FileRemoteJournalStorage(url: URL(fileURLWithPath:CommandLine.arguments[1]))
  var seed: RemoteRequestJournal?=try RemoteRequestJournal(storage:s)
  let id=RemoteAcceptedIdentity(requestID:UUID(),turnID:UUID(),mode:.chatGPT,routes:[.init(providerID:"openai",transportID:"codex-cli",adapterID:"codex-runtime")],requestedModelIDs:["example"],requestedEfforts:["high"],contextVersion:2,attachmentSetDigest:.hash(string:"attachments"))
  _ = try seed!.admit(identity:id,requestFingerprint:.hash(string:"request"));seed=nil
  let saved=try s.read()!
  var root=try JSONSerialization.jsonObject(with:saved) as! [String:Any]
  var records=root["records"] as! [[String:Any]];var identity=records[0]["identity"] as! [String:Any];identity["contextVersion"]=0;records[0]["identity"]=identity;root["records"]=records
  try s.writeAtomically(JSONSerialization.data(withJSONObject:root))
  var successor:RemoteRequestJournal?
  reviewReleaseHook = {
   try! s.writeAtomically(saved)
   successor = try! RemoteRequestJournal(storage:s)
   print("successorAcquiredAfterCatchRelease")
  }
  do { _ = try RemoteRequestJournal(storage:s);exit(2) } catch { print("failingInitializerReturned") }
  let third = try RemoteRequestJournal(storage:s)
  withExtendedLifetime((successor,third)) { print("BUG_twoLiveJournalsAfterStaleDeinitRelease") }
 }
}
