import Foundation
import Testing
@testable import PhoneDurableJournalCandidate

private final class MemoryStorage: RemoteJournalStorage, @unchecked Sendable {
    var data: Data?
    var failWrites = false
    var writes = 0

    func read() throws -> Data? { data }
    func writeAtomically(_ data: Data) throws {
        writes += 1
        if failWrites { throw CocoaError(.fileWriteUnknown) }
        self.data = data
    }
}

private let fixedDate = Date(timeIntervalSince1970: 1_788_768_000)

private func identity(
    requestID: UUID = UUID(),
    turnID: UUID = UUID(),
    model: String = "gpt-6-astra"
) -> RemoteAcceptedIdentity {
    RemoteAcceptedIdentity(
        requestID: requestID,
        turnID: turnID,
        modeID: "chatGPT",
        routes: [.init(providerID: "openai", transportID: "codex-cli", adapterID: "codex-runtime")],
        requestedModelIDs: [model],
        requestedEfforts: ["high"],
        contextVersion: 2,
        attachmentSetDigest: "sha256-attachments"
    )
}

private func result() -> RemoteResultReference {
    .init(workspaceRunID: UUID(), revision: 7, resultDigest: "sha256-result")
}

@Test func atomicWriteFailurePreventsDispatchAndRollsBackReservation() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    let accepted = identity()
    storage.failWrites = true

    #expect(throws: RemoteJournalError.storageUnavailable) {
        try journal.admit(identity: accepted, requestFingerprint: "sha256-request")
    }
    #expect(journal.record(requestID: accepted.requestID) == nil)
}

@Test func sameIdentityReattachesAndConflictingReuseNeverDispatches() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    let accepted = identity()
    #expect(try journal.admit(identity: accepted, requestFingerprint: "sha256-one").isDispatch)
    #expect(try journal.admit(identity: accepted, requestFingerprint: "sha256-one").isReattach)
    #expect(try journal.admit(identity: accepted, requestFingerprint: "sha256-two") == .conflict)
    #expect(try journal.admit(identity: identity(requestID: accepted.requestID), requestFingerprint: "sha256-one") == .conflict)
}

@Test func restartTurnsRunningIntoInterruptedUnknownAndNeverRedispatches() throws {
    let storage = MemoryStorage()
    let accepted = identity()
    let first = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    #expect(try first.admit(identity: accepted, requestFingerprint: "sha256-request").isDispatch)

    let restarted = try RemoteRequestJournal(storage: storage, now: { fixedDate.addingTimeInterval(30) })
    let disposition = try restarted.admit(identity: accepted, requestFingerprint: "sha256-request")
    #expect(disposition.isInterruptedReattach)
}

@Test func completedRecordReplaysWorkspaceReferenceAfterRestart() throws {
    let storage = MemoryStorage()
    let accepted = identity()
    let reference = result()
    let first = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    _ = try first.admit(identity: accepted, requestFingerprint: "sha256-request")
    try first.complete(requestID: accepted.requestID, requestFingerprint: "sha256-request", result: reference)

    let restarted = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    #expect(try restarted.admit(identity: accepted, requestFingerprint: "sha256-request") == .replay(reference))
}

@Test func detachIsReadOnlyButExplicitStopPersistsCancellationIntent() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    let accepted = identity()
    _ = try journal.admit(identity: accepted, requestFingerprint: "sha256-request")
    let writesBeforeDetach = storage.writes

    let detached = try journal.detachObservation(requestID: accepted.requestID, requestFingerprint: "sha256-request")
    #expect(detached.state == .running)
    #expect(storage.writes == writesBeforeDetach)
    #expect(try journal.requestStop(requestID: accepted.requestID, requestFingerprint: "sha256-request") == .cancelProvider)
    #expect(journal.record(requestID: accepted.requestID)?.state == .stopRequested)
    #expect(storage.writes == writesBeforeDetach + 1)
}

@Test func corruptOrOversizedJournalFailsClosedWithoutOverwrite() throws {
    let corrupt = MemoryStorage()
    corrupt.data = Data("{not-json".utf8)
    #expect(throws: RemoteJournalError.corruptOrUnreadable) {
        try RemoteRequestJournal(storage: corrupt)
    }
    #expect(corrupt.writes == 0)

    let oversized = MemoryStorage()
    oversized.data = Data(repeating: 0x41, count: 33)
    #expect(throws: RemoteJournalError.corruptOrUnreadable) {
        try RemoteRequestJournal(storage: oversized, maximumBytes: 32)
    }
    #expect(oversized.writes == 0)
}

@Test func boundedPruningKeepsConsumedIDTombstone() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(
        storage: storage,
        maxRecords: 1,
        maxTombstones: 2,
        now: { fixedDate }
    )
    let firstIdentity = identity()
    _ = try journal.admit(identity: firstIdentity, requestFingerprint: "sha256-first")
    try journal.complete(requestID: firstIdentity.requestID, requestFingerprint: "sha256-first", result: result())
    let secondIdentity = identity()
    #expect(try journal.admit(identity: secondIdentity, requestFingerprint: "sha256-second").isDispatch)
    #expect(try journal.admit(identity: firstIdentity, requestFingerprint: "sha256-first") == .expiredResult)
    #expect(try journal.admit(identity: firstIdentity, requestFingerprint: "sha256-conflict") == .conflict)
}

@Test func fullActiveJournalRefusesNewDispatch() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage, maxRecords: 1, maxTombstones: 1)
    _ = try journal.admit(identity: identity(), requestFingerprint: "sha256-first")
    #expect(throws: RemoteJournalError.journalFull) {
        try journal.admit(identity: identity(), requestFingerprint: "sha256-second")
    }
}

@Test func failedWriteDuringPruningPreservesOriginalCompletedRecord() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage, maxRecords: 1, maxTombstones: 1)
    let original = identity()
    let reference = result()
    _ = try journal.admit(identity: original, requestFingerprint: "sha256-original")
    try journal.complete(requestID: original.requestID, requestFingerprint: "sha256-original", result: reference)
    storage.failWrites = true

    #expect(throws: RemoteJournalError.storageUnavailable) {
        try journal.admit(identity: identity(), requestFingerprint: "sha256-new")
    }
    #expect(try journal.admit(identity: original, requestFingerprint: "sha256-original") == .replay(reference))
}

@Test func persistedMetadataCannotContainPromptAnswerOrCredentials() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage, now: { fixedDate })
    let accepted = identity()
    _ = try journal.admit(identity: accepted, requestFingerprint: "sha256-request")
    try journal.complete(requestID: accepted.requestID, requestFingerprint: "sha256-request", result: result())
    let persisted = String(decoding: storage.data ?? Data(), as: UTF8.self)

    for forbidden in ["user prompt body", "provider answer body", "sk-secret-value", "apiKey", "password", "rawDiagnostics"] {
        #expect(!persisted.contains(forbidden))
    }
    #expect(persisted.contains("workspaceRunID"))
    #expect(persisted.contains("requestFingerprint"))
}

@Test func unsafeFreeformMetadataIsRejectedBeforePersistence() throws {
    let storage = MemoryStorage()
    let journal = try RemoteRequestJournal(storage: storage)
    let unsafe = RemoteAcceptedIdentity(
        requestID: UUID(), turnID: UUID(), modeID: "chatGPT\nsecret",
        routes: [.init(providerID: "openai", transportID: "cli", adapterID: "runtime")],
        requestedModelIDs: ["model"], requestedEfforts: ["high"], contextVersion: 2,
        attachmentSetDigest: "digest"
    )
    #expect(throws: RemoteJournalError.invalidMetadata) {
        try journal.admit(identity: unsafe, requestFingerprint: "fingerprint")
    }
    #expect(storage.writes == 0)
}

private extension RemoteAdmissionDisposition {
    var isDispatch: Bool {
        if case .dispatch = self { true } else { false }
    }
    var isReattach: Bool {
        if case .reattach = self { true } else { false }
    }
    var isInterruptedReattach: Bool {
        if case .reattach(let record) = self, record.state == .interruptedUnknown { true } else { false }
    }
}
