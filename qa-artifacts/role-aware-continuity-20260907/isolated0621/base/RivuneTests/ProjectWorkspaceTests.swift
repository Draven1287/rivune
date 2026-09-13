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

#if os(macOS)
private actor ProjectFixtureRunner: AITextRunning {
    private(set) var prompts: [String] = []
    func run(_ route: AIExecutionRoute, prompt: String, options: TerminalRunOptions) async throws -> TerminalRunResult {
        prompts.append(prompt)
        return TerminalRunResult(text: "Synthetic project reply", elapsedSeconds: 0.01)
    }
}

extension ProjectReviewFixtureTests {
    func testImportedProjectContextReachesOnlyApprovedSyntheticRunAndRetainsChatLink() async throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let file = directory.appendingPathComponent("notes.md")
        try Data("Project-only synthetic marker 8713".utf8).write(to: file)
        let runner = ProjectFixtureRunner()
        let coordinator = RivuneRunCoordinator(textRunner: runner)
        let store = RivuneStore(runCoordinator: coordinator, projectLibraryURL: directory.appendingPathComponent("projects.json"))
        store.codexReadiness = .ready
        store.createProject(named: "Synthetic linked project")
        var project = try XCTUnwrap(store.projects.first)
        project.defaultMode = .chatGPT
        project.instructions = "Use this project's synthetic reference."
        project.files = RivuneProjectFiles.importReferences(from: [file], existing: []).files
        project.files[0].included = true
        store.updateProject(project)
        store.startProjectChat(project)
        let chat = try XCTUnwrap(store.selectedConversationID)
        XCTAssertFalse(store.includeProjectContext)
        let withoutApproval = try RivuneProjectFiles.context(for: project, approved: store.includeProjectContext)
        XCTAssertTrue(withoutApproval.isEmpty)
        store.includeProjectContext = true
        let context = try RivuneProjectFiles.context(for: project, approved: store.includeProjectContext)
        let run = try store.submitWorkspaceRun(id: UUID(), conversationID: chat, prompt: "Use approved project notes", requestMode: .chatGPT, attachments: context, requestKey: "synthetic-project")
        for _ in 0..<200 { if coordinator.runs.first?.status == .complete { break }; await Task.yield() }
        XCTAssertEqual(coordinator.runs.first?.status, .complete)
        let prompts = await runner.prompts
        XCTAssertEqual(prompts.count, 1)
        XCTAssertTrue(try XCTUnwrap(prompts.first).contains("Project-only synthetic marker 8713"))
        let conversation = try XCTUnwrap(store.conversations.first { $0.id == run.conversationID })
        XCTAssertEqual(conversation.projectID, project.id)
        XCTAssertEqual(conversation.turns.last?.chatGPTAnswer?.content, "Synthetic project reply")
        try Data("Changed after approval".utf8).write(to: file)
        XCTAssertThrowsError(try RivuneProjectFiles.context(for: project, approved: true))
        XCTAssertEqual(try String(contentsOf: file, encoding: .utf8), "Changed after approval")
    }

    func testPopulatedProjectDetailRendersAtCompactAndWideSizes() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: directory) }
        let file = directory.appendingPathComponent("research-notes.md")
        try Data("Synthetic context for layout inspection".utf8).write(to: file)
        let store = RivuneStore()
        store.createProject(named: "Research · a project with a longer descriptive name")
        var project = try XCTUnwrap(store.projects.first)
        project.instructions = "Keep observations separate from assumptions.\nOnly share selected project context after approval."
        project.files = RivuneProjectFiles.importReferences(from: [file], existing: []).files
        project.files[0].included = true
        store.updateProject(project)
        store.startProjectChat(project)
        let output = URL(fileURLWithPath: "/private/tmp/rivune-project-render-review")
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        for width in [560, 920] {
            let view = NSHostingView(rootView: RivuneProjectsView(store: store, section: .constant(.projects))
                .foregroundStyle(Color.white).background(RivunePalette.canvas).preferredColorScheme(.dark))
            view.frame = NSRect(x: 0, y: 0, width: width, height: 900)
            view.layoutSubtreeIfNeeded()
            let bitmap = try XCTUnwrap(view.bitmapImageRepForCachingDisplay(in: view.bounds))
            view.cacheDisplay(in: view.bounds, to: bitmap)
            let data = try XCTUnwrap(bitmap.representation(using: .png, properties: [:]))
            XCTAssertGreaterThan(data.count, 1000)
            try data.write(to: output.appendingPathComponent("populated-project-\(width).png"))
        }
    }
}
#endif

#if os(macOS)
import WebKit

@MainActor
final class StaticPreviewRegressionTests: XCTestCase {
    func testProductionRulesCompileAndActualLocalPageLoadsWithoutJavaScript() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("rivune-preview-\(UUID())", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try Data("<!doctype html><html><head><link rel='stylesheet' href='styles.css'></head><body><h1>Local preview fixture</h1></body></html>".utf8).write(to: root.appendingPathComponent("index.html"))
        try Data("body { background: #faf0dd; color: #222; }".utf8).write(to: root.appendingPathComponent("styles.css"))
        let loaded = expectation(description: "actual WebKit file navigation completed")
        let status = StaticPreviewStatus(); status.onFinish = { loaded.fulfill() }
        let coordinator = StaticProjectWebView.Coordinator(rootURL: root, status: status)
        let view = StaticProjectWebView.makeView(coordinator: coordinator)
        defer { coordinator.cancel(); view.stopLoading(); view.navigationDelegate = nil }
        XCTAssertFalse(view.configuration.defaultWebpagePreferences.allowsContentJavaScript)
        let revision = UUID(), retry = UUID()
        coordinator.load(view, rootURL: root, revision: revision, retry: retry)
        await fulfillment(of: [loaded], timeout: 20)
        XCTAssertNil(status.failure); XCTAssertFalse(status.loading)
        XCTAssertEqual(view.url?.lastPathComponent, "index.html")
        status.onFinish = { XCTFail("Equivalent roots must not reload a completed preview") }
        for candidate in [root, root.resolvingSymlinksInPath(), root] {
            coordinator.load(view, rootURL: candidate, revision: revision, retry: retry)
            try await Task.sleep(for: .milliseconds(120))
            XCTAssertFalse(status.loading)
        }
    }
    func testPreviewNavigationRejectsOutsideFilesAndRemoteURLs() throws {
        let root = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("preview-\(UUID())")
        XCTAssertTrue(StaticPreviewPolicy.allows(root.appendingPathComponent("index.html"), root: root, download: false))
        XCTAssertFalse(StaticPreviewPolicy.allows(root.appendingPathComponent("../secret.txt"), root: root, download: false))
        XCTAssertFalse(StaticPreviewPolicy.allows(URL(fileURLWithPath: root.path + "-other/index.html"), root: root, download: false))
        XCTAssertFalse(StaticPreviewPolicy.allows(URL(string: "https://example.invalid")!, root: root, download: false))
        XCTAssertFalse(StaticPreviewPolicy.allows(root.appendingPathComponent("index.html"), root: root, download: true))
    }
    func testLegacyAlternationRuleFailsInsteadOfLoadingItsBlockedErrorPage() async {
        do {
            _ = try await WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "RivuneLegacyPreviewRegression", encodedContentRuleList: #"[{"trigger":{"url-filter":"^(https?|wss?|ftp)://"},"action":{"type":"block"}}]"#)
            XCTFail("Legacy alternation should be rejected by WebKit's content-rule compiler")
        } catch {
            XCTAssertFalse(error.localizedDescription.isEmpty)
        }
    }
}
#endif

final class ResponseArtifactTests: XCTestCase {
    private func response(_ files: [(String, String)], summary: String = "A useful website") throws -> String {
        String(decoding: try JSONSerialization.data(withJSONObject: ["summary": summary, "files": files.map { ["path": $0.0, "content": $0.1] }]), as: UTF8.self)
    }

    func testCompleteLargeArtifactIsImmutableAndStagingIsolatedPerAnswer() throws {
        let firstID = UUID(), secondID = UUID()
        let firstRaw = try response([("index.html", "<h1>First</h1>"), ("assets/site.css", String(repeating: "/* full CSS */\n", count: 3000))])
        let secondRaw = try response([("index.html", "<h1>Second</h1>")])
        let first = try ResponseArtifact.parse(answer: "```json\n\(firstRaw)\n```", answerID: firstID)
        let second = try ResponseArtifact.parse(answer: secondRaw, answerID: secondID)
        XCTAssertEqual(first.files[1].content.utf8.count, 45000)
        XCTAssertEqual(first.rawResponse, "```json\n\(firstRaw)\n```")
        var firstStage: ResponseArtifactStage? = try ResponseArtifactStage(artifact: first)
        let secondStage = try ResponseArtifactStage(artifact: second)
        let firstRoot = try XCTUnwrap(firstStage?.rootURL)
        XCTAssertNotEqual(firstRoot, secondStage.rootURL)
        XCTAssertEqual(firstStage?.answerID, firstID)
        XCTAssertEqual(try String(contentsOf: firstRoot.appendingPathComponent("index.html"), encoding: .utf8), "<h1>First</h1>")
        XCTAssertEqual(try String(contentsOf: secondStage.rootURL.appendingPathComponent("index.html"), encoding: .utf8), "<h1>Second</h1>")
        firstStage = nil
        XCTAssertFalse(FileManager.default.fileExists(atPath: firstRoot.path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: secondStage.rootURL.path))
    }

    func testInvalidIncompleteAndUnsafeArtifactsDoNotBecomeReady() throws {
        for files in [[("../escape.html", "x")], [("index.html", "a"), ("INDEX.html", "b")], [("empty.txt", "")], [("large.txt", String(repeating: "x", count: 131073))]] {
            XCTAssertThrowsError(try ResponseArtifact.parse(answer: response(files), answerID: UUID()))
        }
        let raw = try response([("index.html", "hello")])
        XCTAssertThrowsError(try ResponseArtifact.parse(answer: String(raw.dropLast()), answerID: UUID()))
        XCTAssertThrowsError(try ResponseArtifact.parse(answer: response([("index.html", "hello")], summary: " "), answerID: UUID()))
        XCTAssertFalse(ResponseArtifact.looksLikeManifest("Here is an ordinary answer."))
        XCTAssertFalse(ResponseArtifact.looksLikeManifest("```swift\nlet files = []\n```"))
        XCTAssertTrue(ResponseArtifact.looksLikeManifest(String(raw.dropLast())))
    }

    func testOlderArtifactSaveUsesItsOwnFilesAndExistingConflictGuard() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: root) }
        let file = root.appendingPathComponent("index.html")
        try Data("original".utf8).write(to: file)
        let older = try ResponseArtifact.parse(answer: response([("index.html", "older result")]), answerID: UUID())
        let newer = try ResponseArtifact.parse(answer: response([("index.html", "newer result")]), answerID: UUID())
        let workspace = try ProjectWorkspace(rootURL: root)
        let proposal = try workspace.prepare(answer: older.rawResponse)
        XCTAssertEqual(proposal.changes.first?.content, "older result")
        XCTAssertNotEqual(older.answerID, newer.answerID)
        XCTAssertEqual(try String(contentsOf: file, encoding: .utf8), "original")
        try Data("external edit".utf8).write(to: file)
        XCTAssertThrowsError(try workspace.apply(proposal))
        XCTAssertEqual(try String(contentsOf: file, encoding: .utf8), "external edit")
    }

    @MainActor
    func testCancelledFolderLoadCannotAdmitLateSnapshot() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: root) }
        let session = ProjectWorkspaceSession()
        var admitted = false
        session.select(root) { admitted = true }
        session.cancelFolderLoad()
        try await Task.sleep(for: .milliseconds(150))
        XCTAssertNil(session.workspace)
        XCTAssertFalse(session.isLoadingFolder)
        XCTAssertFalse(admitted)
        let ready = expectation(description: "next folder is admitted")
        session.select(root) { ready.fulfill() }
        await fulfillment(of: [ready], timeout: 3)
        XCTAssertNotNil(session.workspace)
    }
}

#if os(macOS)
import SwiftUI

@MainActor
private final class PreviewSheetFixtureState: ObservableObject {
    @Published var presented = false
    let status = StaticPreviewStatus()
    let artifact: ResponseArtifact
    init(root: URL) throws {
        let files = try ProjectWorkspace(rootURL: root).snapshot().files
        let raw = String(decoding: try JSONSerialization.data(withJSONObject: ["summary": "Mounted preview", "files": files.map { ["path": $0.path, "content": $0.content] }]), as: UTF8.self)
        artifact = try ResponseArtifact.parse(answer: raw, answerID: UUID())
    }
}

private struct PreviewSheetFixture: View {
    @ObservedObject var state: PreviewSheetFixtureState
    var body: some View {
        Text("Preview lifecycle fixture").frame(width: 900, height: 700)
            .sheet(isPresented: $state.presented) {
                ResponseArtifactViewer(artifact: state.artifact, previewStatus: state.status)
            }
    }
}

@MainActor
final class MountedPreviewLifecycleTests: XCTestCase {
    func testNavigationAdmissionRequiresAttachedNonzeroViewport() async throws {
        let status = StaticPreviewStatus()
        let coordinator = StaticProjectWebView.Coordinator(rootURL: FileManager.default.temporaryDirectory, status: status)
        let web = StaticProjectWebView.makeView(coordinator: coordinator)
        var admitted = 0
        web.pendingLoad = { admitted += 1 }
        web.setFrameSize(NSSize(width: 600, height: 400))
        await Task.yield()
        XCTAssertEqual(admitted, 0, "A sized but detached view cannot navigate")
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 600, height: 400), styleMask: [.titled], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        defer { web.cancelMountAdmission(); window.close() }
        window.contentView = web
        window.contentView?.layoutSubtreeIfNeeded()
        await Task.yield()
        XCTAssertEqual(admitted, 1)
        web.layout()
        await Task.yield()
        XCTAssertEqual(admitted, 1, "Layout alone must not repeat the admitted request")
        web.pendingLoad = { admitted += 1 }
        web.cancelMountAdmission()
        await Task.yield()
        XCTAssertEqual(admitted, 1, "Dismantling cancels a queued admission")
    }

    func testFirstSwiftUISheetPresentationPaintsLocalPageWithoutTabSwitch() async throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent("rivune-mounted-preview-\(UUID())")
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: false)
        defer { try? FileManager.default.removeItem(at: root) }
        try Data("<!doctype html><html><head><link rel='stylesheet' href='styles.css'></head><body><h1>First presentation</h1></body></html>".utf8).write(to: root.appendingPathComponent("index.html"))
        try Data("html,body{margin:0;min-height:100%;background:#f1e0ca;color:#123456}h1{padding:70px}".utf8).write(to: root.appendingPathComponent("styles.css"))
        let state = try PreviewSheetFixtureState(root: root)
        let loaded = expectation(description: "first sheet navigation")
        state.status.onFinish = { loaded.fulfill() }
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 900, height: 700), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.contentView = NSHostingView(rootView: PreviewSheetFixture(state: state))
        window.orderBack(nil)
        defer { state.presented = false; if let sheet = window.attachedSheet { window.endSheet(sheet) }; window.close() }
        state.presented = true
        await fulfillment(of: [loaded], timeout: 20)
        XCTAssertNil(state.status.failure)
        let sheet = try XCTUnwrap(window.attachedSheet)
        func findWebView(_ root: NSView) -> WKWebView? {
            if let web = root as? WKWebView { return web }
            for child in root.subviews { if let web = findWebView(child) { return web } }
            return nil
        }
        let web = try XCTUnwrap(sheet.contentView.flatMap(findWebView))
        XCTAssertTrue(web.window === sheet)
        XCTAssertGreaterThan(web.bounds.width, 500)
        XCTAssertGreaterThan(web.bounds.height, 400)
        let painted = expectation(description: "painted WebKit snapshot")
        web.takeSnapshot(with: nil) { image, error in
            XCTAssertNil(error)
            if let data = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: data), let color = bitmap.colorAt(x: 10, y: 10)?.usingColorSpace(.deviceRGB) {
                XCTAssertGreaterThan(color.redComponent, 0.8)
                XCTAssertGreaterThan(color.greenComponent, 0.7)
                XCTAssertGreaterThan(color.blueComponent, 0.6)
            } else { XCTFail("First mounted preview did not produce image pixels") }
            painted.fulfill()
        }
        await fulfillment(of: [painted], timeout: 10)
    }
}
#endif
