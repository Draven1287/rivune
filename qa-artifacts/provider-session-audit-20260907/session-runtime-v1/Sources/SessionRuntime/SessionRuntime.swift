import Foundation
import CryptoKit
import Darwin

public enum SessionError: Error, Equatable { case invalidInput, conflict, busy, resetRequired, storageUnavailable, corruptStore, storeOwned, full, foreignEvent }
public enum SessionRoute: String, Codable, Sendable { case codexAppServerV1, claudeSessionV1 }
public enum SessionEffort: String, Codable, Sendable { case accountDefault, low, medium, high }
public enum SessionTools: String, Codable, Sendable { case none }
public enum HistoryRole: String, Codable, Sendable { case user, assistant }
public struct HistoryMessage: Codable, Equatable, Sendable {
    public let role: HistoryRole
    public let text: String
    public init(_ role: HistoryRole, _ text: String) { self.role = role; self.text = text }
}
/// Document and artifact bytes are reference data, never historical user messages.
public struct SessionReference: Codable, Equatable, Sendable {
    public let name: String
    public let bytes: Data
    public init(name: String, bytes: Data) { self.name = name; self.bytes = bytes }
    public var sha256: String { digest(bytes) }
}
public struct ApprovedTurnInput: Codable, Equatable, Sendable {
    public let message: String
    public let documents: [SessionReference]
    public let artifact: SessionReference?
    public let projectInstructions: String?
    public let projectInstructionVersion: UUID?
    public init(message: String, documents: [SessionReference] = [], artifact: SessionReference? = nil, projectInstructions: String? = nil, projectInstructionVersion: UUID? = nil) {
        self.message = message; self.documents = documents; self.artifact = artifact
        self.projectInstructions = projectInstructions; self.projectInstructionVersion = projectInstructionVersion
    }
    func validate() throws {
        guard !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, message.utf8.count <= 16_384,
              documents.count <= 6, documents.reduce(0, { $0 + $1.bytes.count }) <= 20_000,
              (projectInstructions?.utf8.count ?? 0) <= 8_000,
              (projectInstructions == nil) == (projectInstructionVersion == nil),
              (artifact?.bytes.count ?? 0) <= 256_000 else { throw SessionError.invalidInput }
        for file in documents + (artifact.map { [$0] } ?? []) {
            guard !file.name.isEmpty, file.name.utf8.count <= 256 else { throw SessionError.invalidInput }
        }
    }
}
public struct SessionKey: Codable, Equatable, Hashable, Sendable {
    public let conversationID: UUID
    public let route: SessionRoute
    public init(conversationID: UUID, route: SessionRoute) { self.conversationID = conversationID; self.route = route }
}
public struct SessionRequest: Codable, Equatable, Sendable {
    public let runID: UUID
    public let key: SessionKey
    public let requestedModel: String
    public let effort: SessionEffort
    public let tools: SessionTools
    public let input: ApprovedTurnInput
    /// Supplied exactly once when creating a binding. Nil on every continuation.
    public let historySeed: [HistoryMessage]?
    public init(runID: UUID = UUID(), key: SessionKey, requestedModel: String, effort: SessionEffort = .accountDefault, input: ApprovedTurnInput, historySeed: [HistoryMessage]? = nil) {
        self.runID = runID; self.key = key; self.requestedModel = requestedModel; self.effort = effort
        self.tools = .none; self.input = input; self.historySeed = historySeed
    }
    func validate() throws {
        try input.validate()
        guard !requestedModel.isEmpty, requestedModel.utf8.count <= 256,
              (historySeed?.count ?? 0) <= 16,
              try canonical(historySeed).count <= 12_000 else { throw SessionError.invalidInput }
    }
}
public enum SessionPhase: String, Codable, Sendable {
    case pending, running, stopRequested, completed, interrupted, failed, outcomeUnknown
    var active: Bool { self == .pending || self == .running || self == .stopRequested }
}
public struct SessionRecord: Codable, Equatable, Sendable {
    public let runID: UUID
    public let key: SessionKey
    public let bindingID: UUID
    public let fingerprint: String
    public var phase: SessionPhase
    public var providerSessionID: String?
    public var providerTurnID: String?
    public var sequence: UInt64
    public var preview: String
    public var finalText: String?
    public var stopWasRequested: Bool
}
struct Binding: Codable, Sendable {
    let id: UUID
    let key: SessionKey
    var archived = false
    var providerSessionID: String?
    var requiresReset: Bool
}
struct Snapshot: Codable, Sendable {
    var version = 1
    var bindings: [Binding] = []
    var records: [SessionRecord] = []
}
public struct SessionLaunch: Sendable {
    public let request: SessionRequest
    public let resumeSessionID: String?
}
public struct SessionInterrupt: Equatable, Sendable {
    public let runID: UUID
    public let providerSessionID: String?
    public let providerTurnID: String?
}
public enum BeginEffect: Sendable { case launch(SessionLaunch), existing(SessionRecord) }
public enum EventEffect: Sendable { case saved(SessionRecord), ignored, interrupt(SessionInterrupt) }
public enum SessionEvent: Sendable {
    case acknowledged(sessionID: String, turnID: String)
    case text(String)
    case completed(String)
    case interrupted
    case failed
}
public struct SessionEnvelope: Sendable {
    public let runID: UUID
    public let sessionID: String
    public let turnID: String
    public let sequence: UInt64
    public let event: SessionEvent
    public init(runID: UUID, sessionID: String, turnID: String, sequence: UInt64, event: SessionEvent) {
        self.runID = runID; self.sessionID = sessionID; self.turnID = turnID; self.sequence = sequence; self.event = event
    }
}
public protocol SessionPersistence: AnyObject, Sendable {
    var leaseKey: String { get }
    func read() throws -> Data?
    func writeAtomically(_ bytes: Data) throws
}
/// The lock inode stays separate from the atomically replaced data file.
public final class FileSessionPersistence: SessionPersistence, @unchecked Sendable {
    public let url: URL
    public var leaseKey: String { url.path }
    private var descriptor: Int32 = -1
    public init(url: URL) throws {
        self.url = url.standardizedFileURL
        try FileManager.default.createDirectory(at: self.url.deletingLastPathComponent(), withIntermediateDirectories: true)
        descriptor = open(self.url.path + ".lock", O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else { throw SessionError.storageUnavailable }
        guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else { throw SessionError.storeOwned }
    }
    deinit { if descriptor >= 0 { close(descriptor) } }
    public func read() throws -> Data? { FileManager.default.fileExists(atPath: url.path) ? try Data(contentsOf: url) : nil }
    public func writeAtomically(_ bytes: Data) throws {
        // Sensitive local state: never export this file as an execution receipt.
        let temporary = url.deletingLastPathComponent().appendingPathComponent(".session-" + UUID().uuidString)
        let fd = open(temporary.path, O_CREAT | O_EXCL | O_WRONLY, S_IRUSR | S_IWUSR)
        guard fd >= 0 else { throw SessionError.storageUnavailable }
        defer { close(fd); unlink(temporary.path) }
        try bytes.withUnsafeBytes { raw in
            var offset = 0
            while offset < raw.count {
                let count = Darwin.write(fd, raw.baseAddress!.advanced(by: offset), raw.count - offset)
                if count < 0 && errno == EINTR { continue }
                guard count > 0 else { throw SessionError.storageUnavailable }
                offset += count
            }
        }
        guard fsync(fd) == 0, rename(temporary.path, url.path) == 0 else { throw SessionError.storageUnavailable }
    }
}
private final class LeaseRegistry: @unchecked Sendable {
    static let shared = LeaseRegistry()
    private let lock = NSLock()
    private var owners: [String: UUID] = [:]
    func claim(_ key: String) throws -> Lease {
        lock.lock(); defer { lock.unlock() }
        guard owners[key] == nil else { throw SessionError.storeOwned }
        let id = UUID(); owners[key] = id; return Lease(key: key, id: id)
    }
    func release(_ key: String, id: UUID) {
        lock.lock(); defer { lock.unlock() }
        if owners[key] == id { owners.removeValue(forKey: key) }
    }
}
private final class Lease: Sendable {
    let key: String; let id: UUID
    init(key: String, id: UUID) { self.key = key; self.id = id }
    deinit { LeaseRegistry.shared.release(key, id: id) }
}
/// A deterministic effect boundary, not a live CLI adapter. The driver must register
/// the run ID before executing launch and honor interrupt even before provider ack.
public actor ConversationSessionRuntime {
    private let storage: any SessionPersistence
    private let lease: Lease
    private var snapshot: Snapshot
    private var faulted = false
    public init(storage: any SessionPersistence) throws {
        self.storage = storage
        lease = try LeaseRegistry.shared.claim(storage.leaseKey)
        var loaded: Snapshot
        do {
            if let bytes = try storage.read() {
                guard bytes.count <= 2_097_152 else { throw SessionError.corruptStore }
                loaded = try JSONDecoder().decode(Snapshot.self, from: bytes)
            } else { loaded = Snapshot() }
            try Self.validate(loaded)
        } catch { throw SessionError.corruptStore }
        var changed = false
        for i in loaded.records.indices where loaded.records[i].phase.active {
            loaded.records[i].phase = .outcomeUnknown
            if let b = loaded.bindings.firstIndex(where: { $0.id == loaded.records[i].bindingID }) { loaded.bindings[b].requiresReset = true }
            changed = true
        }
        if changed { do { try storage.writeAtomically(canonical(loaded)) } catch { throw SessionError.storageUnavailable } }
        snapshot = loaded
    }
    public func begin(_ request: SessionRequest) throws -> BeginEffect {
        guard !faulted else { throw SessionError.storageUnavailable }
        try request.validate()
        let fingerprint = digest(try canonical(request))
        if let old = snapshot.records.first(where: { $0.runID == request.runID }) {
            guard old.fingerprint == fingerprint else { throw SessionError.conflict }
            return .existing(old)
        }
        guard snapshot.records.count < 256 else { throw SessionError.full }
        guard !snapshot.records.contains(where: { $0.key == request.key && $0.phase.active }) else { throw SessionError.busy }
        let binding = snapshot.bindings.first { $0.key == request.key && !$0.archived }
        if let binding {
            guard !binding.requiresReset, binding.providerSessionID != nil else { throw SessionError.resetRequired }
            guard request.historySeed == nil else { throw SessionError.invalidInput }
        }
        var next = snapshot
        let bindingID = binding?.id ?? UUID()
        if binding == nil { next.bindings.append(Binding(id: bindingID, key: request.key, requiresReset: false)) }
        next.records.append(SessionRecord(runID: request.runID, key: request.key, bindingID: bindingID, fingerprint: fingerprint, phase: .pending, sequence: 0, preview: "", stopWasRequested: false))
        try commit(next)
        return .launch(SessionLaunch(request: request, resumeSessionID: binding?.providerSessionID))
    }
    /// Explicit user reset forgets the active provider binding, not consumed run IDs
    /// or provider-owned history. A new turn may seed approved Rivune history again.
    public func reset(key: SessionKey) throws {
        guard !faulted else { throw SessionError.storageUnavailable }
        guard !snapshot.records.contains(where: { $0.key == key && $0.phase.active }) else { throw SessionError.busy }
        guard let i = snapshot.bindings.firstIndex(where: { $0.key == key && !$0.archived }) else { return }
        var next = snapshot; next.bindings[i].archived = true; try commit(next)
    }
    public func stop(runID: UUID) throws -> SessionInterrupt? {
        guard !faulted else { throw SessionError.storageUnavailable }
        guard let i = snapshot.records.firstIndex(where: { $0.runID == runID }) else { throw SessionError.foreignEvent }
        guard snapshot.records[i].phase.active else { return nil }
        if snapshot.records[i].phase != .stopRequested {
            var next = snapshot; next.records[i].phase = .stopRequested; next.records[i].stopWasRequested = true
            try commit(next)
        }
        return interrupt(snapshot.records[i])
    }
    public func receive(_ e: SessionEnvelope) throws -> EventEffect {
        guard !faulted else { throw SessionError.storageUnavailable }
        guard let i = snapshot.records.firstIndex(where: { $0.runID == e.runID }) else { throw SessionError.foreignEvent }
        let old = snapshot.records[i]
        guard old.phase.active else { return .ignored }
        guard e.sequence > old.sequence, e.sequence <= 1_000_000 else { return .ignored }
        guard validID(e.sessionID), validID(e.turnID) else { throw SessionError.foreignEvent }
        var next = snapshot
        let b = next.bindings.firstIndex { $0.id == old.bindingID }!
        switch e.event {
        case .acknowledged(let session, let turn):
            guard session == e.sessionID, turn == e.turnID,
                  old.providerTurnID == nil,
                  next.bindings[b].providerSessionID == nil || next.bindings[b].providerSessionID == session else { throw SessionError.foreignEvent }
            next.bindings[b].providerSessionID = session
            next.records[i].providerSessionID = session; next.records[i].providerTurnID = turn
            if old.phase != .stopRequested { next.records[i].phase = .running }
        default:
            guard old.providerSessionID == e.sessionID, old.providerTurnID == e.turnID else { throw SessionError.foreignEvent }
            switch e.event {
            case .text(let delta):
                guard old.preview.utf8.count + delta.utf8.count <= 256_000 else { throw SessionError.invalidInput }
                next.records[i].preview += delta
            case .completed(let final):
                guard !final.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, final.utf8.count <= 256_000 else { throw SessionError.invalidInput }
                next.records[i].phase = .completed; next.records[i].finalText = final; next.records[i].preview = ""
            case .interrupted, .failed:
                next.records[i].phase = { if case .interrupted = e.event { return .interrupted }; return .failed }()
                next.bindings[b].requiresReset = true
            case .acknowledged: break
            }
        }
        next.records[i].sequence = e.sequence
        do { try commit(next) } catch { faulted = true; throw error }
        if case .acknowledged = e.event, old.phase == .stopRequested { return .interrupt(interrupt(next.records[i])) }
        return .saved(next.records[i])
    }
    /// EOF/startup failure may occur before an acknowledgement. Never retry blindly.
    public func lostTransport(runID: UUID) throws {
        guard !faulted else { throw SessionError.storageUnavailable }
        guard let i = snapshot.records.firstIndex(where: { $0.runID == runID }), snapshot.records[i].phase.active else { return }
        var next = snapshot; next.records[i].phase = .outcomeUnknown
        let b = next.bindings.firstIndex { $0.id == next.records[i].bindingID }!; next.bindings[b].requiresReset = true
        do { try commit(next) } catch { faulted = true; throw error }
    }
    public func record(_ id: UUID) -> SessionRecord? {
        guard var record = snapshot.records.first(where: { $0.runID == id }) else { return nil }
        if faulted && record.phase.active { record.phase = .outcomeUnknown }
        return record
    }
    private func commit(_ next: Snapshot) throws {
        do {
            try Self.validate(next)
            let data = try canonical(next)
            guard data.count <= 2_097_152 else { throw SessionError.full }
            try storage.writeAtomically(data)
        } catch { faulted = true; throw SessionError.storageUnavailable }
        snapshot = next
    }
    private func interrupt(_ r: SessionRecord) -> SessionInterrupt { .init(runID: r.runID, providerSessionID: r.providerSessionID, providerTurnID: r.providerTurnID) }
    private static func validate(_ s: Snapshot) throws {
        guard s.version == 1, s.records.count <= 256, s.bindings.count <= 256,
              Set(s.records.map(\.runID)).count == s.records.count,
              Set(s.bindings.map(\.id)).count == s.bindings.count,
              Set(s.bindings.filter { !$0.archived }.map(\.key)).count == s.bindings.filter({ !$0.archived }).count else { throw SessionError.corruptStore }
        for b in s.bindings { if let id = b.providerSessionID, !validID(id) { throw SessionError.corruptStore } }
        for r in s.records {
            guard s.bindings.contains(where: { $0.id == r.bindingID && $0.key == r.key && (!r.phase.active || !$0.archived) }),
                  r.fingerprint.count == 64, r.fingerprint.allSatisfy({ "0123456789abcdef".contains($0) }),
                  r.sequence <= 1_000_000, r.preview.utf8.count <= 256_000,
                  (r.finalText?.utf8.count ?? 0) <= 256_000,
                  (r.providerSessionID == nil) == (r.providerTurnID == nil),
                  r.providerSessionID.map(validID) ?? true, r.providerTurnID.map(validID) ?? true,
                  r.phase != .completed || (r.finalText?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false && r.providerSessionID != nil),
                  r.phase != .running || r.providerSessionID != nil,
                  r.phase != .pending || r.providerSessionID == nil,
                  r.phase != .stopRequested || r.stopWasRequested,
                  r.phase == .completed || r.finalText == nil,
                  r.providerSessionID == nil || s.bindings.first(where: { $0.id == r.bindingID })?.providerSessionID == r.providerSessionID,
                  ![SessionPhase.interrupted, .failed, .outcomeUnknown].contains(r.phase) || s.bindings.first(where: { $0.id == r.bindingID })?.requiresReset == true else { throw SessionError.corruptStore }
        }
        for b in s.bindings {
            guard s.records.filter({ $0.key == b.key && $0.phase.active }).count <= 1 else { throw SessionError.corruptStore }
        }
    }
}
private func canonical<T: Encodable>(_ value: T) throws -> Data { let e = JSONEncoder(); e.outputFormatting = [.sortedKeys]; return try e.encode(value) }
private func digest(_ bytes: Data) -> String { SHA256.hash(data: bytes).map { String(format: "%02x", $0) }.joined() }
private func validID(_ value: String) -> Bool { !value.isEmpty && value.utf8.count <= 256 && !value.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }) }
