import Foundation
import CryptoKit
import Darwin

public enum RemoteJournalError: Error, Equatable, Sendable {
    case corruptOrUnreadable
    case storageUnavailable
    case journalFull
    case unknownRequest
    case identityConflict
    case invalidMetadata
    case invalidTransition
    case journalAlreadyOwned
}

public enum RemoteStorageError: Error, Equatable, Sendable {
    case writerAlreadyOwned
    case lockUnavailable
}

public struct SHA256Digest: Codable, Equatable, Hashable, Sendable {
    public let hex: String

    public init(hex: String) throws {
        guard hex.utf8.count == 64, hex.unicodeScalars.allSatisfy({
            (48...57).contains($0.value) || (97...102).contains($0.value)
        }) else { throw RemoteJournalError.invalidMetadata }
        self.hex = hex
    }

    public static func hash(data: Data) -> Self {
        // CryptoKit always emits a lowercase, 64-character SHA-256 value.
        try! Self(hex: CryptoKit.SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined())
    }

    public static func hash(string: String) -> Self { hash(data: Data(string.utf8)) }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        try self.init(hex: container.decode(String.self))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(hex)
    }
}

public enum RemoteModeIdentity: String, Codable, Equatable, Sendable {
    case chatGPT, claude, together
}

public struct RemoteRouteIdentity: Codable, Equatable, Sendable {
    public let canonicalDigest: SHA256Digest

    public init(providerID: String, transportID: String, adapterID: String) {
        let canonical = [providerID, transportID, adapterID]
            .map { "\($0.utf8.count):\($0)" }
            .joined(separator: "|")
        self.canonicalDigest = .hash(string: canonical)
    }
}

/// Non-secret identity admitted by the Mac. Prompt text, history, document
/// contents, provider credentials, provider output, and raw diagnostics are
/// deliberately not representable here.
public struct RemoteAcceptedIdentity: Codable, Equatable, Sendable {
    public let requestID: UUID
    public let turnID: UUID
    public let mode: RemoteModeIdentity
    public let routes: [RemoteRouteIdentity]
    public let requestedModelDigests: [SHA256Digest]
    public let requestedEffortDigests: [SHA256Digest]
    public let contextVersion: Int
    public let attachmentSetDigest: SHA256Digest

    public init(
        requestID: UUID,
        turnID: UUID,
        mode: RemoteModeIdentity,
        routes: [RemoteRouteIdentity],
        requestedModelIDs: [String],
        requestedEfforts: [String],
        contextVersion: Int,
        attachmentSetDigest: SHA256Digest
    ) {
        self.requestID = requestID
        self.turnID = turnID
        self.mode = mode
        self.routes = routes
        self.requestedModelDigests = requestedModelIDs.map(SHA256Digest.hash(string:))
        self.requestedEffortDigests = requestedEfforts.map(SHA256Digest.hash(string:))
        self.contextVersion = contextVersion
        self.attachmentSetDigest = attachmentSetDigest
    }
}

/// Points back into the existing local workspace journal. The phone journal
/// does not duplicate answer text or artifacts.
public struct RemoteResultReference: Codable, Equatable, Sendable {
    public let workspaceRunID: UUID
    public let revision: Int
    public let resultDigest: SHA256Digest

    public init(workspaceRunID: UUID, revision: Int, resultDigest: SHA256Digest) throws {
        guard revision >= 0 else { throw RemoteJournalError.invalidMetadata }
        self.workspaceRunID = workspaceRunID
        self.revision = revision
        self.resultDigest = resultDigest
    }

    private enum CodingKeys: String, CodingKey { case workspaceRunID, revision, resultDigest }

    public init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        try self.init(
            workspaceRunID: values.decode(UUID.self, forKey: .workspaceRunID),
            revision: values.decode(Int.self, forKey: .revision),
            resultDigest: values.decode(SHA256Digest.self, forKey: .resultDigest)
        )
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
    public let requestFingerprint: SHA256Digest
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

public protocol RemoteJournalStorage: AnyObject, Sendable {
    /// Stable for the lifetime of the underlying store. Two journal snapshots
    /// over the same storage must present the same key.
    var journalLeaseKey: String { get }
    func read() throws -> Data?
    func writeAtomically(_ data: Data) throws
}

private final class WriterOwnershipRegistry: @unchecked Sendable {
    static let shared = WriterOwnershipRegistry()
    private let lock = NSLock()
    private var paths: Set<String> = []

    func claim(_ path: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return paths.insert(path).inserted
    }

    func release(_ path: String) {
        lock.lock(); defer { lock.unlock() }
        paths.remove(path)
    }
}

/// A file-backed storage owns an OS advisory lock and an in-process path lease
/// for its entire lifetime. A second writer cannot obtain a stale snapshot.
public final class FileRemoteJournalStorage: RemoteJournalStorage, @unchecked Sendable {
    public let url: URL
    private let ownershipPath: String
    private let lockDescriptor: Int32
    public var journalLeaseKey: String { "file:\(ownershipPath)" }

    public init(url: URL) throws {
        self.url = url.standardizedFileURL
        ownershipPath = self.url.path
        guard WriterOwnershipRegistry.shared.claim(ownershipPath) else {
            throw RemoteStorageError.writerAlreadyOwned
        }
        do {
            let directory = self.url.deletingLastPathComponent()
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let descriptor = open(self.url.path + ".writer-lock", O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
            guard descriptor >= 0 else { throw RemoteStorageError.lockUnavailable }
            guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
                close(descriptor)
                throw RemoteStorageError.writerAlreadyOwned
            }
            lockDescriptor = descriptor
        } catch {
            WriterOwnershipRegistry.shared.release(ownershipPath)
            throw error
        }
    }

    deinit {
        flock(lockDescriptor, LOCK_UN)
        close(lockDescriptor)
        WriterOwnershipRegistry.shared.release(ownershipPath)
    }

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

private final class JournalStateOwnershipRegistry: @unchecked Sendable {
    static let shared = JournalStateOwnershipRegistry()
    private let lock = NSLock()
    private var keys: Set<String> = []

    func claim(_ key: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return keys.insert(key).inserted
    }

    func release(_ key: String) {
        lock.lock(); defer { lock.unlock() }
        keys.remove(key)
    }
}

public final class RemoteRequestJournal: @unchecked Sendable {
    private struct Tombstone: Codable, Equatable {
        let requestID: UUID
        let requestFingerprint: SHA256Digest
        let identityDigest: SHA256Digest
        let consumedAt: Date
    }

    private struct Snapshot: Codable, Equatable {
        var schemaVersion = 1
        var records: [RemoteJournalRecord]
        var tombstones: [Tombstone]
    }

    private let storage: any RemoteJournalStorage
    private let journalLeaseKey: String
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
        journalLeaseKey = storage.journalLeaseKey
        self.maxRecords = maxRecords
        self.maxTombstones = maxTombstones
        self.maximumBytes = maximumBytes
        self.now = now
        guard JournalStateOwnershipRegistry.shared.claim(journalLeaseKey) else {
            throw RemoteJournalError.journalAlreadyOwned
        }

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
            JournalStateOwnershipRegistry.shared.release(journalLeaseKey)
            throw error
        } catch {
            JournalStateOwnershipRegistry.shared.release(journalLeaseKey)
            throw RemoteJournalError.corruptOrUnreadable
        }

        do {
            try validateAll(snapshot)
            let changed = recoverUnfinishedRuns()
            if changed { try persistCurrentSnapshot() }
        } catch let error as RemoteJournalError {
            JournalStateOwnershipRegistry.shared.release(journalLeaseKey)
            throw error
        } catch {
            JournalStateOwnershipRegistry.shared.release(journalLeaseKey)
            throw RemoteJournalError.corruptOrUnreadable
        }
    }

    deinit {
        JournalStateOwnershipRegistry.shared.release(journalLeaseKey)
    }

    /// Persists the immutable binding and running state before returning
    /// `.dispatch`. A thrown storage error means provider dispatch is forbidden.
    public func admit(
        identity: RemoteAcceptedIdentity,
        requestFingerprint: SHA256Digest
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
        requestFingerprint: SHA256Digest,
        result: RemoteResultReference
    ) throws {
        try validate(result: result)
        try transition(requestID: requestID, fingerprint: requestFingerprint) { state in
            guard state == .running || state == .stopRequested else { throw RemoteJournalError.invalidTransition }
            return .completed(result)
        }
    }

    public func fail(requestID: UUID, requestFingerprint: SHA256Digest) throws {
        try transition(requestID: requestID, fingerprint: requestFingerprint) { state in
            guard state == .running || state == .stopRequested else { throw RemoteJournalError.invalidTransition }
            return .failed
        }
    }

    public func confirmCancelled(requestID: UUID, requestFingerprint: SHA256Digest) throws {
        try transition(requestID: requestID, fingerprint: requestFingerprint) { state in
            guard state == .stopRequested else { throw RemoteJournalError.invalidTransition }
            return .cancelled
        }
    }

    /// View changes and transport disconnects call this. It is intentionally
    /// read-only and must not request provider cancellation.
    public func detachObservation(
        requestID: UUID,
        requestFingerprint: SHA256Digest
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
        requestFingerprint: SHA256Digest
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
        fingerprint: SHA256Digest,
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
            if case .completed(let reference) = record.state {
                try validate(result: reference)
            }
        }
    }

    private func validate(identity: RemoteAcceptedIdentity, fingerprint: SHA256Digest) throws {
        guard identity.contextVersion > 0,
              !identity.routes.isEmpty,
              identity.routes.count <= 8,
              identity.requestedModelDigests.count <= 8,
              identity.requestedEffortDigests.count <= 8 else {
            throw RemoteJournalError.invalidMetadata
        }
    }

    private func validate(result: RemoteResultReference) throws {
        guard result.revision >= 0 else { throw RemoteJournalError.invalidMetadata }
    }

    /// Canonical SHA-256 binding for the typed, non-secret identity record.
    private static func identityDigest(_ identity: RemoteAcceptedIdentity) -> SHA256Digest {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        let data = (try? encoder.encode(identity)) ?? Data()
        return .hash(data: data)
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
