import Foundation
struct Identity: Equatable {let id:String;let providerID:String;let adapterID:String;let routeRef:String?}
struct Result {let participant:Identity;let isSuccessful:Bool}
struct Appointment {let participant:Identity;let policyVersion:String;let reason:String;let evidenceBasis:String;let replacesParticipantID:String?}
struct Member {let identity:Identity}
struct Fallback {let memberIDs:[String]}
struct Team {let members:[Member];let orchestratorMemberID:String;let fallback:Fallback;func validate() throws {}}
struct Artifact: Equatable {func validate() throws {}}
struct Context {let isStructurallyValid:Bool;let selectedArtifactReference:Artifact?}
enum CouncilRecordValidationError: Error {case invalidSavedResults}
struct AIExecutionRoute {let providerID:String;let runtimeAdapterID:String;static let codexCLI=Self(providerID:"openai",runtimeAdapterID:"codex");static let claudeCodeCLI=Self(providerID:"anthropic",runtimeAdapterID:"claude")}
struct Baseline {

 var selectedArtifact:Artifact?=nil
 var approvedPromptContext:Context?=nil
 var approvedContext=""
 var participants:[Identity]
 var results:[Result]
 var teamConfiguration:Team?=nil
 var appointments:[Appointment]=[]
    func validateSavedResults() throws {
        try selectedArtifact?.validate()
        if let approvedPromptContext {
            guard approvedContext.isEmpty,
                  approvedPromptContext.isStructurallyValid,
                  approvedPromptContext.selectedArtifactReference == selectedArtifact else {
                throw CouncilRecordValidationError.invalidSavedResults
            }
        }
        guard (2...6).contains(participants.count),
              Set(participants.map(\.id)).count == participants.count,
              Set(results.map { $0.participant.id }).count == results.count,
              results.allSatisfy({ participants.contains($0.participant) }) else { throw CouncilRecordValidationError.invalidSavedResults }
        if let teamConfiguration {
            try teamConfiguration.validate()
            guard teamConfiguration.members.map(\.identity) == participants else { throw CouncilRecordValidationError.invalidSavedResults }
        } else {
            guard participants.allSatisfy({ identity in
                identity.routeRef == nil && [AIExecutionRoute.codexCLI, .claudeCodeCLI].contains {
                    $0.providerID == identity.providerID && $0.runtimeAdapterID == identity.adapterID
                }
            }) else { throw CouncilRecordValidationError.invalidSavedResults }
        }
    }
}
struct Candidate {

 var selectedArtifact:Artifact?=nil
 var approvedPromptContext:Context?=nil
 var approvedContext=""
 var participants:[Identity]
 var results:[Result]
 var teamConfiguration:Team?=nil
 var appointments:[Appointment]=[]
    func validateSavedResults() throws {
        try selectedArtifact?.validate()
        if let approvedPromptContext {
            guard approvedContext.isEmpty,
                  approvedPromptContext.isStructurallyValid,
                  approvedPromptContext.selectedArtifactReference == selectedArtifact else {
                throw CouncilRecordValidationError.invalidSavedResults
            }
        }
        guard (2...6).contains(participants.count),
              Set(participants.map(\.id)).count == participants.count,
              Set(results.map { $0.participant.id }).count == results.count,
              results.allSatisfy({ participants.contains($0.participant) }) else { throw CouncilRecordValidationError.invalidSavedResults }
        let successfulParticipantIDs = Set(results.filter(\.isSuccessful).map { $0.participant.id })
        let permittedLeadIDs: Set<String>
        if let teamConfiguration {
            try teamConfiguration.validate()
            guard teamConfiguration.members.map(\.identity) == participants else { throw CouncilRecordValidationError.invalidSavedResults }
            permittedLeadIDs = Set([teamConfiguration.orchestratorMemberID] + teamConfiguration.fallback.memberIDs)
        } else {
            guard participants.allSatisfy({ identity in
                identity.routeRef == nil && [AIExecutionRoute.codexCLI, .claudeCodeCLI].contains {
                    $0.providerID == identity.providerID && $0.runtimeAdapterID == identity.adapterID
                }
            }) else { throw CouncilRecordValidationError.invalidSavedResults }
            permittedLeadIDs = Set(participants.map(\.id))
        }
        for (index, appointment) in appointments.enumerated() {
            guard participants.contains(appointment.participant),
                  successfulParticipantIDs.contains(appointment.participant.id),
                  permittedLeadIDs.contains(appointment.participant.id),
                  appointment.policyVersion == (teamConfiguration == nil ? "council-lead-v1" : "selected-orchestrator-v1"),
                  !appointment.reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  !appointment.evidenceBasis.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  appointment.reason.utf8.count <= 1_024,
                  appointment.evidenceBasis.utf8.count <= 1_024,
                  appointment.replacesParticipantID == (index == 0 ? nil : appointments[index - 1].participant.id) else {
                throw CouncilRecordValidationError.invalidSavedResults
            }
        }
    }
}

let a=Identity(id:"a",providerID:"openai",adapterID:"codex",routeRef:nil),b=Identity(id:"b",providerID:"anthropic",adapterID:"claude",routeRef:nil),foreign=Identity(id:"outside",providerID:"forged",adapterID:"forged",routeRef:nil)
let results=[Result(participant:a,isSuccessful:true),Result(participant:b,isSuccessful:true)]
let team=Team(members:[Member(identity:a),Member(identity:b)],orchestratorMemberID:"b",fallback:Fallback(memberIDs:["a"]))
func app(_ who:Identity,_ previous:String?=nil,policy:String="selected-orchestrator-v1")->Appointment {Appointment(participant:who,policyVersion:policy,reason:"Frozen lead",evidenceBasis:"Frozen policy",replacesParticipantID:previous)}
func rejects(_ record:Candidate)->Bool {do {try record.validateSavedResults();return false}catch{return true}}
var baseline=Baseline(participants:[a,b],results:results,teamConfiguration:team,appointments:[app(foreign)])
try baseline.validateSavedResults()
var candidate=Candidate(participants:[a,b],results:results,teamConfiguration:team,appointments:[app(foreign)])
precondition(rejects(candidate));print("PASS: original foreign appointment accepted by baseline, rejected by candidate")
candidate.appointments=[app(b),app(a,"b")];try candidate.validateSavedResults();print("PASS: configured lead-to-fallback chain")
candidate.appointments=[app(b),app(a,"b"),app(b,"a")];try candidate.validateSavedResults();print("PASS: retained chain across retry allows restarting configured lead")
candidate.appointments=[];try candidate.validateSavedResults();print("PASS: historical/pre-lead empty appointments remain readable")
candidate.teamConfiguration=nil;candidate.appointments=[app(a,policy:"council-lead-v1"),app(b,"a",policy:"council-lead-v1")];try candidate.validateSavedResults();print("PASS: legacy policy chain remains readable")
candidate.teamConfiguration=team;candidate.appointments=[app(b,policy:"wrong")];precondition(rejects(candidate));print("PASS: wrong policy rejected")
candidate.appointments=[app(b),app(a,"outside")];precondition(rejects(candidate));print("PASS: broken replacement chain rejected")
candidate.appointments=[app(b)];candidate.results=[Result(participant:a,isSuccessful:true),Result(participant:b,isSuccessful:false)];precondition(rejects(candidate));print("PASS: failed independent lead rejected")
candidate.results=results;candidate.teamConfiguration=Team(members:team.members,orchestratorMemberID:"b",fallback:Fallback(memberIDs:[]));candidate.appointments=[app(a)];precondition(rejects(candidate));print("PASS: fallback outside stop policy rejected")
