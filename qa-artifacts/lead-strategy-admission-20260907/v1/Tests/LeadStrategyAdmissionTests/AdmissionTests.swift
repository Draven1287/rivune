import Foundation
import XCTest
@testable import LeadStrategyAdmission

final class AdmissionTests: XCTestCase {
    func snapshot(capabilities: [Capability] = [.independentAnswers, .leadReview, .scopedWorkers], permissions: [Permission] = [.workspaceWrite], calls: Int = 20, phases: Int = 2, manual: Strategy? = nil, ready: Bool = true) throws -> Snapshot {
        try Snapshot(runID: UUID(), leadID: "lead", approvedInput: Data("Compare and build a synthetic reading-club website".utf8), members: [
            Member(id: "lead", provider: "provider-a", adapter: "fixture-a", model: "fixture-1", effort: "high", ready: ready),
            Member(id: "partner", provider: "provider-b", adapter: "fixture-b", model: "fixture-2", effort: "high", ready: true)
        ], capabilities: capabilities, permissions: permissions, capabilityEvidenceIDs: ["fixture-capability-receipt"], permissionEvidenceIDs: permissions.isEmpty ? [] : ["fixture-workspace-grant"], workerCount: 2, maximumCalls: calls, maximumPhases: phases, manualOverride: manual)
    }
    func response(_ snapshot: Snapshot, strategy: Strategy = .council, reason: String = "Independent comparisons will clarify the choices.", lead: String? = nil, fingerprint: String? = nil) throws -> Data {
        try JSONEncoder().encode(Proposal(runID: snapshot.runID, leadMemberID: lead ?? snapshot.leadID, frozenInputDigest: fingerprint ?? snapshot.fingerprint(), strategy: strategy, reason: reason, requiredCapabilities: [], requiredPermissions: []))
    }
    func testAdviceAdmitsCouncilAndPreservesLeadReason() throws {
        let s = try snapshot(); let r = try Admission.evaluate(response: response(s), snapshot: s)
        XCTAssertEqual(r.outcome, .accepted); XCTAssertEqual(r.phases, [.council])
        XCTAssertEqual(r.proposal.leadMemberID, "lead"); XCTAssertEqual(r.minimumCallCount, 4)
        XCTAssertEqual(r.proposal.reason, "Independent comparisons will clarify the choices.")
    }
    func testBuildRequiresRealHostWorkerCapabilityEvenIfLeadOmitsIt() throws {
        let s = try snapshot(capabilities: [.independentAnswers, .leadReview])
        let r = try Admission.evaluate(response: response(s, strategy: .swarm), snapshot: s)
        XCTAssertEqual(r.outcome, .unavailable); XCTAssertNil(r.effectiveStrategy); XCTAssertTrue(r.phases.isEmpty)
    }
    func testBuildRequiresHostPermissionEvenIfLeadOmitsIt() throws {
        let s = try snapshot(permissions: [])
        XCTAssertEqual(try Admission.evaluate(response: response(s, strategy: .swarm), snapshot: s).outcome, .unavailable)
        XCTAssertEqual(try Admission.evaluate(response: response(s), snapshot: s).outcome, .accepted)
    }
    func testMixedSequencePreservesOrderWithoutExecutingAnything() throws {
        let s = try snapshot()
        XCTAssertEqual(try Admission.evaluate(response: response(s, strategy: .councilThenSwarm), snapshot: s).phases, [.council, .swarm])
        XCTAssertEqual(try Admission.evaluate(response: response(s, strategy: .swarmThenCouncil), snapshot: s).phases, [.swarm, .council])
    }
    func testUnavailableSwarmIsNotSilentlyReplacedByCouncil() throws {
        let s = try snapshot(capabilities: [.independentAnswers, .leadReview])
        let r = try Admission.evaluate(response: response(s, strategy: .councilThenSwarm), snapshot: s)
        XCTAssertEqual(r.outcome, .unavailable); XCTAssertNil(r.effectiveStrategy); XCTAssertTrue(r.phases.isEmpty)
    }
    func testManualOverrideWinsOverLeadPreference() throws {
        let s = try snapshot(manual: .council)
        XCTAssertThrowsError(try Admission.evaluate(response: response(s, strategy: .swarm), snapshot: s))
        XCTAssertEqual(try Admission.evaluate(response: response(s), snapshot: s).outcome, .accepted)
    }
    func testForeignRunLeadAndFrozenInputRejected() throws {
        let a = try snapshot(), b = try snapshot()
        XCTAssertThrowsError(try Admission.evaluate(response: response(a), snapshot: b))
        XCTAssertThrowsError(try Admission.evaluate(response: response(a, lead: "partner"), snapshot: a))
        XCTAssertThrowsError(try Admission.evaluate(response: response(a, fingerprint: String(repeating: "0", count: 64)), snapshot: a))
    }
    func testBudgetAndReadinessCannotBeExpandedByProposal() throws {
        for s in [try snapshot(calls: 3), try snapshot(phases: 0), try snapshot(ready: false)] {
            XCTAssertEqual(try Admission.evaluate(response: response(s), snapshot: s).outcome, .unavailable)
        }
        let s = try snapshot(calls: 6)
        XCTAssertEqual(try Admission.evaluate(response: response(s, strategy: .councilThenSwarm), snapshot: s).outcome, .unavailable)
    }
    func testMalformedUnknownAndOversizedResponseRejected() throws {
        let s = try snapshot()
        XCTAssertThrowsError(try Admission.evaluate(response: Data(repeating: 32, count: 8193), snapshot: s))
        XCTAssertThrowsError(try Admission.evaluate(response: response(s, reason: "  "), snapshot: s))
        XCTAssertThrowsError(try Admission.evaluate(response: response(s, reason: String(repeating: "é", count: 257)), snapshot: s))
        var json = try JSONSerialization.jsonObject(with: response(s)) as! [String: Any]
        json["grantAllTools"] = true
        XCTAssertThrowsError(try Admission.evaluate(response: JSONSerialization.data(withJSONObject: json), snapshot: s))
        json.removeValue(forKey: "grantAllTools"); json["requiredCapabilities"] = ["imaginary-adapter"]
        XCTAssertThrowsError(try Admission.evaluate(response: JSONSerialization.data(withJSONObject: json), snapshot: s))
    }
    func testTypedTeamFingerprintHasNoDelimiterOrModelCollisions() throws {
        func make(_ provider: String, _ adapter: String) throws -> Snapshot {
            try Snapshot(runID: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!, leadID: "lead", approvedInput: Data(), members: [Member(id: "lead", provider: provider, adapter: adapter, model: "model", effort: "default", ready: true)], capabilities: [], permissions: [], capabilityEvidenceIDs: [], permissionEvidenceIDs: [], workerCount: 0, maximumCalls: 0, maximumPhases: 0)
        }
        XCTAssertNotEqual(try make("a:b", "c").fingerprint(), try make("a", "b:c").fingerprint())
    }
    func testReceiptPersistsBeforeAdmissionReturnsAndDuplicateDoesNotPersistAgain() async throws {
        let recorder = Recorder(); let gate = AdmissionGate { try recorder.save($0) }; let s = try snapshot()
        let r = try await gate.admit(response: response(s), snapshot: s)
        XCTAssertEqual(r.outcome, .accepted); XCTAssertEqual(recorder.count, 1)
        do { _ = try await gate.admit(response: response(s), snapshot: s); XCTFail("Duplicate admitted") } catch AdmissionError.consumedRun {} catch { XCTFail("Wrong error") }
        XCTAssertEqual(recorder.count, 1)
    }
    func testFailedPersistenceReturnsNoAdmissionAndCannotRetryAmbiguousRun() async throws {
        let recorder = Recorder(fail: true); let gate = AdmissionGate { try recorder.save($0) }; let s = try snapshot()
        do { _ = try await gate.admit(response: response(s), snapshot: s); XCTFail("Persistence failure accepted") } catch AdmissionError.storageFailure {} catch { XCTFail("Wrong error") }
        do { _ = try await gate.admit(response: response(s), snapshot: s); XCTFail("Ambiguous run retried") } catch AdmissionError.consumedRun {} catch { XCTFail("Wrong error") }
        XCTAssertEqual(recorder.count, 1)
    }
}
private final class Recorder: @unchecked Sendable {
    private let lock = NSLock()
    private var writes = 0
    let fail: Bool
    init(fail: Bool = false) { self.fail = fail }
    var count: Int { lock.withLock { writes } }
    func save(_ data: Data) throws {
        lock.withLock { writes += 1 }
        if fail { throw AdmissionError.storageFailure }
        _ = try JSONSerialization.jsonObject(with: data)
    }
}
