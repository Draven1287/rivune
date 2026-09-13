import Foundation
@main struct Review {
 static func identity(_ id: UUID = UUID(), model: String = "model") -> RemoteAcceptedIdentity {
  .init(requestID:id,turnID:UUID(),modeID:"chatGPT",routes:[.init(providerID:"openai",transportID:"codex-cli",adapterID:"codex-runtime")],requestedModelIDs:[model],requestedEfforts:["high"],contextVersion:2,attachmentSetDigest:"sha256-attachments")
 }
 static func dispatch(_ d: RemoteAdmissionDisposition) -> Bool { if case .dispatch = d { return true }; return false }
 static func main() throws {
  let root=URL(fileURLWithPath:CommandLine.arguments[1]);try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true)
  let privacy=FileRemoteJournalStorage(url:root.appendingPathComponent("privacy.json"));let p=try RemoteRequestJournal(storage:privacy);let a=identity(model:"sk-SYNTHETIC_SECRET")
  _=try p.admit(identity:a,requestFingerprint:"fingerprint")
  try p.complete(requestID:a.requestID,requestFingerprint:"fingerprint",result:.init(workspaceRunID:UUID(),revision:-7,resultDigest:"user prompt body\nprovider answer body\nAuthorization: Bearer SYNTHETIC_SECRET"))
  let saved=String(decoding:try privacy.read()!,as:UTF8.self)
  let restarted=try RemoteRequestJournal(storage:privacy)
  let replay=try restarted.admit(identity:a,requestFingerprint:"fingerprint")
  print("rawSecretPersisted=\(saved.contains("SYNTHETIC_SECRET")) promptPersisted=\(saved.contains("user prompt body"))")
  if case .replay(let ref)=replay { print("negativeRevisionReplayed=\(ref.revision)") }
  let shared=FileRemoteJournalStorage(url:root.appendingPathComponent("shared.json"));let first=try RemoteRequestJournal(storage:shared);let second=try RemoteRequestJournal(storage:shared);let b=identity()
  print("firstDispatch=\(dispatch(try first.admit(identity:b,requestFingerprint:"one")))")
  print("secondDispatchSameID=\(dispatch(try second.admit(identity:b,requestFingerprint:"one")))")
 }
}
