import Foundation
import XCTest
import Auth
@testable import Rivune

final class BridgeUpdateFittingTests: XCTestCase {
    func testSmallUpdateIsPreserved() throws {
        let turn = ChatTurn(
            id: UUID(uuidString: "10000000-0000-0000-0000-000000000001")!,
            prompt: "Explain the result.",
            mode: .chatGPT,
            createdAt: Date(timeIntervalSince1970: 1_700_000_000),
            chatGPTAnswer: answer(
                id: "20000000-0000-0000-0000-000000000001",
                source: .chatGPT,
                content: "A concise answer."
            ),
            executionState: .complete
        )
        let update = BridgePromptUpdate(
            requestID: UUID(uuidString: "30000000-0000-0000-0000-000000000001")!,
            stage: .complete,
            turn: turn,
            isComplete: true
        )

        let fitted = RivuneStore.fittedBridgeUpdate(update)

        XCTAssertEqual(fitted.requestID, update.requestID)
        XCTAssertEqual(fitted.stage, update.stage)
        XCTAssertEqual(fitted.turn, update.turn)
        XCTAssertEqual(fitted.isComplete, update.isComplete)
        XCTAssertEqual(try encodedSize(fitted), try encodedSize(update))
    }

    func testOversizedUnicodeAnswersFitWithinBridgeBudget() throws {
        let oversizedContent = String(repeating: "🧠", count: 300_000)
        let chatGPTID = "20000000-0000-0000-0000-000000000011"
        let claudeID = "20000000-0000-0000-0000-000000000012"
        let combinedID = "20000000-0000-0000-0000-000000000013"
        let turn = ChatTurn(
            id: UUID(uuidString: "10000000-0000-0000-0000-000000000011")!,
            prompt: "Synthesize both answers.",
            mode: .together,
            createdAt: Date(timeIntervalSince1970: 1_700_000_001),
            chatGPTAnswer: answer(id: chatGPTID, source: .chatGPT, content: oversizedContent),
            claudeAnswer: answer(id: claudeID, source: .claude, content: oversizedContent),
            combinedAnswer: answer(id: combinedID, source: .alloy, content: oversizedContent),
            togetherTrace: TogetherTrace(
                phase: .complete,
                sharedPlan: String(repeating: "Shared plan. ", count: 1_000),
                chatGPTReview: "ChatGPT review",
                claudeReview: "Claude review"
            ),
            executionState: .complete
        )
        let update = BridgePromptUpdate(
            requestID: UUID(uuidString: "30000000-0000-0000-0000-000000000011")!,
            stage: .complete,
            turn: turn,
            isComplete: true
        )

        XCTAssertGreaterThan(try encodedSize(update), PeerBridge.maximumMessageBytes)

        let fitted = RivuneStore.fittedBridgeUpdate(update)
        let fittedSize = try encodedSize(fitted)

        XCTAssertLessThanOrEqual(fittedSize, PeerBridge.maximumMessageBytes - 4_096)
        XCTAssertEqual(fitted.turn.chatGPTAnswer?.id, UUID(uuidString: chatGPTID))
        XCTAssertEqual(fitted.turn.claudeAnswer?.id, UUID(uuidString: claudeID))
        XCTAssertEqual(fitted.turn.combinedAnswer?.id, UUID(uuidString: combinedID))
        XCTAssertEqual(fitted.turn.chatGPTAnswer?.provenance, "Test provenance")
        XCTAssertEqual(fitted.turn.togetherTrace, turn.togetherTrace)
        XCTAssertEqual(fitted.turn.executionState, .complete)
        XCTAssertTrue(fitted.turn.chatGPTAnswer?.content.hasSuffix("[truncated]") == true)
        XCTAssertTrue(fitted.turn.claudeAnswer?.content.hasSuffix("[truncated]") == true)
        XCTAssertTrue(fitted.turn.combinedAnswer?.content.hasSuffix("[truncated]") == true)
    }

    func testOversizedEchoedAttachmentsAreRemoved() throws {
        let attachmentText = String(repeating: "x", count: PeerBridge.maximumMessageBytes + 16_384)
        let attachment = PromptAttachment(
            id: UUID(uuidString: "40000000-0000-0000-0000-000000000001")!,
            name: "oversized.txt",
            textContent: attachmentText,
            byteCount: attachmentText.utf8.count
        )
        let turn = ChatTurn(
            id: UUID(uuidString: "10000000-0000-0000-0000-000000000021")!,
            prompt: "Use the attachment.",
            mode: .claude,
            createdAt: Date(timeIntervalSince1970: 1_700_000_002),
            claudeAnswer: answer(
                id: "20000000-0000-0000-0000-000000000021",
                source: .claude,
                content: "The result."
            ),
            attachments: [attachment],
            executionState: .complete
        )
        let update = BridgePromptUpdate(
            requestID: UUID(uuidString: "30000000-0000-0000-0000-000000000021")!,
            stage: .complete,
            turn: turn,
            isComplete: true
        )

        XCTAssertGreaterThan(try encodedSize(update), PeerBridge.maximumMessageBytes)

        let fitted = RivuneStore.fittedBridgeUpdate(update)

        XCTAssertTrue(fitted.turn.attachments.isEmpty)
        XCTAssertEqual(fitted.turn.claudeAnswer, turn.claudeAnswer)
        XCTAssertLessThanOrEqual(
            try encodedSize(fitted),
            PeerBridge.maximumMessageBytes - 4_096
        )
    }

    func testFinalBridgeUpdateDoesNotShrinkPreviouslyShownContributions() {
        let turnID = UUID(uuidString: "10000000-0000-0000-0000-000000000031")!
        let chatGPTID = "20000000-0000-0000-0000-000000000031"
        let claudeID = "20000000-0000-0000-0000-000000000032"
        let existing = ChatTurn(
            id: turnID,
            prompt: "Coordinate the result.",
            mode: .together,
            chatGPTAnswer: answer(
                id: chatGPTID,
                source: .chatGPT,
                content: String(repeating: "A", count: 20_000)
            ),
            claudeAnswer: answer(
                id: claudeID,
                source: .claude,
                content: String(repeating: "B", count: 20_000)
            ),
            executionState: .pending
        )
        let incoming = ChatTurn(
            id: turnID,
            prompt: existing.prompt,
            mode: .together,
            chatGPTAnswer: answer(
                id: chatGPTID,
                source: .chatGPT,
                content: "shortened\n[truncated]"
            ),
            claudeAnswer: answer(
                id: claudeID,
                source: .claude,
                content: "shortened\n[truncated]"
            ),
            combinedAnswer: answer(
                id: "20000000-0000-0000-0000-000000000033",
                source: .alloy,
                content: "Integrated result"
            ),
            executionState: .complete
        )

        let merged = RivuneStore.mergedBridgeTurn(
            existing: existing,
            incoming: incoming
        )

        XCTAssertEqual(merged.chatGPTAnswer?.content, existing.chatGPTAnswer?.content)
        XCTAssertEqual(merged.claudeAnswer?.content, existing.claudeAnswer?.content)
        XCTAssertEqual(merged.combinedAnswer, incoming.combinedAnswer)
        XCTAssertEqual(merged.executionState, .complete)
    }

    private func answer(id: String, source: AnswerSource, content: String) -> AIAnswer {
        AIAnswer(
            id: UUID(uuidString: id)!,
            source: source,
            content: content,
            responseTime: 1.25,
            provenance: "Test provenance"
        )
    }

    private func encodedSize(_ update: BridgePromptUpdate) throws -> Int {
        try JSONEncoder().encode(BridgeEnvelope.update(update)).count
    }
}

final class PreparedAttachmentContextTests: XCTestCase {
    func testNearLimitTextIsPreservedWithoutTruncation() throws {
        let content = String(repeating: "A", count: 18_000)
        let attachment = PromptAttachment(
            name: "evidence.txt",
            textContent: content,
            byteCount: content.utf8.count
        )

        let prepared = try XCTUnwrap(RivuneStore.preparedAttachmentContext([attachment]))

        XCTAssertTrue(prepared.contains(content))
        XCTAssertFalse(prepared.contains("[truncated]"))
        XCTAssertLessThanOrEqual(prepared.utf8.count, 20_000)
    }

    func testEscapeHeavyTextIsRejectedInsteadOfSilentlyTruncated() {
        let content = String(repeating: "\\\"\n", count: 5_500)
        let attachment = PromptAttachment(
            name: "escaped.txt",
            textContent: content,
            byteCount: content.utf8.count
        )

        XCTAssertNil(RivuneStore.preparedAttachmentContext([attachment]))
    }
}

final class TogetherTraceCompatibilityTests: XCTestCase {
    func testTraceRoundTripsAndRemainsOptionalForLegacyTurns() throws {
        let trace = TogetherTrace(
            phase: .reviewing,
            collaborationShape: .complementaryWorkstreams,
            sharedPlan: "Codex builds the structure; Claude checks the experience.",
            chatGPTReview: "Resolve the navigation conflict and recheck my assumptions.",
            claudeReview: "Keep the shared design tokens.",
            failedPhase: nil
        )
        let original = ChatTurn(
            id: UUID(uuidString: "70000000-0000-0000-0000-000000000001")!,
            prompt: "Build a website together.",
            mode: .together,
            createdAt: Date(timeIntervalSince1970: 1_700_000_003),
            togetherTrace: trace,
            executionState: .pending
        )

        let encoded = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(ChatTurn.self, from: encoded)
        XCTAssertEqual(decoded.togetherTrace, trace)

        var legacyObject = try XCTUnwrap(
            JSONSerialization.jsonObject(with: encoded) as? [String: Any]
        )
        var legacyTraceObject = try XCTUnwrap(
            legacyObject["togetherTrace"] as? [String: Any]
        )
        legacyTraceObject.removeValue(forKey: "collaborationShape")
        legacyObject["togetherTrace"] = legacyTraceObject
        let legacyShapeData = try JSONSerialization.data(
            withJSONObject: legacyObject,
            options: [.sortedKeys]
        )
        let legacyShapeTurn = try JSONDecoder().decode(ChatTurn.self, from: legacyShapeData)
        XCTAssertNil(legacyShapeTurn.togetherTrace?.collaborationShape)

        legacyObject.removeValue(forKey: "togetherTrace")
        let legacyData = try JSONSerialization.data(
            withJSONObject: legacyObject,
            options: [.sortedKeys]
        )
        let legacyTurn = try JSONDecoder().decode(ChatTurn.self, from: legacyData)
        XCTAssertNil(legacyTurn.togetherTrace)
    }

    func testEscapedPromptPayloadIsFittedAfterJSONEncoding() throws {
        let escapeHeavy = String(repeating: "\"\\\u{0001}\n", count: 40_000)
        let payload = RivuneStore.jsonPayload([
            "original_user_request": "Build the requested artifact.",
            "shared_coordination_plan": escapeHeavy,
            "chatgpt_contribution": escapeHeavy,
            "claude_contribution": escapeHeavy
        ])
        let data = try XCTUnwrap(payload.data(using: .utf8))
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: data) as? [String: String]
        )

        XCTAssertLessThanOrEqual(data.count, 112 * 1_024)
        XCTAssertEqual(object["original_user_request"], "Build the requested artifact.")
        XCTAssertNotNil(object["shared_coordination_plan"])
        XCTAssertNotNil(object["chatgpt_contribution"])
        XCTAssertNotNil(object["claude_contribution"])
    }

    func testEscapedMaximumUserRequestIsNeverTrimmed() throws {
        let request = String(repeating: "\"\\\n", count: 5_461) + "x"
        XCTAssertEqual(request.utf8.count, 16_384)

        let payload = RivuneStore.jsonPayload(
            [
                "original_user_request": request,
                "prior_conversation": String(repeating: "\\", count: 12_000),
                "shared_coordination_plan": String(repeating: "plan ", count: 2_400),
                "chatgpt_contribution": String(repeating: "\"\\", count: 12_000),
                "claude_contribution": String(repeating: "\"\\", count: 12_000),
                "user_selected_documents": String(repeating: "\\", count: 20_000)
            ],
            preserving: ["original_user_request"]
        )

        let data = try XCTUnwrap(payload.data(using: .utf8))
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: data) as? [String: String]
        )
        XCTAssertEqual(object["original_user_request"], request)
        XCTAssertLessThanOrEqual(data.count, 112 * 1_024)
    }

    func testCollaborationPlanRequiresAndPreservesEverySection() throws {
        let validPlan = """
        ## Goal
        Produce a complete landing page.

        ## Collaboration approach
        Use complementary workstreams so structure and visual behavior can be developed in parallel.

        ## Shared requirements
        One file, accessible markup, and no external assets.

        ## Codex task
        Build the semantic HTML structure and component contract that Claude needs for visual behavior.

        ## Claude task
        Build the visual system using Codex's component contract and check accessibility behavior.

        ## How the work connects
        Codex provides class names and component boundaries; Claude uses them and supplies token definitions back to Codex.

        ## Definition of done
        Verify keyboard flow, responsive layout, and all requested sections.
        """

        let normalized = try XCTUnwrap(
            RivuneStore.validatedCollaborationPlan(validPlan)
        )
        XCTAssertTrue(normalized.contains("## Codex task"))
        XCTAssertTrue(normalized.contains("## Claude task"))
        XCTAssertTrue(normalized.contains("## Definition of done"))
        XCTAssertLessThanOrEqual(normalized.utf8.count, 12_000)

        let incompletePlan = validPlan.replacingOccurrences(
            of: "## How the work connects\nCodex provides class names and component boundaries; Claude uses them and supplies token definitions back to Codex.\n\n",
            with: ""
        )
        XCTAssertNil(RivuneStore.validatedCollaborationPlan(incompletePlan))

        let placeholderPlan = """
        ## Goal
        N/A
        ## Collaboration approach
        N/A
        ## Shared requirements
        N/A
        ## Codex task
        N/A
        ## Claude task
        N/A
        ## How the work connects
        N/A
        ## Definition of done
        N/A
        """
        XCTAssertNil(RivuneStore.validatedCollaborationPlan(placeholderPlan))

        let repeatedPlaceholderPlan = """
        ## Goal
        N/A N/A N/A N/A
        ## Collaboration approach
        TBD TBD TBD TBD
        ## Shared requirements
        N/A N/A N/A N/A
        ## Codex task
        N/A N/A N/A N/A N/A N/A N/A N/A N/A N/A N/A
        ## Claude task
        TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD TBD
        ## How the work connects
        None None None None None
        ## Definition of done
        Unknown Unknown Unknown Unknown Unknown
        """
        XCTAssertNil(RivuneStore.validatedCollaborationPlan(repeatedPlaceholderPlan))

        let duplicateAssignments = validPlan.replacingOccurrences(
            of: "Build the visual system using Codex's component contract and check accessibility behavior.",
            with: "Build the semantic HTML structure and component contract that Claude needs for visual behavior."
        )
        XCTAssertNil(RivuneStore.validatedCollaborationPlan(duplicateAssignments))

        let missingTaskDependency = validPlan.replacingOccurrences(
            of: " that Claude needs for visual behavior",
            with: " for visual behavior"
        )
        XCTAssertNil(RivuneStore.validatedCollaborationPlan(missingTaskDependency))

        let vagueDefinition = validPlan.replacingOccurrences(
            of: "Verify keyboard flow, responsive layout, and all requested sections.",
            with: "Make it good."
        )
        XCTAssertNil(RivuneStore.validatedCollaborationPlan(vagueDefinition))
    }
}

final class TogetherOrchestrationSafetyTests: XCTestCase {
    func testOnlyUnmistakableSmallTalkUsesDirectWorkflow() {
        let directPrompts = [
            "hi", "Hello!", "hey there", "Thank you", "How are you?", "testing"
        ]
        for prompt in directPrompts {
            XCTAssertEqual(
                RivuneStore.togetherWorkflowDepth(for: prompt, attachments: []),
                .direct,
                "Expected a direct workflow for: \(prompt)"
            )
        }

        let substantialPrompts = [
            "Build a website", "Fix login", "Compare these plans", "What is 2 + 2?",
            "Hi, build a responsive portfolio for me"
        ]
        for prompt in substantialPrompts {
            XCTAssertEqual(
                RivuneStore.togetherWorkflowDepth(for: prompt, attachments: []),
                .deliberative,
                "Expected a deliberative workflow for: \(prompt)"
            )
        }
    }

    func testAttachmentsAlwaysPreserveDeliberativeWorkflow() {
        let attachment = PromptAttachment(
            name: "brief.txt",
            textContent: "Review this brief.",
            byteCount: 18
        )

        XCTAssertEqual(
            RivuneStore.togetherWorkflowDepth(for: "hi", attachments: [attachment]),
            .deliberative
        )
    }

    func testRequestShapeSelectionMatchesTheRequestedOutcome() {
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "Build a lesson plan for teenagers to learn AI.",
                attachments: []
            ),
            .complementaryWorkstreams
        )
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "Compare these two launch plans and recommend one.",
                attachments: []
            ),
            .comparisonAndDecision
        )
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "Research this claim and verify the evidence.",
                attachments: []
            ),
            .evidenceAndVerification
        )
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "Explain why this algorithm terminates.",
                attachments: []
            ),
            .solutionAndChallenge
        )
        XCTAssertEqual(
            RivuneStore.collaborationShape(for: "Hello!", attachments: []),
            .directResponse
        )
    }

    func testInternalCoordinationNotesAreWithheldFromContributionCards() {
        let leaked = """
        Candidate A: Use the greeting. Candidate B: Mention the tools.
        Self-audit against the acceptance checks: both candidates remain blocked.
        Notes for ChatGPT and the integrator: final wording and selection remain ChatGPT's.
        """

        let displayed = RivuneStore.userFacingContribution(leaked)

        XCTAssertTrue(RivuneStore.containsInternalCoordinationLeak(leaked))
        XCTAssertTrue(displayed.contains("usable work was incorporated"))
        XCTAssertFalse(displayed.localizedCaseInsensitiveContains("candidate a"))
        XCTAssertFalse(displayed.localizedCaseInsensitiveContains("acceptance checks"))

        let candidateSelection = """
        Candidate A: “Hi! What would you like to work on?”
        Candidate B: “Hi! How can I help?”
        I recommend Candidate B because it is concise.
        """
        XCTAssertTrue(RivuneStore.containsInternalCoordinationLeak(candidateSelection))
        XCTAssertFalse(
            RivuneStore.containsInternalCoordinationLeak(
                candidateSelection,
                userPrompt: "Compare Candidate A and Candidate B"
            )
        )
    }

    func testNormalContributionIsBoundedWithoutFalsePositive() {
        let normal = """
        Here is the implementation. Acceptance checks include keyboard navigation,
        responsive layout, and clear loading states.
        """ + String(repeating: " Useful implementation detail.", count: 1_000)

        let displayed = RivuneStore.userFacingContribution(normal)

        XCTAssertFalse(RivuneStore.containsInternalCoordinationLeak(normal))
        XCTAssertLessThanOrEqual(displayed.utf8.count, 8_000)
        XCTAssertTrue(displayed.hasSuffix("[truncated]"))
    }

    func testFallbackUsesCompletedSafeContributionAndNeverLeakedNotes() {
        let safe = "Hi! What would you like to work on?"
        let leaked = """
        Candidate A: hello. Candidate B: hi.
        Audit of ChatGPT's candidates against all acceptance checks.
        """

        XCTAssertEqual(
            RivuneStore.fallbackCombinedContent(chatGPT: safe, claude: leaked),
            safe
        )
        XCTAssertEqual(
            RivuneStore.fallbackCombinedContent(chatGPT: leaked, claude: safe),
            safe
        )
        XCTAssertNil(
            RivuneStore.fallbackCombinedContent(chatGPT: leaked, claude: leaked)
        )
        let withheld = "Private coordination notes were withheld from this card. Their usable conclusions are still considered in the combined answer."
        XCTAssertTrue(RivuneStore.containsInternalCoordinationLeak(withheld))
        XCTAssertNil(
            RivuneStore.fallbackCombinedContent(chatGPT: withheld, claude: withheld)
        )
        let removed = "Internal coordination details were removed from this saved response."
        XCTAssertTrue(RivuneStore.containsInternalCoordinationLeak(removed))
        XCTAssertEqual(
            RivuneStore.localDirectFallback(for: "hi"),
            "Hi! What would you like to work on?"
        )
        XCTAssertNil(RivuneStore.localDirectFallback(for: "Build a website"))
    }

    func testSidebarPreviewNeverKeepsLeakedCoordinationText() {
        let leaked = """
        Candidate A: hello. Candidate B: hi.
        Self-audit against the acceptance checks.
        """
        let recovered = "Hi! What would you like to work on?"
        let turn = ChatTurn(
            prompt: "hi",
            mode: .together,
            chatGPTAnswer: AIAnswer(source: .chatGPT, content: leaked, responseTime: 1),
            combinedAnswer: AIAnswer(source: .alloy, content: recovered, responseTime: 2),
            executionState: .complete
        )

        XCTAssertEqual(
            RivuneStore.sidebarPreview(for: turn, fallback: leaked),
            recovered
        )

        let leakedOnly = ChatTurn(
            prompt: "Build a website",
            mode: .together,
            chatGPTAnswer: AIAnswer(source: .chatGPT, content: leaked, responseTime: 1),
            executionState: .failed
        )
        XCTAssertEqual(
            RivuneStore.sidebarPreview(for: leakedOnly, fallback: leaked),
            "Conversation"
        )
    }

    func testDeliberativeWorkflowPhaseContractIsOrderedAndComplete() {
        XCTAssertEqual(
            RivuneStore.deliberativePhaseSequence,
            [.planning, .contributing, .reviewing, .integrating, .complete]
        )
    }

    func testPlanningPromptsRequireComplementaryAssignmentsAndChallenge() throws {
        let planningPrompt = RivuneStore.collaborationPlanningPrompt(
            userPrompt: "Build a responsive product website.",
            priorContext: "Keep the interface calm.",
            attachments: []
        )
        let planningPayload = try payload(in: planningPrompt)
        XCTAssertEqual(
            planningPayload["original_user_request"],
            "Build a responsive product website."
        )
        XCTAssertEqual(
            planningPayload["selected_collaboration_shape"],
            TogetherCollaborationShape.complementaryWorkstreams.rawValue
        )
        XCTAssertTrue(planningPrompt.contains("substantive, complementary responsibilities"))
        XCTAssertTrue(planningPrompt.contains("Codex task, Claude task, How the work connects, Definition of done"))
        XCTAssertTrue(planningPrompt.contains("dependencies on the other task"))
        XCTAssertTrue(planningPrompt.contains("Do not inspect local files, run commands, or use tools"))

        let reviewPrompt = RivuneStore.collaborationPlanReviewPrompt(
            userPrompt: "Build a responsive product website.",
            priorContext: "Keep the interface calm.",
            proposedPlan: collaborationPlan(),
            sourceMaterial: "[]",
            selectedShape: .complementaryWorkstreams
        )
        let reviewPayload = try payload(in: reviewPrompt)
        XCTAssertEqual(reviewPayload["proposed_coordination_plan"], collaborationPlan())
        XCTAssertTrue(reviewPrompt.contains("duplicated effort"))
        XCTAssertTrue(reviewPrompt.contains("explicitly aware of each other"))
        XCTAssertTrue(reviewPrompt.contains("definition of done"))
        XCTAssertTrue(reviewPrompt.contains("Do not inspect local files, run commands, or use tools"))
    }

    func testQualityEvalRoutesWebsiteBuildAndBusinessJudgmentDifferently() {
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "Build a polished responsive website with working code.",
                attachments: []
            ),
            .complementaryWorkstreams
        )
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "What is the best business idea for me?",
                attachments: []
            ),
            .comparisonAndDecision
        )
        XCTAssertEqual(
            RivuneStore.collaborationShape(
                for: "This is my current idea. Is there a better one?",
                attachments: []
            ),
            .comparisonAndDecision
        )
    }

    func testQualityEvalPromptsRejectForcedNoveltyAndSycophancy() {
        let userPrompt = "My current business idea fits my skills and reachable users. Is there honestly a better one?"
        let planning = RivuneStore.collaborationPlanningPrompt(
            userPrompt: userPrompt,
            priorContext: "The incumbent has already passed five interviews.",
            attachments: []
        )
        let planReview = RivuneStore.collaborationPlanReviewPrompt(
            userPrompt: userPrompt,
            priorContext: "",
            proposedPlan: collaborationPlan(),
            sourceMaterial: "[]",
            selectedShape: .comparisonAndDecision
        )
        let contribution = RivuneStore.coordinatedContributionPrompt(
            userPrompt: userPrompt,
            priorContext: "",
            sharedPlan: collaborationPlan(),
            roleName: "Codex",
            partnerName: "Claude",
            sourceMaterial: "[]"
        )
        let reviews = RivuneStore.collaborationReviewPrompts(
            userPrompt: userPrompt,
            priorContext: "",
            sharedPlan: collaborationPlan(),
            chatGPTContribution: "Keep the incumbent because it fits the stated constraints.",
            claudeContribution: "Challenge the incumbent against explicit evidence and alternatives.",
            sourceMaterial: "[]"
        )
        let synthesis = RivuneStore.synthesisPrompt(
            userPrompt: userPrompt,
            priorContext: "",
            sharedPlan: collaborationPlan(),
            chatGPTAnswer: "The incumbent remains strongest.",
            claudeAnswer: "No tested alternative beats it.",
            chatGPTCritique: "The evidence is incomplete but directionally supportive.",
            claudeCritique: "Do not invent a replacement merely to disagree.",
            sourceMaterial: "[]"
        )

        for prompt in [planning, planReview, contribution, reviews.chatGPT, reviews.claude, synthesis] {
            XCTAssertTrue(prompt.contains("incumbent remains strongest"))
            XCTAssertTrue(prompt.contains("explicit criteria"))
            XCTAssertTrue(prompt.contains("evidence could change the conclusion"))
            XCTAssertTrue(prompt.contains("calibrate confidence"))
        }
        XCTAssertTrue(planReview.contains("reflexive agreement and forced novelty"))
        XCTAssertTrue(reviews.chatGPT.contains("sycophancy"))
        XCTAssertTrue(synthesis.contains("false consensus"))
    }

    func testContributionPromptsCarryWholePlanAndOppositeAssignments() throws {
        let plan = collaborationPlan()
        let chatGPTPrompt = RivuneStore.coordinatedContributionPrompt(
            userPrompt: "Build a responsive product website.",
            priorContext: "The visual direction is restrained and native.",
            sharedPlan: plan,
            roleName: "Codex",
            partnerName: "Claude",
            sourceMaterial: "[]"
        )
        let claudePrompt = RivuneStore.coordinatedContributionPrompt(
            userPrompt: "Build a responsive product website.",
            priorContext: "The visual direction is restrained and native.",
            sharedPlan: plan,
            roleName: "Claude",
            partnerName: "Codex",
            sourceMaterial: "[]"
        )
        let chatGPTPayload = try payload(in: chatGPTPrompt)
        let claudePayload = try payload(in: claudePrompt)

        XCTAssertEqual(chatGPTPayload["shared_coordination_plan"], plan)
        XCTAssertEqual(claudePayload["shared_coordination_plan"], plan)
        XCTAssertEqual(chatGPTPayload["assigned_identity"], "Codex")
        XCTAssertEqual(chatGPTPayload["collaboration_partner"], "Claude")
        XCTAssertEqual(claudePayload["assigned_identity"], "Claude")
        XCTAssertEqual(claudePayload["collaboration_partner"], "Codex")
        XCTAssertTrue(chatGPTPayload["shared_coordination_plan"]?.contains("## Claude task") == true)
        XCTAssertTrue(claudePayload["shared_coordination_plan"]?.contains("## Codex task") == true)
        XCTAssertTrue(chatGPTPrompt.contains("Do not inspect local files, run commands, or use tools"))
        XCTAssertTrue(claudePrompt.contains("Do not inspect local files, run commands, or use tools"))
    }

    func testMutualReviewPromptsAreSymmetricAndContainPeerWork() throws {
        let chatGPTContribution = "Implement the semantic shell with NavigationContract and keyboard focus order."
        let claudeContribution = "Define the AuroraToken palette and responsive spacing behavior."
        let prompts = RivuneStore.collaborationReviewPrompts(
            userPrompt: "Build a responsive product website.",
            priorContext: "",
            sharedPlan: collaborationPlan(),
            chatGPTContribution: chatGPTContribution,
            claudeContribution: claudeContribution,
            sourceMaterial: "[]"
        )
        let chatGPTPayload = try payload(in: prompts.chatGPT)
        let claudePayload = try payload(in: prompts.claude)

        XCTAssertEqual(chatGPTPayload["reviewer"], "Codex")
        XCTAssertEqual(chatGPTPayload["partner"], "Claude")
        XCTAssertEqual(chatGPTPayload["partner_contribution"], claudeContribution)
        XCTAssertEqual(chatGPTPayload["reviewer_contribution"], chatGPTContribution)
        XCTAssertEqual(claudePayload["reviewer"], "Claude")
        XCTAssertEqual(claudePayload["partner"], "Codex")
        XCTAssertEqual(claudePayload["partner_contribution"], chatGPTContribution)
        XCTAssertEqual(claudePayload["reviewer_contribution"], claudeContribution)
        for prompt in [prompts.chatGPT, prompts.claude] {
            XCTAssertTrue(prompt.contains("Partner work checked"))
            XCTAssertTrue(prompt.contains("My assumptions checked"))
            XCTAssertTrue(prompt.contains("Conflicts and gaps"))
            XCTAssertTrue(prompt.contains("Recommended resolutions"))
            XCTAssertTrue(prompt.contains("Do not inspect local files, run commands, or use tools"))
        }
    }

    func testPeerReviewValidatorRequiresConcretePartnerReference() {
        let partnerContribution = "Claude defines AuroraToken spacing and responsive breakpoints for every page."
        let groundedReview = """
        ## Partner work checked
        Claude's AuroraToken spacing is concrete and compatible with the requested responsive system.

        ## My assumptions checked
        My assumption that spacing keys matched the shell is wrong and must be corrected.

        ## Conflicts and gaps
        The breakpoint names do not yet match the semantic shell.

        ## Recommended resolutions
        Keep AuroraToken and rename the breakpoint keys before integration.
        """
        let genericReview = """
        ## Partner work checked
        The partner contribution seems generally reasonable.

        ## My assumptions checked
        My assumptions seem generally reasonable but could be improved.

        ## Conflicts and gaps
        There may be a few issues worth considering.

        ## Recommended resolutions
        Improve the result before integration if possible.
        """

        let acceptedReview = RivuneStore.validatedCollaborationReview(
                groundedReview,
                reviewerName: "Codex",
                partnerName: "Claude",
                partnerContribution: partnerContribution
            )
        XCTAssertTrue(acceptedReview?.hasPrefix("Codex:\n") == true)
        XCTAssertNil(
            RivuneStore.validatedCollaborationReview(
                genericReview,
                reviewerName: "Codex",
                partnerName: "Claude",
                partnerContribution: partnerContribution
            )
        )
    }

    func testPlanChallengeFailureFallsBackOnlyToValidProposedPlan() throws {
        let proposedPlan = collaborationPlan()
        let resolved = try XCTUnwrap(
            RivuneStore.resolvedCollaborationPlan(
                reviewedPlan: nil,
                proposedPlan: proposedPlan
            )
        )

        XCTAssertEqual(resolved, proposedPlan)
        XCTAssertNil(
            RivuneStore.resolvedCollaborationPlan(
                reviewedPlan: "The plan looks good.",
                proposedPlan: "Build something useful."
            )
        )
    }

    func testSynthesisEnvelopeIncludesBothReviewsAndDemandsOneCleanDeliverable() throws {
        let prompt = RivuneStore.synthesisPrompt(
            userPrompt: "Build a responsive product website.",
            priorContext: "",
            sharedPlan: collaborationPlan(),
            chatGPTAnswer: "Semantic HTML with NavigationContract.",
            claudeAnswer: "Visual tokens using AuroraToken.",
            chatGPTCritique: "Keep AuroraToken but align its key names.",
            claudeCritique: "Keep NavigationContract and add reduced-motion behavior.",
            sourceMaterial: "[]"
        )
        let parsed = try payload(in: prompt)

        XCTAssertEqual(parsed["chatgpt_critique"], "Keep AuroraToken but align its key names.")
        XCTAssertEqual(parsed["claude_critique"], "Keep NavigationContract and add reduced-motion behavior.")
        XCTAssertEqual(parsed["original_user_request"], "Build a responsive product website.")
        XCTAssertTrue(prompt.contains("Return only the polished final answer"))
        XCTAssertTrue(prompt.contains("Do not average the two views into false consensus"))
        XCTAssertTrue(prompt.contains("coverage checklist"))
        XCTAssertTrue(prompt.contains("shorten explanations, alternatives, and table cells before omitting any requirement"))
        XCTAssertTrue(prompt.contains("final section requested by the user is present and usable"))
        XCTAssertTrue(prompt.contains("Do not inspect files, run commands, or use tools"))
        XCTAssertFalse(prompt.contains("Claude's rebuttal"))
    }

    func testMarkdownResponseParserProducesNativeTableBlock() {
        let markdown = """
        ## Decision matrix

        | Option | Fit | Evidence |
        |---|---:|---|
        | Incumbent | 5 | Reachable buyers |
        | Alternative | 3 | Untested channel |

        ## Seven-day test

        Interview five owners.
        """

        let blocks = ResponseTextParser.parse(markdown)

        XCTAssertEqual(blocks[0], .heading(level: 2, text: "Decision matrix"))
        XCTAssertEqual(
            blocks[1],
            .table(
                headers: ["Option", "Fit", "Evidence"],
                rows: [
                    ["Incumbent", "5", "Reachable buyers"],
                    ["Alternative", "3", "Untested channel"]
                ]
            )
        )
        XCTAssertTrue(blocks.contains(.heading(level: 2, text: "Seven-day test")))
        XCTAssertTrue(blocks.contains(.paragraph("Interview five owners.")))
    }

    func testEscapeHeavyReviewAndSynthesisPromptsStayInsideTerminalEnvelope() throws {
        let escapeHeavy = String(repeating: "\\\"\n", count: 18_000)
        let reviews = RivuneStore.collaborationReviewPrompts(
            userPrompt: "Build the requested artifact.",
            priorContext: escapeHeavy,
            sharedPlan: escapeHeavy,
            chatGPTContribution: escapeHeavy,
            claudeContribution: escapeHeavy,
            sourceMaterial: escapeHeavy
        )
        let synthesis = RivuneStore.synthesisPrompt(
            userPrompt: "Build the requested artifact.",
            priorContext: escapeHeavy,
            sharedPlan: escapeHeavy,
            chatGPTAnswer: escapeHeavy,
            claudeAnswer: escapeHeavy,
            chatGPTCritique: escapeHeavy,
            claudeCritique: escapeHeavy,
            sourceMaterial: escapeHeavy
        )

        for prompt in [reviews.chatGPT, reviews.claude, synthesis] {
            XCTAssertLessThanOrEqual(prompt.utf8.count, 128 * 1_024)
            XCTAssertEqual(
                try payload(in: prompt)["original_user_request"],
                "Build the requested artifact."
            )
        }
    }

    func testContributionCleanupKeepsUsefulWorkAndDropsCoordinationTail() {
        let useful = """
        The implementation uses semantic landmarks, a responsive navigation shell,
        visible keyboard focus, reduced-motion fallbacks, and a shared token system.
        It also includes a complete mobile hierarchy and clear loading states.
        """
        let leaked = useful + """

        Notes for ChatGPT and the integrator: audit Candidate A against the hidden acceptance checks.
        """

        let displayed = RivuneStore.userFacingContribution(leaked)

        XCTAssertTrue(displayed.contains("semantic landmarks"))
        XCTAssertFalse(displayed.localizedCaseInsensitiveContains("integrator"))
        XCTAssertFalse(displayed.localizedCaseInsensitiveContains("candidate a"))
        XCTAssertLessThanOrEqual(displayed.utf8.count, 8_000)
    }

    func testIntegratedAnswerRejectsCoordinationNarration() {
        XCTAssertNil(
            RivuneStore.validatedIntegratedAnswer(
                "As the final integrator, I combined both contributions.",
                userPrompt: "Build a website"
            )
        )
        XCTAssertNil(
            RivuneStore.validatedIntegratedAnswer(
                "After reviewing both contributions, here is the combined result.",
                userPrompt: "Build a website"
            )
        )
        XCTAssertNil(
            RivuneStore.validatedIntegratedAnswer(
                "## Partner work checked\nClaude covered the lesson.\n\n## My assumptions checked\nMy assumptions were supported.",
                userPrompt: "Build a lesson plan"
            )
        )
        XCTAssertEqual(
            RivuneStore.validatedIntegratedAnswer(
                "Here is the complete responsive website implementation.",
                userPrompt: "Build a website"
            ),
            "Here is the complete responsive website implementation."
        )
    }

    func testDeliberativeFallbackFailsClosedEvenWithSafeWorkstreams() {
        let structure = "The lesson opens with a five-minute prediction activity and three measurable learning goals."
        let assessment = "Students finish with a source-checking exercise, reflection rubric, and teacher exit ticket."

        let fallback = RivuneStore.fallbackCombinedContent(
            chatGPT: structure,
            claude: assessment,
            userPrompt: "Build a lesson plan for teenagers to learn AI."
        )

        XCTAssertNil(fallback)

        let message = RivuneStore.incompleteCollaborationMessage(
            codexCompleted: true,
            claudeCompleted: false
        )
        XCTAssertTrue(message.contains("Claude's assigned task did not finish"))
        XCTAssertTrue(message.contains("kept Codex's completed work"))
        XCTAssertTrue(message.localizedCaseInsensitiveContains("retry"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("handoff"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("audit"))
    }

    func testSubstantiveTurnWithoutCombinedAnswerHasFailedCompletionStage() {
        let turn = ChatTurn(
            prompt: "Build a lesson plan for teenagers to learn AI.",
            mode: .together,
            chatGPTAnswer: AIAnswer(
                source: .chatGPT,
                content: "A complete lesson structure.",
                responseTime: 1
            ),
            combinedError: RivuneStore.incompleteCollaborationMessage(
                codexCompleted: true,
                claudeCompleted: false
            ),
            togetherTrace: TogetherTrace(
                phase: .failed,
                collaborationShape: .complementaryWorkstreams,
                sharedPlan: collaborationPlan(),
                failedPhase: .contributing
            ),
            executionState: .failed
        )

        XCTAssertNil(turn.combinedAnswer)
        XCTAssertEqual(RivuneStore.completionStage(for: turn), .failed)
        XCTAssertEqual(turn.togetherTrace?.failedPhase, .contributing)
        XCTAssertEqual(turn.executionState, .failed)
    }

    func testFailedIntegrationMessageIsUserFacingAndRetryable() {
        let message = RivuneStore.incompleteIntegrationMessage

        XCTAssertTrue(message.contains("kept the completed work and reviews"))
        XCTAssertTrue(message.localizedCaseInsensitiveContains("retry"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("candidate"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("handoff"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("audit"))
    }

    func testMissingPeerReviewFailsClosedWithUserFacingGuidance() {
        let message = RivuneStore.incompleteReviewMessage(
            codexReviewedClaude: true,
            claudeReviewedCodex: false
        )
        let turn = ChatTurn(
            prompt: "Build a lesson plan for teenagers to learn AI.",
            mode: .together,
            chatGPTAnswer: AIAnswer(source: .chatGPT, content: "Lesson structure", responseTime: 1),
            claudeAnswer: AIAnswer(source: .claude, content: "Assessment design", responseTime: 1),
            combinedError: message,
            togetherTrace: TogetherTrace(
                phase: .failed,
                collaborationShape: .complementaryWorkstreams,
                sharedPlan: collaborationPlan(),
                chatGPTReview: "Codex checked Claude's assessment design.",
                failedPhase: .reviewing
            ),
            executionState: .failed
        )

        XCTAssertTrue(message.contains("Claude's review of Codex's work did not finish"))
        XCTAssertTrue(message.localizedCaseInsensitiveContains("retry"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("handoff"))
        XCTAssertFalse(message.localizedCaseInsensitiveContains("audit"))
        XCTAssertNil(turn.combinedAnswer)
        XCTAssertEqual(turn.togetherTrace?.failedPhase, .reviewing)
        XCTAssertEqual(RivuneStore.completionStage(for: turn), .failed)
    }

    private func collaborationPlan() -> String {
        """
        ## Goal
        Produce a complete responsive product website.

        ## Collaboration approach
        Use complementary workstreams to build compatible structure and visual behavior in parallel.

        ## Shared requirements
        Use accessible markup, restrained visuals, and no external assets.

        ## Codex task
        Build the semantic shell and define the NavigationContract required by Claude's visual work.

        ## Claude task
        Build the AuroraToken visual system using Codex's semantic shell and accessibility constraints.

        ## How the work connects
        Codex provides NavigationContract for Claude to use; Claude supplies AuroraToken values and breakpoint mappings back to Codex.

        ## Definition of done
        Confirm keyboard flow, responsive behavior, compatible interfaces, and every requested section.
        """
    }

    private func payload(in prompt: String) throws -> [String: String] {
        let marker = "JSON PAYLOAD\n"
        let range = try XCTUnwrap(prompt.range(of: marker, options: .backwards))
        let json = String(prompt[range.upperBound...])
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let data = try XCTUnwrap(json.data(using: .utf8))
        return try XCTUnwrap(
            JSONSerialization.jsonObject(with: data) as? [String: String]
        )
    }
}

final class TogetherFailurePersistenceTests: XCTestCase {
    func testFailedDirectResponseRemainsFailedAfterHistoryReload() throws {
        let failure = "Neither model returned an answer. Check both connections and try again."
        let turn = ChatTurn(
            prompt: "hi",
            mode: .together,
            chatGPTError: "Codex was unavailable.",
            claudeError: "Claude was unavailable.",
            combinedError: failure,
            togetherTrace: TogetherTrace(
                phase: .failed,
                collaborationShape: .directResponse,
                sharedPlan: "This short request uses direct responses; no task split is needed.",
                failedPhase: .contributing
            ),
            executionState: .failed
        )

        let loaded = try roundTrip(turn)

        XCTAssertNil(loaded.chatGPTAnswer)
        XCTAssertNil(loaded.claudeAnswer)
        XCTAssertNil(loaded.combinedAnswer)
        XCTAssertEqual(loaded.combinedError, failure)
        XCTAssertEqual(loaded.executionState, .failed)
        XCTAssertEqual(loaded.togetherTrace?.phase, .failed)
        XCTAssertEqual(loaded.togetherTrace?.failedPhase, .contributing)
        XCTAssertEqual(loaded.togetherTrace?.collaborationShape, .directResponse)
        XCTAssertEqual(RivuneStore.completionStage(for: loaded), .failed)
    }

    func testMissingContributionRemainsFailedAfterHistoryReload() throws {
        let turn = ChatTurn(
            prompt: "Build a complete lesson plan for teenagers to learn AI.",
            mode: .together,
            chatGPTAnswer: AIAnswer(
                source: .chatGPT,
                content: "A six-part lesson sequence with measurable objectives.",
                responseTime: 1.4,
                provenance: "Codex test"
            ),
            claudeError: "Claude was unavailable.",
            combinedError: RivuneStore.incompleteCollaborationMessage(
                codexCompleted: true,
                claudeCompleted: false
            ),
            togetherTrace: TogetherTrace(
                phase: .failed,
                collaborationShape: .complementaryWorkstreams,
                sharedPlan: "Codex builds the lesson sequence; Claude verifies assessments and safety boundaries.",
                failedPhase: .contributing
            ),
            executionState: .failed
        )

        let loaded = try roundTrip(turn)

        XCTAssertNotNil(loaded.chatGPTAnswer)
        XCTAssertNil(loaded.claudeAnswer)
        XCTAssertNil(loaded.combinedAnswer)
        XCTAssertEqual(loaded.executionState, .failed)
        XCTAssertEqual(loaded.togetherTrace?.phase, .failed)
        XCTAssertEqual(loaded.togetherTrace?.failedPhase, .contributing)
        XCTAssertEqual(RivuneStore.completionStage(for: loaded), .failed)
        XCTAssertTrue(loaded.combinedError?.localizedCaseInsensitiveContains("retry") == true)
    }

    func testFailedIntegratorsPreserveContributionsAndReviewsAfterHistoryReload() throws {
        let codexReview = "The assessment work identifies a missing source-verification example and recommends adding one."
        let claudeReview = "The lesson sequence assumes prior vocabulary knowledge and should define tokens before the activity."
        let turn = ChatTurn(
            prompt: "Build a complete lesson plan for teenagers to learn AI.",
            mode: .together,
            chatGPTAnswer: AIAnswer(
                source: .chatGPT,
                content: "A six-part lesson sequence with measurable objectives.",
                responseTime: 1.4,
                provenance: "Codex test"
            ),
            claudeAnswer: AIAnswer(
                source: .claude,
                content: "A verification activity, rubric, and teacher safety notes.",
                responseTime: 1.7,
                provenance: "Claude test"
            ),
            combinedError: RivuneStore.incompleteIntegrationMessage,
            togetherTrace: TogetherTrace(
                phase: .failed,
                collaborationShape: .complementaryWorkstreams,
                sharedPlan: "Codex builds the lesson sequence; Claude verifies assessments and safety boundaries.",
                chatGPTReview: codexReview,
                claudeReview: claudeReview,
                failedPhase: .integrating
            ),
            executionState: .failed
        )

        let loaded = try roundTrip(turn)

        XCTAssertNotNil(loaded.chatGPTAnswer)
        XCTAssertNotNil(loaded.claudeAnswer)
        XCTAssertNil(loaded.combinedAnswer)
        XCTAssertEqual(loaded.togetherTrace?.chatGPTReview, codexReview)
        XCTAssertEqual(loaded.togetherTrace?.claudeReview, claudeReview)
        XCTAssertEqual(loaded.togetherTrace?.phase, .failed)
        XCTAssertEqual(loaded.togetherTrace?.failedPhase, .integrating)
        XCTAssertEqual(loaded.executionState, .failed)
        XCTAssertEqual(RivuneStore.completionStage(for: loaded), .failed)
        XCTAssertEqual(loaded.combinedError, RivuneStore.incompleteIntegrationMessage)
    }

    func testLegacyRecoveredPartialAnswerMigratesToContributingFailure() throws {
        let turn = ChatTurn(
            prompt: "Build a complete lesson plan for teenagers to learn AI.",
            mode: .together,
            chatGPTAnswer: AIAnswer(
                source: .chatGPT,
                content: "A six-part lesson sequence with measurable objectives.",
                responseTime: 1.4,
                provenance: "Codex test"
            ),
            combinedAnswer: recoveredAnswer("A six-part lesson sequence with measurable objectives."),
            togetherTrace: TogetherTrace(
                phase: .complete,
                collaborationShape: .complementaryWorkstreams,
                sharedPlan: "Codex builds the lesson sequence; Claude verifies it."
            ),
            executionState: .complete
        )

        let loaded = try roundTrip(turn)

        XCTAssertNotNil(loaded.chatGPTAnswer)
        XCTAssertNil(loaded.claudeAnswer)
        XCTAssertNil(loaded.combinedAnswer)
        XCTAssertEqual(loaded.executionState, .failed)
        XCTAssertEqual(loaded.togetherTrace?.phase, .failed)
        XCTAssertEqual(loaded.togetherTrace?.failedPhase, .contributing)
        XCTAssertTrue(loaded.combinedError?.contains("Claude's assigned task did not finish") == true)
    }

    func testLegacyRecoveredAnswerWithoutBothReviewsMigratesToReviewFailure() throws {
        let turn = legacyRecoveredTurn(
            chatGPTReview: "Codex checked Claude's assessment design.",
            claudeReview: nil
        )

        let loaded = try roundTrip(turn)

        XCTAssertNotNil(loaded.chatGPTAnswer)
        XCTAssertNotNil(loaded.claudeAnswer)
        XCTAssertNil(loaded.combinedAnswer)
        XCTAssertEqual(loaded.executionState, .failed)
        XCTAssertEqual(loaded.togetherTrace?.phase, .failed)
        XCTAssertEqual(loaded.togetherTrace?.failedPhase, .reviewing)
        XCTAssertNotNil(loaded.togetherTrace?.chatGPTReview)
        XCTAssertNil(loaded.togetherTrace?.claudeReview)
        XCTAssertTrue(loaded.combinedError?.contains("Claude's review of Codex's work did not finish") == true)
    }

    func testLegacyRecoveredAnswerAfterBothReviewsMigratesToIntegrationFailure() throws {
        let codexReview = "Codex checked Claude's assessment design."
        let claudeReview = "Claude checked Codex's lesson sequence."
        let turn = legacyRecoveredTurn(
            chatGPTReview: codexReview,
            claudeReview: claudeReview
        )

        let loaded = try roundTrip(turn)

        XCTAssertNotNil(loaded.chatGPTAnswer)
        XCTAssertNotNil(loaded.claudeAnswer)
        XCTAssertNil(loaded.combinedAnswer)
        XCTAssertEqual(loaded.executionState, .failed)
        XCTAssertEqual(loaded.togetherTrace?.phase, .failed)
        XCTAssertEqual(loaded.togetherTrace?.failedPhase, .integrating)
        XCTAssertEqual(loaded.togetherTrace?.chatGPTReview, codexReview)
        XCTAssertEqual(loaded.togetherTrace?.claudeReview, claudeReview)
        XCTAssertEqual(loaded.combinedError, RivuneStore.incompleteIntegrationMessage)
    }

    private func legacyRecoveredTurn(
        chatGPTReview: String?,
        claudeReview: String?
    ) -> ChatTurn {
        ChatTurn(
            prompt: "Build a complete lesson plan for teenagers to learn AI.",
            mode: .together,
            chatGPTAnswer: AIAnswer(
                source: .chatGPT,
                content: "A six-part lesson sequence with measurable objectives.",
                responseTime: 1.4,
                provenance: "Codex test"
            ),
            claudeAnswer: AIAnswer(
                source: .claude,
                content: "A verification activity, rubric, and teacher safety notes.",
                responseTime: 1.7,
                provenance: "Claude test"
            ),
            combinedAnswer: recoveredAnswer(
                "A six-part lesson sequence followed by a verification activity and rubric."
            ),
            togetherTrace: TogetherTrace(
                phase: .complete,
                collaborationShape: .complementaryWorkstreams,
                sharedPlan: "Codex builds the lesson sequence; Claude verifies assessments and safety boundaries.",
                chatGPTReview: chatGPTReview,
                claudeReview: claudeReview
            ),
            executionState: .complete
        )
    }

    private func recoveredAnswer(_ content: String) -> AIAnswer {
        AIAnswer(
            source: .alloy,
            content: content,
            responseTime: 2.2,
            provenance: "Recovered from a completed contribution"
        )
    }

    private func roundTrip(_ turn: ChatTurn) throws -> ChatTurn {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("RivuneFailurePersistenceTests-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let conversation = Conversation(
            title: "Failure fixture",
            preview: "Failure fixture",
            updatedAt: Date(timeIntervalSince1970: 1_700_000_000),
            mode: .together,
            turns: [turn]
        )
        RivuneHistoryStorage.save([conversation], in: root)

        return try XCTUnwrap(
            RivuneHistoryStorage.load(from: root).first?.turns.first
        )
    }
}

final class BridgeWorkflowVersionCompatibilityTests: XCTestCase {
    func testRivuneDisplayNameKeepsTogetherWireValue() {
        XCTAssertEqual(IntelligenceMode.together.displayName, "Rivune")
        XCTAssertEqual(IntelligenceMode.together.rawValue, "Together")
        XCTAssertEqual(IntelligenceMode(rawValue: "Together"), .together)
    }

    func testLegacyReadinessWithoutWorkflowVersionDecodesAsNil() throws {
        let readiness = BridgeReadiness(codex: .ready, claude: .signedOut)
        let legacyData = try encodedRemovingWorkflowVersion(from: readiness)

        let decoded = try JSONDecoder().decode(BridgeReadiness.self, from: legacyData)

        XCTAssertEqual(decoded.codex, .ready)
        XCTAssertEqual(decoded.claude, .signedOut)
        XCTAssertNil(decoded.togetherWorkflowVersion)
    }

    func testLegacyPromptRequestWithoutWorkflowVersionDecodesAsNil() throws {
        let request = promptRequest()
        let legacyData = try encodedRemovingWorkflowVersion(from: request)

        let decoded = try JSONDecoder().decode(BridgePromptRequest.self, from: legacyData)

        XCTAssertEqual(decoded.id, request.id)
        XCTAssertEqual(decoded.turnID, request.turnID)
        XCTAssertEqual(decoded.prompt, request.prompt)
        XCTAssertEqual(decoded.mode, .together)
        XCTAssertNil(decoded.togetherWorkflowVersion)
    }

    func testNewBridgeValuesDefaultToWorkflowVersionTwo() {
        let readiness = BridgeReadiness(codex: .ready, claude: .ready)
        let request = promptRequest()

        XCTAssertEqual(BridgePromptRequest.currentTogetherWorkflowVersion, 2)
        XCTAssertEqual(readiness.togetherWorkflowVersion, 2)
        XCTAssertEqual(request.togetherWorkflowVersion, 2)
    }

    func testProviderPlanRoundTripsAndRemainsOptionalForLegacyPeers() throws {
        let providerPlan = AICouncilConfiguration(
            id: UUID(uuidString: "81000000-0000-0000-0000-000000000001")!,
            name: "Three-model build team",
            participants: [
                AIParticipantConfiguration(
                    id: UUID(uuidString: "81000000-0000-0000-0000-000000000011")!,
                    displayName: "Planner",
                    providerID: "openai",
                    transportID: "openai.codex-cli",
                    roles: [.coordinator]
                ),
                AIParticipantConfiguration(
                    id: UUID(uuidString: "81000000-0000-0000-0000-000000000012")!,
                    displayName: "Builder",
                    providerID: "anthropic",
                    transportID: "anthropic.claude-code-cli",
                    roles: [.contributor]
                ),
                AIParticipantConfiguration(
                    id: UUID(uuidString: "81000000-0000-0000-0000-000000000013")!,
                    displayName: "Verifier",
                    providerID: "local.example",
                    transportID: "local.example.cli",
                    roles: [.verifier]
                )
            ]
        )
        let request = promptRequest(providerPlan: providerPlan)
        let encoded = try JSONEncoder().encode(request)
        let decoded = try JSONDecoder().decode(BridgePromptRequest.self, from: encoded)

        XCTAssertEqual(decoded.providerPlan, providerPlan)
        XCTAssertEqual(decoded.providerPlan?.enabledParticipants.count, 3)

        var legacyObject = try XCTUnwrap(
            JSONSerialization.jsonObject(with: encoded) as? [String: Any]
        )
        legacyObject.removeValue(forKey: "providerPlan")
        let legacyData = try JSONSerialization.data(withJSONObject: legacyObject, options: [.sortedKeys])
        let legacyDecoded = try JSONDecoder().decode(BridgePromptRequest.self, from: legacyData)

        XCTAssertNil(legacyDecoded.providerPlan)
    }

    private func promptRequest(
        providerPlan: AICouncilConfiguration? = nil
    ) -> BridgePromptRequest {
        BridgePromptRequest(
            id: UUID(uuidString: "80000000-0000-0000-0000-000000000001")!,
            turnID: UUID(uuidString: "80000000-0000-0000-0000-000000000002")!,
            prompt: "Coordinate the strongest answer.",
            mode: .together,
            attachments: [],
            priorContext: "Prior context",
            codexModel: .accountDefault,
            claudeModel: .accountDefault,
            codexEffort: .automatic,
            claudeEffort: .automatic,
            providerPlan: providerPlan
        )
    }

    private func encodedRemovingWorkflowVersion<T: Encodable>(from value: T) throws -> Data {
        let encoded = try JSONEncoder().encode(value)
        var object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: encoded) as? [String: Any]
        )
        object.removeValue(forKey: "togetherWorkflowVersion")
        return try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    }
}

final class ReturnedCodeSnippetTests: XCTestCase {
    func testTogetherExtractsOnlyTheIntegratedAnswerCode() {
        let turn = ChatTurn(
            prompt: "Combine the implementation",
            mode: .together,
            chatGPTAnswer: answer(.chatGPT, "```swift\nlet discardedCodexDraft = true\n```"),
            claudeAnswer: answer(.claude, "```python\ndiscarded_claude_draft = True\n```"),
            combinedAnswer: answer(.alloy, "Final answer:\n```swift\nlet integrated = true\n```\n\n```json\n{\"ready\": true}\n```")
        )

        let snippets = ReturnedCodeSnippet.extract(from: turn)
        XCTAssertEqual(snippets.map(\.language), ["swift", "json"])
        XCTAssertEqual(snippets.map(\.content), ["let integrated = true", "{\"ready\": true}"])
    }

    func testUnfinishedTogetherAnswerDoesNotPromotePeerCode() {
        let turn = ChatTurn(
            prompt: "Still reviewing",
            mode: .together,
            chatGPTAnswer: answer(.chatGPT, "```swift\nlet incompleteDraft = true\n```"),
            claudeAnswer: answer(.claude, "```swift\nlet anotherDraft = true\n```")
        )

        XCTAssertTrue(ReturnedCodeSnippet.extract(from: turn).isEmpty)
    }

    func testDirectClaudeExtractsClaudeCodeAndIgnoresCodex() {
        let turn = ChatTurn(
            prompt: "Use Claude",
            mode: .claude,
            chatGPTAnswer: answer(.chatGPT, "```swift\nlet unrelated = true\n```"),
            claudeAnswer: answer(.claude, "```python\nselected_provider = 'claude'\n```")
        )

        let snippets = ReturnedCodeSnippet.extract(from: turn)
        XCTAssertEqual(snippets.map(\.language), ["python"])
        XCTAssertEqual(snippets.map(\.content), ["selected_provider = 'claude'"])
    }

    private func answer(_ source: AnswerSource, _ content: String) -> AIAnswer {
        AIAnswer(source: source, content: content, responseTime: 0)
    }
}

final class RivuneLaunchIsolationTests: XCTestCase {
    func testOnlyExplicitPreviewAndHostedTestsUseIsolation() {
        XCTAssertEqual(
            RivuneLaunchContext.resolve(arguments: ["Rivune"], environment: [:]),
            .normal
        )
        XCTAssertEqual(
            RivuneLaunchContext.resolve(arguments: ["Rivune", "--ui-preview"], environment: [:]),
            .uiPreview
        )
        XCTAssertEqual(
            RivuneLaunchContext.resolve(
                arguments: ["Rivune", "--ui-preview"],
                environment: ["XCTestConfigurationFilePath": "/fixture/test-config"]
            ),
            .tests
        )
        XCTAssertEqual(
            RivuneLaunchContext.resolve(
                arguments: ["Rivune"], environment: [:], hasXCTestRuntime: true
            ),
            .tests
        )
        XCTAssertEqual(
            RivuneLaunchContext.resolve(arguments: ["Rivune", "--preview-project"], environment: [:]),
            .normal
        )
        XCTAssertEqual(
            RivuneLaunchContext.resolve(
                arguments: ["Rivune"], environment: [:], hasUIPreviewInfoFlag: true
            ),
            .uiPreview
        )
        XCTAssertEqual(
            RivuneLaunchContext.resolve(
                arguments: ["Rivune"],
                environment: ["XCTestSessionIdentifier": "fixture-session"],
                hasUIPreviewInfoFlag: true
            ),
            .tests
        )
    }

    @MainActor
    func testHostedStartupStaysEmptyAndCannotSendEvenIfReadinessChanges() {
        guard RivuneLaunchContext.current == .tests else {
            XCTFail("Hosted XCTest must select isolation before constructing the app store")
            return
        }
        let bridge = PeerBridge()
        let store = RivuneStore(bridge: bridge)

        XCTAssertTrue(store.conversations.isEmpty)
        XCTAssertTrue(store.turns.isEmpty)
        XCTAssertFalse(bridge.hasSavedPairing)
        XCTAssertFalse(bridge.isAdvertising)
        XCTAssertEqual(store.codexReadiness, .unavailable)
        XCTAssertEqual(store.claudeReadiness, .unavailable)

        store.codexReadiness = .ready
        store.claudeReadiness = .ready
        store.composerText = "Never send this UI test prompt"
        store.send()

        XCTAssertFalse(store.canSendInCurrentMode)
        XCTAssertFalse(store.isGenerating)
        XCTAssertTrue(store.turns.isEmpty)
        XCTAssertEqual(store.composerText, "Never send this UI test prompt")
        XCTAssertEqual(store.showActionNotice, "UI preview · model requests are disabled")
    }
}

final class RivuneBrandMigrationTests: XCTestCase {
    func testPrivacyDeletionRewritesPrimaryAndBackupWithoutDeletedConversation() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("RivuneHistoryDeletionTests-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let deleted = Conversation(
            title: "Delete me",
            preview: "Private prompt and attachment",
            updatedAt: Date(timeIntervalSince1970: 1_700_000_000),
            mode: .together
        )
        let retained = Conversation(
            title: "Keep me",
            preview: "Retained",
            updatedAt: Date(timeIntervalSince1970: 1_700_000_001),
            mode: .chatGPT
        )

        XCTAssertTrue(RivuneHistoryStorage.save([deleted], in: root))
        XCTAssertTrue(RivuneHistoryStorage.save([deleted, retained], in: root))
        XCTAssertTrue(
            RivuneHistoryStorage.save(
                [retained],
                in: root,
                mode: .privacyDeletion
            )
        )

        let primaryURL = RivuneHistoryStorage.currentFileURL(in: root)
        let backupURL = primaryURL.deletingLastPathComponent()
            .appendingPathComponent("conversations.backup.json")
        for fileURL in [primaryURL, backupURL] {
            let fileData = try Data(contentsOf: fileURL)
            let conversations = try JSONDecoder().decode([Conversation].self, from: fileData)
            XCTAssertEqual(conversations.map(\.id), [retained.id])
            XCTAssertFalse(String(decoding: fileData, as: UTF8.self).contains("Delete me"))
        }
    }

    func testHistorySaveReportsStorageFailure() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("RivuneHistoryFailureTests-\(UUID().uuidString)")
        defer { try? FileManager.default.removeItem(at: root) }
        try Data("not a directory".utf8).write(to: root, options: [.atomic])

        XCTAssertFalse(
            RivuneHistoryStorage.save(
                [Conversation(
                    title: "Cannot persist",
                    preview: "Failure",
                    updatedAt: .now,
                    mode: .claude
                )],
                in: root
            )
        )
    }

    func testLegacyDefaultsCopyForwardWithoutOverwritingOrDeleting() throws {
        let suiteName = "RivuneBrandMigrationTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer { defaults.removePersistentDomain(forName: suiteName) }

        defaults.set("Together", forKey: "alloy.defaultMode")
        defaults.set(false, forKey: "alloy.conversationContext")
        defaults.set("gpt-5.6-sol", forKey: "rivune.codexModel")
        defaults.set("gpt-5.4", forKey: "alloy.codexModel")

        RivuneBrand.migrateLegacyDefaults(in: defaults)

        XCTAssertEqual(defaults.string(forKey: "rivune.defaultMode"), "Together")
        XCTAssertEqual(defaults.object(forKey: "rivune.conversationContext") as? Bool, false)
        XCTAssertEqual(defaults.string(forKey: "rivune.codexModel"), "gpt-5.6-sol")
        XCTAssertEqual(defaults.string(forKey: "alloy.defaultMode"), "Together")
        XCTAssertTrue(defaults.bool(forKey: RivuneBrand.defaultsMigrationMarker))

        defaults.removeObject(forKey: "rivune.defaultMode")
        RivuneBrand.migrateLegacyDefaults(in: defaults)
        XCTAssertNil(defaults.object(forKey: "rivune.defaultMode"))
    }

    func testLegacyHistoryLoadsIntoRivuneWithoutDeletingSource() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("RivuneHistoryMigrationTests-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: root) }

        let legacyDirectory = root.appendingPathComponent("Alloy", isDirectory: true)
        try FileManager.default.createDirectory(at: legacyDirectory, withIntermediateDirectories: true)
        let legacyFile = legacyDirectory.appendingPathComponent("conversations.json")
        let conversation = Conversation(
            title: "Existing conversation",
            preview: "Working in Alloy mode",
            updatedAt: Date(timeIntervalSince1970: 1_700_000_000),
            mode: .together
        )
        try JSONEncoder().encode([conversation]).write(to: legacyFile, options: [.atomic])

        let loaded = RivuneHistoryStorage.load(from: root)
        let migratedFile = RivuneHistoryStorage.currentFileURL(in: root)

        XCTAssertEqual(loaded.count, 1)
        XCTAssertEqual(loaded.first?.title, "Existing conversation")
        XCTAssertEqual(loaded.first?.preview, "Working in Rivune mode")
        XCTAssertTrue(FileManager.default.fileExists(atPath: migratedFile.path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: legacyFile.path))

        let migrated = try JSONDecoder().decode(
            [Conversation].self,
            from: Data(contentsOf: migratedFile)
        )
        XCTAssertEqual(migrated.first?.preview, "Working in Rivune mode")
    }

    func testBrandKeepsWireAndPairingCompatibilityIdentifiers() throws {
        XCTAssertEqual(IntelligenceMode.together.rawValue, "Together")
        XCTAssertEqual(AnswerSource.alloy.rawValue, "Alloy")
        XCTAssertEqual(
            try JSONDecoder().decode(AnswerSource.self, from: Data("\"Alloy\"".utf8)),
            .alloy
        )
        XCTAssertEqual(PeerBridge.serviceType, "_alloy-bridge._tcp")
        XCTAssertEqual(
            RivuneBrand.keychainServiceCandidates,
            ["com.aaravshah.rivune.bridge", "com.aaravshah.alloy.bridge"]
        )
        XCTAssertEqual(RivuneBrand.legacyMacBundleIdentifier, "com.aaravshah.alloy.mac")
        XCTAssertEqual(RivuneBrand.legacyIOSBundleIdentifier, "com.aaravshah.alloy.ios")
    }
}

final class ProviderCatalogSafetyTests: XCTestCase {
    func testProviderSwitcherKeepsRivuneFirstAndShowsOnlyExecutableAdapters() {
        let options = IntelligenceModeSelectionOption.available(in: .currentDefaults)
        XCTAssertEqual(options.map(\.mode), [.together, .chatGPT, .claude])
        XCTAssertEqual(options.map(\.title), ["Rivune", "ChatGPT", "Claude"])
        XCTAssertTrue(
            options.allSatisfy {
                !$0.detail.contains("Responses API")
                    && !$0.detail.contains("Messages API")
            }
        )
        XCTAssertEqual(IntelligenceMode.together.rawValue, "Together")
    }

    func testDefaultsUseReferencesWithoutEmbeddingCredentialValues() throws {
        let catalog = AIProviderCatalog.currentDefaults
        let encoded = try JSONEncoder().encode(catalog)
        let json = try XCTUnwrap(String(data: encoded, encoding: .utf8))

        XCTAssertEqual(catalog.providers.count, 2)
        XCTAssertEqual(
            catalog.providers.flatMap(\.transports)
                .filter { $0.implementation == .executableAdapter }
                .count,
            4
        )
        XCTAssertEqual(
            catalog.providers.flatMap(\.transports)
                .filter { $0.implementation == .configurationPreview }
                .count,
            0
        )
        XCTAssertTrue(catalog.providers.flatMap(\.transports)
            .filter { $0.kind == .api }.allSatisfy { $0.capabilities == [.text] })
        XCTAssertTrue(json.contains("alloy.provider.openai.api"))
        XCTAssertTrue(json.contains("alloy.provider.anthropic.api"))
        XCTAssertFalse(json.localizedCaseInsensitiveContains("apiKeyValue"))
        XCTAssertFalse(json.localizedCaseInsensitiveContains("bearerTokenValue"))
        XCTAssertFalse(json.contains("sk-"))
    }

    func testCuratedEffortsPreserveUltraBoundary() throws {
        let openAI = try XCTUnwrap(
            AIProviderCatalog.currentDefaults.provider(id: "openai")
        )
        let sol = try XCTUnwrap(openAI.models.first { $0.id == "gpt-5.6-sol" })
        let terra = try XCTUnwrap(openAI.models.first { $0.id == "gpt-5.6-terra" })
        let luna = try XCTUnwrap(openAI.models.first { $0.id == "gpt-5.6-luna" })

        XCTAssertTrue(sol.efforts.contains(.ultra))
        XCTAssertTrue(terra.efforts.contains(.ultra))
        XCTAssertFalse(luna.efforts.contains(.ultra))
        XCTAssertFalse(sol.efforts.contains(.none))
    }

    func testCLIRegistryIncludesAThirdProviderWithoutPretendingItCanExecute() throws {
        let provider = customCLIProvider(executableName: "example-ai")
        let registry = CLIProviderRegistry(
            catalog: AIProviderCatalog(providers: [provider])
        )

        let registration = try XCTUnwrap(registry.registrations.first)
        XCTAssertEqual(registry.registrations.count, 1)
        XCTAssertEqual(registration.provider.displayName, "Example AI")
        XCTAssertEqual(registration.transport.executableName, "example-ai")
        XCTAssertNil(registration.terminalProvider)
        XCTAssertFalse(registration.supportsExecution)
        XCTAssertFalse(registration.supportsModelSettings)
    }

    func testCompiledRoutesResolveForBothDefaultCLIProviders() throws {
        let registry = CLIProviderRegistry.current
        let routes = Set(registry.registrations.compactMap(\.executionRoute))

        XCTAssertEqual(routes, [.codexCLI, .claudeCodeCLI])
        XCTAssertTrue(registry.registrations.allSatisfy(\.supportsExecution))
    }

    func testCatalogCannotSpoofAReviewedAdapterWithDifferentExecutable() throws {
        let provider = customCLIProvider(
            executableName: "unreviewed-binary",
            runtimeAdapterID: AIExecutionRoute.codexCLI.runtimeAdapterID,
            implementation: .executableAdapter
        )
        let registration = try XCTUnwrap(
            CLIProviderRegistry(
                catalog: AIProviderCatalog(providers: [provider])
            ).registrations.first
        )

        XCTAssertNil(registration.executionRoute)
        XCTAssertFalse(registration.supportsExecution)
    }

    func testRuntimeRegistryRejectsDuplicateAdapterIdentifiers() throws {
        let recorder = RuntimeAdapterRecorder()
        let adapter = TestRuntimeAdapter(recorder: recorder)

        XCTAssertThrowsError(try AITextRuntimeRegistry(adapters: [adapter, adapter])) {
            XCTAssertEqual(
                $0 as? AITextRuntimeRegistryError,
                .duplicateAdapterID(adapter.route.runtimeAdapterID)
            )
        }
    }

    func testReviewedThirdProviderReceivesSelectedModelAndEffort() async throws {
        let recorder = RuntimeAdapterRecorder()
        let adapter = TestRuntimeAdapter(recorder: recorder)
        let runtime = try AITextRuntimeRegistry(adapters: [adapter])
        let provider = customCLIProvider(
            executableName: adapter.executableName,
            runtimeAdapterID: adapter.route.runtimeAdapterID,
            implementation: .executableAdapter
        )
        let registration = try XCTUnwrap(
            CLIProviderRegistry(
                catalog: AIProviderCatalog(providers: [provider]),
                runtimeRegistry: runtime
            ).registrations.first
        )

        let route = try XCTUnwrap(registration.executionRoute)
        let result = try await runtime.run(
            route,
            prompt: "Review this implementation.",
            options: .init(model: "example-model", effort: "high")
        )
        let recordedCall = await recorder.latest()
        let call = try XCTUnwrap(recordedCall)

        XCTAssertEqual(result.text, "reviewed adapter result")
        XCTAssertEqual(call.prompt, "Review this implementation.")
        XCTAssertEqual(call.model, "example-model")
        XCTAssertEqual(call.effort, "high")
    }

    func testTrustedCLIPathsRejectUnregisteredAndRelativePATHEntries() {
        let home = URL(fileURLWithPath: "/private/tmp/rivune-provider-home", isDirectory: true)
        let directories = CLIProviderDiscovery.trustedSearchDirectories(
            homeDirectory: home,
            environmentPath: [
                home.appendingPathComponent(".local/bin").path,
                "/tmp/untrusted-cli-bin",
                "/usr/bin",
                "relative/bin",
                home.appendingPathComponent(".local/bin").path
            ].joined(separator: ":")
        )
        let paths = directories.map(\.path)

        XCTAssertEqual(paths.first, home.appendingPathComponent(".local/bin").path)
        XCTAssertTrue(paths.contains("/usr/bin"))
        XCTAssertFalse(paths.contains("/tmp/untrusted-cli-bin"))
        XCTAssertFalse(paths.contains("relative/bin"))
        XCTAssertEqual(Set(paths).count, paths.count)
    }

    func testReviewedThirdProviderDoesNotAdvertiseUnimplementedModelControls() throws {
        let adapter = TestRuntimeAdapter(recorder: RuntimeAdapterRecorder())
        let runtime = try AITextRuntimeRegistry(adapters: [adapter])
        let provider = customCLIProvider(
            executableName: adapter.executableName,
            runtimeAdapterID: adapter.route.runtimeAdapterID,
            implementation: .executableAdapter
        )
        let registration = try XCTUnwrap(
            CLIProviderRegistry(
                catalog: AIProviderCatalog(providers: [provider]),
                runtimeRegistry: runtime
            ).registrations.first
        )

        XCTAssertTrue(registration.supportsExecution)
        XCTAssertFalse(provider.models.isEmpty)
        XCTAssertNil(registration.terminalProvider)
        XCTAssertFalse(registration.supportsModelSettings)
        XCTAssertTrue(CLIProviderRegistry.current.registrations.allSatisfy(\.supportsModelSettings))
    }

    #if os(macOS)
    func testDiscoveryAndResolverFindPackageManagerInstallationsWithoutLaunching() throws {
        let fileManager = FileManager.default
        let root = fileManager.temporaryDirectory
            .appendingPathComponent("RivuneResolverParity-\(UUID().uuidString)", isDirectory: true)
        let sentinel = root.appendingPathComponent("was-launched", isDirectory: false)
        addTeardownBlock { try? FileManager.default.removeItem(at: root) }

        let trustedDirectories = CLIProviderDiscovery.trustedSearchDirectories(
            homeDirectory: root,
            environmentPath: nil
        ).map(\.path)

        for relativePath in [".npm-global/bin", "Library/pnpm", ".bun/bin"] {
            let bin = root.appendingPathComponent(relativePath, isDirectory: true)
            XCTAssertTrue(trustedDirectories.contains(bin.path))
            try fileManager.createDirectory(at: bin, withIntermediateDirectories: true)
            for name in ["codex", "claude"] {
                let executable = bin.appendingPathComponent(name, isDirectory: false)
                try Data("#!/bin/sh\ntouch '\(sentinel.path)'\n".utf8).write(to: executable)
                try fileManager.setAttributes(
                    [.posixPermissions: NSNumber(value: Int16(0o700))],
                    ofItemAtPath: executable.path
                )
            }

            let installations = CLIProviderDiscovery.discover(searchDirectories: [bin])
            for registration in CLIProviderRegistry.current.registrations {
                let discovered = try XCTUnwrap(
                    installations.first { $0.registrationID == registration.id }?.executableURL
                )
                let executable = try XCTUnwrap(
                    CLIProviderDiscovery.resolveExecutable(
                        named: registration.transport.executableName,
                        searchDirectories: [bin]
                    )
                )
                XCTAssertEqual(executable, discovered)
                XCTAssertEqual(executable, bin.appendingPathComponent(registration.transport.executableName))
            }
        }

        XCTAssertFalse(fileManager.fileExists(atPath: sentinel.path))
    }

    func testCLIDiscoveryFindsExactExecutableWithoutLaunchingIt() throws {
        let fileManager = FileManager.default
        let root = fileManager.temporaryDirectory
            .appendingPathComponent("RivuneProviderDiscovery-\(UUID().uuidString)", isDirectory: true)
        let bin = root.appendingPathComponent("bin", isDirectory: true)
        let executable = bin.appendingPathComponent("example-ai", isDirectory: false)
        let sentinel = root.appendingPathComponent("was-launched", isDirectory: false)
        try fileManager.createDirectory(at: bin, withIntermediateDirectories: true)
        try Data("#!/bin/sh\ntouch '\(sentinel.path)'\n".utf8).write(to: executable)
        try fileManager.setAttributes(
            [.posixPermissions: NSNumber(value: Int16(0o700))],
            ofItemAtPath: executable.path
        )
        addTeardownBlock { try? FileManager.default.removeItem(at: root) }

        let registry = CLIProviderRegistry(
            catalog: AIProviderCatalog(
                providers: [self.customCLIProvider(executableName: "example-ai")]
            )
        )
        let discovered = CLIProviderDiscovery.discover(
            registry: registry,
            searchDirectories: [bin],
            fileManager: fileManager
        )

        XCTAssertEqual(discovered.count, 1)
        XCTAssertEqual(discovered.first?.executableURL?.path, executable.path)
        XCTAssertFalse(fileManager.fileExists(atPath: sentinel.path))
        XCTAssertNil(CLIProviderDiscovery.resolveExecutable(
            named: "../example-ai",
            searchDirectories: [bin],
            fileManager: fileManager
        ))
        XCTAssertNil(CLIProviderDiscovery.resolveExecutable(
            named: "/tmp/example-ai",
            searchDirectories: [bin],
            fileManager: fileManager
        ))
    }
    #endif

    func testCLIConnectionStateDistinguishesAuthenticationFromAdapterSupport() throws {
        let known = try XCTUnwrap(
            CLIProviderRegistry.current.registrations.first {
                if case .codex? = $0.terminalProvider { return true }
                return false
            }
        )
        XCTAssertEqual(
            CLIProviderDiscovery.connectionState(
                registration: known,
                installation: nil,
                readiness: .ready,
                isMac: true
            ),
            .ready
        )

        let custom = try XCTUnwrap(
            CLIProviderRegistry(
                catalog: AIProviderCatalog(
                    providers: [customCLIProvider(executableName: "example-ai")]
                )
            ).registrations.first
        )
        let installed = CLIExecutableInstallation(
            registrationID: custom.id,
            executableURL: URL(fileURLWithPath: "/usr/local/bin/example-ai")
        )
        XCTAssertEqual(
            CLIProviderDiscovery.connectionState(
                registration: custom,
                installation: installed,
                readiness: nil,
                isMac: true
            ),
            .adapterRequired
        )
        XCTAssertEqual(
            CLIProviderDiscovery.connectionState(
                registration: custom,
                installation: nil,
                readiness: nil,
                isMac: true
            ),
            .missing
        )
        XCTAssertEqual(
            CLIProviderDiscovery.connectionState(
                registration: custom,
                installation: installed,
                readiness: nil,
                isMac: false
            ),
            .macRequired
        )
    }

    private func customCLIProvider(
        executableName: String,
        runtimeAdapterID: String? = nil,
        implementation: AITransportImplementation = .configurationPreview
    ) -> AIProviderConfiguration {
        AIProviderConfiguration(
            id: "example",
            displayName: "Example AI",
            transports: [
                .commandLine(AICLITransportConfiguration(
                    id: "example.cli",
                    displayName: "Example CLI",
                    executableName: executableName,
                    runtimeAdapterID: runtimeAdapterID,
                    implementation: implementation,
                    capabilities: [.text]
                ))
            ],
            models: [
                AIModelConfiguration(
                    id: "example-model",
                    displayName: "Example model",
                    capabilities: [.text]
                )
            ]
        )
    }
}

private actor RuntimeAdapterRecorder {
    struct Call: Sendable {
        let prompt: String
        let model: String?
        let effort: String?
    }

    private var calls: [Call] = []

    func record(prompt: String, options: TerminalRunOptions) {
        calls.append(.init(prompt: prompt, model: options.model, effort: options.effort))
    }

    func latest() -> Call? { calls.last }
}

private struct TestRuntimeAdapter: AITextRuntimeAdapter {
    let recorder: RuntimeAdapterRecorder
    let executableName = "example-ai"
    let route = AIExecutionRoute(
        providerID: "example",
        transportID: "example.cli",
        runtimeAdapterID: "test.runtime.example",
        transportKind: .commandLine
    )

    func accepts(providerID: String, transport: AITransportConfiguration) -> Bool {
        guard providerID == route.providerID,
              transport.id == route.transportID,
              transport.kind == route.transportKind,
              transport.runtimeAdapterID == route.runtimeAdapterID,
              transport.implementation == .executableAdapter,
              transport.capabilities.contains(.text),
              case .commandLine(let configuration) = transport else {
            return false
        }
        return configuration.executableName == executableName
    }

    func probe() async -> ProviderReadiness { .ready }
    func setupAction() -> AIProviderSetupAction? { nil }

    func run(
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        await recorder.record(prompt: prompt, options: options)
        return .init(text: "reviewed adapter result", elapsedSeconds: 0.01)
    }
}

final class ChatTurnCompatibilityTests: XCTestCase {
    func testLegacyTurnWithoutExecutionStateStillDecodes() throws {
        let original = ChatTurn(
            id: UUID(uuidString: "50000000-0000-0000-0000-000000000001")!,
            prompt: "Legacy prompt",
            mode: .chatGPT,
            createdAt: Date(timeIntervalSince1970: 1_650_000_000),
            attachments: [],
            executionState: .pending
        )
        let encoded = try JSONEncoder().encode(original)
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        object.removeValue(forKey: "executionState")
        let legacyData = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])

        let decoded = try JSONDecoder().decode(ChatTurn.self, from: legacyData)

        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.prompt, original.prompt)
        XCTAssertEqual(decoded.mode, original.mode)
        XCTAssertNil(decoded.executionState)
    }

    func testLegacyConversationWithMissingTurnStateStillDecodes() throws {
        let legacyTurn = ChatTurn(
            id: UUID(uuidString: "50000000-0000-0000-0000-000000000011")!,
            prompt: "Nested legacy prompt",
            mode: .together,
            createdAt: Date(timeIntervalSince1970: 1_650_000_001),
            executionState: .pending
        )
        let conversation = Conversation(
            id: UUID(uuidString: "60000000-0000-0000-0000-000000000001")!,
            title: "Legacy fixture",
            preview: "Fixture",
            updatedAt: Date(timeIntervalSince1970: 1_700_000_000),
            mode: .together,
            turns: [legacyTurn]
        )
        let encoded = try JSONEncoder().encode([conversation])
        var root = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [[String: Any]])
        var turns = try XCTUnwrap(root[0]["turns"] as? [[String: Any]])
        turns[0].removeValue(forKey: "executionState")
        root[0]["turns"] = turns
        let legacyData = try JSONSerialization.data(withJSONObject: root, options: [.sortedKeys])

        let decoded = try JSONDecoder().decode([Conversation].self, from: legacyData)

        XCTAssertEqual(decoded.first?.turns.first?.prompt, legacyTurn.prompt)
        XCTAssertNil(decoded.first?.turns.first?.executionState)
    }

    func testNewTurnDefaultsToPending() {
        let turn = ChatTurn(prompt: "New request", mode: .claude)

        XCTAssertEqual(turn.executionState, .pending)
        XCTAssertEqual(turn.executionState?.councilStage, .asking)
    }

    func testExecutionStatesRoundTripAndMapToCouncilStages() throws {
        let cases: [(TurnExecutionState, CouncilStage)] = [
            (.pending, .asking),
            (.complete, .complete),
            (.failed, .failed),
            (.cancelled, .cancelled),
            (.interrupted, .failed)
        ]

        for (state, expectedStage) in cases {
            let turn = ChatTurn(
                prompt: "State fixture: \(state.rawValue)",
                mode: .chatGPT,
                executionState: state
            )
            let decoded = try JSONDecoder().decode(
                ChatTurn.self,
                from: JSONEncoder().encode(turn)
            )

            XCTAssertEqual(decoded.executionState, state)
            XCTAssertEqual(decoded.executionState?.councilStage, expectedStage)
        }
    }
}

@MainActor
final class RivuneRuntimeFailureTests: XCTestCase {
    func testCancellationDuringDirectSynthesisCannotPublishRecoveredCompletion() async {
        let runner = RivuneCollaborationRunner(textRunner: DirectSynthesisCancellationRunner())
        let request = request(prompt: "hi")
        // Isolate cancellation from the XCTest task itself. The fake runtime
        // cancels this task at precisely the synthesis boundary.
        let task = Task { await runner.run(request) }
        let turn = await task.value

        XCTAssertNotNil(turn.chatGPTAnswer)
        XCTAssertNotNil(turn.claudeAnswer)
        XCTAssertNil(turn.combinedAnswer)
        XCTAssertEqual(turn.executionState, .cancelled)
        XCTAssertEqual(turn.togetherTrace?.phase, .cancelled)
        XCTAssertEqual(turn.togetherTrace?.stoppedPhase, .integrating)
    }

    func testRuntimeExecutionFailureDoesNotClaimMissingAdapter() async {
        let runner = RivuneCollaborationRunner(
            textRunner: RuntimeFailureRunner(failure: .execution)
        )
        let turn = await runner.run(request(prompt: "Build an accessible product website."))

        XCTAssertEqual(turn.executionState, .failed)
        XCTAssertEqual(turn.chatGPTError, TerminalEngineError.executionFailed.userMessage)
        XCTAssertNil(turn.combinedAnswer)
    }

    func testMissingRuntimeAdapterKeepsItsSpecificFailure() async {
        let runner = RivuneCollaborationRunner(
            textRunner: RuntimeFailureRunner(failure: .registry)
        )
        let turn = await runner.run(request(prompt: "Build an accessible product website."))

        XCTAssertEqual(turn.executionState, .failed)
        XCTAssertEqual(turn.chatGPTError, TerminalEngineError.adapterUnavailable.userMessage)
        XCTAssertNil(turn.combinedAnswer)
    }

    private func request(prompt: String) -> RivuneCollaborationRequest {
        .init(
            turnID: UUID(),
            createdAt: .now,
            prompt: prompt,
            priorContext: "",
            attachments: [],
            codexOptions: .accountDefault,
            claudeOptions: .accountDefault,
            codexProvenance: "Codex fixture",
            claudeProvenance: "Claude fixture"
        )
    }
}

private struct DirectSynthesisCancellationRunner: AITextRunning {
    func run(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        if prompt.contains("Return one concise, natural answer to the original user request") {
            withUnsafeCurrentTask { $0?.cancel() }
            throw CancellationError()
        }
        return .init(text: "Hi! What would you like to work on?", elapsedSeconds: 0.1)
    }
}

private struct RuntimeFailureRunner: AITextRunning {
    enum Failure: Sendable { case execution, registry }
    let failure: Failure

    func run(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        switch failure {
        case .execution: throw CocoaError(.fileWriteOutOfSpace)
        case .registry: throw AITextRuntimeRegistryError.adapterUnavailable(route)
        }
    }
}

@MainActor
final class EvaluationLabTests: XCTestCase {
    func testBlindMappingPresentationAndScorecardRemainBlindUntilCommit() throws {
        var selected = completeRun(
            id: UUID(uuidString: "71000000-0000-0000-0000-000000000001")!,
            state: .awaitingSelection
        )
        let blind = EvaluationCandidatePresentation.candidates(for: selected)

        XCTAssertEqual(blind.map(\.title), ["Answer A", "Answer B", "Answer C"])
        XCTAssertTrue(blind.allSatisfy { $0.revealedIdentity == nil && $0.metadata == nil })
        let rivuneSlot = try XCTUnwrap(selected.candidateOrder.firstIndex(of: .rivune))
        selected.selectedSlotIndex = rivuneSlot
        selected.state = .revealed
        selected.revealedAt = .now

        var abstained = completeRun(
            id: UUID(uuidString: "71000000-0000-0000-0000-000000000002")!,
            state: .revealed
        )
        abstained.abstained = true
        abstained.revealedAt = .now

        let revealed = EvaluationCandidatePresentation.candidates(for: selected)
        let score = EvaluationScorecard(runs: [selected, abstained])

        XCTAssertEqual(revealed[rivuneSlot].revealedIdentity, "Rivune")
        XCTAssertNotNil(revealed[rivuneSlot].metadata)
        XCTAssertTrue(revealed[rivuneSlot].isSelected)
        XCTAssertEqual(score.judged, 1)
        XCTAssertEqual(score.rivuneWins, 1)
        XCTAssertEqual(score.abstentions, 1)
        XCTAssertEqual(score.rivuneWinRate, 100)
    }

    func testSubstantiveEvaluationRunsTwoIsolatedBaselinesPlusFullRivuneGraph() async throws {
        let root = temporaryRoot("graph")
        defer { try? FileManager.default.removeItem(at: root) }
        let runner = EvaluationScriptRunner()
        let store = EvaluationLabStore(service: runner, historyRoot: root)
        store.prompt = "Build a polished responsive product website with accessible navigation."
        store.start(configuration: configuration)

        await waitUntilFinished(store)

        let run = try XCTUnwrap(store.selectedRun)
        let calls = await runner.recordedCalls()
        let baselines = calls.filter { $0.prompt.contains("For this blind comparison") }
        let workflow = calls.filter { !$0.prompt.contains("For this blind comparison") }

        XCTAssertEqual(calls.count, 9)
        XCTAssertEqual(baselines.count, 2)
        XCTAssertEqual(baselines[0].prompt, baselines[1].prompt)
        XCTAssertTrue(baselines[0].prompt.contains("\"prior_conversation\":\"\""))
        XCTAssertTrue(baselines[0].prompt.contains("\"user_selected_documents\":\"[]\""))
        XCTAssertTrue(workflow.allSatisfy { !$0.prompt.contains("baseline-alpha-result") })
        XCTAssertTrue(workflow.allSatisfy { !$0.prompt.contains("baseline-beta-result") })
        XCTAssertEqual(calls.filter { $0.provider == .codex }.count, 5)
        XCTAssertEqual(calls.filter { $0.provider == .claude }.count, 4)
        XCTAssertTrue(calls.filter { $0.provider == .codex }.allSatisfy {
            $0.model == CodexModelChoice.gpt56Sol.cliValue
                && $0.effort == CodexReasoningEffort.ultra.cliValue
        })
        XCTAssertTrue(calls.filter { $0.provider == .claude }.allSatisfy {
            $0.model == ClaudeModelChoice.opus.cliValue
                && $0.effort == ClaudeReasoningEffort.high.cliValue
        })
        XCTAssertEqual(run.state, .awaitingSelection)
        XCTAssertTrue(run.hasEveryCandidate)
        XCTAssertEqual(run.rivuneTurn?.togetherTrace?.phase, .complete)
        XCTAssertNotNil(run.rivuneTurn?.togetherTrace?.chatGPTReview)
        XCTAssertNotNil(run.rivuneTurn?.togetherTrace?.claudeReview)
        XCTAssertTrue(
            EvaluationCandidatePresentation.candidates(for: run)
                .allSatisfy { $0.revealedIdentity == nil }
        )

        let escapeHeavyText = String(repeating: "\\\"\n", count: 5_500)
        let rejectedAttachment = PromptAttachment(
            name: "oversized.txt",
            textContent: escapeHeavyText,
            byteCount: escapeHeavyText.utf8.count
        )
        let rejectedTurn = await RivuneCollaborationRunner(textRunner: runner).run(
            .init(
                turnID: UUID(),
                createdAt: .now,
                prompt: "Review the attached evidence.",
                priorContext: "",
                attachments: [rejectedAttachment],
                codexOptions: .init(
                    model: configuration.codexModel.cliValue,
                    effort: configuration.codexEffort.cliValue
                ),
                claudeOptions: .init(
                    model: configuration.claudeModel.cliValue,
                    effort: configuration.claudeEffort.cliValue
                ),
                codexProvenance: "Codex test",
                claudeProvenance: "Claude test"
            )
        )
        let callCountAfterRejectedAttachment = await runner.recordedCalls().count
        XCTAssertEqual(callCountAfterRejectedAttachment, 9)
        XCTAssertEqual(rejectedTurn.togetherTrace?.failedPhase, .planning)
        XCTAssertTrue(rejectedTurn.combinedError?.contains("20 KB") == true)
    }

    func testRetryRunsOnlyMissingCandidateWithFrozenConfiguration() async throws {
        let root = temporaryRoot("retry")
        defer { try? FileManager.default.removeItem(at: root) }
        let runner = EvaluationScriptRunner(failFirstClaudeBaseline: true)
        let store = EvaluationLabStore(service: runner, historyRoot: root)
        store.prompt = "Build a complete website and explain the implementation decisions."
        store.start(configuration: configuration)
        await waitUntilFinished(store)

        let firstRun = try XCTUnwrap(store.selectedRun)
        XCTAssertEqual(firstRun.state, .needsAttention)
        XCTAssertNotNil(firstRun.codexAnswer)
        XCTAssertNil(firstRun.claudeAnswer)
        XCTAssertNotNil(firstRun.rivuneTurn?.combinedAnswer)
        let firstCount = await runner.recordedCalls().count

        store.retryMissingCandidates(firstRun.id)
        await waitUntilFinished(store)

        let completed = try XCTUnwrap(store.selectedRun)
        let calls = await runner.recordedCalls()
        let addedCalls = Array(calls.dropFirst(firstCount))
        XCTAssertEqual(addedCalls.count, 1)
        XCTAssertEqual(addedCalls.first?.provider, .claude)
        XCTAssertTrue(addedCalls.first?.prompt.contains("For this blind comparison") == true)
        XCTAssertEqual(addedCalls.first?.model, ClaudeModelChoice.opus.cliValue)
        XCTAssertEqual(addedCalls.first?.effort, ClaudeReasoningEffort.high.cliValue)
        XCTAssertEqual(completed.configuration, configuration)
        XCTAssertEqual(completed.state, .awaitingSelection)
        XCTAssertTrue(completed.hasEveryCandidate)
    }

    func testHistoryFallsBackToBackupAndRecoversCompleteInterruptedRunForJudging() throws {
        let root = temporaryRoot("recovery")
        defer { try? FileManager.default.removeItem(at: root) }
        let original = completeRun(
            id: UUID(uuidString: "72000000-0000-0000-0000-000000000001")!,
            state: .runningRivune
        )
        try EvaluationHistoryStorage.save([original], in: root)
        try Data("corrupt".utf8).write(
            to: EvaluationHistoryStorage.currentFileURL(in: root),
            options: .atomic
        )

        let loaded = try XCTUnwrap(EvaluationHistoryStorage.load(from: root).first)

        XCTAssertEqual(loaded.id, original.id)
        XCTAssertEqual(loaded.configuration, original.configuration)
        XCTAssertEqual(loaded.candidateOrder, original.candidateOrder)
        XCTAssertEqual(loaded.state, .awaitingSelection)
        XCTAssertTrue(loaded.hasEveryCandidate)
        XCTAssertTrue(
            EvaluationCandidatePresentation.candidates(for: loaded)
                .allSatisfy { $0.revealedIdentity == nil && $0.metadata == nil }
        )

        let interruptedWriteRoot = temporaryRoot("newer-backup")
        defer { try? FileManager.default.removeItem(at: interruptedWriteRoot) }
        let primary = EvaluationHistoryStorage.currentFileURL(in: interruptedWriteRoot)
        let backup = EvaluationHistoryStorage.backupFileURL(in: interruptedWriteRoot)
        try FileManager.default.createDirectory(
            at: primary.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try JSONEncoder().encode(
            EvaluationHistorySnapshot(revision: 1, runs: [original])
        ).write(to: primary, options: .atomic)
        try JSONEncoder().encode(
            EvaluationHistorySnapshot(revision: 2, runs: [])
        ).write(to: backup, options: .atomic)

        XCTAssertTrue(
            EvaluationHistoryStorage.load(from: interruptedWriteRoot).isEmpty,
            "A newer deletion snapshot in recovery storage must beat a valid stale primary copy."
        )
    }

    func testDeletionPurgesBothCopiesAndFailedSaveDoesNotPretendSuccess() throws {
        let root = temporaryRoot("delete")
        defer { try? FileManager.default.removeItem(at: root) }
        var run = completeRun(
            id: UUID(uuidString: "73000000-0000-0000-0000-000000000001")!,
            state: .revealed
        )
        run.codexAnswer = AIAnswer(
            source: .chatGPT,
            content: "UNIQUE-PRIVATE-EVALUATION-ANSWER",
            responseTime: 1
        )
        try EvaluationHistoryStorage.save([run], in: root)
        try EvaluationHistoryStorage.save([], in: root)

        for url in [
            EvaluationHistoryStorage.currentFileURL(in: root),
            EvaluationHistoryStorage.backupFileURL(in: root)
        ] {
            let data = try Data(contentsOf: url)
            let text = String(decoding: data, as: UTF8.self)
            XCTAssertFalse(text.contains(run.prompt))
            XCTAssertFalse(text.contains("UNIQUE-PRIVATE-EVALUATION-ANSWER"))
            XCTAssertTrue(
                try JSONDecoder().decode(EvaluationHistorySnapshot.self, from: data).runs.isEmpty
            )
        }

        let invalidRoot = root.appendingPathComponent("not-a-directory")
        try Data("file".utf8).write(to: invalidRoot)
        XCTAssertThrowsError(try EvaluationHistoryStorage.save([run], in: invalidRoot))
    }

    func testHistoryBoundsRetentionAnswerSizeAndIdentityDisclosures() throws {
        let root = temporaryRoot("bounds")
        defer { try? FileManager.default.removeItem(at: root) }
        let oversized = String(repeating: "🧠", count: 100_000)
        let runs = (0..<45).map { index -> EvaluationRun in
            var run = EvaluationRun(
                prompt: "Evaluation \(index)",
                configuration: configuration,
                candidateOrder: [.codex, .claude, .rivune]
            )
            run.codexAnswer = AIAnswer(
                source: .chatGPT,
                content: oversized,
                responseTime: 1
            )
            run.state = .needsAttention
            return run
        }
        try EvaluationHistoryStorage.save(runs, in: root)

        let loaded = EvaluationHistoryStorage.load(from: root)

        XCTAssertEqual(loaded.count, EvaluationHistoryStorage.maximumStoredRuns)
        XCTAssertLessThanOrEqual(
            try XCTUnwrap(loaded.first?.codexAnswer?.content.utf8.count),
            EvaluationHistoryStorage.maximumAnswerBytes
        )
        XCTAssertTrue(loaded.first?.codexAnswer?.content.hasSuffix("[truncated]") == true)
        XCTAssertTrue(EvaluationLabStore.containsIdentityDisclosure("As Claude, I would choose this option."))
        XCTAssertTrue(EvaluationLabStore.containsIdentityDisclosure("I am ChatGPT, and here is the answer."))
        XCTAssertTrue(EvaluationLabStore.containsIdentityDisclosure("As Rivune, I combined both answers."))
        XCTAssertTrue(EvaluationLabStore.containsIdentityDisclosure("I’m an Anthropic assistant."))
        XCTAssertTrue(EvaluationLabStore.containsIdentityDisclosure("I come from OpenAI."))
        XCTAssertTrue(EvaluationLabStore.containsIdentityDisclosure("Codex here—let's begin."))
        XCTAssertFalse(EvaluationLabStore.containsIdentityDisclosure("Claude and ChatGPT have different strengths."))
        XCTAssertFalse(EvaluationLabStore.containsIdentityDisclosure("ChatGPT was created by OpenAI."))
    }

    private var configuration: EvaluationConfiguration {
        .init(
            codexModel: .gpt56Sol,
            codexEffort: .ultra,
            claudeModel: .opus,
            claudeEffort: .high
        )
    }

    private func completeRun(
        id: UUID,
        state: EvaluationRunState
    ) -> EvaluationRun {
        var run = EvaluationRun(
            id: id,
            prompt: "Which answer is strongest for this product decision?",
            configuration: configuration,
            candidateOrder: [.claude, .rivune, .codex]
        )
        run.codexAnswer = AIAnswer(
            source: .chatGPT,
            content: "Codex candidate",
            responseTime: 1.2,
            provenance: "Codex test"
        )
        run.claudeAnswer = AIAnswer(
            source: .claude,
            content: "Claude candidate",
            responseTime: 1.4,
            provenance: "Claude test"
        )
        run.rivuneTurn = ChatTurn(
            prompt: run.prompt,
            mode: .together,
            combinedAnswer: AIAnswer(
                source: .alloy,
                content: "Rivune candidate",
                responseTime: 3.2,
                provenance: "Integrated test"
            ),
            togetherTrace: TogetherTrace(
                phase: .complete,
                collaborationShape: .comparisonAndDecision,
                sharedPlan: "A complete shared plan",
                chatGPTReview: "Codex review",
                claudeReview: "Claude review"
            ),
            executionState: .complete
        )
        run.state = state
        return run
    }

    private func temporaryRoot(_ suffix: String) -> URL {
        FileManager.default.temporaryDirectory
            .appendingPathComponent("RivuneEvaluationLabTests-\(suffix)-\(UUID().uuidString)", isDirectory: true)
    }

    private func waitUntilFinished(_ store: EvaluationLabStore) async {
        for _ in 0..<400 {
            if !store.isRunning { return }
            try? await Task.sleep(for: .milliseconds(5))
        }
        XCTFail("Evaluation did not finish within the deterministic test window")
    }
}

private actor EvaluationScriptRunner: AITextRunning {
    struct Call: Sendable {
        let route: AIExecutionRoute
        let prompt: String
        let model: String?
        let effort: String?

        var provider: TerminalProvider {
            TerminalProvider(executionRoute: route)!
        }
    }

    private var calls: [Call] = []
    private var shouldFailFirstClaudeBaseline: Bool

    init(failFirstClaudeBaseline: Bool = false) {
        shouldFailFirstClaudeBaseline = failFirstClaudeBaseline
    }

    func recordedCalls() -> [Call] { calls }

    func run(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions
    ) async throws -> TerminalRunResult {
        guard let provider = TerminalProvider(executionRoute: route) else {
            throw TerminalEngineError.adapterUnavailable
        }
        calls.append(
            Call(
                route: route,
                prompt: prompt,
                model: options.model,
                effort: options.effort
            )
        )

        if prompt.contains("For this blind comparison") {
            if provider == .claude && shouldFailFirstClaudeBaseline {
                shouldFailFirstClaudeBaseline = false
                throw TerminalEngineError.providerError(.claude)
            }
            return .init(
                text: provider == .codex ? "baseline-alpha-result" : "baseline-beta-result",
                elapsedSeconds: 0.1
            )
        }
        if prompt.contains("Act as the first coordinator inside Rivune")
            || prompt.contains("Act as the second coordinator inside Rivune") {
            return .init(text: Self.plan, elapsedSeconds: 0.1)
        }
        if prompt.contains("Work as the assigned contributor inside Rivune") {
            let text = provider == .codex
                ? "The semantic shell defines NavigationContract, keyboard focus order, accessible landmarks, and responsive sections."
                : "The AuroraToken system defines restrained colors, responsive breakpoints, typography, and reduced-motion behavior."
            return .init(text: text, elapsedSeconds: 0.1)
        }
        if prompt.contains("Act as an adversarial collaboration reviewer inside Rivune") {
            return .init(
                text: provider == .codex ? Self.codexReview : Self.claudeReview,
                elapsedSeconds: 0.1
            )
        }
        if prompt.contains("Produce the final Rivune answer to the original user") {
            return .init(
                text: "Here is the complete responsive website specification with accessible navigation, a restrained visual system, mobile breakpoints, keyboard behavior, and reduced-motion support.",
                elapsedSeconds: 0.1
            )
        }
        throw TerminalEngineError.malformedOutput(provider)
    }

    private static let plan = """
    ## Goal
    Produce a complete responsive product website.

    ## Collaboration approach
    Use complementary workstreams with compatible structure and visual behavior.

    ## Shared requirements
    Use accessible markup, restrained visuals, responsive behavior, and no external assets.

    ## Codex task
    Build the semantic shell and define NavigationContract for Claude's visual work.

    ## Claude task
    Build AuroraToken using Codex's semantic shell and accessibility constraints.

    ## How the work connects
    Codex provides NavigationContract to Claude; Claude returns AuroraToken and breakpoint mappings to Codex.

    ## Definition of done
    Confirm keyboard flow, responsive behavior, compatible interfaces, and every requested section.
    """

    private static let codexReview = """
    ## Partner work checked
    Claude's AuroraToken colors and responsive breakpoints support the requested restrained visual system.

    ## My assumptions checked
    My NavigationContract assumption is supported, but the mobile focus order remains uncertain.

    ## Conflicts and gaps
    The breakpoint names must match the semantic shell before delivery.

    ## Recommended resolutions
    Keep AuroraToken and align every breakpoint name with NavigationContract.
    """

    private static let claudeReview = """
    ## Partner work checked
    Codex's NavigationContract and keyboard focus order give the visual system concrete accessible structure.

    ## My assumptions checked
    My AuroraToken assumption is supported, but the reduced-motion timing needs verification.

    ## Conflicts and gaps
    The semantic shell does not yet name the reduced-motion token.

    ## Recommended resolutions
    Keep NavigationContract and add one explicit reduced-motion token before delivery.
    """
}

@MainActor
final class WorkspaceDraftPersistenceTests: XCTestCase {
    func testUnsentDraftSurvivesStoreRecreationAndClearing() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("drafts.json")
        let first = RivuneStore(draftStorageURL: url)
        first.composerText = "Unsent draft with Unicode ✨\nSecond line"
        let second = RivuneStore(draftStorageURL: url)
        XCTAssertEqual(second.composerText, first.composerText)
        second.composerText = ""
        XCTAssertEqual(RivuneStore(draftStorageURL: url).composerText, "")
    }

    func testConversationDraftDoesNotOverwriteNewDraft() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("drafts.json")
        let store = RivuneStore(draftStorageURL: url)
        store.composerText = "New chat draft"
        let id = UUID()
        store.selectConversation(id)
        store.composerText = "Conversation draft"
        store.newChat()
        XCTAssertEqual(store.composerText, "New chat draft")
        store.selectConversation(id)
        XCTAssertEqual(store.composerText, "Conversation draft")
        store.newChat()
        XCTAssertEqual(RivuneStore(draftStorageURL: url).composerText, "New chat draft")
    }

    func testUnreadableDraftFailsWithoutInventingContent() throws {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: url) }
        try Data("invalid".utf8).write(to: url)
        XCTAssertEqual(RivuneStore(draftStorageURL: url).composerText, "")
    }
}

final class AccountLaunchPolicyTests: XCTestCase {
    func testLocalReviewNeverRestoresAccountEvenWithEnabledConfig() {
        XCTAssertFalse(RivuneAccountLaunchPolicy.permitsAutomaticRestore(enabled: true, distribution: "preview", expectedTeam: nil, verifiedDeveloperID: false, isolated: false))
        XCTAssertNil(RivuneAccountConfiguration.bundled)
    }
    func testUnsignedAndIsolatedBuildsFailClosed() {
        XCTAssertFalse(RivuneAccountLaunchPolicy.permitsAutomaticRestore(enabled: true, distribution: "developer-id", expectedTeam: "SYNTHETIC0", verifiedDeveloperID: false, isolated: false))
        XCTAssertFalse(RivuneAccountLaunchPolicy.permitsAutomaticRestore(enabled: true, distribution: "developer-id", expectedTeam: "SYNTHETIC0", verifiedDeveloperID: true, isolated: true))
        XCTAssertFalse(RivuneAccountLaunchPolicy.permitsAutomaticRestore(enabled: false, distribution: "developer-id", expectedTeam: "SYNTHETIC0", verifiedDeveloperID: true, isolated: false))
    }
    @MainActor
    func testUnconfiguredAccountStaysLocalAcrossRepeatedRestoreAttempts() async {
        let account = RivuneAccount(configuration: nil)
        await account.restore()
        await account.restore()
        XCTAssertNil(account.identity)
        XCTAssertFalse(account.sessionAccessRequested)
        XCTAssertFalse(account.busy)
        XCTAssertFalse(account.supports("email"))
        XCTAssertFalse(account.supports("google"))
        XCTAssertFalse(account.supports("apple"))
    }
}


extension WorkspaceDraftPersistenceTests {
    func testUpdatePreparationPreservesDraftAttachmentsAcrossRecreation() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let url = directory.appendingPathComponent("drafts.json")
        let store = RivuneStore(draftStorageURL: url)
        store.composerText = "Synthetic unsent request"
        let attachment = PromptAttachment(name: "qa.txt", textContent: "Synthetic context", byteCount: 17)
        store.draftAttachments = [attachment]
        XCTAssertTrue(store.prepareForUpdate())
        let restored = RivuneStore(draftStorageURL: url)
        XCTAssertEqual(restored.composerText, store.composerText)
        XCTAssertEqual(restored.draftAttachments, [attachment])
    }
}


@MainActor
private final class FakeAccountBackend: RivuneAccountBackend {
    let events: AsyncStream<RivuneAccountEvent>
    let continuation: AsyncStream<RivuneAccountEvent>.Continuation
    var verificationFails = false
    var signOutFails = false
    var verifyCalls = 0
    var signOutCalls = 0
    var deferred: CheckedContinuation<RivuneVerifiedAccount, Error>?
    var deferNext = false
    init() { (events, continuation) = AsyncStream.makeStream() }
    func verifiedAccount() async throws -> RivuneVerifiedAccount {
        verifyCalls += 1
        if deferNext { deferNext = false; return try await withCheckedThrowingContinuation { deferred = $0 } }
        if verificationFails { throw URLError(.notConnectedToInternet) }
        return .init(id: "synthetic-user", email: "qa@example.invalid")
    }
    func oauth(_ provider: Provider) async throws {}
    func sendCode(_ email: String) async throws {}
    func verify(_ email: String, code: String) async throws {}
    func callback(_ url: URL) async throws {}
    func signOut() async throws { signOutCalls += 1; if signOutFails { throw URLError(.notConnectedToInternet) } }
}

@MainActor
final class AccountLifecycleTests: XCTestCase {
    private func config() -> RivuneAccountConfiguration {
        RivuneAccountConfiguration(values: ["Enabled": true, "URL": "https://synthetic.supabase.co", "PublishableKey": "sb_publishable_synthetic_test_value", "google": true, "email": true])!
    }
    func testLaunchAndUnsolicitedCallbackNeverCreateBackend() async {
        var creations = 0
        let account = RivuneAccount(configuration: config(), backendFactory: { creations += 1; return FakeAccountBackend() })
        await account.monitor(); await account.restore()
        await account.finishEmailLink(URL(string: "rivune://auth/callback?code=unsolicited")!)
        XCTAssertEqual(creations, 0); XCTAssertFalse(account.sessionAccessRequested)
    }
    func testObserverStartsOnceAndOfflineVerificationCanRetry() async {
        let fake = FakeAccountBackend()
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let account = RivuneAccount(configuration: config(), defaults: defaults, backendFactory: { fake })
        await account.oauth(.google)
        XCTAssertEqual(account.identity, "qa@example.invalid")
        await account.monitor(); await account.monitor()
        XCTAssertEqual(account.observerStarts, 1)
        fake.verificationFails = true
        fake.continuation.yield(.refreshed)
        for _ in 0..<100 where !account.verificationFailed { await Task.yield() }
        XCTAssertNil(account.identity); XCTAssertTrue(account.verificationFailed)
        fake.verificationFails = false
        await account.retryVerification()
        XCTAssertNotNil(account.identity); XCTAssertFalse(account.verificationFailed)
        fake.continuation.yield(.signedOut)
        for _ in 0..<20 { await Task.yield() }
        XCTAssertNil(account.identity)
    }
    func testFailedSignOutSurvivesRestartAndHasSuccessfulRetry() async {
        let name = UUID().uuidString; let defaults = UserDefaults(suiteName: name)!
        defer { defaults.removePersistentDomain(forName: name) }
        let fake = FakeAccountBackend()
        let first = RivuneAccount(configuration: config(), defaults: defaults, backendFactory: { fake })
        await first.oauth(.google)
        fake.signOutFails = true
        await first.signOut()
        XCTAssertNil(first.identity); XCTAssertTrue(first.signOutPending)
        XCTAssertTrue(first.message?.contains("not confirmed") == true)
        let restarted = RivuneAccount(configuration: config(), defaults: defaults, backendFactory: { fake })
        XCTAssertTrue(restarted.signOutPending); XCTAssertFalse(restarted.sessionAccessRequested)
        await restarted.restore(); XCTAssertNil(restarted.identity)
        fake.signOutFails = false
        await restarted.signOut()
        XCTAssertFalse(restarted.signOutPending)
        await restarted.oauth(.google); XCTAssertNotNil(restarted.identity)
    }
    func testDelayedVerificationCannotResurrectSignedOutIdentity() async {
        let fake = FakeAccountBackend()
        let defaults = UserDefaults(suiteName: UUID().uuidString)!
        let account = RivuneAccount(configuration: config(), defaults: defaults, backendFactory: { fake })
        await account.oauth(.google)
        fake.deferNext = true
        let pending = Task { await account.restore() }
        for _ in 0..<100 where fake.deferred == nil { await Task.yield() }
        XCTAssertNotNil(fake.deferred)
        await account.signOut()
        fake.deferred?.resume(returning: .init(id: "old", email: "old@example.invalid"))
        await pending.value
        XCTAssertNil(account.identity); XCTAssertNil(account.verifiedUserID)
    }
}
