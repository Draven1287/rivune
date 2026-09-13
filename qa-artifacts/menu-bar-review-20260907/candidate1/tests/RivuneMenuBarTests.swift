#if os(macOS)
import XCTest
@testable import Rivune

@MainActor
final class RivuneMenuBarCommandRouterTests: XCTestCase {
    func testNewConversationDismissesPreservesCommandOrderAndNeverDispatches() {
        let recorder = CommandRecorder()
        let router = router(recorder)

        router.perform(.newConversation)

        XCTAssertEqual(recorder.events, ["dismiss", "new", "show"])
        XCTAssertEqual(recorder.providerDispatchCount, 0)
    }

    func testSettingsUsesExistingPresentationAndFocusPathsExactlyOnce() {
        let recorder = CommandRecorder()
        let router = router(recorder)

        router.perform(.settings)

        XCTAssertEqual(recorder.events, ["dismiss", "settings", "show"])
        XCTAssertEqual(recorder.providerDispatchCount, 0)
    }

    func testOpenAndQuitHaveNativeLifecycleBoundaries() {
        let recorder = CommandRecorder()
        let router = router(recorder)

        router.perform(.showApplication)
        XCTAssertEqual(recorder.events, ["dismiss", "show"])
        recorder.events.removeAll()
        router.perform(.quit)

        XCTAssertEqual(recorder.events, ["dismiss", "quit"])
        XCTAssertEqual(recorder.providerDispatchCount, 0)
    }

    func testStoreNewConversationPreservesExistingDraftAndRestoresIt() {
        let coordinator = RivuneRunCoordinator(journalURL: nil)
        let store = RivuneStore(bridge: PeerBridge(), runCoordinator: coordinator)
        let conversation = Conversation(
            title: "Existing work",
            preview: "Draft",
            updatedAt: .now,
            mode: .chatGPT
        )
        store.conversations = [conversation]
        store.selectConversation(conversation.id)
        store.composerText = "Keep this exact draft"

        store.newChat()
        XCTAssertNil(store.selectedConversationID)
        XCTAssertNotEqual(store.composerText, "Keep this exact draft")

        store.selectConversation(conversation.id)
        XCTAssertEqual(store.composerText, "Keep this exact draft")
    }

    private func router(_ recorder: CommandRecorder) -> RivuneMenuBarCommandRouter {
        RivuneMenuBarCommandRouter(
            dismissPanel: { recorder.events.append("dismiss") },
            showApplication: { recorder.events.append("show") },
            startNewConversation: { recorder.events.append("new") },
            showSettings: { recorder.events.append("settings") },
            terminateApplication: { recorder.events.append("quit") }
        )
    }
}

@MainActor
private final class CommandRecorder {
    var events: [String] = []
    var providerDispatchCount = 0
}

final class RivuneMenuBarTaskSnapshotTests: XCTestCase {
    func testSnapshotTracksRunningCoordinatorRowsAndStageChanges() {
        let conversationID = UUID()
        let runID = UUID()
        let conversation = Conversation(
            id: conversationID,
            title: "Real task",
            preview: "Working",
            updatedAt: .now,
            mode: .council
        )
        var run = WorkspaceRun(
            id: runID,
            conversationID: conversationID,
            requestKey: "request",
            turn: ChatTurn(prompt: "Question", mode: .council),
            status: .running,
            stage: .asking,
            updatedAt: .now
        )

        var snapshot = RivuneMenuBarTaskSnapshot.make(
            runs: [run], conversations: [conversation], hasActiveProviderRuns: true,
            currentConversationTitle: "Real task", currentStage: .asking
        )
        XCTAssertEqual(snapshot.headline, "1 task running")
        XCTAssertEqual(snapshot.items.first?.title, "Real task")
        XCTAssertEqual(snapshot.items.first?.stage, CouncilStage.asking.title)

        run.stage = .synthesizing
        snapshot = .make(
            runs: [run], conversations: [conversation], hasActiveProviderRuns: true,
            currentConversationTitle: "Real task", currentStage: .synthesizing
        )
        XCTAssertEqual(snapshot.items.first?.stage, CouncilStage.synthesizing.title)

        run.status = .complete
        snapshot = .make(
            runs: [run], conversations: [conversation], hasActiveProviderRuns: false,
            currentConversationTitle: "Real task", currentStage: .complete
        )
        XCTAssertEqual(snapshot, .init(activeCount: 0, items: []))
    }

    func testSnapshotDoesNotInventAProviderForUnjournaledActiveWork() {
        let snapshot = RivuneMenuBarTaskSnapshot.make(
            runs: [], conversations: [], hasActiveProviderRuns: true,
            currentConversationTitle: "New chat", currentStage: .asking
        )

        XCTAssertEqual(snapshot.activeCount, 1)
        XCTAssertEqual(snapshot.items.first?.title, "New chat")
        XCTAssertEqual(snapshot.items.first?.stage, CouncilStage.asking.title)
    }
}

final class RivuneReviewDraftPolicyTests: XCTestCase {
    func testExplicitReviewTextAppendsWithoutReplacingExistingDraft() {
        let merged = RivuneReviewDraftPolicy.merging(
            existingDraft: "Keep my original draft.",
            explicitText: "Check this paragraph."
        )

        XCTAssertEqual(
            merged,
            "Keep my original draft.\n\n---\n\nReview this text:\n\nCheck this paragraph."
        )
    }

    func testReviewTextRequiresExplicitNonemptyInput() {
        XCTAssertNil(RivuneReviewDraftPolicy.merging(existingDraft: "Existing", explicitText: "  \n "))
    }

    func testReviewDoesNotTruncateOrOverwriteWhenCombinedDraftExceedsLimit() {
        let existing = String(repeating: "x", count: RivuneReviewDraftPolicy.maximumComposerBytes)
        XCTAssertNil(RivuneReviewDraftPolicy.merging(existingDraft: existing, explicitText: "More"))
    }
}
#endif
