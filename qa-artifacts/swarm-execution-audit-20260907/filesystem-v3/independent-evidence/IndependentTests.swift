import Foundation
import Testing
@testable import SwarmFilesystemAdapter

private struct IndependentFailure: Error {}
private struct BoundaryReplacement: SwarmFilesystemFaultInjecting {
    let boundary: URL
    let moved: URL
    let replacement: URL
    let symlink: Bool
    let before: Bool
    func check(_ step: SwarmFilesystemApplyStep) throws {
        let trigger: SwarmFilesystemApplyStep = before ? .beforeFile(index: 0, path: "a.txt") : .afterFile(index: 0, path: "a.txt")
        guard step == trigger else { return }
        try FileManager.default.moveItem(at: boundary, to: moved)
        if symlink {
            try FileManager.default.createSymbolicLink(at: boundary, withDestinationURL: replacement)
        } else {
            try FileManager.default.moveItem(at: replacement, to: boundary)
        }
        if !before { throw IndependentFailure() }
    }
}

private func bytes(_ url: URL) throws -> String {
    String(decoding: try Data(contentsOf: url), as: UTF8.self)
}

private func boundaryProbe(ancestor: Bool, symlink: Bool, before: Bool) async throws {
    let fm = FileManager.default
    let fixture = fm.temporaryDirectory.appendingPathComponent("rivune-independent-boundary-\(UUID())")
    defer { try? fm.removeItem(at: fixture) }
    let container = fixture.appendingPathComponent("container")
    let project = container.appendingPathComponent("project")
    let staging = fixture.appendingPathComponent("staging")
    let moved = fixture.appendingPathComponent("moved")
    let replacement = fixture.appendingPathComponent("replacement")
    let replacementProject = ancestor ? replacement.appendingPathComponent("project") : replacement
    for path in [project, staging, replacementProject] {
        try fm.createDirectory(at: path, withIntermediateDirectories: true)
    }
    try Data("original".utf8).write(to: project.appendingPathComponent("a.txt"))
    try Data("proposal".utf8).write(to: replacementProject.appendingPathComponent("a.txt"))
    try Data("unrelated".utf8).write(to: replacementProject.appendingPathComponent("keep.txt"))
    let session = try SwarmFilesystemApplySession(runID: UUID(), projectRoot: project, stagingParent: staging,
        files: [.init(path: "a.txt", expectedBaseSHA256: SwarmFilesystemApplySession.sha256(Data("original".utf8)), proposedBytes: Data("proposal".utf8))],
        faultInjector: BoundaryReplacement(boundary: ancestor ? container : project, moved: moved,
                                          replacement: replacement, symlink: symlink, before: before))
    let staged = try await session.stage()
    await #expect(throws: SwarmFilesystemError.recoveryRequired) { try await session.apply() }
    let originalLocation = ancestor ? moved.appendingPathComponent("project") : moved
    let replacementLocation = symlink ? replacementProject : project
    #expect(try bytes(originalLocation.appendingPathComponent("a.txt")) == (before ? "original" : "proposal"))
    #expect(try bytes(replacementLocation.appendingPathComponent("a.txt")) == "proposal")
    #expect(try bytes(replacementLocation.appendingPathComponent("keep.txt")) == "unrelated")
    #expect(try bytes(URL(fileURLWithPath: staged.stagingDirectory).appendingPathComponent("backups/a.txt")) == "original")
    let result = try #require(await session.currentReceipt())
    #expect(result.journalState == .recoveryRequired)
    #expect(result.recoveryConflicts.contains { $0.path == "." && $0.observedKind == "unsafe-root" })
    let raw = try Data(contentsOf: URL(fileURLWithPath: staged.stagingDirectory).appendingPathComponent("journal.json"))
    let json = try #require(JSONSerialization.jsonObject(with: raw) as? [String: Any])
    #expect(json["state"] as? String == "recoveryRequired")
}

@Test func independentRootDirectoryReplacementPreservesBoth() async throws {
    try await boundaryProbe(ancestor: false, symlink: false, before: false)
}
@Test func independentAncestorDirectoryReplacementPreservesBoth() async throws {
    try await boundaryProbe(ancestor: true, symlink: false, before: false)
}
@Test func independentAncestorSymlinkReplacementPreservesBoth() async throws {
    try await boundaryProbe(ancestor: true, symlink: true, before: false)
}
@Test func independentRootReplacementBeforeWriteBlocksForwardWrite() async throws {
    try await boundaryProbe(ancestor: false, symlink: true, before: true)
}
@Test func independentAncestorReplacementBeforeWriteBlocksForwardWrite() async throws {
    try await boundaryProbe(ancestor: true, symlink: false, before: true)
}
