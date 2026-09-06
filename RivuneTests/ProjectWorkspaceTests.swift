import Foundation
import XCTest
@testable import Rivune

final class ProjectWorkspaceTests: XCTestCase {
    private func folder() throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("Rivune-workspace-test-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: false)
        addTeardownBlock { try? FileManager.default.removeItem(at: url) }
        return url
    }

    private func put(_ content: String, at path: String, in root: URL) throws {
        let target = root.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data(content.utf8).write(to: target)
    }

    private func get(_ path: String, in root: URL) throws -> String {
        try String(contentsOf: root.appendingPathComponent(path), encoding: .utf8)
    }

    private func manifest(_ files: [(String, String)]) throws -> String {
        let object: [String: Any] = ["summary": "Update the website", "files": files.map { ["path": $0.0, "content": $0.1] }]
        return "```json\n" + String(decoding: try JSONSerialization.data(withJSONObject: object), as: UTF8.self) + "\n```"
    }

    func testSnapshotIncludesBoundedTextAndOmitsHiddenDependenciesAndLinks() throws {
        let root = try folder()
        let outside = try folder()
        try put("<h1>Hello</h1>", at: "index.html", in: root)
        try put("body {}", at: "assets/site.css", in: root)
        try put("hidden", at: ".private.json", in: root)
        try put("dependency", at: "node_modules/library/index.js", in: root)
        try put("outside", at: "external.txt", in: outside)
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("linked.txt"), withDestinationURL: outside.appendingPathComponent("external.txt"))

        let snapshot = try ProjectWorkspace(rootURL: root).snapshot()

        XCTAssertEqual(snapshot.files.map(\.path), ["assets/site.css", "index.html"])
        XCTAssertEqual(snapshot.omittedFiles, 2)
        XCTAssertEqual(try get("index.html", in: root), "<h1>Hello</h1>")
    }

    func testUnsafeAndUnsupportedManifestPathsAreRejectedWithoutWrites() throws {
        let root = try folder()
        let workspace = try ProjectWorkspace(rootURL: root)
        for path in ["../outside.html", "/absolute.html", "a/../../b.html", "a//b.html", ".env.json", ".git/config.json", "a\\b.html", "https://x/index.html", "image.png", "index.html\u{0000}", "a/%2e%2e/b.html"] {
            XCTAssertThrowsError(try workspace.prepare(answer: manifest([(path, "bad")])) , path)
        }
        XCTAssertEqual(try FileManager.default.contentsOfDirectory(atPath: root.path), [])
    }

    func testTemporaryDirectoryAliasesProduceTheSameRelativeSnapshotPaths() throws {
        let root = try folder()
        try put("<h1>Local</h1>", at: "pages/index.html", in: root)
        let canonical = root.resolvingSymlinksInPath()
        let standardized = canonical.standardizedFileURL
        let first = try ProjectWorkspace(rootURL: canonical).snapshot()
        let second = try ProjectWorkspace(rootURL: standardized).snapshot()

        XCTAssertEqual(first.files.map(\.path), ["pages/index.html"])
        XCTAssertEqual(first.files, second.files)
    }

    func testDuplicatePathsAndAmbiguousManifestsAreRejected() throws {
        let workspace = try ProjectWorkspace(rootURL: folder())
        XCTAssertThrowsError(try workspace.prepare(answer: manifest([("index.html", "a"), ("INDEX.html", "b")])))
        let first = try manifest([("index.html", "a")])
        let second = try manifest([("style.css", "b")])
        XCTAssertThrowsError(try workspace.prepare(answer: first + "\n" + second))
    }

    func testSymbolicLinkTargetsAndParentsAreRejectedAndOutsideStaysUnchanged() throws {
        let root = try folder()
        let outside = try folder()
        try put("outside", at: "index.html", in: outside)
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("index.html"), withDestinationURL: outside.appendingPathComponent("index.html"))
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("assets"), withDestinationURL: outside)
        let workspace = try ProjectWorkspace(rootURL: root)

        XCTAssertThrowsError(try workspace.prepare(answer: manifest([("index.html", "bad")])))
        XCTAssertThrowsError(try workspace.prepare(answer: manifest([("assets/index.html", "bad")])))
        XCTAssertEqual(try get("index.html", in: outside), "outside")
    }

    func testProposalIsReadOnlyAndApplyCreatesBackupThenRevertRestoresOnlyTrackedFiles() throws {
        let root = try folder()
        try put("original", at: "index.html", in: root)
        try put("keep", at: "notes.txt", in: root)
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: manifest([("index.html", "updated"), ("assets/style.css", "body {}")]))
        XCTAssertEqual(try get("index.html", in: root), "original")
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("assets").path))

        let receipt = try workspace.apply(proposal)
        addTeardownBlock { try? FileManager.default.removeItem(at: receipt.backupURL.deletingLastPathComponent()) }
        XCTAssertEqual(try get("index.html", in: root), "updated")
        XCTAssertEqual(try get("assets/style.css", in: root), "body {}")
        XCTAssertTrue(FileManager.default.fileExists(atPath: receipt.backupURL.path))
        let archive = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: receipt.backupURL)) as? [String: Any])
        let originals = try XCTUnwrap(archive["files"] as? [[String: Any]])
        XCTAssertEqual(originals.first?["original"] as? String, Data("original".utf8).base64EncodedString())

        try workspace.revert(receipt)
        XCTAssertEqual(try get("index.html", in: root), "original")
        XCTAssertEqual(try get("notes.txt", in: root), "keep")
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("assets/style.css").path))
    }

    func testChangedTargetPreventsEveryWrite() throws {
        let root = try folder()
        try put("one", at: "index.html", in: root)
        try put("two", at: "style.css", in: root)
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: manifest([("index.html", "new one"), ("style.css", "new two")]))
        try put("edited elsewhere", at: "style.css", in: root)

        XCTAssertThrowsError(try workspace.apply(proposal))
        XCTAssertEqual(try get("index.html", in: root), "one")
        XCTAssertEqual(try get("style.css", in: root), "edited elsewhere")
    }

    func testNewFileAppearingAfterProposalIsNotOverwritten() throws {
        let root = try folder()
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: manifest([("index.html", "generated")]))
        try put("written elsewhere", at: "index.html", in: root)

        XCTAssertThrowsError(try workspace.apply(proposal))
        XCTAssertEqual(try get("index.html", in: root), "written elsewhere")
    }

    func testInjectedMidApplyFailureRestoresOriginalFiles() throws {
        let root = try folder()
        try put("original", at: "index.html", in: root)
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: manifest([("index.html", "generated"), ("style.css", "body {}")]))
        let backup = FileManager.default.temporaryDirectory.appendingPathComponent("Rivune-project-\(proposal.id.uuidString)")
        addTeardownBlock { try? FileManager.default.removeItem(at: backup) }

        XCTAssertThrowsError(try workspace.apply(proposal, beforeWrite: { index in
            if index == 1 { throw ProjectWorkspaceError.io("Injected write failure") }
        }))
        XCTAssertEqual(try get("index.html", in: root), "original")
        XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("style.css").path))
    }

    func testParentSymlinkAppearingDuringApplyCannotWriteOutsideRoot() throws {
        let root = try folder()
        let outside = try folder()
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: manifest([("assets/style.css", "body {}")]))
        let backup = FileManager.default.temporaryDirectory.appendingPathComponent("Rivune-project-\(proposal.id.uuidString)")
        addTeardownBlock { try? FileManager.default.removeItem(at: backup) }

        XCTAssertThrowsError(try workspace.apply(proposal, beforeWrite: { _ in
            try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("assets"), withDestinationURL: outside)
        }))
        XCTAssertFalse(FileManager.default.fileExists(atPath: outside.appendingPathComponent("style.css").path))
    }

    func testRevertRefusesIfAnyAppliedFileChangedAgain() throws {
        let root = try folder()
        try put("original", at: "index.html", in: root)
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: manifest([("index.html", "generated"), ("style.css", "body {}")]))
        let receipt = try workspace.apply(proposal)
        addTeardownBlock { try? FileManager.default.removeItem(at: receipt.backupURL.deletingLastPathComponent()) }
        try put("user edit", at: "index.html", in: root)

        XCTAssertThrowsError(try workspace.revert(receipt))
        XCTAssertEqual(try get("index.html", in: root), "user edit")
        XCTAssertEqual(try get("style.css", in: root), "body {}")
    }

    func testStructuralChecksReportMissingAndExternalReferencesHonestly() throws {
        let root = try folder()
        try put("<link href=\"style.css\"><img src=\"missing.png\"><a href=\"https://example.com\">Remote</a>", at: "index.html", in: root)
        try put("body {}", at: "style.css", in: root)
        let checks = try ProjectWorkspace(rootURL: root).structuralChecks()

        XCTAssertEqual(checks.first(where: { $0.id == "entry" })?.passed, true)
        XCTAssertEqual(checks.first(where: { $0.id == "references" })?.passed, false)
        XCTAssertTrue(checks.first(where: { $0.id == "references" })?.detail.contains("missing.png") == true)
        XCTAssertEqual(checks.first(where: { $0.id == "remote" })?.passed, false)
    }

    func testOversizedAndNonUTF8FilesAreNotSilentlySharedOrReplaced() throws {
        let root = try folder()
        try Data([0xff, 0xfe, 0xfd]).write(to: root.appendingPathComponent("index.html"))
        let workspace = try ProjectWorkspace(rootURL: root)
        XCTAssertThrowsError(try workspace.snapshot())
        let replacement = try manifest([("index.html", "replacement")])
        XCTAssertThrowsError(try workspace.prepare(answer: replacement))
        try Data(repeating: 65, count: ProjectWorkspace.maximumFileBytes + 1).write(to: root.appendingPathComponent("index.html"))
        XCTAssertThrowsError(try workspace.snapshot())
    }
}

final class LocalProjectLibraryTests: XCTestCase {
    func testVersionedProjectLibraryRoundTripAndFutureVersionProtection() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("projects.json")
        var project = RivuneProject(name: "Synthetic research")
        project.instructions = "Use concise answers."
        project.defaultMode = .claude
        try RivuneProjectStorage.save([project], to: url)
        XCTAssertEqual(try RivuneProjectStorage.load(from: url), [project])
        let future = Data("{\"schemaVersion\":99,\"projects\":[]}".utf8)
        try future.write(to: url)
        XCTAssertThrowsError(try RivuneProjectStorage.load(from: url))
        XCTAssertEqual(try Data(contentsOf: url), future)
    }
    func testUnapprovedContextNeverReadsMissingFiles() throws {
        var project = RivuneProject(name: "Synthetic")
        project.instructions = "Private instructions"
        project.files = [RivuneProjectFile(name: "missing.txt", path: "/nonexistent/rivune-test.txt", bookmark: nil, byteCount: 1, fingerprint: "missing", included: true)]
        XCTAssertTrue(try RivuneProjectFiles.context(for: project, approved: false).isEmpty)
        XCTAssertThrowsError(try RivuneProjectFiles.context(for: project, approved: true))
    }
    func testChangedFilesFailClosedAndRemovalPreservesOriginal() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".txt")
        defer { try? FileManager.default.removeItem(at: url) }
        try Data("Original synthetic text".utf8).write(to: url)
        var file = try RivuneProjectFiles.reference(url)
        file.included = true
        var project = RivuneProject(name: "Synthetic", files: [file])
        XCTAssertEqual(try RivuneProjectFiles.context(for: project, approved: true).count, 1)
        try Data("Changed synthetic text".utf8).write(to: url)
        XCTAssertThrowsError(try RivuneProjectFiles.context(for: project, approved: true))
        project.files = []
        XCTAssertTrue(FileManager.default.fileExists(atPath: url.path))
    }
    func testInstructionsBudgetFailsWithoutTruncation() throws {
        var project = RivuneProject(name: "Synthetic")
        project.instructions = String(repeating: "x", count: 21_000)
        XCTAssertThrowsError(try RivuneProjectFiles.context(for: project, approved: true))
    }
}

extension LocalProjectLibraryTests {
    @MainActor
    func testProjectChatsMoveAndDeleteWithoutLosingMessages() throws {
        let store = RivuneStore()
        XCTAssertTrue(RivuneLaunchContext.isIsolated)
        store.createProject(named: "First synthetic project")
        store.createProject(named: "Second synthetic project")
        let first = store.projects[0]
        let second = store.projects[1]
        store.startProjectChat(first)
        let id = try XCTUnwrap(store.selectedConversationID)
        XCTAssertEqual(store.activeProject?.id, first.id)
        store.composerText = "Unsent project draft"
        store.moveConversation(id, to: second.id)
        XCTAssertEqual(store.activeProject?.id, second.id)
        store.deleteProject(second.id)
        XCTAssertNil(store.activeProject)
        XCTAssertTrue(store.conversations.contains { $0.id == id })
        XCTAssertEqual(store.composerText, "Unsent project draft")
        let data = try JSONEncoder().encode(store.conversations)
        let restored = try JSONDecoder().decode([Conversation].self, from: data)
        XCTAssertEqual(restored.first?.id, id)
        XCTAssertNil(restored.first?.projectID)
    }
}


extension LocalProjectLibraryTests {
    @MainActor
    func testUpdateCannotOverwriteUnreadableProjectLibrary() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("projects.json")
        let future = Data("{\"schemaVersion\":99,\"projects\":[]}".utf8)
        try future.write(to: url)
        let store = RivuneStore(projectLibraryURL: url)
        XCTAssertFalse(store.prepareForUpdate())
        XCTAssertEqual(try Data(contentsOf: url), future)
    }

    func testExcludedMissingFileDoesNotBlockApprovedInstructions() throws {
        var project = RivuneProject(name: "Synthetic", files: [RivuneProjectFile(name: "missing.txt", path: "/nonexistent/rivune-qa.txt", bookmark: nil, byteCount: 1, fingerprint: "missing", included: false)])
        project.instructions = "Be concise."
        XCTAssertEqual(try RivuneProjectFiles.context(for: project, approved: true).map(\.textContent), ["Be concise."])
        project.files[0].included = true
        XCTAssertThrowsError(try RivuneProjectFiles.context(for: project, approved: true))
    }
}

#if os(macOS)
import SwiftUI
import AppKit

@MainActor
final class ProjectReviewFixtureTests: XCTestCase {
    func testArchiveRestoreAndFileReferencesSurviveRecreation() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let library = directory.appendingPathComponent("projects.json")
        let fileURL = directory.appendingPathComponent("notes.txt")
        try Data("Disposable project reference".utf8).write(to: fileURL)
        let store = RivuneStore(projectLibraryURL: library)
        store.createProject(named: "  Field work  ")
        var project = try XCTUnwrap(store.projects.first)
        XCTAssertEqual(project.name, "Field work")
        project.files = [try RivuneProjectFiles.reference(fileURL)]
        project.name = "Renamed field work"; project.instructions = "Use only selected context."
        project.isArchived = true; store.updateProject(project)
        let restored = RivuneStore(projectLibraryURL: library)
        XCTAssertEqual(restored.projects.first, store.projects.first)
        restored.startProjectChat(try XCTUnwrap(restored.projects.first))
        XCTAssertTrue(restored.conversations.isEmpty)
        var reopened = try XCTUnwrap(restored.projects.first); reopened.isArchived = false
        restored.updateProject(reopened); restored.startProjectChat(reopened)
        XCTAssertEqual(restored.activeProject?.id, reopened.id)
        restored.deleteProject(reopened.id)
        XCTAssertNil(restored.activeProject)
        XCTAssertEqual(restored.conversations.count, 1)
        XCTAssertTrue(try RivuneProjectStorage.load(from: library).isEmpty)
        XCTAssertEqual(try String(contentsOf: fileURL, encoding: .utf8), "Disposable project reference")
    }

    func testProjectApprovalResetsWhenSwitchingChatsAndChangingInstructions() throws {
        let store = RivuneStore()
        store.createProject(named: "Synthetic approval")
        let project = try XCTUnwrap(store.projects.first)
        store.startProjectChat(project)
        let first = try XCTUnwrap(store.selectedConversationID)
        store.composerText = "First unsent draft"; store.includeProjectContext = true
        store.startProjectChat(project)
        let second = try XCTUnwrap(store.selectedConversationID)
        XCTAssertFalse(store.includeProjectContext)
        store.composerText = "Second unsent draft"
        store.selectConversation(first)
        XCTAssertEqual(store.composerText, "First unsent draft")
        store.includeProjectContext = true
        var changed = project; changed.instructions = "Changed instructions"
        store.updateProject(changed)
        XCTAssertFalse(store.includeProjectContext)
        store.selectConversation(second)
        XCTAssertEqual(store.composerText, "Second unsent draft")
    }

    func testUnreadableLibraryCannotCreateUnsavedProjects() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: url) }
        let original = Data("unreadable library".utf8); try original.write(to: url)
        let store = RivuneStore(projectLibraryURL: url)
        store.createProject(named: "Should not pretend to save")
        XCTAssertFalse(store.projectLibraryAvailable)
        XCTAssertTrue(store.projects.isEmpty)
        XCTAssertEqual(try Data(contentsOf: url), original)
    }

    func testProjectDetailsRenderInIsolatedHostingView() throws {
        let store = RivuneStore()
        store.createProject(named: "Synthetic project · design research")
        var project = try XCTUnwrap(store.projects.first)
        project.instructions = "Preserve provenance. Use concise answers.\nOnly share context after approval."
        store.updateProject(project)
        let output = URL(fileURLWithPath: "/private/tmp/rivune-native-0607")
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        for width in [620, 980] {
            let view = NSHostingView(rootView: RivuneProjectsView(store: store, section: .constant(.projects)).preferredColorScheme(.dark))
            view.frame = NSRect(x: 0, y: 0, width: width, height: 900)
            view.layoutSubtreeIfNeeded()
            let bitmap = try XCTUnwrap(view.bitmapImageRepForCachingDisplay(in: view.bounds))
            view.cacheDisplay(in: view.bounds, to: bitmap)
            let data = try XCTUnwrap(bitmap.representation(using: .png, properties: [:]))
            XCTAssertGreaterThan(data.count, 1000)
            try data.write(to: output.appendingPathComponent("project-\(width).png"))
        }
    }
}
#endif

#if os(macOS)
extension ProjectReviewFixtureTests {
    func testFolderImportSkipsHiddenSymlinksAndDuplicatesAndRequiresSelection() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let normal = directory.appendingPathComponent("notes.md")
        try Data("Synthetic markdown".utf8).write(to: normal)
        try Data("Hidden".utf8).write(to: directory.appendingPathComponent(".private.txt"))
        try Data([0, 1, 2]).write(to: directory.appendingPathComponent("binary.txt"))
        try FileManager.default.createSymbolicLink(at: directory.appendingPathComponent("linked.txt"), withDestinationURL: normal)
        let result = RivuneProjectFiles.importReferences(from: [directory, normal], existing: [])
        XCTAssertEqual(result.files.map(\.name), ["notes.md"])
        XCTAssertFalse(try XCTUnwrap(result.files.first).included)
        let project = RivuneProject(name: "Synthetic", files: result.files)
        XCTAssertTrue(try RivuneProjectFiles.context(for: project, approved: true).isEmpty)
        try FileManager.default.removeItem(at: normal)
        var selected = project; selected.files[0].included = true
        XCTAssertThrowsError(try RivuneProjectFiles.context(for: selected, approved: true))
    }
}
#endif
