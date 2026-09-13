import Foundation

struct TeamRouteReference: Codable, Hashable, Sendable {
    let transportID: String
    let providerID: String
    let adapterID: String

    init(_ route: AIExecutionRoute) {
        transportID = route.transportID; providerID = route.providerID; adapterID = route.runtimeAdapterID
    }
    var registeredRoute: AIExecutionRoute? {
        [AIExecutionRoute.codexCLI, .claudeCodeCLI].first { TeamRouteReference($0) == self }
    }
}

struct TeamMemberConfiguration: Codable, Hashable, Sendable {
    let memberID: String
    let displayName: String
    let routeRef: TeamRouteReference
    let requestedModelID: String?
    let requestedEffort: String?
    var options: TerminalRunOptions { .init(model: requestedModelID, effort: requestedEffort) }
    var identity: CouncilParticipantIdentity {
        .init(id: memberID, providerID: routeRef.providerID, adapterID: routeRef.adapterID,
              modelID: requestedModelID, displayName: displayName, requestedEffort: requestedEffort, routeRef: routeRef)
    }
}

enum TeamOrchestratorFallback: Codable, Hashable, Sendable {
    case stop
    case orderedMemberIDs([String])
    var memberIDs: [String] { if case .orderedMemberIDs(let ids) = self { return ids }; return [] }
}

enum TeamWorkflow: String, Codable, Hashable, Sendable { case council, swarm }

/// Fixed local scheduling policy, not an account capacity measurement.
struct TeamExecutionLimits: Codable, Hashable, Sendable {
    var maximumMembers = 6
    var maximumConcurrentCalls = 2
    var maximumConcurrentCallsPerRoute = 1
    var maximumInputBytes = CouncilRunner.maximumInputBytes
    var maximumOutputBytes = CouncilRunner.maximumOutputBytes
    var maximumLengthRepairs = 1
    static let current = TeamExecutionLimits()
}

struct TeamRunConfiguration: Codable, Hashable, Sendable {
    var schemaVersion = 1
    let members: [TeamMemberConfiguration]
    let orchestratorMemberID: String
    let fallback: TeamOrchestratorFallback
    var workflow: TeamWorkflow = .council
    var limits: TeamExecutionLimits = .current

    func validate() throws {
        let ids = Set(members.map(\.memberID))
        guard schemaVersion == 1, workflow == .council, limits == .current,
              (2...limits.maximumMembers).contains(members.count), ids.count == members.count,
              ids.contains(orchestratorMemberID), Set(fallback.memberIDs).count == fallback.memberIDs.count,
              Set(fallback.memberIDs).isSubset(of: ids), !fallback.memberIDs.contains(orchestratorMemberID),
              members.allSatisfy({ member in
                  !member.memberID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && member.memberID.utf8.count <= 128 &&
                  !member.displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && member.displayName.utf8.count <= 128 &&
                  member.routeRef.registeredRoute != nil &&
                  [member.requestedModelID, member.requestedEffort].allSatisfy { $0 == nil || (!$0!.isEmpty && $0!.utf8.count <= 256 && !$0!.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains)) }
              }) else { throw TeamConfigurationError.invalidConfiguration }
    }

    func participants(admittedBy evidence: TeamAdmissionEvidence) throws -> [CouncilParticipant] {
        try validate()
        return try members.map { member in
            guard let route = member.routeRef.registeredRoute,
                  evidence.accepts(member) else { throw TeamConfigurationError.unavailableMember(member.displayName) }
            return .init(identity: member.identity, route: route, options: member.options)
        }
    }
    func matches(_ participants: [CouncilParticipant]) -> Bool {
        guard participants.count == members.count else { return false }
        return zip(members, participants).allSatisfy { member, participant in
            member.identity == participant.identity && member.routeRef.registeredRoute == participant.route && member.options == participant.options
        }
    }
}

/// Current adapter evidence is supplied by the app, never by model output or a
/// serialized preset. Advertised option pairs do not imply account entitlement.
struct TeamAdmissionEvidence: Sendable {
    struct Route: Sendable {
        let reference: TeamRouteReference
        let isReady: Bool
        let supportedOptions: Set<TerminalRunOptions>
        let source: String
        let observedAt: Date
    }
    var routes: [Route] = []
    func accepts(_ member: TeamMemberConfiguration, now: Date = .now) -> Bool {
        let matches = routes.filter { $0.reference == member.routeRef }
        guard matches.count == 1, let route = matches.first,
              route.isReady, !route.source.isEmpty,
              (0...604_800).contains(now.timeIntervalSince(route.observedAt)) else { return false }
        return member.options == .accountDefault || route.supportedOptions.contains(member.options)
    }
}

struct SavedTeamConfiguration: Codable, Hashable, Sendable {
    var schemaVersion = 1
    let id: UUID
    let name: String
    let configuration: TeamRunConfiguration
    func validate() throws {
        guard schemaVersion == 1, !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.utf8.count <= 128 else { throw TeamConfigurationError.invalidConfiguration }
        try configuration.validate()
    }
}

enum TeamConfigurationError: LocalizedError {
    case invalidConfiguration, unavailableMember(String), unreadableStorage
    var errorDescription: String? {
        switch self {
        case .invalidConfiguration: "The saved team configuration is invalid or unsupported. Review the team before sending."
        case .unavailableMember(let name): "\(name) is unavailable with the saved route, model or reasoning. Reconnect or edit the team for a new request; this run will not silently change its options."
        case .unreadableStorage: "The saved team could not be read. Its file has been preserved."
        }
    }
}

@MainActor
final class TeamConfigurationStorage {
    private let file: URL?
    private var memory: SavedTeamConfiguration?
    init(file: URL? = nil) { self.file = file }
    func load() throws -> SavedTeamConfiguration? {
        guard let file else { return memory }
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        do {
            guard ((try file.resourceValues(forKeys: [.fileSizeKey])).fileSize ?? Int.max) <= 65_536 else { throw TeamConfigurationError.unreadableStorage }
            let saved = try JSONDecoder().decode(SavedTeamConfiguration.self, from: Data(contentsOf: file))
            try saved.validate(); return saved
        } catch { throw TeamConfigurationError.unreadableStorage }
    }
    func save(_ value: SavedTeamConfiguration) throws {
        try value.validate()
        guard let file else { memory = value; return }
        _ = try load() // Never overwrite an unreadable or unsupported existing file.
        let data = try JSONEncoder().encode(value)
        guard data.count <= 65_536 else { throw TeamConfigurationError.invalidConfiguration }
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: file, options: .atomic)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
    }
}

/// Shared for every Council run owned by one coordinator, including all lead,
/// fallback and repair calls. Routes are local process lanes, not account IDs.
actor CouncilCallGate {
    struct Waiter { let id: UUID; let route: AIExecutionRoute; let continuation: CheckedContinuation<Void, Error> }
    private var running: [UUID: AIExecutionRoute] = [:]
    private var waiters: [Waiter] = []
    func acquire(_ id: UUID, route: AIExecutionRoute) async throws {
        try Task.checkCancellation()
        try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                waiters.append(.init(id: id, route: route, continuation: continuation))
                drain()
            }
        } onCancel: { Task { await self.cancelWaiting(id) } }
    }
    private func cancelWaiting(_ id: UUID) {
        guard let index = waiters.firstIndex(where: { $0.id == id }) else { return }
        waiters.remove(at: index).continuation.resume(throwing: CancellationError())
        drain()
    }
    private func drain() {
        while running.count < TeamExecutionLimits.current.maximumConcurrentCalls,
              let index = waiters.firstIndex(where: { !running.values.contains($0.route) }) {
            let waiter = waiters.remove(at: index)
            running[waiter.id] = waiter.route
            waiter.continuation.resume()
        }
    }
    func release(_ id: UUID) { running[id] = nil; drain() }
    func occupancy() -> (running: Int, waiting: Int) { (running.count, waiters.count) }
}

struct GatedCouncilTextRunner: AITextRunning {
    let base: any AITextRunning
    let gate: CouncilCallGate
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        let id = UUID()
        try await gate.acquire(id, route: route)
        do {
            // Cancellation can race the grant; do not invoke the provider then.
            try Task.checkCancellation()
            let output = try await base.run(route, prompt: prompt, options: options)
            try Task.checkCancellation()
            await gate.release(id)
            return output
        } catch { await gate.release(id); throw error }
    }
}
