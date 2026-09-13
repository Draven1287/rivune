import Foundation
import CryptoKit

public enum Strategy: String, Codable, Sendable {
    case council, swarm, councilThenSwarm, swarmThenCouncil
    public var phases: [Phase] {
        switch self {
        case .council: [.council]
        case .swarm: [.swarm]
        case .councilThenSwarm: [.council, .swarm]
        case .swarmThenCouncil: [.swarm, .council]
        }
    }
}
public enum Phase: String, Codable, Sendable { case council, swarm }
public enum Capability: String, Codable, Sendable { case independentAnswers, leadReview, scopedWorkers }
public enum Permission: String, Codable, Sendable { case workspaceWrite }
public struct Member: Codable, Equatable, Sendable {
    public let id: String
    public let provider: String
    public let adapter: String
    public let model: String
    public let effort: String
    public let ready: Bool
    public init(id: String, provider: String, adapter: String, model: String, effort: String, ready: Bool) {
        self.id = id; self.provider = provider; self.adapter = adapter
        self.model = model; self.effort = effort; self.ready = ready
    }
}
/// Host-owned facts. These are not fields the lead response is allowed to supply.
public struct Snapshot: Encodable, Equatable, Sendable {
    public let runID: UUID
    public let leadID: String
    public let inputSHA256: String
    public let members: [Member]
    public let capabilities: [Capability]
    public let permissions: [Permission]
    public let capabilityEvidenceIDs: [String]
    public let permissionEvidenceIDs: [String]
    public let workerCount: Int
    public let maximumCalls: Int
    public let maximumPhases: Int
    public let manualOverride: Strategy?
    public init(runID: UUID, leadID: String, approvedInput: Data, members: [Member], capabilities: [Capability], permissions: [Permission], capabilityEvidenceIDs: [String], permissionEvidenceIDs: [String], workerCount: Int, maximumCalls: Int, maximumPhases: Int, manualOverride: Strategy? = nil) throws {
        guard approvedInput.count <= 256 * 1024, (1...6).contains(members.count),
              Set(members.map(\.id)).count == members.count,
              members.contains(where: { $0.id == leadID }),
              members.allSatisfy({ [$0.id, $0.provider, $0.adapter, $0.model, $0.effort].allSatisfy(validLabel) }),
              Set(capabilities).count == capabilities.count,
              Set(permissions).count == permissions.count,
              capabilityEvidenceIDs.count <= 32, permissionEvidenceIDs.count <= 32,
              capabilityEvidenceIDs.allSatisfy(validLabel), permissionEvidenceIDs.allSatisfy(validLabel),
              (0...6).contains(workerCount), (0...100).contains(maximumCalls), (0...2).contains(maximumPhases)
        else { throw AdmissionError.invalidSnapshot }
        self.runID = runID; self.leadID = leadID; self.inputSHA256 = digest(approvedInput)
        self.members = members.sorted { $0.id < $1.id }
        self.capabilities = capabilities.sorted { $0.rawValue < $1.rawValue }
        self.permissions = permissions.sorted { $0.rawValue < $1.rawValue }
        self.capabilityEvidenceIDs = capabilityEvidenceIDs.sorted()
        self.permissionEvidenceIDs = permissionEvidenceIDs.sorted()
        self.workerCount = workerCount; self.maximumCalls = maximumCalls
        self.maximumPhases = maximumPhases; self.manualOverride = manualOverride
    }
    public func fingerprint() throws -> String { digest(try canonical(self)) }
}
public struct Proposal: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let runID: UUID
    public let leadMemberID: String
    public let frozenInputDigest: String
    public let strategy: Strategy
    public let reason: String
    public let requiredCapabilities: [Capability]
    public let requiredPermissions: [Permission]
    public init(runID: UUID, leadMemberID: String, frozenInputDigest: String, strategy: Strategy, reason: String, requiredCapabilities: [Capability], requiredPermissions: [Permission], schemaVersion: Int = 1) {
        self.schemaVersion = schemaVersion; self.runID = runID; self.leadMemberID = leadMemberID
        self.frozenInputDigest = frozenInputDigest; self.strategy = strategy; self.reason = reason
        self.requiredCapabilities = requiredCapabilities; self.requiredPermissions = requiredPermissions
    }
}
public enum AdmissionError: Error { case invalidSnapshot, invalidProposal, consumedRun, storageFailure, capacityReached }
public enum Outcome: String, Codable, Sendable { case accepted, unavailable }
public struct Receipt: Encodable, Equatable, Sendable {
    public let proposal: Proposal
    public let snapshot: Snapshot
    public let outcome: Outcome
    public let effectiveStrategy: Strategy?
    public let minimumCallCount: Int
    public let unavailableReasons: [String]
    public var phases: [Phase] { effectiveStrategy?.phases ?? [] }
}
private func validLabel(_ value: String) -> Bool {
    !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.utf8.count <= 256
}
private func digest(_ bytes: Data) -> String { SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined() }
private func canonical<T: Encodable>(_ value: T) throws -> Data {
    let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]; return try encoder.encode(value)
}

public enum Admission {
    /// No provider calls and no phase dispatch. Missing model requirements cannot reduce host requirements.
    public static func evaluate(response: Data, snapshot: Snapshot) throws -> Receipt {
        guard response.count <= 8192,
              let object = try? JSONSerialization.jsonObject(with: response) as? [String: Any],
              Set(object.keys) == Set(["schemaVersion", "runID", "leadMemberID", "frozenInputDigest", "strategy", "reason", "requiredCapabilities", "requiredPermissions"]),
              let proposal = try? JSONDecoder().decode(Proposal.self, from: response),
              proposal.schemaVersion == 1, proposal.runID == snapshot.runID,
              proposal.leadMemberID == snapshot.leadID,
              proposal.frozenInputDigest == (try snapshot.fingerprint()),
              !proposal.reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              proposal.reason.utf8.count <= 512,
              Set(proposal.requiredCapabilities).count == proposal.requiredCapabilities.count,
              Set(proposal.requiredPermissions).count == proposal.requiredPermissions.count,
              snapshot.manualOverride == nil || snapshot.manualOverride == proposal.strategy
        else { throw AdmissionError.invalidProposal }

        let phases = proposal.strategy.phases
        var required: Set<Capability> = [.leadReview]
        var permissions = Set(proposal.requiredPermissions)
        var reasons: [String] = []
        // Reserve one lead routing call, plus the minimum successful execution path.
        // Repair/retry calls must remain under maximumCalls at execution time.
        var calls = 1
        if phases.contains(.council) {
            required.insert(.independentAnswers)
            calls += snapshot.members.count + 1
            if snapshot.members.count < 2 { reasons.append("Council needs at least two independent members.") }
        }
        if phases.contains(.swarm) {
            required.insert(.scopedWorkers); permissions.insert(.workspaceWrite)
            calls += snapshot.workerCount + 1
            if snapshot.workerCount < 2 || snapshot.workerCount > snapshot.members.count {
                reasons.append("Swarm needs at least two scoped workers within this team.")
            }
        }
        required.formUnion(proposal.requiredCapabilities)
        if !required.isSubset(of: Set(snapshot.capabilities)) || snapshot.capabilityEvidenceIDs.isEmpty {
            reasons.append("Required execution capabilities are unavailable.")
        }
        if !permissions.isSubset(of: Set(snapshot.permissions)) || (!permissions.isEmpty && snapshot.permissionEvidenceIDs.isEmpty) {
            reasons.append("Required workspace permission is unavailable.")
        }
        if snapshot.members.contains(where: { !$0.ready }) { reasons.append("A selected team member is not ready.") }
        if calls > snapshot.maximumCalls { reasons.append("The selected strategy exceeds the call budget.") }
        if phases.count > snapshot.maximumPhases { reasons.append("The selected strategy exceeds the phase budget.") }
        return Receipt(proposal: proposal, snapshot: snapshot, outcome: reasons.isEmpty ? .accepted : .unavailable,
                       effectiveStrategy: reasons.isEmpty ? proposal.strategy : nil,
                       minimumCallCount: calls, unavailableReasons: reasons)
    }
}

/// Process-local gate. A host persistence closure must commit the receipt before this gate returns it.
/// Native orchestration still owns capability checks at each effect, budgets, phase execution and recovery.
public actor AdmissionGate {
    private var consumed: Set<UUID> = []
    private let persist: @Sendable (Data) throws -> Void
    public init(persist: @escaping @Sendable (Data) throws -> Void) { self.persist = persist }
    public func admit(response: Data, snapshot: Snapshot) throws -> Receipt {
        guard !consumed.contains(snapshot.runID) else { throw AdmissionError.consumedRun }
        guard consumed.count < 256 else { throw AdmissionError.capacityReached }
        let receipt = try Admission.evaluate(response: response, snapshot: snapshot)
        // Consume before invoking persistence: an ambiguous failure must not enable duplicate effects.
        consumed.insert(snapshot.runID)
        do { try persist(canonical(receipt)) } catch { throw AdmissionError.storageFailure }
        return receipt
    }
}
