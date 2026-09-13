import Foundation
struct Manifest:Encodable{let summary:String;let files:[ProjectFile]}
actor RecordingTransport:AITextRunning {
 var prompts:[String]=[]
 func run(_ route:AIExecutionRoute,prompt:String,options:TerminalRunOptions)async throws->TerminalRunResult{prompts.append(prompt);return .init(text:prompt.hasPrefix("You are the app-appointed") ? "Fixture final" : "Fixture independent draft",elapsedSeconds:0)}
 func snapshot()->[String]{prompts}
}
func content(_ size:Int)->String{
 let head="<!doctype html><html><body><!--AO05_BEGIN_"+String(size)+"|"
 let middle="|AO05_MIDDLE_"+String(size)+"|"
 let tail="|AO05_END_"+String(size)+"--></body></html>"
 let first=size/2-head.utf8.count
 let last=size-head.utf8.count-first-middle.utf8.count-tail.utf8.count
 return head+String(repeating:"a",count:first)+middle+String(repeating:"z",count:last)+tail
}
func encoded(_ files:[ProjectFile])throws->String{let encoder=JSONEncoder();encoder.outputFormatting=[.sortedKeys,.withoutEscapingSlashes];return String(decoding:try encoder.encode(Manifest(summary:"Synthetic continuation fixture",files:files)),as:UTF8.self)}
func commonPrefixBytes(_ lhs:String,_ rhs:String)->Int{zip(lhs.utf8,rhs.utf8).prefix(while:{$0==$1}).count}
func includedFileBytes(_ content:String,in payload:String)->Int{
 let marker=String(content.prefix(64));guard let start=payload.range(of:marker)?.lowerBound else{return 0};return commonPrefixBytes(content,String(payload[start...]))
}
func jsonPayload(_ request:String)throws->[String:String]{try JSONDecoder().decode([String:String].self,from:Data(request.components(separatedBy:"\nJSON PAYLOAD\n").last!.utf8))}
@main struct Checks{
 static func main()async throws{
 let out=URL(fileURLWithPath:CommandLine.arguments[1],isDirectory:true)
 var report:[String:Any]=[:]
 let index=content(32000);let css="/*AO05_CSS_BEGIN|"+String(repeating:"c",count:969)+"|AO05_CSS_END*/"
 let files=[ProjectFile(path:"index.html",content:index),ProjectFile(path:"style.css",content:css)]
 let response=try encoded(files);let artifact=try ResponseArtifact.parse(answer:response,answerID:UUID())
 precondition(artifact.files==files && artifact.byteCount>12000)
 try response.write(to:out.appendingPathComponent("artifact-response.json"),atomically:true,encoding:.utf8)
 let originalPrompt="Build this website."
 let turn=ChatTurn(prompt:originalPrompt,chatGPTAnswer:nil,claudeAnswer:nil,combinedAnswer:.init(content:response))
 let restored=try JSONDecoder().decode([ChatTurn].self,from:JSONEncoder().encode([turn]))
 let history=RivuneStore.conversationContext(from:restored,mode:.council)
 let followup="Change this website: make its footer blue."
 let entryPrefix="USER: "+originalPrompt+"\nASSISTANT: "
 precondition(history.hasPrefix(entryPrefix) && history.hasSuffix("\n[truncated]"))
 let includedResponse=String(history.dropFirst(entryPrefix.utf8.count).dropLast("\n[truncated]".utf8.count))
 precondition(response.hasPrefix(includedResponse))
 let indexIncluded=includedFileBytes(index,in:includedResponse)
 let cssIncluded=includedFileBytes(css,in:includedResponse)
 let direct=RivuneStore.independentPrompt(userPrompt:followup,priorContext:history,attachments:[])
 let payload=try jsonPayload(direct);precondition(payload["prior_conversation"]==history && payload["user_request"]==followup)
 let directTransport=RecordingTransport();_=try await directTransport.run(.codexCLI,prompt:direct,options:.accountDefault)
 let members=[AIExecutionRoute.codexCLI,.claudeCodeCLI].map{ route in CouncilParticipant(identity:.init(id:route.transportID,providerID:route.providerID,adapterID:route.runtimeAdapterID,modelID:nil,displayName:route.transportID),route:route,options:.accountDefault)}
 let councilTransport=RecordingTransport()
 // Verbatim coordinator context assembly at frozen RivuneRunCoordinator.swift:177.
 let context=history+"\n"+(RivuneStore.preparedAttachmentContext([]) ?? "")
 let request=CouncilRequest(runID:UUID(),turnID:UUID(),prompt:followup,approvedContext:context,criteria:CouncilRunner.defaultCriteria,participants:members)
 let council=await CouncilRunner(textRunner:councilTransport).run(request);let councilPrompts=await councilTransport.snapshot()
 precondition(council.phase == .complete && councilPrompts.count==3)
 let draftPayload=try JSONSerialization.jsonObject(with:Data(councilPrompts[0].components(separatedBy:"\nFROZEN TASK JSON:\n").last!.utf8)) as! [String:Any]
 precondition(draftPayload["approvedContext"] as? String==context)
 let sentinels=["AO05_BEGIN_32000","AO05_MIDDLE_32000","AO05_END_32000","AO05_CSS_BEGIN","AO05_CSS_END"]
 let retained=Dictionary(uniqueKeysWithValues:sentinels.map{($0,history.contains($0))})
 precondition(retained["AO05_BEGIN_32000"]==true && retained["AO05_MIDDLE_32000"]==false && retained["AO05_END_32000"]==false && cssIncluded==0)
 report["ordinary_followup"]=["memory_enabled":true,"artifact_parsed_by_frozen_parser":true,"artifact_file_bytes":artifact.byteCount,"artifact_json_bytes":response.utf8.count,"history_bytes":history.utf8.count,"history_entry_prefix_bytes":entryPrefix.utf8.count,"truncation_marker_bytes":"\n[truncated]".utf8.count,"original_artifact_json_bytes_included":includedResponse.utf8.count,"original_artifact_json_bytes_lost":response.utf8.count-includedResponse.utf8.count,"files":[["path":"index.html","original_bytes":index.utf8.count,"included_bytes":indexIncluded,"lost_bytes":index.utf8.count-indexIncluded],["path":"style.css","original_bytes":css.utf8.count,"included_bytes":cssIncluded,"lost_bytes":css.utf8.count-cssIncluded]],"sentinels_present":retained,"complete_selected_files":0,"direct_builder_request_bytes":direct.utf8.count,"direct_recording_calls":await directTransport.snapshot().count,"council_recording_calls":councilPrompts.count,"council_phase":council.phase.rawValue,"artifact_specific_block":false,"warning_scope":"[truncated] is in model history; no artifact revision or complete-file manifest bound to follow-up"]
 try history.write(to:out.appendingPathComponent("ordinary-history.txt"),atomically:true,encoding:.utf8)
 try direct.write(to:out.appendingPathComponent("direct-next-request.txt"),atomically:true,encoding:.utf8)
 try councilPrompts[0].write(to:out.appendingPathComponent("council-next-draft-request.txt"),atomically:true,encoding:.utf8)
 let later=ChatTurn(prompt:"Which style did you use?",chatGPTAnswer:nil,claudeAnswer:nil,combinedAnswer:.init(content:"A simple style."))
 let olderHistory=RivuneStore.conversationContext(from:[turn,later],mode:.council)
 precondition(!olderHistory.contains("AO05_BEGIN") && !olderHistory.contains("[truncated]"))
 report["artifact_one_turn_older"]=["history_bytes":olderHistory.utf8.count,"artifact_json_bytes_included":0,"has_truncation_marker":olderHistory.contains("[truncated]"),"explanation":"Newest short turn fits; oversized older artifact entry is omitted entirely by conversationContext's break"]
 try olderHistory.write(to:out.appendingPathComponent("older-artifact-history.txt"),atomically:true,encoding:.utf8)
 let off=try jsonPayload(RivuneStore.independentPrompt(userPrompt:followup,priorContext:"",attachments:[]));precondition(off["prior_conversation"]=="")
 report["memory_disabled"]=["artifact_bytes_included":0,"explicit_artifact_block":false]
 let largeSnapshot=try ProjectSnapshot(files:artifact.files,omittedFiles:0).composerContext()
 let largePrompt=followup+largeSnapshot
 precondition(largeSnapshot.contains(index) && largeSnapshot.contains(css) && largePrompt.utf8.count>16384)
 report["manual_large_snapshot"]=["file_bytes":artifact.byteCount,"snapshot_context_bytes":largeSnapshot.utf8.count,"composer_prompt_bytes":largePrompt.utf8.count,"contains_complete_files":true,"fits_native_send_16384_byte_guard":false,"source_guard_notice":"Please shorten this prompt before sending","note":"Guard size comparison only; app entrypoint was not executed"]
 try largePrompt.write(to:out.appendingPathComponent("manual-large-snapshot-prompt.txt"),atomically:true,encoding:.utf8)
 let smaller=content(14000);let smallerFiles=[ProjectFile(path:"index.html",content:smaller)]
 let smallSnapshot=try ProjectSnapshot(files:smallerFiles,omittedFiles:0).composerContext()
 let smallPrompt=followup+smallSnapshot
 precondition(smallPrompt.utf8.count<=16384)
 let smallRequest=RivuneStore.independentPrompt(userPrompt:smallPrompt,priorContext:history,attachments:[])
 let smallPayload=try jsonPayload(smallRequest)
 precondition(smallPayload["user_request"]==smallPrompt && smallPayload["user_request"]!.contains(smaller))
 let manualTransport=RecordingTransport();_=try await manualTransport.run(.codexCLI,prompt:smallRequest,options:.accountDefault)
 report["manual_small_snapshot"]=["file_bytes":smaller.utf8.count,"snapshot_context_bytes":smallSnapshot.utf8.count,"composer_prompt_bytes":smallPrompt.utf8.count,"fits_native_send_16384_byte_guard":true,"complete_file_reaches_user_request":true,"recording_calls":await manualTransport.snapshot().count,"note":"Explicit snapshot reattachment preserves full smaller file in protected user_request; not automatic artifact continuation"]
 try smallRequest.write(to:out.appendingPathComponent("manual-small-next-request.txt"),atomically:true,encoding:.utf8)
 let results=try JSONSerialization.data(withJSONObject:report,options:[.prettyPrinted,.sortedKeys,.withoutEscapingSlashes]);try results.write(to:out.appendingPathComponent("results.json"));print(String(decoding:results,as:UTF8.self))
 }
}
