import Foundation

public enum RemoteJournalError: Error, Equatable, Sendable {
    case corruptOrUnreadable
    case storageUnavailable
    case journalFull
    case unknownRequest
    case identityConflict
    case invalidMetadata
    case invalidTransition
}

public struct RemoteRouteIdentity: Codable, Equatable, Sendable {
    public let providerID: String
    public let transportID: String
    public let adapterID: String

    public init(providerID: String, transportID: String, adapterID: String) {
        self.providerID = providerID
        self.transportID = transportID
        self.adapterID = adapterID
    }
}

/// Non-secret identity admitted by the Mac. Prompt text, history, document
/// contents, provider credentials, provider output, and raw diagnostics are
/// deliberately not representable here.
public struct RemoteAcceptedIdentity: Codable, Equatable, Sendable {
    public let requestID: UUID
    public let turnID: UUID
    public let modeID: String
    public let routes: [RemoteRouteIdentity]
    public let requestedModelIDs: [String]
    public let requestedEfforts: [String]
    public let contextVersion: Int
    public let attachmentSetDigest: String

    public init(
        requestID: UUID,
        turnID: UUID,
        modeID: String,
        routes: [RemoteRouteIdentity],
        requestedModelIDs: [String],
        requestedEfforts: [String],
        contextVersion: Int,
        attachmentSetDigest: String
    ) {
        self.requestID = requestID
        self.turnID = turnID
        self.modeID = modeID
        self.routes = routes
        self.requestedModelIDs = requestedModelIDs
        self.requestedEfforts = requestedEfforts
        self.contextVersion = contextVersion
        self.attachmentSetDigest = attachmentSetDigest
    }
}

/// Points back into the existing local workspace journal. The phone journal
/// does not duplicate answer text or artifacts.
public struct RemoteResultReference: Codable, Equatable, Sendable {
    public let workspaceRunID: UUID
    public let revision: Int
    public let resultDigest: String

    public init(workspaceRunID: UUID, revision: Int, resultDigest: String) {
        self.workspaceRunID = workspaceRunID
        self.revision = revision
        self.resultDigest = resultDigest
    }
}

public enum RemoteJournalState: Equatable, Sendable {
    case running
    case completed(RemoteResultReference)
    case interruptedUnknown
    case stopRequested
    case cancelled
    case failed
}

extension RemoteJournalState: Codable {
    private enum CodingKeys: String, CodingKey { case kind, result }
    private enum Kind: String, Codable { case running, completed, interruptedUnknown, stopRequested, cancelled, failed }

    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        switch try values.decode(Kind.self, forKey: .kind) {
        case .running: self = .running
        case .completed: self = .completed(try values.decode(RemoteResultReference.self, forKey: .result))
        case .interruptedUnknown: self = .interruptedUnknown
        case .stopRequested: self = .stopRequested
        case .cancelled: self = .cancelled
        case .failed: self = .failed
        }
    }

    public func encode(to encoder: Encoder) throws {
        var values = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .running: try values.encode(Kind.running, forKey: .kind)
        case .completed(let result):
            try values.encode(Kind.completed, forKey: .kind)
            try values.encode(result, forKey: .result)
        case .interruptedUnknown: try values.encode(Kind.interruptedUnknown, forKey: .kind)
        case .stopRequested: try values.encode(Kind.stopRequested, forKey: .kind)
        case .cancelled: try values.encode(Kind.cancelled, forKey: .kind)
        case .failed: try values.encode(Kind.failed, forKey: .kind)
        }
    }
}

public struct RemoteJournalRecord: Codable, Equatable, Sendable {
    public let identity: RemoteAcceptedIdentity
    public let requestFingerprint: String
    public var state: RemoteJournalState
    public let acceptedAt: Date
    public var updatedAt: Date
}

public enum RemoteAdmissionDisposition: Equatable, Sendable {
    /// Persistence succeeded. The caller may dispatch exactly once.
    case dispatch(RemoteJournalRecord)
    /// Same ID and immutable identity. Attach to the existing durable run.
    case reattach(RemoteJournalRecord)
    /// Same ID and completed result. Resolve the reference from the workspace.
    case replay(RemoteResultReference)
    /// The detailed result was pruned, but the ID remains consumed. Never rerun.
    case expiredResult
    /// Same ID with different content or accepted identity. Never dispatch.
    case conflict
}

public enum RemoteStopDisposition: Equatable, Sendable {
    case cancelProvider
    case alreadyTerminal
    case conflict
}

public protocol RemoteJournalStorage: Sendable {
    func read() throws -> Data?
    func writeAtomically(_ data: Data) throws
}

public struct FileRemoteJournalStorage: RemoteJournalStorage {
    public let url: URL

    public init(url: URL) { self.url = url }

    public func read() throws -> Data? {
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        return try Data(contentsOf: url, options: [.mappedIfSafe])
    }

    public func writeAtomically(_ data: Data) throws {
        let directory = url.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try data.write(to: url, options: [.atomic])
    }
}

public final class RemoteRequestJournal: @unchecked Sendable {
    private struct Tombstone: Codable, Equatable {
        let requestID: UUID
        let requestFingerprint: String
        let identityDigest: String
        let consumedAt: Date
    }

    private struct Snapshot: Codable, Equatable {
        var schemaVersion = 1
        var records: [RemoteJournalRecord]
        var tombstones: [Tombstone]
    }

    private let storage: any RemoteJournalStorage
    private let maxRecords: Int
    private let maxTombstones: Int
    private let maximumBytes: Int
    private let now: @Sendable () -> Date
    private let lock = NSLock()
    private var snapshot: Snapshot

    public init(
        storage: any RemoteJournalStorage,
        maxRecords: Int = 1_024,
        maxTombstones: Int = 100_000,
        maximumBytes: Int = 8 * 1_024 * 1_024,
        now: @escaping @Sendable () -> Date = { Date() }
    ) throws {
        guard maxRecords > 0, maxTombstones > 0, maximumBytes > 0 else {
            throw RemoteJournalError.invalidMetadata
        }
        self.storage = storage
        self.maxRecords = maxRecords
        self.maxTombstones = maxTombstones
        self.maximumBytes = maximumBytes
        self.now = now

        do {
            if let data = try storage.read() {
                guard data.count <= maximumBytes else { throw RemoteJournalError.corruptOrUnreadable }
                let decoded = try JSONDecoder().decode(Snapshot.self, from: data)
                guard decoded.schemaVersion == 1,
                      Set(decoded.records.map(\.identity.requestID)).count == decoded.records.count,
                      Set(decoded.tombstones.map(\.requestID)).count == decoded.tombstones.count,
                      Set(decoded.records.map(\.identity.requestID)).isDisjoint(with: Set(decoded.tombstones.map(\.requestID))) else {
                    throw RemoteJournalError.corruptOrUnreadable
                }
                snapshot = decoded
            } else {
                snapshot = Snapshot(records: [], tombstones: [])
            }
        } catch let error as RemoteJournalError {
            throw error
        } catch {
            throw RemoteJournalError.corruptOrUnreadable
        }

        do {
            try validateAll(snapshot)
            let changed = recoverUnfinishedRuns()
            if changed { try persistCurrentSnapshot() }
        } catch let error as RemoteJournalError {
            throw error
        } catch {
            throw RemoteJournalError.corruptOrUnreadable
        }
    }

    /// Persists the immutable binding and running state before returning
    /// `.dispatch`. A thrown storage error means provider dispatch is forbidden.
    public func admit(
        identity: RemoteAcceptedIdentity,
        requestFingerprint: String
    ) throws -> RemoteAdmissionDisposition {
        try withLock {
            try validate(identity: identity, fingerprint: requestFingerprint)
            if let record = snapshot.records.first(where: { $0.identity.requestID == identity.requestID }) {
                guard record.requestFingerprint == requestFingerprint, record.identity == identity else { return .conflict }
                if case .completed(let reference) = record.state { return .replay(reference) }
                return .reattach(record)
            }
            if let tombstone = snapshot.tombstones.first(where: { $0.requestID == identity.requestID }) {
                guard tombstone.requestFingerprint == requestFingerprint,
                      tombstone.identityDigest == Self.identityDigest(identity) else { return .conflict }
                return .expiredResult
            }

            let pruneIndex = try terminalIndexToPruneIfNeeded()
            let timestamp = now()
            let record = RemoteJournalRecord(
                identity: identity,
                requestFingerprint: requestFingerprint,
                state: .running,
                acceptedAt: timestamp,
                updatedAt: timestamp
            )
            try commit { candidate in
                if let pruneIndex {
                    let removed = candidate.records.remove(at: pruneIndex)
                    candidate.tombstones.append(Tombstone(
                        requestID: removed.identity.requestID,
                        requestFingerprint: removed.requestFingerprint,
                        identityDigest: Self.identityDigest(removed.identity),
                        consumedAt: timestamp
                    ))
                }
                candidate.records.append(record)
            }
            return .dispatch(record)
        }
    }

    public func complete(
        requestID: UUID,
        requestFingerprint: String,
        result: RemoteResultReference
    ) throws {
        try transition(requestID: requestID, fingerprint: requestFingerprint) { state in
            guard state == .running || state == .stopRequested else { throw RemoteJournalError.invalidTransition }
            return .completed(result)
        }
    }

    public func fail(requestID: UUID, requestFingerprint: String) throws {
        try transition(requestID: requestID, fingerprint: requestFingerprint) { state in
            guard state == .running || state == .stopRequested else { throw RemoteJournalError.invalidTransition }
            return .failed
        }
    }

    public func confirmCancelled(requestID: UUID, requestFingerprint: String) throws {
        try transition(requestID: requestID, fingerprint: requestFingerprint) { state in
            guard state == .stopRequested else { throw RemoteJournalError.invalidTransition }
            return .cancelled
        }
    }

    /// View changes and transport disconnects call this. It is intentionally
    /// read-only and must not request provider cancellation.
    public func detachObservation(
        requestID: UUID,
        requestFingerprint: String
    ) throws -> RemoteJournalRecord {
        try withLock {
            guard let record = snapshot.records.first(where: { $0.identity.requestID == requestID }) else {
                throw RemoteJournalError.unknownRequest
            }
            guard record.requestFingerprint == requestFingerprint else { throw RemoteJournalError.identityConflict }
            return record
        }
    }

    /// Only an explicit user Stop command calls this. The host sends provider
    /// cancellation only after this state is durably committed.
    public func requestStop(
        requestID: UUID,
        requestFingerprint: String
    ) throws -> RemoteStopDisposition {
        try withLock {
            guard let index = snapshot.records.firstIndex(where: { $0.identity.requestID == requestID }) else {
                throw RemoteJournalError.unknownRequest
            }
            guard snapshot.records[index].requestFingerprint == requestFingerprint else { return .conflict }
            switch snapshot.records[index].state {
            case .running:
                try commit {
                    $0.records[index].state = .stopRequested
                    $0.records[index].updatedAt = now()
                }
                return .cancelProvider
            case .stopRequested:
                return .cancelProvider
            case .completed, .interruptedUnknown, .cancelled, .failed:
                return .alreadyTerminal
            }
        }
    }

    public func record(requestID: UUID) -> RemoteJournalRecord? {
        withLockNoThrow { snapshot.records.first { $0.identity.requestID == requestID } }
    }

    private func transition(
        requestID: UUID,
        fingerprint: String,
        change: (RemoteJournalState) throws -> RemoteJournalState
    ) throws {
        try withLock {
            guard let index = snapshot.records.firstIndex(where: { $0.identity.requestID == requestID }) else {
                throw RemoteJournalError.unknownRequest
            }
            guard snapshot.records[index].requestFingerprint == fingerprint else {
                throw RemoteJournalError.identityConflict
            }
            let next = try change(snapshot.records[index].state)
            try commit {
                $0.records[index].state = next
                $0.records[index].updatedAt = now()
            }
        }
    }

    private func recoverUnfinishedRuns() -> Bool {
        var changed = false
        for index in snapshot.records.indices {
            if snapshot.records[index].state == .running || snapshot.records[index].state == .stopRequested {
                snapshot.records[index].state = .interruptedUnknown
                snapshot.records[index].updatedAt = now()
                changed = true
            }
        }
        return changed
    }

    private func terminalIndexToPruneIfNeeded() throws -> Int? {
        guard snapshot.records.count >= maxRecords else { return nil }
        let terminalIndices = snapshot.records.indices.filter {
            switch snapshot.records[$0].state {
            case .completed, .interruptedUnknown, .cancelled, .failed: true
            case .running, .stopRequested: false
            }
        }
        guard let oldestIndex = terminalIndices.min(by: {
            snapshot.records[$0].updatedAt < snapshot.records[$1].updatedAt
        }), snapshot.tombstones.count < maxTombstones else {
            throw RemoteJournalError.journalFull
        }
        return oldestIndex
    }

    private func commit(_ mutation: (inout Snapshot) throws -> Void) throws {
        let previous = snapshot
        do {
            try mutation(&snapshot)
            try validateAll(snapshot)
            try persistCurrentSnapshot()
        } catch let error as RemoteJournalError {
            snapshot = previous
            throw error
        } catch {
            snapshot = previous
            throw RemoteJournalError.storageUnavailable
        }
    }

    private func persistCurrentSnapshot() throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(snapshot)
        guard data.count <= maximumBytes else { throw RemoteJournalError.journalFull }
        do { try storage.writeAtomically(data) }
        catch { throw RemoteJournalError.storageUnavailable }
    }

    private func validateAll(_ candidate: Snapshot) throws {
        guard candidate.records.count <= maxRecords,
              candidate.tombstones.count <= maxTombstones else { throw RemoteJournalError.journalFull }
        for record in candidate.records {
            try validate(identity: record.identity, fingerprint: record.requestFingerprint)
        }
        for tombstone in candidate.tombstones {
            guard Self.isSafeToken(tombstone.requestFingerprint, maximumLength: 256),
                  Self.isSafeToken(tombstone.identityDigest, maximumLength: 256) else {
                throw RemoteJournalError.invalidMetadata
            }
        }
    }

    private func validate(identity: RemoteAcceptedIdentity, fingerprint: String) throws {
        let tokens = [identity.modeID, identity.attachmentSetDigest, fingerprint]
            + identity.requestedModelIDs + identity.requestedEfforts
            + identity.routes.flatMap { [$0.providerID, $0.transportID, $0.adapterID] }
        guard identity.contextVersion > 0,
              !identity.routes.isEmpty,
              identity.routes.count <= 8,
              identity.requestedModelIDs.count <= 8,
              identity.requestedEfforts.count <= 8,
              tokens.allSatisfy({ Self.isSafeToken($0, maximumLength: 256) }) else {
            throw RemoteJournalError.invalidMetadata
        }
    }

    private static func isSafeToken(_ value: String, maximumLength: Int) -> Bool {
        !value.isEmpty && value.utf8.count <= maximumLength && value.unicodeScalars.allSatisfy {
            !CharacterSet.controlCharacters.contains($0) &&
            !CharacterSet.whitespacesAndNewlines.contains($0)
        }
    }

    /// Stable, non-cryptographic comparison key for the already SHA-256-bound
    /// identity fields. Production integration should use Rivune's SHA-256
    /// canonical encoder for this value.
    private static func identityDigest(_ identity: RemoteAcceptedIdentity) -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let data = (try? encoder.encode(identity)) ?? Data()
        var hash: UInt64 = 14_695_981_039_346_656_037
        for byte in data { hash = (hash ^ UInt64(byte)) &* 1_099_511_628_211 }
        return String(hash, radix: 16)
    }

    private func withLock<T>(_ body: () throws -> T) rethrows -> T {
        lock.lock(); defer { lock.unlock() }
        return try body()
    }

    private func withLockNoThrow<T>(_ body: () -> T) -> T {
        lock.lock(); defer { lock.unlock() }
        return body()
    }
}
