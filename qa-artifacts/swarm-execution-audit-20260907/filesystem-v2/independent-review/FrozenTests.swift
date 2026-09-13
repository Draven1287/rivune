import Foundation
import Testing
@testable import SwarmFilesystemAdapter

private struct InjectedFailure: Error {}

private struct FailAfterFirstWrite: SwarmFilesystemFaultInjecting {
    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .afterFile(index: 0, path: "a.txt") { throw InjectedFailure() }
    }
}

private struct FailAfterFirstNestedWrite: SwarmFilesystemFaultInjecting {
    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .afterFile(index: 0, path: "new/deep/a.txt") { throw InjectedFailure() }
    }
}

private struct FailAfterPackageWrite: SwarmFilesystemFaultInjecting {
    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .afterFile(index: 0, path: "Existing.app/Contents/valuable.txt") { throw InjectedFailure() }
    }
}

private struct ReplaceAppliedFileWithUserEdit: SwarmFilesystemFaultInjecting {
    let project: URL

    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .afterFile(index: 0, path: "a.txt") {
            try Data("new-user-edit".utf8).write(to: project.appendingPathComponent("a.txt"), options: .atomic)
            throw InjectedFailure()
        }
    }
}

private struct ReplaceAppliedFileWithDirectory: SwarmFilesystemFaultInjecting {
    let project: URL

    func check(_ step: SwarmFilesystemApplyStep) throws {
        if step == .afterFile(index: 0, path: "a.txt") {
            let target = project.appendingPathComponent("a.txt")
            try FileManager.default.removeItem(at: target)
            try FileManager.default.createDirectory(at: target, withIntermediateDirectories: false)
            try Data("keep".utf8).write(to: target.appendingPathComponent("keep.txt"))
            throw InjectedFailure()
        }
    }
}

private struct Fixture {
    let root: URL
    let project: URL
    let staging: URL

    init() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("rivune-fs-test-\(UUID().uuidString)")
        project = root.appendingPathComponent("project")
        staging = root.appendingPathComponent("staging")
        try FileManager.default.createDirectory(at: project, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: staging, withIntermediateDirectories: true)
    }

    func write(_ path: String, _ value: String) throws {
        let url = project.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(value.utf8).write(to: url)
    }

    func read(_ path: String) throws -> String {
        String(decoding: try Data(contentsOf: project.appendingPathComponent(path)), as: UTF8.self)
    }

    func cleanup() { try? FileManager.default.removeItem(at: root) }
}

@Test func stagesAndAppliesOwnedFilesWithReceipts() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("a.txt", "old")
    let base = SwarmFilesystemApplySession.sha256(Data("old".utf8))
    let session = try SwarmFilesystemApplySession(
        runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [
            .init(path: "a.txt", expectedBaseSHA256: base, proposedBytes: Data("new".utf8)),
            .init(path: "nested/b.txt", expectedBaseSHA256: nil, proposedBytes: Data("added".utf8))
        ])
    let staged = try await session.stage()
    #expect(staged.journalState == .prepared)
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/proposed/a.txt"))
    let applied = try await session.apply()
    #expect(applied.journalState == .complete)
    #expect(try fixture.read("a.txt") == "new")
    #expect(try fixture.read("nested/b.txt") == "added")
}

@Test func rejectsTraversalAndNormalizedOwnershipOverlap() throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    #expect(throws: SwarmFilesystemError.traversalRejected) {
        _ = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
            files: [.init(path: "../escape", expectedBaseSHA256: nil, proposedBytes: Data())])
    }
    #expect(throws: SwarmFilesystemError.ownershipConflict) {
        _ = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
            files: [
                .init(path: "Styles", expectedBaseSHA256: nil, proposedBytes: Data()),
                .init(path: "styles/site.css", expectedBaseSHA256: nil, proposedBytes: Data())
            ])
    }
}

@Test func rejectsSymlinkBeforeStaging() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("outside.txt", "outside")
    try FileManager.default.createSymbolicLink(at: fixture.project.appendingPathComponent("linked.txt"),
                                                withDestinationURL: fixture.project.appendingPathComponent("outside.txt"))
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "linked.txt", expectedBaseSHA256: nil, proposedBytes: Data("bad".utf8))])
    await #expect(throws: SwarmFilesystemError.symlinkRejected) { try await session.stage() }
    #expect(try fixture.read("outside.txt") == "outside")
}

@Test func rejectsCaseAndUnicodeNamespaceCollisions() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("STYLES", "occupied")
    let caseSession = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "styles/site.css", expectedBaseSHA256: nil, proposedBytes: Data())])
    await #expect(throws: SwarmFilesystemError.ownershipConflict) { try await caseSession.stage() }

    try FileManager.default.removeItem(at: fixture.project.appendingPathComponent("STYLES"))
    try fixture.write("Cafe\u{301}", "occupied")
    let unicodeSession = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "Caf\u{e9}/index.html", expectedBaseSHA256: nil, proposedBytes: Data())])
    await #expect(throws: SwarmFilesystemError.ownershipConflict) { try await unicodeSession.stage() }
}

@Test func applyTimeConflictLeavesTargetUnchanged() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("a.txt", "old")
    let base = SwarmFilesystemApplySession.sha256(Data("old".utf8))
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "a.txt", expectedBaseSHA256: base, proposedBytes: Data("new".utf8))])
    _ = try await session.stage()
    try fixture.write("a.txt", "changed-by-user")
    await #expect(throws: SwarmFilesystemError.targetChanged) { try await session.apply() }
    #expect(try fixture.read("a.txt") == "changed-by-user")
    #expect(await session.currentReceipt()?.journalState == .conflict)
}

@Test func newAncestorConflictAfterStageLeavesTargetUnchanged() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "styles/site.css", expectedBaseSHA256: nil, proposedBytes: Data("body{}".utf8))])
    _ = try await session.stage()
    try fixture.write("STYLES", "user file")
    await #expect(throws: SwarmFilesystemError.targetChanged) { try await session.apply() }
    #expect(try fixture.read("STYLES") == "user file")
    #expect(!FileManager.default.fileExists(atPath: fixture.project.appendingPathComponent("styles/site.css").path))
}

@Test func partialApplyFailureRollsBackAndPreservesRecoveryBundle() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("a.txt", "old-a")
    try fixture.write("b.txt", "old-b")
    let session = try SwarmFilesystemApplySession(
        runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [
            .init(path: "a.txt", expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("old-a".utf8)), proposedBytes: Data("new-a".utf8)),
            .init(path: "b.txt", expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("old-b".utf8)), proposedBytes: Data("new-b".utf8))
        ],
        faultInjector: FailAfterFirstWrite()
    )
    let staged = try await session.stage()
    await #expect(throws: SwarmFilesystemError.applyFailed) { try await session.apply() }
    #expect(try fixture.read("a.txt") == "old-a")
    #expect(try fixture.read("b.txt") == "old-b")
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/proposed/a.txt"))
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/backups/a.txt"))
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/journal.json"))
    #expect(await session.currentReceipt()?.journalState == .rolledBack)
}

@Test func unrelatedProjectChangeDoesNotCauseFalseConflict() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("a.txt", "old")
    try fixture.write("unrelated.txt", "one")
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "a.txt", expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("old".utf8)), proposedBytes: Data("new".utf8))])
    _ = try await session.stage()
    try fixture.write("unrelated.txt", "two")
    _ = try await session.apply()
    #expect(try fixture.read("a.txt") == "new")
    #expect(try fixture.read("unrelated.txt") == "two")
}

@Test func rejectsWrongBaseWithoutChangingProject() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("a.txt", "old")
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "a.txt", expectedBaseSHA256: String(repeating: "0", count: 64), proposedBytes: Data("new".utf8))])
    await #expect(throws: SwarmFilesystemError.baseConflict) { try await session.stage() }
    #expect(try fixture.read("a.txt") == "old")
}

@Test func applyTimeSymlinkIsRejectedAndExternalBytesAreUntouched() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let external = fixture.root.appendingPathComponent("external.txt")
    try Data("external".utf8).write(to: external)
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "target.txt", expectedBaseSHA256: nil, proposedBytes: Data("proposed".utf8))])
    _ = try await session.stage()
    try FileManager.default.createSymbolicLink(at: fixture.project.appendingPathComponent("target.txt"), withDestinationURL: external)
    await #expect(throws: SwarmFilesystemError.symlinkRejected) { try await session.apply() }
    #expect(String(decoding: try Data(contentsOf: external), as: UTF8.self) == "external")
    #expect(await session.currentReceipt()?.journalState == .conflict)
}

@Test func failedNewNestedWriteRemovesCreatedTreeAndKeepsStaging() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = try SwarmFilesystemApplySession(
        runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [
            .init(path: "new/deep/a.txt", expectedBaseSHA256: nil, proposedBytes: Data("a".utf8)),
            .init(path: "z.txt", expectedBaseSHA256: nil, proposedBytes: Data("z".utf8))
        ], faultInjector: FailAfterFirstNestedWrite())
    let staged = try await session.stage()
    await #expect(throws: SwarmFilesystemError.applyFailed) { try await session.apply() }
    #expect(!FileManager.default.fileExists(atPath: fixture.project.appendingPathComponent("new").path))
    #expect(!FileManager.default.fileExists(atPath: fixture.project.appendingPathComponent("z.txt").path))
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/proposed/new/deep/a.txt"))
    #expect(await session.currentReceipt()?.journalState == .rolledBack)
}

@Test func existingFileInsidePackageIsNotTreatedAsAbsent() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("Existing.app/Contents/valuable.txt", "existing-user-data")
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "Existing.app/Contents/valuable.txt", expectedBaseSHA256: nil,
                      proposedBytes: Data("proposal".utf8))])
    await #expect(throws: SwarmFilesystemError.baseConflict) { try await session.stage() }
    #expect(try fixture.read("Existing.app/Contents/valuable.txt") == "existing-user-data")
}

@Test func packageFileWithCorrectBaseIsBackedUpAndRestored() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("Existing.app/Contents/valuable.txt", "existing-user-data")
    let session = try SwarmFilesystemApplySession(
        runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [
            .init(path: "Existing.app/Contents/valuable.txt",
                  expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("existing-user-data".utf8)),
                  proposedBytes: Data("proposal".utf8)),
            .init(path: "z.txt", expectedBaseSHA256: nil, proposedBytes: Data("z".utf8))
        ], faultInjector: FailAfterPackageWrite())
    let staged = try await session.stage()
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/backups/Existing.app/Contents/valuable.txt"))
    await #expect(throws: SwarmFilesystemError.applyFailed) { try await session.apply() }
    #expect(try fixture.read("Existing.app/Contents/valuable.txt") == "existing-user-data")
    #expect(await session.currentReceipt()?.journalState == .rolledBack)
}

@Test func relevantSymlinkInsidePackageIsRejected() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("external.txt", "external")
    let packageDirectory = fixture.project.appendingPathComponent("Existing.app/Contents")
    try FileManager.default.createDirectory(at: packageDirectory, withIntermediateDirectories: true)
    try FileManager.default.createSymbolicLink(at: packageDirectory.appendingPathComponent("linked.txt"),
                                                withDestinationURL: fixture.project.appendingPathComponent("external.txt"))
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "Existing.app/Contents/linked.txt", expectedBaseSHA256: nil,
                      proposedBytes: Data("proposal".utf8))])
    await #expect(throws: SwarmFilesystemError.symlinkRejected) { try await session.stage() }
    #expect(try fixture.read("external.txt") == "external")
}

@Test func rollbackPreservesLaterUserEditAndRequiresRecovery() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    try fixture.write("a.txt", "original")
    let session = try SwarmFilesystemApplySession(
        runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "a.txt", expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("original".utf8)),
                      proposedBytes: Data("proposal".utf8))],
        faultInjector: ReplaceAppliedFileWithUserEdit(project: fixture.project))
    let staged = try await session.stage()
    await #expect(throws: SwarmFilesystemError.recoveryRequired) { try await session.apply() }
    #expect(try fixture.read("a.txt") == "new-user-edit")
    let receipt = await session.currentReceipt()
    #expect(receipt?.journalState == .recoveryRequired)
    #expect(receipt?.recoveryConflicts.first?.path == "a.txt")
    #expect(receipt?.recoveryConflicts.first?.observedSHA256 == SwarmFilesystemApplySession.sha256(Data("new-user-edit".utf8)))
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/backups/a.txt"))
}

@Test func rollbackNeverRecursivelyDeletesReplacementDirectory() async throws {
    let fixture = try Fixture(); defer { fixture.cleanup() }
    let session = try SwarmFilesystemApplySession(
        runID: UUID(), projectRoot: fixture.project, stagingParent: fixture.staging,
        files: [.init(path: "a.txt", expectedBaseSHA256: nil, proposedBytes: Data("proposal".utf8))],
        faultInjector: ReplaceAppliedFileWithDirectory(project: fixture.project))
    let staged = try await session.stage()
    await #expect(throws: SwarmFilesystemError.recoveryRequired) { try await session.apply() }
    #expect(try fixture.read("a.txt/keep.txt") == "keep")
    let receipt = await session.currentReceipt()
    #expect(receipt?.journalState == .recoveryRequired)
    #expect(receipt?.recoveryConflicts.first?.observedKind == "directory")
    #expect(FileManager.default.fileExists(atPath: staged.stagingDirectory + "/proposed/a.txt"))
}
