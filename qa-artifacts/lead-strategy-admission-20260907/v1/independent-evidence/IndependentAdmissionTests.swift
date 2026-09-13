import Foundation
import XCTest
@testable import LeadStrategyAdmission
final class IndependentAdmissionTests: XCTestCase {
 func snap(id:UUID=UUID(),input:String="approved A",model:String="model",effort:String="high",caps:[Capability]=[.independentAnswers,.leadReview,.scopedWorkers],permissions:[Permission]=[.workspaceWrite],workers:Int=2,calls:Int=7,phases:Int=2) throws -> Snapshot {
  try Snapshot(runID:id,leadID:"lead",approvedInput:Data(input.utf8),members:[Member(id:"lead",provider:"p",adapter:"a",model:model,effort:effort,ready:true),Member(id:"other",provider:"p2",adapter:"a2",model:"m2",effort:"default",ready:true)],capabilities:caps,permissions:permissions,capabilityEvidenceIDs:["host-caps"],permissionEvidenceIDs:permissions.isEmpty ? [] : ["host-grant"],workerCount:workers,maximumCalls:calls,maximumPhases:phases)
 }
 func reply(_ s:Snapshot,_ strategy:Strategy = .council) throws -> Data {try JSONEncoder().encode(Proposal(runID:s.runID,leadMemberID:s.leadID,frozenInputDigest:s.fingerprint(),strategy:strategy,reason:"Synthetic choice",requiredCapabilities:[],requiredPermissions:[]))}
 func testOmittedLeadReviewNeverBypassesHostRequirement() throws {
  let s=try snap(caps:[.independentAnswers,.scopedWorkers])
  for mode in [Strategy.council,.swarm,.councilThenSwarm,.swarmThenCouncil] {let r=try Admission.evaluate(response:reply(s,mode),snapshot:s);XCTAssertEqual(r.outcome,.unavailable);XCTAssertTrue(r.phases.isEmpty)}
 }
 func testExactBudgetsAndWorkerBounds() throws {
  let good=try snap();let r=try Admission.evaluate(response:reply(good,.councilThenSwarm),snapshot:good);XCTAssertEqual(r.minimumCallCount,7);XCTAssertEqual(r.outcome,.accepted)
  for s in [try snap(calls:6),try snap(phases:1),try snap(workers:1),try snap(workers:3)] {XCTAssertEqual(try Admission.evaluate(response:reply(s,.councilThenSwarm),snapshot:s).outcome,.unavailable)}
 }
 func testFrozenInputModelAndEffortChangesCannotReuseProposal() throws {
  let id=UUID(),old=try snap(id:id),bytes=try reply(old)
  for s in [try snap(id:id,input:"approved B"),try snap(id:id,model:"new-model"),try snap(id:id,effort:"low"),try snap(id:id,permissions:[])] {XCTAssertThrowsError(try Admission.evaluate(response:bytes,snapshot:s))}
 }
 func testConcurrentDuplicatesPersistExactlyOnce() async throws {
  let recorder=IndependentRecorder(),gate=AdmissionGate{recorder.save($0)},s=try snap(),bytes=try reply(s)
  let admitted=await withTaskGroup(of:Bool.self) {group in
   for _ in 0..<20 {group.addTask {do {_ = try await gate.admit(response:bytes,snapshot:s);return true}catch{return false}}}
   var n=0;for await value in group {if value {n+=1}};return n
  }
  XCTAssertEqual(admitted,1);XCTAssertEqual(recorder.count,1)
 }
 func testInvalidProposalDoesNotReserveBeforeCorrectedAdmission() async throws {
  let recorder=IndependentRecorder(),gate=AdmissionGate{recorder.save($0)},s=try snap()
  do {_ = try await gate.admit(response:Data("{}".utf8),snapshot:s);XCTFail("Invalid accepted")}catch{}
  let r=try await gate.admit(response:reply(s),snapshot:s);XCTAssertEqual(r.outcome,.accepted);XCTAssertEqual(recorder.count,1)
 }
 func testUnavailableResultCannotExposePartialPlan() async throws {
  let recorder=IndependentRecorder(),gate=AdmissionGate{recorder.save($0)},s=try snap(permissions:[])
  let r=try await gate.admit(response:reply(s,.swarmThenCouncil),snapshot:s);XCTAssertEqual(r.outcome,.unavailable);XCTAssertTrue(r.phases.isEmpty);XCTAssertEqual(recorder.count,1)
  do {_ = try await gate.admit(response:reply(s,.council),snapshot:s);XCTFail("Unavailable decision silently retried as Council")}catch AdmissionError.consumedRun {}catch {XCTFail("Wrong error")}
 }
 func testAmbiguousWriteThenThrowDoesNotReturnOrRepeatReceipt() async throws {
  let recorder=IndependentRecorder(),gate=AdmissionGate{bytes in recorder.save(bytes);throw AdmissionError.storageFailure},s=try snap(),bytes=try reply(s)
  for _ in 0..<2 {do {_ = try await gate.admit(response:bytes,snapshot:s);XCTFail("Ambiguous write accepted")}catch{}}
  XCTAssertEqual(recorder.count,1)
 }
 func testCapacityCannotDropConsumedIDs() async throws {
  let recorder=IndependentRecorder(),gate=AdmissionGate{recorder.save($0)},first=try snap()
  _ = try await gate.admit(response:reply(first),snapshot:first)
  for _ in 1..<256 {let s=try snap();_ = try await gate.admit(response:reply(s),snapshot:s)}
  let extra=try snap();do {_ = try await gate.admit(response:reply(extra),snapshot:extra);XCTFail("Full gate admitted")}catch AdmissionError.capacityReached{}catch{XCTFail("Wrong capacity error")}
  do {_ = try await gate.admit(response:reply(first),snapshot:first);XCTFail("Old ID admitted")}catch AdmissionError.consumedRun{}catch{XCTFail("Wrong consumed error")}
  XCTAssertEqual(recorder.count,256)
 }
}
private final class IndependentRecorder:@unchecked Sendable {private let lock=NSLock();private var n=0;var count:Int{lock.withLock{n}};func save(_ d:Data){lock.withLock{n+=1}}}
