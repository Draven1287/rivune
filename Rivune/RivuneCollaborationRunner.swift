import Foundation

struct RivuneCollaborationRequest: Sendable {
    let turnID: UUID
    let createdAt: Date
    let prompt: String
    let priorContext: String
    let attachments: [PromptAttachment]
    let codexOptions: TerminalRunOptions
    let claudeOptions: TerminalRunOptions
    let codexProvenance: String
    let claudeProvenance: String
}

struct RivuneCollaborationSnapshot: Sendable {
    let turn: ChatTurn
    let stage: CouncilStage
}

/// Executes one complete Rivune collaboration without depending on chat UI
/// state. Evaluation Lab uses this runner so its collaborative candidate is a
/// real plan/split/review/resolve run, not a marketing simulation.
struct RivuneCollaborationRunner: Sendable {
    private let textRunner: any AITextRunning

    init(textRunner: any AITextRunning = TerminalAIService()) {
        self.textRunner = textRunner
    }

    func run(
        _ request: RivuneCollaborationRequest,
        onUpdate: @MainActor @Sendable (RivuneCollaborationSnapshot) -> Void = { _ in }
    ) async -> ChatTurn {
        let startedAt = Date()
        let shape = RivuneStore.collaborationShape(
            for: request.prompt,
            attachments: request.attachments
        )
        var turn = ChatTurn(
            id: request.turnID,
            prompt: request.prompt,
            mode: .together,
            createdAt: request.createdAt,
            attachments: request.attachments,
            togetherTrace: TogetherTrace(
                phase: .planning,
                collaborationShape: shape
            )
        )
        await onUpdate(.init(turn: turn, stage: .asking))

        guard let sourceMaterial = RivuneStore.preparedAttachmentContext(request.attachments) else {
            return await failed(
                turn,
                phase: .planning,
                message: "The selected documents exceed Rivune's 20 KB prepared-document limit.",
                onUpdate: onUpdate
            )
        }

        if shape == .directResponse {
            return await runDirect(
                request,
                startedAt: startedAt,
                turn: turn,
                onUpdate: onUpdate
            )
        }

        let proposedPlan = await attempt(
            .codexCLI,
            prompt: RivuneStore.collaborationPlanningPrompt(
                userPrompt: request.prompt,
                priorContext: request.priorContext,
                attachments: request.attachments
            ),
            options: request.codexOptions
        )
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .planning, onUpdate: onUpdate)
        }
        guard let proposedPlanResult = proposedPlan.result else {
            turn.chatGPTError = proposedPlan.error?.userMessage
                ?? "Codex could not create the shared work plan."
            return await failed(
                turn,
                phase: .planning,
                message: "Rivune could not create a shared work plan.",
                onUpdate: onUpdate
            )
        }

        let challengedPlan = await attempt(
            .claudeCodeCLI,
            prompt: RivuneStore.collaborationPlanReviewPrompt(
                userPrompt: request.prompt,
                priorContext: request.priorContext,
                proposedPlan: proposedPlanResult.text,
                sourceMaterial: sourceMaterial,
                selectedShape: shape
            ),
            options: request.claudeOptions
        )
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .planning, onUpdate: onUpdate)
        }
        guard let sharedPlan = RivuneStore.resolvedCollaborationPlan(
            reviewedPlan: challengedPlan.result?.text,
            proposedPlan: proposedPlanResult.text
        ) else {
            turn.claudeError = challengedPlan.error?.userMessage
                ?? "Claude did not produce a usable plan challenge."
            return await failed(
                turn,
                phase: .planning,
                message: "Neither the proposed nor challenged plan was complete enough to run.",
                onUpdate: onUpdate
            )
        }

        turn.togetherTrace?.phase = .contributing
        turn.togetherTrace?.sharedPlan = sharedPlan
        await onUpdate(.init(turn: turn, stage: .asking))

        let codexContributionPrompt = RivuneStore.coordinatedContributionPrompt(
            userPrompt: request.prompt,
            priorContext: request.priorContext,
            sharedPlan: sharedPlan,
            roleName: "Codex",
            partnerName: "Claude",
            sourceMaterial: sourceMaterial
        )
        let claudeContributionPrompt = RivuneStore.coordinatedContributionPrompt(
            userPrompt: request.prompt,
            priorContext: request.priorContext,
            sharedPlan: sharedPlan,
            roleName: "Claude",
            partnerName: "Codex",
            sourceMaterial: sourceMaterial
        )
        async let codexWork = attempt(
            .codexCLI,
            prompt: codexContributionPrompt,
            options: request.codexOptions
        )
        async let claudeWork = attempt(
            .claudeCodeCLI,
            prompt: claudeContributionPrompt,
            options: request.claudeOptions
        )
        let (codexContribution, claudeContribution) = await (codexWork, claudeWork)
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .contributing, onUpdate: onUpdate)
        }

        if let result = codexContribution.result {
            turn.chatGPTAnswer = AIAnswer(
                source: .chatGPT,
                content: RivuneStore.userFacingContribution(
                    result.text,
                    userPrompt: request.prompt
                ),
                responseTime: result.elapsedSeconds,
                provenance: "\(request.codexProvenance) · coordinated"
            )
        } else {
            turn.chatGPTError = codexContribution.error?.userMessage
        }
        if let result = claudeContribution.result {
            turn.claudeAnswer = AIAnswer(
                source: .claude,
                content: RivuneStore.userFacingContribution(
                    result.text,
                    userPrompt: request.prompt
                ),
                responseTime: result.elapsedSeconds,
                provenance: "\(request.claudeProvenance) · coordinated"
            )
        } else {
            turn.claudeError = claudeContribution.error?.userMessage
        }
        await onUpdate(.init(turn: turn, stage: .asking))

        guard let codexText = codexContribution.result?.text,
              let claudeText = claudeContribution.result?.text else {
            return await failed(
                turn,
                phase: .contributing,
                message: RivuneStore.incompleteCollaborationMessage(
                    codexCompleted: codexContribution.result != nil,
                    claudeCompleted: claudeContribution.result != nil
                ),
                onUpdate: onUpdate
            )
        }

        turn.togetherTrace?.phase = .reviewing
        await onUpdate(.init(turn: turn, stage: .comparing))
        let reviewPrompts = RivuneStore.collaborationReviewPrompts(
            userPrompt: request.prompt,
            priorContext: request.priorContext,
            sharedPlan: sharedPlan,
            chatGPTContribution: codexText,
            claudeContribution: claudeText,
            sourceMaterial: sourceMaterial
        )
        async let codexReviewAttempt = attempt(
            .codexCLI,
            prompt: reviewPrompts.chatGPT,
            options: request.codexOptions
        )
        async let claudeReviewAttempt = attempt(
            .claudeCodeCLI,
            prompt: reviewPrompts.claude,
            options: request.claudeOptions
        )
        let (codexReviewResult, claudeReviewResult) = await (
            codexReviewAttempt,
            claudeReviewAttempt
        )
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .reviewing, onUpdate: onUpdate)
        }

        let codexReview = codexReviewResult.result.flatMap {
            RivuneStore.validatedCollaborationReview(
                $0.text,
                reviewerName: "Codex",
                partnerName: "Claude",
                partnerContribution: claudeText
            )
        }
        let claudeReview = claudeReviewResult.result.flatMap {
            RivuneStore.validatedCollaborationReview(
                $0.text,
                reviewerName: "Claude",
                partnerName: "Codex",
                partnerContribution: codexText
            )
        }
        turn.togetherTrace?.chatGPTReview = codexReview
        turn.togetherTrace?.claudeReview = claudeReview
        await onUpdate(.init(turn: turn, stage: .comparing))

        guard let codexReview, let claudeReview else {
            return await failed(
                turn,
                phase: .reviewing,
                message: RivuneStore.incompleteReviewMessage(
                    codexReviewedClaude: codexReview != nil,
                    claudeReviewedCodex: claudeReview != nil
                ),
                onUpdate: onUpdate
            )
        }

        turn.togetherTrace?.phase = .integrating
        await onUpdate(.init(turn: turn, stage: .synthesizing))
        let synthesisPrompt = RivuneStore.synthesisPrompt(
            userPrompt: request.prompt,
            priorContext: request.priorContext,
            sharedPlan: sharedPlan,
            chatGPTAnswer: codexText,
            claudeAnswer: claudeText,
            chatGPTCritique: codexReview,
            claudeCritique: claudeReview,
            sourceMaterial: sourceMaterial
        )
        let codexSynthesis = await attempt(
            .codexCLI,
            prompt: synthesisPrompt,
            options: request.codexOptions
        )
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .integrating, onUpdate: onUpdate)
        }
        var integrated = RivuneStore.validatedIntegratedAnswer(
            codexSynthesis.result?.text,
            userPrompt: request.prompt
        )
        var provenance = request.codexProvenance
        if integrated == nil {
            let claudeSynthesis = await attempt(
                .claudeCodeCLI,
                prompt: synthesisPrompt,
                options: request.claudeOptions
            )
            guard !Task.isCancelled else {
                return await cancelled(turn, phase: .integrating, onUpdate: onUpdate)
            }
            integrated = RivuneStore.validatedIntegratedAnswer(
                claudeSynthesis.result?.text,
                userPrompt: request.prompt
            )
            if integrated != nil { provenance = request.claudeProvenance }
        }

        guard let integrated else {
            return await failed(
                turn,
                phase: .integrating,
                message: RivuneStore.incompleteIntegrationMessage,
                onUpdate: onUpdate
            )
        }

        turn.combinedAnswer = AIAnswer(
            source: .alloy,
            content: integrated,
            responseTime: Date().timeIntervalSince(startedAt),
            provenance: "Integrated by \(provenance)"
        )
        turn.executionState = .complete
        turn.togetherTrace?.phase = .complete
        await onUpdate(.init(turn: turn, stage: .complete))
        return turn
    }

    private func runDirect(
        _ request: RivuneCollaborationRequest,
        startedAt: Date,
        turn: ChatTurn,
        onUpdate: @MainActor @Sendable (RivuneCollaborationSnapshot) -> Void
    ) async -> ChatTurn {
        var turn = turn
        turn.togetherTrace?.phase = .contributing
        turn.togetherTrace?.sharedPlan = "This short request uses two direct responses; no task split is needed."
        await onUpdate(.init(turn: turn, stage: .asking))
        let prompt = RivuneStore.directTogetherPrompt(
            userPrompt: request.prompt,
            priorContext: request.priorContext
        )
        async let codex = attempt(.codexCLI, prompt: prompt, options: request.codexOptions)
        async let claude = attempt(.claudeCodeCLI, prompt: prompt, options: request.claudeOptions)
        let (codexAttempt, claudeAttempt) = await (codex, claude)
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .contributing, onUpdate: onUpdate)
        }
        if let result = codexAttempt.result {
            turn.chatGPTAnswer = AIAnswer(
                source: .chatGPT,
                content: RivuneStore.userFacingContribution(result.text, userPrompt: request.prompt),
                responseTime: result.elapsedSeconds,
                provenance: "\(request.codexProvenance) · direct"
            )
        } else if codexAttempt.error != .cancelled {
            turn.chatGPTError = codexAttempt.error?.userMessage
                ?? "Codex did not return a direct response."
        }
        if let result = claudeAttempt.result {
            turn.claudeAnswer = AIAnswer(
                source: .claude,
                content: RivuneStore.userFacingContribution(result.text, userPrompt: request.prompt),
                responseTime: result.elapsedSeconds,
                provenance: "\(request.claudeProvenance) · direct"
            )
        } else if claudeAttempt.error != .cancelled {
            turn.claudeError = claudeAttempt.error?.userMessage
                ?? "Claude did not return a direct response."
        }
        guard codexAttempt.result != nil || claudeAttempt.result != nil else {
            return await failed(
                turn,
                phase: .contributing,
                message: "Neither model returned an answer.",
                onUpdate: onUpdate
            )
        }
        turn.togetherTrace?.phase = .integrating
        await onUpdate(.init(turn: turn, stage: .synthesizing))
        var integrated: String?
        var integrationProvenance: String?
        if let codexText = codexAttempt.result?.text,
           let claudeText = claudeAttempt.result?.text {
            let synthesis = await attempt(
                .codexCLI,
                prompt: RivuneStore.directTogetherSynthesisPrompt(
                    userPrompt: request.prompt,
                    chatGPTAnswer: codexText,
                    claudeAnswer: claudeText
                ),
                options: request.codexOptions
            )
            guard !Task.isCancelled, synthesis.error != .cancelled else {
                return await cancelled(turn, phase: .integrating, onUpdate: onUpdate)
            }
            integrated = RivuneStore.validatedIntegratedAnswer(
                synthesis.result?.text,
                userPrompt: request.prompt
            )
            if integrated != nil {
                integrationProvenance = "Integrated by \(request.codexProvenance)"
            }
        }
        if integrated == nil,
           let recovered = RivuneStore.fallbackCombinedContent(
               chatGPT: codexAttempt.result?.text,
               claude: claudeAttempt.result?.text,
               userPrompt: request.prompt
           ) {
            integrated = recovered
            integrationProvenance = "Recovered from a completed contribution"
        }
        if integrated == nil,
           let local = RivuneStore.localDirectFallback(for: request.prompt) {
            integrated = local
            integrationProvenance = "Local direct fallback"
        }
        guard !Task.isCancelled else {
            return await cancelled(turn, phase: .integrating, onUpdate: onUpdate)
        }
        guard let integrated else {
            return await failed(
                turn,
                phase: .integrating,
                message: RivuneStore.incompleteIntegrationMessage,
                onUpdate: onUpdate
            )
        }
        turn.combinedAnswer = AIAnswer(
            source: .alloy,
            content: integrated,
            responseTime: Date().timeIntervalSince(startedAt),
            provenance: integrationProvenance
        )
        turn.executionState = .complete
        turn.togetherTrace?.phase = .complete
        await onUpdate(.init(turn: turn, stage: .complete))
        return turn
    }

    private func attempt(
        _ route: AIExecutionRoute,
        prompt: String,
        options: TerminalRunOptions
    ) async -> RunnerAttempt {
        do {
            return RunnerAttempt(
                result: try await textRunner.run(route, prompt: prompt, options: options),
                error: nil
            )
        } catch let error as TerminalEngineError {
            return RunnerAttempt(result: nil, error: error)
        } catch is CancellationError {
            return RunnerAttempt(result: nil, error: .cancelled)
        } catch is AITextRuntimeRegistryError {
            return RunnerAttempt(result: nil, error: .adapterUnavailable)
        } catch {
            return RunnerAttempt(result: nil, error: .executionFailed)
        }
    }

    private func failed(
        _ original: ChatTurn,
        phase: TogetherPhase,
        message: String,
        onUpdate: @MainActor @Sendable (RivuneCollaborationSnapshot) -> Void
    ) async -> ChatTurn {
        var turn = original
        turn.combinedAnswer = nil
        turn.combinedError = message
        turn.executionState = .failed
        turn.togetherTrace?.failedPhase = phase
        turn.togetherTrace?.phase = .failed
        await onUpdate(.init(turn: turn, stage: .failed))
        return turn
    }

    private func cancelled(
        _ original: ChatTurn,
        phase: TogetherPhase,
        onUpdate: @MainActor @Sendable (RivuneCollaborationSnapshot) -> Void
    ) async -> ChatTurn {
        var turn = original
        turn.combinedError = "Rivune mode stopped before the combined answer finished."
        turn.executionState = .cancelled
        turn.togetherTrace?.stoppedPhase = phase
        turn.togetherTrace?.phase = .cancelled
        await onUpdate(.init(turn: turn, stage: .cancelled))
        return turn
    }

}

private struct RunnerAttempt: Sendable {
    let result: TerminalRunResult?
    let error: TerminalEngineError?
}
