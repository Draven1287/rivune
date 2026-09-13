import Foundation
@main struct Review {
 static func main() throws {
  let u=URL(fileURLWithPath:CommandLine.arguments[1]);let s=try FileRemoteJournalStorage(url:u)
  let first=try RemoteRequestJournal(storage:s);let second=try RemoteRequestJournal(storage:s)
  let id=RemoteAcceptedIdentity(requestID:UUID(),turnID:UUID(),mode:.chatGPT,routes:[.init(providerID:"openai",transportID:"codex-cli",adapterID:"codex-runtime")],requestedModelIDs:["sk-SYNTHETIC_SECRET"],requestedEfforts:["high"],contextVersion:2,attachmentSetDigest:.hash(string:"attachments"))
  let fp=SHA256Digest.hash(string:"request")
  func isDispatch(_ d: RemoteAdmissionDisposition)->Bool { if case .dispatch=d { return true };return false }
  print("firstDispatch=\(isDispatch(try first.admit(identity:id,requestFingerprint:fp)))")
  print("secondDispatchSameStorageSameID=\(isDispatch(try second.admit(identity:id,requestFingerprint:fp)))")
  print("rawSecretPersisted=\(String(decoding:try s.read()!,as:UTF8.self).contains("SYNTHETIC_SECRET"))")
  do { _=try RemoteResultReference(workspaceRunID:UUID(),revision:-7,resultDigest:.hash(string:"result"));print("negativeAccepted=true") }catch{print("negativeAccepted=false")}
  do { _=try SHA256Digest(hex:"user prompt body\nAuthorization: Bearer SYNTHETIC_SECRET");print("rawDigestAccepted=true") }catch{print("rawDigestAccepted=false")}
 }
}
