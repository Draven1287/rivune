import SwiftUI
import UniformTypeIdentifiers

#if os(macOS)
import AppKit
#else
import UIKit
#endif

struct ModelSelector: View {
    @Binding var selection: IntelligenceMode
    var isDisabled = false
    var presentation: Presentation = .compact
    var catalog: AIProviderCatalog = .currentDefaults
    var isExpanded = false
    let onToggle: () -> Void

    enum Presentation {
        case sidebar
        case compact
    }

    private var options: [IntelligenceModeSelectionOption] {
        IntelligenceModeSelectionOption.available(in: catalog)
    }

    private var selectedOption: IntelligenceModeSelectionOption {
        options.first(where: { $0.mode == selection }) ?? options[0]
    }

    var body: some View {
        Button(action: onToggle) {
            switch presentation {
            case .sidebar:
                sidebarLabel
            case .compact:
                compactLabel
            }
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.72 : 1)
        .accessibilityLabel("Assistant selector, current selection \(selectedOption.title)")
        .accessibilityValue(selectedOption.detail)
        .accessibilityHint(isExpanded ? "Close assistant choices" : "Choose Rivune collaboration or a direct provider")
        .accessibilityAddTraits(isExpanded ? .isSelected : [])
    }

    private var sidebarLabel: some View {
        HStack(spacing: 5) {
            Text(selectedOption.title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(RivunePalette.primaryText)
            Image(systemName: "chevron.down")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(RivunePalette.tertiaryText)
                .rotationEffect(.degrees(isExpanded ? 180 : 0))
        }
        .contentShape(Rectangle())
    }

    private var compactLabel: some View {
        HStack(spacing: 6) {
            optionMark(selectedOption, size: 18)
            Text(selectedOption.title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(RivunePalette.primaryText)
            Image(systemName: "chevron.down")
                .font(.caption2.weight(.bold))
                .foregroundStyle(RivunePalette.tertiaryText)
                .rotationEffect(.degrees(isExpanded ? 180 : 0))
        }
        .frame(minHeight: 44)
    }

    @ViewBuilder
    private func optionMark(
        _ option: IntelligenceModeSelectionOption,
        size: CGFloat
    ) -> some View {
        if option.mode == .together {
            RivuneOrb(size: size, motionEnabled: false)
        } else {
            ProviderIdentityMark(mode: option.mode, size: size)
        }
    }
}

struct ProviderSelectionPanel: View {
    @Binding var selection: IntelligenceMode
    var catalog: AIProviderCatalog = .currentDefaults
    let onDismiss: () -> Void

    private var options: [IntelligenceModeSelectionOption] {
        IntelligenceModeSelectionOption.available(in: catalog)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Work with")
                .font(.caption.weight(.semibold))
                .foregroundStyle(RivunePalette.secondaryText)
                .padding(.horizontal, 9)
                .padding(.vertical, 5)

            if let rivune = options.first(where: { $0.mode == .together }) {
                optionButton(rivune)
            }

            let directOptions = options.filter { $0.mode != .together }
            if !directOptions.isEmpty {
                Divider()
                    .overlay(RivunePalette.hairline)
                    .padding(.vertical, 2)

                Text("Direct")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(RivunePalette.secondaryText)
                    .padding(.horizontal, 5)

                ForEach(directOptions) { option in
                    optionButton(option)
                }
            }
        }
        .padding(8)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Assistant choices")
    }

    private func optionButton(_ option: IntelligenceModeSelectionOption) -> some View {
        let isSelected = selection == option.mode

        return Button {
            withAnimation(.snappy(duration: 0.24)) {
                selection = option.mode
                onDismiss()
            }
        } label: {
            HStack(spacing: 11) {
                optionMark(option, isSelected: isSelected)

                VStack(alignment: .leading, spacing: 2) {
                    Text(option.title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(RivunePalette.primaryText)
                    Text(option.detail)
                        .font(.caption)
                        .foregroundStyle(RivunePalette.secondaryText)
                        .lineLimit(1)
                }

                Spacer(minLength: 8)

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(RivunePalette.rivune)
                }
            }
            .padding(.horizontal, 9)
            .frame(minHeight: 47)
            .contentShape(Rectangle())
            .background(
                isSelected ? RivunePalette.surfaceRaised : .clear,
                in: RoundedRectangle(cornerRadius: 11, style: .continuous)
            )
            .overlay {
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .stroke(isSelected ? RivunePalette.hairline : .clear, lineWidth: 0.6)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(option.title)
        .accessibilityValue(option.detail)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    @ViewBuilder
    private func optionMark(
        _ option: IntelligenceModeSelectionOption,
        isSelected: Bool
    ) -> some View {
        if option.mode == .together {
            RivuneOrb(size: 29, motionEnabled: false)
        } else {
            ProviderIdentityMark(mode: option.mode, size: 29)
                .opacity(isSelected ? 1 : 0.82)
        }
    }
}

struct ResponseCard: View {
    let source: AnswerSource
    let answer: AIAnswer?
    let isLoading: Bool
    var error: String? = nil
    var progressStage: CouncilStage? = nil
    var onRetry: (() -> Void)? = nil
    var retryLabel = "Ask again"
    var eyebrow: String? = nil
    var emptyStateMessage = "This response will appear here"
    var isCollapsible = false
    var isPrimary = false

    @State private var copied = false
    @State private var showFullAnswer = false

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            cardHeader

            if let progressStage {
                CouncilStatusLine(stage: progressStage)
                    .transition(.opacity.combined(with: .scale(scale: 0.98)))
            }

            if let error {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "exclamationmark.circle")
                            .foregroundStyle(source.accent.opacity(0.82))
                            .padding(.top, 2)
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(RivunePalette.secondaryText)
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if let onRetry {
                        Button(retryLabel, systemImage: "arrow.clockwise", action: onRetry)
                            .buttonStyle(.bordered)
                            .controlSize(.small)
                    }
                }
                .padding(14)
                .background(RivunePalette.canvas.opacity(0.34), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else if let answer {
                answerBody(answer)
                    .transition(.opacity)
            } else if isLoading {
                loadingBody
            } else {
                waitingBody
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(RivunePalette.surface.opacity(0.97))
        }
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(RivunePalette.hairline, lineWidth: 0.7)
        }
        .animation(.easeOut(duration: 0.24), value: answer)
        .animation(.easeOut(duration: 0.2), value: error)
        .onChange(of: answer?.id) { _, _ in
            showFullAnswer = false
        }
    }

    private var cardHeader: some View {
        HStack(spacing: 10) {
            responseMark

            VStack(alignment: .leading, spacing: 2) {
                Text(displayTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RivunePalette.primaryText.opacity(0.90))

                if let answer {
                    Text(metadata(for: answer))
                        .font(.caption2)
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .lineLimit(1)
                } else {
                    Text(error != nil ? "Needs attention" : (isLoading ? "Thinking…" : "Waiting"))
                        .font(.caption2)
                        .foregroundStyle(RivunePalette.tertiaryText)
                }
            }

            Spacer()

            if answer != nil {
                Button {
                    copyAnswer()
                } label: {
                    Image(systemName: copied ? "checkmark" : "doc.on.doc")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(width: 32, height: 32)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(copied ? RivunePalette.success : RivunePalette.secondaryText)
                .accessibilityLabel(copied ? "Copied" : "Copy response")

                Menu {
                    if let onRetry {
                        Button(retryLabel, systemImage: "arrow.clockwise", action: onRetry)
                    }
                    if let answer {
                        ShareLink(item: answer.content) {
                            Label("Share response", systemImage: "square.and.arrow.up")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.system(size: 12, weight: .semibold))
                        .frame(width: 32, height: 32)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .foregroundStyle(RivunePalette.secondaryText)
                .accessibilityLabel("More response actions")
            }
        }
    }

    @ViewBuilder
    private var responseMark: some View {
        if source == .alloy {
            RivuneOrb(size: 25, motionEnabled: false)
        } else {
            ProviderIdentityMark(mode: source == .chatGPT ? .chatGPT : .claude, size: 25)
        }
    }

    @ViewBuilder
    private func answerBody(_ answer: AIAnswer) -> some View {
        let shouldCondense = isCollapsible && answer.content.count > 760

        MarkdownResponseText(
            content: answer.content,
            maximumBlocks: shouldCondense && !showFullAnswer ? 2 : nil
        )

        if shouldCondense {
            Button {
                withAnimation(.easeInOut(duration: 0.22)) {
                    showFullAnswer.toggle()
                }
            } label: {
                Label(
                    showFullAnswer ? "Show less" : "Show full contribution",
                    systemImage: showFullAnswer ? "chevron.up" : "chevron.down"
                )
                .font(.caption.weight(.semibold))
                .foregroundStyle(RivunePalette.secondaryText)
                .frame(minHeight: 30)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint(showFullAnswer ? "Collapses this contribution" : "Expands this contribution")
        }
    }

    private var displayTitle: String {
        if let eyebrow { return eyebrow }
        return switch source {
        case .chatGPT: "ChatGPT"
        case .claude: "Claude"
        case .alloy: "Combined answer"
        }
    }

    private func metadata(for answer: AIAnswer) -> String {
        let values: [String?] = [
            answer.provenance,
            String(format: "%.1f sec", answer.responseTime)
        ]
        return values
            .compactMap { value -> String? in
                guard let value, !value.isEmpty else { return nil }
                return value
            }
            .joined(separator: " · ")
    }

    private var loadingBody: some View {
        VStack(alignment: .leading, spacing: 10) {
            ShimmerLine(width: 0.92)
            ShimmerLine(width: 0.78)
            ShimmerLine(width: 0.60)
        }
        .padding(.vertical, 3)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Response is being generated")
    }

    private var waitingBody: some View {
        HStack(spacing: 9) {
            Image(systemName: "clock")
            Text(emptyStateMessage)
        }
        .font(.subheadline)
        .foregroundStyle(RivunePalette.tertiaryText)
        .padding(.vertical, 4)
    }

    private func copyAnswer() {
        guard let text = answer?.content else { return }
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #else
        UIPasteboard.general.string = text
        #endif

        copied = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1.4))
            copied = false
        }
    }
}

private struct CouncilStatusLine: View {
    let stage: CouncilStage
    @AppStorage("rivune.subtleMotion") private var subtleMotionEnabled = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        HStack(spacing: 10) {
            if [.asking, .comparing, .synthesizing].contains(stage), subtleMotionEnabled, !reduceMotion {
                ProgressView()
                    .controlSize(.small)
                    .tint(RivunePalette.rivune)
            } else {
                Image(systemName: stage.symbol)
                    .foregroundStyle(stageColor)
            }

            Text(stage.title)
                .font(.caption.weight(.medium))
                .foregroundStyle(RivunePalette.secondaryText)

            Spacer()
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }

    private var stageColor: Color {
        switch stage {
        case .complete: RivunePalette.success
        case .failed: RivunePalette.claude
        case .cancelled: RivunePalette.tertiaryText
        default: RivunePalette.rivune
        }
    }
}

struct TogetherPlanCard: View {
    let trace: TogetherTrace
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 10) {
                Image(systemName: trace.phase.symbol)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(phaseColor)
                    .frame(width: 28, height: 28)
                    .background(phaseColor.opacity(0.11), in: Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text("Shared work plan")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(RivunePalette.primaryText.opacity(0.90))
                    Text(statusText)
                        .font(.caption2)
                        .foregroundStyle(RivunePalette.tertiaryText)
                }

                Spacer()

                if trace.phase == .planning || trace.phase == .contributing
                    || trace.phase == .reviewing || trace.phase == .integrating {
                    ProgressView()
                        .controlSize(.small)
                        .tint(RivunePalette.rivune)
                }
            }

            if let plan = trace.sharedPlan, !plan.isEmpty {
                DisclosureGroup(isExpanded: $isExpanded) {
                    MarkdownResponseText(content: plan)
                        .padding(.top, 10)
                } label: {
                    Label(
                        isExpanded ? "Hide task split" : "View task split and handoffs",
                        systemImage: "point.3.connected.trianglepath.dotted"
                    )
                    .font(.caption.weight(.medium))
                    .foregroundStyle(RivunePalette.secondaryText)
                }
                .tint(RivunePalette.secondaryText)
            } else {
                Text(emptyPlanMessage)
                    .font(.caption)
                    .foregroundStyle(RivunePalette.tertiaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RivunePalette.surface.opacity(0.74), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(RivunePalette.hairline, lineWidth: 0.7)
        }
        .accessibilityElement(children: .contain)
    }

    private var statusText: String {
        if trace.phase == .failed, let failedPhase = trace.failedPhase {
            return "Stopped during \(failedPhase.title.lowercased())"
        }
        if trace.phase == .cancelled, let stoppedPhase = trace.stoppedPhase {
            return "Stopped during \(stoppedPhase.title.lowercased())"
        }
        return trace.phase.title
    }

    private var emptyPlanMessage: String {
        switch trace.phase {
        case .failed:
            "A complete shared plan was not produced. Run the collaboration again to restart planning."
        case .cancelled:
            "Planning stopped before a complete shared plan was produced."
        default:
            "ChatGPT is drafting the task split; Claude will challenge it before either model begins its assigned work."
        }
    }

    private var phaseColor: Color {
        switch trace.phase {
        case .complete: RivunePalette.success
        case .failed: RivunePalette.claude
        case .cancelled: RivunePalette.tertiaryText
        default: RivunePalette.rivune
        }
    }
}

// MARK: - Rivune collaboration presentation

/// A concise, user-facing account of Rivune's work. The final answer remains
/// in the transcript while the supporting plan, contributions, and reviews
/// live in a dedicated inspector.
struct CollaborationProgressCard: View {
    let turn: ChatTurn
    let stage: CouncilStage
    let isGenerating: Bool
    let onShowWork: () -> Void

    @State private var isExpanded = false

    private var trace: TogetherTrace? { turn.togetherTrace }
    private var receipt: CollaborationReceipt {
        CollaborationReceipt(turn: turn, stage: stage, isGenerating: isGenerating)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: 14) {
                Text(receipt.statusDetail)
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)

                CollaborationFlowStrip(
                    turn: turn,
                    stage: stage,
                    isGenerating: isGenerating
                )

                CollaborationReceiptMetrics(receipt: receipt)


            }
            .padding(.top, 14)
        } label: {
            HStack(alignment: .center, spacing: 10) {
                Image(systemName: receipt.outcome.symbol)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(receipt.outcome.color)
                    .frame(width: 28, height: 28)
                    .background(receipt.outcome.color.opacity(0.09), in: RoundedRectangle(cornerRadius: 8, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(isDirectResponse ? "Response details" : "Collaboration")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(RivunePalette.primaryText)
                    Text(receipt.statusTitle)
                        .font(.caption)
                        .foregroundStyle(RivunePalette.secondaryText)
                        .lineLimit(2)
                }

                Spacer(minLength: 8)

                if isGenerating {
                    ProgressView()
                        .controlSize(.small)
                        .tint(RivunePalette.rivune)
                        .accessibilityLabel("Collaboration in progress")
                }
            }
        }
        Button(action: onShowWork) {
            Label(isDirectResponse ? "View source responses" : "View contributions & reviews", systemImage: "sidebar.right")
                .font(.caption.weight(.medium))
                .frame(minHeight: 32)
        }
        .buttonStyle(.plain)
        .foregroundStyle(RivunePalette.rivune)
        .accessibilityLabel(isDirectResponse ? "View source responses" : "View contributions and reviews")
        .accessibilityHint(isDirectResponse
            ? "Shows both direct responses and Rivune's resolved reply"
            : "Shows the shared plan, contributions, and cross-reviews")
        }
        .tint(RivunePalette.secondaryText)
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RivunePalette.surface.opacity(0.97), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(RivunePalette.hairline, lineWidth: 0.6)
        }
        .accessibilityElement(children: .contain)
    }

    private var isDirectResponse: Bool {
        trace?.collaborationShape == .directResponse
    }
}

struct CollaborationFlowStrip: View {
    let turn: ChatTurn
    let stage: CouncilStage
    let isGenerating: Bool

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ScaledMetric(relativeTo: .caption) private var stepIconSize: CGFloat = 24
    @ScaledMetric(relativeTo: .caption) private var verticalConnectorHeight: CGFloat = 10

    private let steps: [CollaborationFlowStep] = [
        .init(title: "Plan", symbol: "list.bullet.clipboard"),
        .init(title: "Split", symbol: "arrow.triangle.branch"),
        .init(title: "Work", symbol: "person.2"),
        .init(title: "Review", symbol: "arrow.left.arrow.right"),
        .init(title: "Resolve", symbol: "checkmark")
    ]

    var body: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                verticalFlow
            } else {
                ViewThatFits(in: .horizontal) {
                    horizontalFlow
                        .frame(minWidth: 330)
                    verticalFlow
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Collaboration progress")
    }

    private var horizontalFlow: some View {
        HStack(alignment: .top, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                if index > 0 {
                    Capsule()
                        .fill(connectorColor(before: index))
                        .frame(minWidth: 6, maxWidth: 34, minHeight: 1, maxHeight: 1)
                        .padding(.top, stepIconSize / 2)
                }

                flowStep(step, state: state(for: index))
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var verticalFlow: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                let stepState = state(for: index)
                HStack(alignment: .center, spacing: 10) {
                    flowIcon(step, state: stepState)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(step.title)
                            .font(.caption.weight(stepState == .current ? .semibold : .medium))
                            .foregroundStyle(
                                stepState == .waiting
                                    ? RivunePalette.secondaryText
                                    : RivunePalette.primaryText.opacity(0.90)
                            )
                        Text(stepState.accessibilityValue.capitalized)
                            .font(.caption2)
                            .foregroundStyle(RivunePalette.secondaryText)
                    }

                    Spacer(minLength: 8)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(step.title), \(stepState.accessibilityValue)")

                if index < steps.count - 1 {
                    Capsule()
                        .fill(connectorColor(before: index + 1))
                        .frame(width: 1, height: verticalConnectorHeight)
                        .padding(.leading, max(0, (stepIconSize - 1) / 2))
                }
            }
        }
    }

    private func flowStep(_ step: CollaborationFlowStep, state: CollaborationFlowStepState) -> some View {
        VStack(spacing: 6) {
            flowIcon(step, state: state)

            Text(step.title)
                .font(.caption2.weight(state == .current ? .semibold : .medium))
                .foregroundStyle(state == .waiting ? RivunePalette.secondaryText : RivunePalette.primaryText.opacity(0.82))
                .lineLimit(2)
                .multilineTextAlignment(.center)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(step.title), \(state.accessibilityValue)")
    }

    private func flowIcon(
        _ step: CollaborationFlowStep,
        state: CollaborationFlowStepState
    ) -> some View {
        ZStack {
            Circle()
                .fill(state.background)
            Circle()
                .stroke(state.border, lineWidth: 0.7)
            Image(systemName: symbol(for: step, state: state))
                .font(.caption2.weight(.bold))
                .foregroundStyle(state.foreground)
        }
        .frame(width: stepIconSize, height: stepIconSize)
    }

    private func connectorColor(before index: Int) -> Color {
        state(for: index - 1) == .complete && state(for: index) != .waiting
            ? RivunePalette.rivune.opacity(0.42)
            : RivunePalette.hairline
    }

    private func symbol(
        for step: CollaborationFlowStep,
        state: CollaborationFlowStepState
    ) -> String {
        switch state {
        case .complete: "checkmark"
        case .skipped: "minus"
        default: step.symbol
        }
    }

    private func state(for index: Int) -> CollaborationFlowStepState {
        if isDirectResponse, [0, 1, 3].contains(index) {
            return .skipped
        }

        let hasPlan = !(turn.togetherTrace?.sharedPlan?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let contributionCount = [turn.chatGPTAnswer, turn.claudeAnswer].compactMap { $0 }.count
        let reviewCount = collaborationReviews(in: turn.togetherTrace).count
        let hasFinal = turn.combinedAnswer != nil

        let isComplete: Bool = switch index {
        case 0, 1: hasPlan
        case 2: contributionCount == 2
        case 3: reviewCount == 2
        case 4: hasFinal
        default: false
        }
        if isComplete { return .complete }

        let phase = turn.togetherTrace?.phase
        let terminal = phase == .complete || phase == .failed || phase == .cancelled
            || stage == .complete || stage == .failed || stage == .cancelled
        if terminal { return .unavailable }
        guard isGenerating else { return .waiting }

        let activeIndex: Int = switch phase {
        case .planning: hasPlan ? 1 : 0
        case .contributing: 2
        case .reviewing: 3
        case .integrating: 4
        case .complete, .failed, .cancelled: index
        case nil:
            switch stage {
            case .asking: 0
            case .comparing: 3
            case .synthesizing: 4
            default: 0
            }
        }
        return index == activeIndex ? .current : .waiting
    }

    private var isDirectResponse: Bool {
        turn.togetherTrace?.collaborationShape == .directResponse
    }
}

private struct CollaborationFlowStep {
    let title: String
    let symbol: String
}

private enum CollaborationFlowStepState: Equatable {
    case waiting
    case current
    case complete
    case skipped
    case unavailable

    var foreground: Color {
        switch self {
        case .waiting: RivunePalette.tertiaryText
        case .current: RivunePalette.rivune
        case .complete: RivunePalette.primaryText
        case .skipped: RivunePalette.tertiaryText
        case .unavailable: RivunePalette.claude.opacity(0.82)
        }
    }

    var background: Color {
        switch self {
        case .waiting: RivunePalette.control
        case .current: RivunePalette.rivune.opacity(0.13)
        case .complete: RivunePalette.success.opacity(0.20)
        case .skipped: .clear
        case .unavailable: RivunePalette.claude.opacity(0.10)
        }
    }

    var border: Color {
        switch self {
        case .waiting: RivunePalette.hairline
        case .current: RivunePalette.rivune.opacity(0.45)
        case .complete: RivunePalette.success.opacity(0.50)
        case .skipped: RivunePalette.hairline
        case .unavailable: RivunePalette.claude.opacity(0.30)
        }
    }

    var accessibilityValue: String {
        switch self {
        case .waiting: "waiting"
        case .current: "in progress"
        case .complete: "complete"
        case .skipped: "not needed"
        case .unavailable: "not available"
        }
    }
}

struct CollaborationInspectorView: View {
    let turn: ChatTurn
    let stage: CouncilStage
    let isGenerating: Bool

    @Environment(\.dismiss) private var dismiss
    @State private var selectedSection: CollaborationInspectorSection = .overview
    @State private var showFullPlan = false

    private var receipt: CollaborationReceipt {
        CollaborationReceipt(turn: turn, stage: stage, isGenerating: isGenerating)
    }

    var body: some View {
        ZStack {
            RivuneBackground()

            VStack(spacing: 0) {
                inspectorHeader

                Divider().overlay(RivunePalette.hairline)

                VStack(spacing: 14) {
                    Picker("Collaboration detail", selection: $selectedSection) {
                        ForEach(CollaborationInspectorSection.allCases) { section in
                            Text(section.title).tag(section)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(maxWidth: 430)
                    .accessibilityHint("Choose the overview or inspect one model's work and its partner review")

                    ScrollView {
                        inspectorContent
                            .padding(.bottom, 24)
                    }
                    .scrollIndicators(.automatic)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }
        }
    }

    private var inspectorHeader: some View {
        HStack(spacing: 12) {
            RivuneOrb(size: 38, isActive: isGenerating)

            Text("Collaboration details")
                .font(.headline)
                .foregroundStyle(RivunePalette.primaryText)

            Spacer()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .frame(width: 32, height: 32)
                    .background(RivunePalette.control, in: Circle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(RivunePalette.secondaryText)
            .accessibilityLabel("Close collaboration details")
            .keyboardShortcut(.escape, modifiers: [])
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(RivunePalette.canvas.opacity(0.88))
    }

    @ViewBuilder
    private var inspectorContent: some View {
        switch selectedSection {
        case .overview:
            overviewContent
        case .chatGPT:
            modelContent(
                source: .chatGPT,
                answer: turn.chatGPTAnswer,
                answerError: turn.chatGPTError,
                reviewTitle: "Reviewed by Claude",
                review: turn.togetherTrace?.claudeReview
            )
        case .claude:
            modelContent(
                source: .claude,
                answer: turn.claudeAnswer,
                answerError: turn.claudeError,
                reviewTitle: "Reviewed by ChatGPT",
                review: turn.togetherTrace?.chatGPTReview
            )
        }
    }

    private var overviewContent: some View {
        VStack(alignment: .leading, spacing: 14) {
            CollaborationFlowStrip(
                turn: turn,
                stage: stage,
                isGenerating: isGenerating
            )
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .background(RivunePalette.surface.opacity(0.60), in: RoundedRectangle(cornerRadius: 15, style: .continuous))

            DecisionRecordSummaryCard(receipt: receipt)

            WhyThisAnswerWonCard(receipt: receipt)

            CollaborationContentCard(
                title: isDirectResponse ? "Direct response" : "Shared plan and task split",
                subtitle: isDirectResponse
                    ? "This request did not need planning or a task split."
                    : "The models agreed on complementary responsibilities before starting.",
                symbol: "point.3.connected.trianglepath.dotted",
                accent: RivunePalette.rivune,
                content: turn.togetherTrace?.sharedPlan,
                emptyMessage: planEmptyMessage,
                maximumBlocks: showFullPlan ? nil : 4
            )

            if let plan = turn.togetherTrace?.sharedPlan, plan.count > 520 {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showFullPlan.toggle()
                    }
                } label: {
                    Label(showFullPlan ? "Show concise plan" : "Show complete plan", systemImage: showFullPlan ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                        .frame(minHeight: 32)
                }
                .buttonStyle(.plain)
                .foregroundStyle(RivunePalette.secondaryText)
                .padding(.leading, 4)
            }

            VStack(spacing: 0) {
                inspectorStatusRow(
                    title: isDirectResponse ? "ChatGPT response" : "ChatGPT contribution",
                    detail: answerStatus(turn.chatGPTAnswer, error: turn.chatGPTError),
                    symbol: "terminal",
                    color: RivunePalette.openAI,
                    isComplete: turn.chatGPTAnswer != nil
                )
                Divider().overlay(RivunePalette.hairline).padding(.leading, 44)
                inspectorStatusRow(
                    title: isDirectResponse ? "Claude response" : "Claude contribution",
                    detail: answerStatus(turn.claudeAnswer, error: turn.claudeError),
                    symbol: "text.bubble",
                    color: RivunePalette.claude,
                    isComplete: turn.claudeAnswer != nil
                )
                Divider().overlay(RivunePalette.hairline).padding(.leading, 44)
                inspectorStatusRow(
                    title: isDirectResponse ? "Cross-review" : "Two-way cross-review",
                    detail: reviewStatus,
                    symbol: "arrow.left.arrow.right",
                    color: RivunePalette.rivune,
                    isComplete: reviewCount == 2,
                    isSkipped: isDirectResponse
                )
                Divider().overlay(RivunePalette.hairline).padding(.leading, 44)
                inspectorStatusRow(
                    title: "Final answer",
                    detail: finalAnswerStatus,
                    symbol: "checkmark.seal",
                    color: RivunePalette.rivune,
                    isComplete: turn.combinedAnswer != nil
                )
            }
            .background(RivunePalette.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(RivunePalette.hairline, lineWidth: 0.7)
            }

            Text(
                isDirectResponse
                    ? "Choose ChatGPT or Claude above to read the direct response Rivune used."
                    : "Choose ChatGPT or Claude above to read that contribution and the other model's review of it."
            )
                .font(.caption)
                .foregroundStyle(RivunePalette.tertiaryText)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 4)
        }
    }

    private func modelContent(
        source: AnswerSource,
        answer: AIAnswer?,
        answerError: String?,
        reviewTitle: String,
        review: String?
    ) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            CollaborationContentCard(
                title: "\(source == .chatGPT ? "ChatGPT" : "Claude") \(isDirectResponse ? "response" : "contribution")",
                subtitle: answer.map(answerMetadata)
                    ?? (isDirectResponse ? "Independent direct response" : "Assigned work from the shared plan"),
                symbol: source.symbol,
                accent: source.accent,
                content: answer?.content,
                emptyMessage: answerError ?? contributionEmptyMessage
            )

            if !isDirectResponse {
                CollaborationContentCard(
                    title: reviewTitle,
                    subtitle: "Independent check for conflicts, gaps, and improvements",
                    symbol: "checkmark.bubble",
                    accent: source == .chatGPT ? RivunePalette.claude : RivunePalette.openAI,
                    content: review,
                    emptyMessage: reviewEmptyMessage
                )
            }
        }
    }

    private func inspectorStatusRow(
        title: String,
        detail: String,
        symbol: String,
        color: Color,
        isComplete: Bool,
        isSkipped: Bool = false
    ) -> some View {
        HStack(spacing: 11) {
            Image(systemName: symbol)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(color)
                .frame(width: 30, height: 30)
                .background(color.opacity(0.10), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(RivunePalette.primaryText.opacity(0.90))
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(RivunePalette.tertiaryText)
                    .lineLimit(1)
            }

            Spacer()

            Image(
                systemName: isSkipped
                    ? "minus.circle.fill"
                    : (isComplete ? "checkmark.circle.fill" : (isGenerating ? "circle.dotted" : "minus.circle"))
            )
            .foregroundStyle(isComplete && !isSkipped ? RivunePalette.success : RivunePalette.tertiaryText)
        }
        .padding(.horizontal, 13)
        .frame(minHeight: 54)
        .accessibilityElement(children: .combine)
    }

    private var reviewCount: Int {
        collaborationReviews(in: turn.togetherTrace).count
    }

    private var reviewStatus: String {
        if isDirectResponse {
            return "Not needed for a direct response"
        }
        return switch reviewCount {
        case 2: "ChatGPT and Claude each checked the other's work"
        case 1: "One partner review completed"
        default: isGenerating ? "Partner reviews have not started" : "No partner reviews were saved"
        }
    }

    private var finalAnswerStatus: String {
        if let answer = turn.combinedAnswer { return answerMetadata(answer) }
        if turn.combinedError != nil { return "No resolved answer was saved" }
        return isGenerating ? "Waiting for the required work" : "No final answer was saved"
    }

    private func answerStatus(_ answer: AIAnswer?, error: String?) -> String {
        if let answer { return answerMetadata(answer) }
        if error != nil { return "Needs attention" }
        return isGenerating ? "Working on assigned responsibility" : "No contribution was saved"
    }

    private func answerMetadata(_ answer: AIAnswer) -> String {
        let time = String(format: "%.1f sec", answer.responseTime)
        let values: [String?] = [answer.provenance, time]
        return values
            .compactMap { value -> String? in
                guard let value, !value.isEmpty else { return nil }
                return value
            }
            .joined(separator: " · ")
    }

    private var planEmptyMessage: String {
        if isDirectResponse {
            return "Planning and task splitting were not needed for this request."
        }
        return isGenerating
            ? "Rivune is creating and challenging the shared plan."
            : "No shared plan was saved for this collaboration."
    }

    private var contributionEmptyMessage: String {
        isGenerating ? "This model is working on its assigned responsibility." : "This contribution was not saved."
    }

    private var reviewEmptyMessage: String {
        isGenerating ? "The partner review will appear after both contributions finish." : "This cross-review was not saved."
    }

    private var isDirectResponse: Bool {
        turn.togetherTrace?.collaborationShape == .directResponse
    }
}

// MARK: - Collaboration decision record

/// A deterministic receipt derived only from values already persisted on the
/// turn. It describes workflow completion, never hidden reasoning or a claim
/// that the answer is factually correct.
struct CollaborationReceipt {
    enum Outcome: Equatable {
        case inProgress
        case resolved
        case resolvedWithLimitedInput
        case needsAttention
        case stopped

        var symbol: String {
            switch self {
            case .inProgress: "circle.dotted"
            case .resolved: "checkmark.seal.fill"
            case .resolvedWithLimitedInput: "checkmark.circle.badge.exclamationmark"
            case .needsAttention: "exclamationmark.triangle.fill"
            case .stopped: "stop.circle.fill"
            }
        }

        var color: Color {
            switch self {
            case .inProgress: RivunePalette.rivune
            case .resolved: RivunePalette.success
            case .resolvedWithLimitedInput: RivunePalette.claude
            case .needsAttention: RivunePalette.claude
            case .stopped: RivunePalette.tertiaryText
            }
        }
    }

    struct Metric: Identifiable {
        let value: String
        let label: String
        let accessibilityValue: String

        var id: String { label }
    }

    let outcome: Outcome
    let statusTitle: String
    let statusDetail: String
    let approachTitle: String
    let contributionCount: Int
    let reviewCount: Int
    let completedStageCount: Int
    let requiredStageCount: Int
    let elapsedText: String?
    let issueDetail: String?
    let whyDetail: String
    let isDirectResponse: Bool

    var isTerminal: Bool { outcome != .inProgress }

    var metrics: [Metric] {
        var values = [
            Metric(
                value: "\(completedStageCount)/\(requiredStageCount)",
                label: "Stages",
                accessibilityValue: "\(completedStageCount) of \(requiredStageCount) required stages complete"
            ),
            Metric(
                value: "\(contributionCount)/2",
                label: isDirectResponse ? "Responses" : "Contributions",
                accessibilityValue: "\(contributionCount) of 2 \(isDirectResponse ? "responses" : "contributions") saved"
            ),
            Metric(
                value: isDirectResponse ? "—" : "\(reviewCount)/2",
                label: "Reviews",
                accessibilityValue: isDirectResponse
                    ? "Reciprocal review was not required"
                    : "\(reviewCount) of 2 reciprocal reviews saved"
            )
        ]

        if let elapsedText {
            values.append(
                Metric(
                    value: elapsedText,
                    label: "Run time",
                    accessibilityValue: "Saved run time \(elapsedText)"
                )
            )
        }
        return values
    }

    init(turn: ChatTurn, stage: CouncilStage, isGenerating: Bool) {
        let trace = turn.togetherTrace
        let finalAnswerExists = turn.combinedAnswer != nil
        let contributions = [turn.chatGPTAnswer, turn.claudeAnswer].compactMap { $0 }.count
        let reviews = collaborationReviews(in: trace).count
        let direct = trace?.collaborationShape == .directResponse
        let providerFailureCount = [turn.chatGPTError, turn.claudeError]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .count
        let missingContributionCount = max(0, 2 - contributions)
        let missingReviewCount = direct ? 0 : max(0, 2 - reviews)
        let limitedInputDetail = Self.limitedInputDetail(
            providerFailureCount: providerFailureCount,
            missingContributionCount: missingContributionCount,
            missingReviewCount: missingReviewCount
        )

        isDirectResponse = direct
        contributionCount = contributions
        reviewCount = reviews
        approachTitle = trace?.collaborationShape?.title ?? "Rivune collaboration"
        requiredStageCount = direct ? 2 : 5

        if direct {
            completedStageCount = (contributions == 2 ? 1 : 0) + (finalAnswerExists ? 1 : 0)
        } else {
            let hasPlan = !(trace?.sharedPlan?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
            completedStageCount = (hasPlan ? 2 : 0)
                + (contributions == 2 ? 1 : 0)
                + (reviews == 2 ? 1 : 0)
                + (finalAnswerExists ? 1 : 0)
        }

        if let seconds = turn.combinedAnswer?.responseTime, seconds > 0, seconds.isFinite {
            elapsedText = Self.formattedDuration(seconds)
        } else {
            elapsedText = nil
        }

        let phase = trace?.phase
        if finalAnswerExists {
            let incompleteRequiredWork = missingContributionCount > 0 || missingReviewCount > 0
            outcome = providerFailureCount == 0 && !incompleteRequiredWork
                ? .resolved
                : .resolvedWithLimitedInput
        } else if phase == .cancelled || stage == .cancelled {
            outcome = .stopped
        } else if phase == .failed || stage == .failed || turn.combinedError != nil {
            outcome = .needsAttention
        } else if isGenerating {
            outcome = .inProgress
        } else if phase == .complete || stage == .complete {
            outcome = .needsAttention
        } else {
            outcome = .inProgress
        }

        switch outcome {
        case .resolved:
            statusTitle = "Resolution saved"
            statusDetail = direct
                ? "Rivune saved one final reply from \(contributions) independent response\(contributions == 1 ? "" : "s")."
                : "Rivune saved one final answer after \(contributions) contributions and \(reviews) reciprocal reviews."
        case .resolvedWithLimitedInput:
            statusTitle = "Resolution saved with limited input"
            statusDetail = "A final answer was saved, but \(limitedInputDetail)."
        case .needsAttention:
            statusTitle = "No resolved answer"
            if let failedPhase = trace?.failedPhase {
                statusDetail = "The collaboration ended during \(failedPhase.title.lowercased())."
            } else {
                statusDetail = "The required workflow did not produce a saved final answer."
            }
        case .stopped:
            statusTitle = "Collaboration stopped"
            if let stoppedPhase = trace?.stoppedPhase {
                statusDetail = "The run stopped during \(stoppedPhase.title.lowercased()); completed work remains saved."
            } else {
                statusDetail = "The run stopped before a final answer was saved."
            }
        case .inProgress:
            statusTitle = trace?.phase.title ?? stage.title
            statusDetail = direct
                ? "Rivune is preparing independent responses before resolving one reply."
                : "Rivune is completing the shared plan, assigned work, reciprocal review, and final resolution."
        }

        if let error = turn.combinedError?.trimmingCharacters(in: .whitespacesAndNewlines), !error.isEmpty {
            issueDetail = error
        } else if outcome == .resolvedWithLimitedInput {
            issueDetail = "Limited workflow input: \(limitedInputDetail). Review the available work before relying on this answer."
        } else if outcome == .needsAttention {
            issueDetail = "A final answer was not saved. Open ChatGPT and Claude above to inspect the work that completed."
        } else {
            issueDetail = nil
        }

        switch outcome {
        case .resolved, .resolvedWithLimitedInput:
            if direct {
                whyDetail = "This is the saved resolved reply from \(contributions) independent response\(contributions == 1 ? "" : "s"). This direct request did not use planning or reciprocal review."
            } else if contributions == 2 && reviews == 2 {
                whyDetail = "This is the saved integrated answer. It was produced after both assigned contributions completed and each model reviewed the other model's work."
            } else {
                whyDetail = "This is the saved integrated answer from \(contributions) contribution\(contributions == 1 ? "" : "s") and \(reviews) reciprocal review\(reviews == 1 ? "" : "s")."
            }
        case .needsAttention:
            whyDetail = "No answer won. Rivune did not save a final result because the required collaboration did not complete."
        case .stopped:
            whyDetail = "No answer won. The run was stopped before Rivune saved a final result."
        case .inProgress:
            whyDetail = "No answer has been selected yet. Rivune saves the final result only after the required work for this path completes."
        }
    }

    private static func formattedDuration(_ seconds: Double) -> String {
        let roundedSeconds = Int(seconds.rounded())
        if roundedSeconds >= 60 {
            return "\(roundedSeconds / 60)m \(roundedSeconds % 60)s"
        }
        if seconds >= 10 {
            return "\(roundedSeconds)s"
        }
        return String(format: "%.1fs", seconds)
    }

    private static func limitedInputDetail(
        providerFailureCount: Int,
        missingContributionCount: Int,
        missingReviewCount: Int
    ) -> String {
        var details: [String] = []
        if providerFailureCount > 0 {
            details.append(
                "\(providerFailureCount) provider request\(providerFailureCount == 1 ? "" : "s") failed"
            )
        }
        if missingContributionCount > 0 {
            details.append(
                "\(missingContributionCount) of 2 contributions \(missingContributionCount == 1 ? "was" : "were") not saved"
            )
        }
        if missingReviewCount > 0 {
            details.append(
                "\(missingReviewCount) of 2 reciprocal reviews \(missingReviewCount == 1 ? "was" : "were") not saved"
            )
        }

        guard let last = details.last else {
            return "some required workflow input was not saved"
        }
        if details.count == 1 { return last }
        if details.count == 2 { return details.joined(separator: " and ") }
        return details.dropLast().joined(separator: "; ") + "; and " + last
    }
}

private struct CollaborationReceiptMetrics: View {
    let receipt: CollaborationReceipt

    var body: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 92), spacing: 6)],
            alignment: .leading,
            spacing: 6
        ) {
            ForEach(receipt.metrics) { metric in
                VStack(alignment: .leading, spacing: 3) {
                    Text(metric.value)
                        .font(.subheadline.weight(.semibold))
                        .fontDesign(.rounded)
                        .foregroundStyle(RivunePalette.primaryText.opacity(0.92))
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                    Text(metric.label)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, minHeight: 45, alignment: .leading)
                .padding(.horizontal, 9)
                .background(RivunePalette.control.opacity(0.72), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(metric.label)
                .accessibilityValue(metric.accessibilityValue)
            }
        }
    }
}

private struct DecisionRecordSummaryCard: View {
    let receipt: CollaborationReceipt

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            decisionHeader

            CollaborationReceiptMetrics(receipt: receipt)

            if let issueDetail = receipt.issueDetail {
                Divider().overlay(RivunePalette.hairline)
                Label {
                    Text(issueDetail)
                        .fixedSize(horizontal: false, vertical: true)
                } icon: {
                    Image(systemName: "exclamationmark.circle")
                        .foregroundStyle(receipt.outcome.color)
                }
                .font(.caption)
                .foregroundStyle(RivunePalette.secondaryText)
            }
        }
        .padding(17)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RivunePalette.surfaceRaised.opacity(0.90), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(receipt.outcome.color.opacity(0.20), lineWidth: 0.8)
        }
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    private var decisionHeader: some View {
        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 10) {
                statusBlock
                approachBadge
            }
        } else {
            HStack(alignment: .top, spacing: 11) {
                statusBlock
                    .layoutPriority(1)
                Spacer(minLength: 8)
                approachBadge
            }
        }
    }

    private var statusBlock: some View {
        HStack(alignment: .top, spacing: 11) {
            Image(systemName: receipt.outcome.symbol)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(receipt.outcome.color)
                .frame(width: 32, height: 32)
                .background(receipt.outcome.color.opacity(0.10), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(receipt.statusTitle)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RivunePalette.primaryText)
                Text(receipt.statusDetail)
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var approachBadge: some View {
        Text(receipt.approachTitle)
            .font(.caption.weight(.medium))
            .foregroundStyle(RivunePalette.secondaryText)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(RivunePalette.control, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityLabel("Collaboration approach")
            .accessibilityValue(receipt.approachTitle)
    }
}

private struct WhyThisAnswerWonCard: View {
    let receipt: CollaborationReceipt

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(spacing: 9) {
                Image(systemName: symbol)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(accent)
                    .frame(width: 28, height: 28)
                    .background(accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(RivunePalette.primaryText)
            }

            Text(receipt.whyDetail)
                .font(.subheadline)
                .foregroundStyle(RivunePalette.secondaryText)
                .lineSpacing(3)
                .fixedSize(horizontal: false, vertical: true)

            Divider().overlay(RivunePalette.hairline)

            Label("This receipt proves which workflow steps were saved; it is not a guarantee that every claim is correct.", systemImage: "checkmark.shield")
                .font(.caption2)
                .foregroundStyle(RivunePalette.tertiaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(17)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RivunePalette.surface.opacity(0.78), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(RivunePalette.hairline, lineWidth: 0.7)
        }
    }

    private var title: String {
        switch receipt.outcome {
        case .resolved, .resolvedWithLimitedInput: "Why this answer was delivered"
        case .needsAttention, .stopped: "Why no final answer was delivered"
        case .inProgress: "How Rivune decides what to deliver"
        }
    }

    private var symbol: String {
        switch receipt.outcome {
        case .resolved, .resolvedWithLimitedInput: "checkmark.bubble"
        case .needsAttention: "exclamationmark.bubble"
        case .stopped: "stop.circle"
        case .inProgress: "arrow.triangle.branch"
        }
    }

    private var accent: Color { receipt.outcome.color }
}

private enum CollaborationInspectorSection: String, CaseIterable, Identifiable {
    case overview
    case chatGPT
    case claude

    var id: String { rawValue }

    var title: String {
        switch self {
        case .overview: "Overview"
        case .chatGPT: "ChatGPT"
        case .claude: "Claude"
        }
    }
}

private struct CollaborationContentCard: View {
    let title: String
    let subtitle: String
    let symbol: String
    let accent: Color
    let content: String?
    let emptyMessage: String
    var maximumBlocks: Int? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .center, spacing: 10) {
                Image(systemName: symbol)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(accent)
                    .frame(width: 30, height: 30)
                    .background(accent.opacity(0.10), in: RoundedRectangle(cornerRadius: 9, style: .continuous))

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(RivunePalette.primaryText)
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .lineLimit(2)
                }
            }

            Divider().overlay(RivunePalette.hairline)

            if let content, !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                MarkdownResponseText(content: content, maximumBlocks: maximumBlocks)
            } else {
                HStack(alignment: .top, spacing: 9) {
                    Image(systemName: "clock")
                        .padding(.top, 1)
                    Text(emptyMessage)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .font(.subheadline)
                .foregroundStyle(RivunePalette.tertiaryText)
                .padding(.vertical, 2)
            }
        }
        .padding(17)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RivunePalette.surface.opacity(0.84), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(RivunePalette.hairline, lineWidth: 0.7)
        }
    }
}

private func collaborationReviews(in trace: TogetherTrace?) -> [String] {
    guard let trace else { return [] }
    let reviews: [String?] = [trace.chatGPTReview, trace.claudeReview]
    return reviews.compactMap { review -> String? in
        guard let review,
              !review.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return nil
        }
        return review
    }
}

private struct ShimmerLine: View {
    let width: CGFloat
    @State private var isBright = false
    @AppStorage("rivune.subtleMotion") private var subtleMotionEnabled = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var shouldAnimate: Bool {
        subtleMotionEnabled && !reduceMotion
    }

    var body: some View {
        GeometryReader { geometry in
            Capsule()
                .fill(.white.opacity(shouldAnimate && isBright ? 0.12 : 0.07))
                .frame(width: geometry.size.width * width, height: 9)
        }
        .frame(height: 9)
        .animation(
            shouldAnimate ? .easeInOut(duration: 0.9).repeatForever(autoreverses: true) : nil,
            value: isBright
        )
        .onAppear { isBright = shouldAnimate }
        .onChange(of: shouldAnimate) { _, enabled in
            isBright = enabled
        }
    }
}

struct ComposerView: View {
    @ObservedObject var store: RivuneStore
    var isEmbedded = false
    @EnvironmentObject private var bridge: PeerBridge
    @StateObject private var speechDictation = SpeechDictationController()
    @FocusState private var composerFocused: Bool
    @State private var showDocumentPicker = false
    @State private var showConfigurationPanel = false

    var body: some View {
        VStack(spacing: 7) {
            if store.isGenerating {
                generationStatus
            }

            if let project = store.activeProject {
                VStack(alignment: .leading, spacing: 5) {
                    Toggle("Include project context with this request", isOn: $store.includeProjectContext)
                        .font(.caption).disabled(store.isGenerating)
                    Text("\(project.name) · \(project.files.filter(\.included).count) selected files + instructions → \(store.projectRecipients). Approval resets after sending. Earlier shared context may remain in chat history.")
                        .font(.caption2).foregroundStyle(RivunePalette.secondaryText).fixedSize(horizontal: false, vertical: true)
                }.frame(maxWidth: .infinity, alignment: .leading).padding(10)
                    .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 10))
            }
            VStack(spacing: 0) {
                if !store.draftAttachments.isEmpty {
                    attachmentStrip
                        .padding(.top, 11)
                        .padding(.bottom, 2)
                }

                TextField("Send a message", text: $store.composerText, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.body)
                    .foregroundStyle(RivunePalette.primaryText)
                    .lineLimit(1...8)
                    .focused($composerFocused)
                    .onSubmit {
                        if speechDictation.isActive {
                            speechDictation.stop()
                        }
                        store.send()
                    }
                    .accessibilityLabel("Message")
                    .accessibilityHint("Ask \(store.mode.displayName) anything")
                    .padding(.horizontal, 22)
                    .padding(.top, store.draftAttachments.isEmpty ? 21 : 9)
                    .padding(.bottom, 12)
                    .frame(minHeight: isEmbedded ? 78 : 64, alignment: .topLeading)

                composerToolbar
                    .padding(.horizontal, 8)
                    .padding(.bottom, 8)
            }
            .background {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(LinearGradient(colors: [RivunePalette.surfaceRaised.opacity(0.94), RivunePalette.composer, RivunePalette.surface], startPoint: .topLeading, endPoint: .bottomTrailing))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(LinearGradient(colors: [RivunePalette.rivune.opacity(composerFocused ? 0.55 : 0.28), RivunePalette.hairline.opacity(0.6), RivunePalette.rivune.opacity(0.12)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 0.8)
            }
            .shadow(color: .black.opacity(0.27), radius: 22, y: 12)

            if let readyMode = availableDirectMode {
                Button {
                    store.mode = readyMode
                } label: {
                    HStack(spacing: 6) {
                        Circle().fill(RivunePalette.success).frame(width: 4, height: 4)
                        Text("\(readyMode.displayName) is ready")
                        Text("Use \(readyMode.displayName)").foregroundStyle(RivunePalette.rivune)
                        Image(systemName: "arrow.right").font(.system(size: 9))
                    }
                    .font(.system(size: 11))
                    .foregroundStyle(RivunePalette.secondaryText)
                }
                .buttonStyle(.plain)
                .disabled(store.isGenerating)
                .padding(.top, 4)
                .accessibilityHint("Changes the assistant while keeping your draft and attachments")
            } else if !isEmbedded {
            HStack(spacing: 7) {
                Circle()
                    .fill(store.canSendInCurrentMode ? RivunePalette.success : RivunePalette.tertiaryText)
                    .frame(width: 6, height: 6)
                Text(footerConnectionText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.88)
                Spacer()
                ViewThatFits(in: .horizontal) {
                    Text(store.draftAttachments.isEmpty ? "Tools off · no attachments" : "Tools off · attached text")
                    Text("Tools off")
                }
            }
            .font(.caption2)
            .foregroundStyle(RivunePalette.secondaryText)
            .padding(.horizontal, 8)
            .accessibilityElement(children: .combine)
            } else if !store.canSendInCurrentMode {
                Button { store.showConnections = true } label: {
                    Text(footerConnectionText + " · Connections")
                        .font(.system(size: 11))
                        .foregroundStyle(RivunePalette.secondaryText)
                }
                .buttonStyle(.plain)
                .padding(.top, 3)
            }
        }
        .frame(maxWidth: 860)
        .padding(.horizontal, isEmbedded ? 0 : 16)
        .padding(.top, isEmbedded ? 0 : 9)
        .padding(.bottom, isEmbedded ? 0 : 10)
        .frame(maxWidth: .infinity)
        .background {
            if !isEmbedded {
                LinearGradient(colors: [.clear, RivunePalette.canvas.opacity(0.86), RivunePalette.canvas], startPoint: .top, endPoint: .bottom)
                    .ignoresSafeArea()
            }
        }
        .fileImporter(
            isPresented: $showDocumentPicker,
            allowedContentTypes: [.plainText, .sourceCode, .json, .commaSeparatedText],
            allowsMultipleSelection: true,
            onCompletion: importDocuments
        )
        .onChange(of: speechDictation.errorMessage) { _, message in
            if let message {
                store.showPrototypeNotice(message)
            }
        }
        .onChange(of: composerFocused) { _, isFocused in
            if isFocused { closeConfigurationPanel() }
        }
        .onChange(of: store.isGenerating) { _, isGenerating in
            if isGenerating { closeConfigurationPanel() }
        }
        .onDisappear {
            speechDictation.stop()
        }
        #if os(macOS)
        .onExitCommand(perform: closeConfigurationPanel)
        #endif
    }

    @ViewBuilder
    private var composerToolbar: some View {
        if isEmbedded {
            HStack(spacing: 0) {
                attachmentControl
                ConfigurationMenu(store: store, iconOnly: true, opensBelow: true, isExpanded: $showConfigurationPanel)
                ComposerPermissionMenu(store: store, showsTitle: true, onChooseDocuments: { showDocumentPicker = true })
                Spacer(minLength: 8)
                voiceControl
                sendControl
            }
            .padding(.horizontal, 5)
        } else {
        ViewThatFits(in: .horizontal) {
            fullComposerToolbar
            compactComposerToolbar
            splitComposerToolbar
        }
        }
    }

    private var fullComposerToolbar: some View {
        HStack(spacing: 4) {
            attachmentControl
            ComposerPermissionMenu(
                store: store,
                onChooseDocuments: { showDocumentPicker = true }
            )
            ContextWindowMenu(store: store)

            Spacer(minLength: 12)

            ConfigurationMenu(
                store: store,
                opensBelow: isEmbedded,
                    isExpanded: $showConfigurationPanel
            )
            voiceControl
            sendControl
        }
    }

    private var compactComposerToolbar: some View {
        HStack(spacing: 2) {
            attachmentControl
            ComposerPermissionMenu(
                store: store,
                onChooseDocuments: { showDocumentPicker = true }
            )
            ContextWindowMenu(store: store)

            Spacer(minLength: 4)

            ConfigurationMenu(
                store: store,
                compact: true,
                opensBelow: isEmbedded,
                isExpanded: $showConfigurationPanel
            )
            voiceControl
            sendControl
        }
    }

    private var splitComposerToolbar: some View {
        VStack(spacing: 6) {
            HStack(spacing: 4) {
                attachmentControl
                ComposerPermissionMenu(
                    store: store,
                    onChooseDocuments: { showDocumentPicker = true }
                )
                ContextWindowMenu(store: store)
                Spacer(minLength: 8)
                voiceControl
                sendControl
            }

            HStack {
                ConfigurationMenu(
                    store: store,
                    compact: true,
                    opensBelow: isEmbedded,
                isExpanded: $showConfigurationPanel
                )
                Spacer(minLength: 0)
            }
        }
    }

    private var attachmentControl: some View {
        Menu {
            Button("Attach a text document", systemImage: "doc.badge.plus") {
                showDocumentPicker = true
            }

            Divider()

            Button("Photos — unavailable", systemImage: "photo") {}
                .disabled(true)
            Button("Camera — unavailable", systemImage: "camera") {}
                .disabled(true)

            Button("About supported files", systemImage: "info.circle") {
                store.showPrototypeNotice("Rivune accepts selected UTF-8 text and code files up to 20 KB total, so Rivune mode never silently clips them")
            }
        } label: {
            ComposerIconLabel(symbol: "plus")
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .foregroundStyle(RivunePalette.secondaryText)
        .accessibilityLabel("Add files")
        .accessibilityHint("Choose text or code documents to include with this message")
    }

    private var voiceControl: some View {
        Button {
            if speechDictation.isActive {
                speechDictation.stop()
            } else {
                composerFocused = true
                speechDictation.start(existingText: store.composerText) { transcript in
                    store.composerText = transcript
                }
            }
        } label: {
            ComposerIconLabel(
                symbol: speechDictation.isActive ? "mic.fill" : "mic",
                isActive: speechDictation.isActive
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(speechDictation.isActive ? RivunePalette.primaryText : RivunePalette.secondaryText)
        .accessibilityLabel(speechDictation.isActive ? "Stop voice input" : "Start voice input")
        .accessibilityValue(speechDictation.accessibilityValue)
        .accessibilityHint(
            speechDictation.isActive
                ? "Stops listening and keeps the transcribed text"
                : "Transcribes speech from the microphone into the message"
        )
    }

    private var sendControl: some View {
        Button {
            if speechDictation.isActive {
                speechDictation.stop()
            }
            store.isGenerating ? store.stopGenerating() : store.send()
        } label: {
            Image(systemName: store.isGenerating ? "stop.fill" : "arrow.up")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(canSend && !store.isGenerating ? RivunePalette.canvas : RivunePalette.primaryText)
                .frame(width: 40, height: 40)
                .background(sendButtonColor, in: Circle())
                .overlay {
                    Circle()
                        .stroke(.white.opacity(store.isGenerating || canSend ? 0.14 : 0.06), lineWidth: 0.6)
                }
                .shadow(
                    color: canSend && !store.isGenerating ? .black.opacity(0.25) : .clear,
                    radius: 7,
                    y: 3
                )
        }
        .buttonStyle(.plain)
        .disabled(!store.isGenerating && (!hasText || !store.canSendInCurrentMode))
        .accessibilityLabel(store.isGenerating ? "Stop generating" : "Send message")
        .accessibilityHint(store.isGenerating ? "Stops the active request" : sendAccessibilityHint)
    }

    private var canSend: Bool {
        hasText && store.canSendInCurrentMode
    }

    private var availableDirectMode: IntelligenceMode? {
        guard !store.canSendInCurrentMode else { return nil }
        #if os(iOS)
        guard bridge.state.isConnected else { return nil }
        #endif
        if store.codexReadiness.isReady && !store.claudeReadiness.isReady { return .chatGPT }
        if store.claudeReadiness.isReady && !store.codexReadiness.isReady { return .claude }
        return nil
    }

    private var footerConnectionText: String {
        #if os(iOS)
        store.engineFooterSummary
        #else
        store.connectionSummary
        #endif
    }

    private var hasText: Bool {
        !store.composerText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func closeConfigurationPanel() {
        guard showConfigurationPanel else { return }
        withAnimation(.snappy(duration: 0.20)) {
            showConfigurationPanel = false
        }
    }

    private var sendButtonColor: Color {
        if store.isGenerating {
            return RivunePalette.control
        }
        if canSend {
            return RivunePalette.primaryText
        }
        return RivunePalette.control
    }

    private var sendAccessibilityHint: String {
        if !hasText { return "Enter a message first" }
        if !store.canSendInCurrentMode { return footerConnectionText }
        return "Sends using the selected model configuration"
    }

    private var generationStatus: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.mini)
                .tint(store.mode.accent)
            Text(store.councilStage.title(for: store.mode))
                .font(.caption.weight(.medium))
            Spacer()
            Text("Live request")
                .font(.caption2)
                .foregroundStyle(RivunePalette.tertiaryText)
        }
        .foregroundStyle(RivunePalette.secondaryText)
        .padding(.horizontal, 8)
    }

    private var attachmentStrip: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(store.draftAttachments) { attachment in
                    HStack(spacing: 7) {
                        Image(systemName: "doc.text")
                            .foregroundStyle(RivunePalette.secondaryText)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(attachment.name)
                                .lineLimit(1)
                            Text(attachment.sizeLabel)
                                .font(.caption2)
                                .foregroundStyle(RivunePalette.tertiaryText)
                        }
                        Button {
                            store.removeAttachment(attachment.id)
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption2.weight(.bold))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Remove \(attachment.name)")
                    }
                    .font(.caption)
                    .padding(.horizontal, 10)
                    .frame(height: 38)
                    .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .stroke(RivunePalette.hairline, lineWidth: 0.6)
                    }
                }
            }
            .padding(.horizontal, 12)
        }
        .scrollIndicators(.hidden)
    }

    private func importDocuments(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result else {
            store.showPrototypeNotice("Rivune could not open that document")
            return
        }

        for url in urls {
            let accessed = url.startAccessingSecurityScopedResource()
            defer {
                if accessed { url.stopAccessingSecurityScopedResource() }
            }

            do {
                let data = try Data(contentsOf: url, options: [.mappedIfSafe])
                guard data.count <= 20_000 else {
                    store.showPrototypeNotice("\(url.lastPathComponent) is over the 20 KB document limit")
                    continue
                }
                guard let text = String(data: data, encoding: .utf8) else {
                    store.showPrototypeNotice("\(url.lastPathComponent) is not UTF-8 text")
                    continue
                }
                store.addAttachment(
                    PromptAttachment(
                        name: url.lastPathComponent,
                        textContent: text,
                        byteCount: data.count
                    )
                )
            } catch {
                store.showPrototypeNotice("Rivune could not read \(url.lastPathComponent)")
            }
        }
    }
}

private struct ComposerIconLabel: View {
    let symbol: String
    var isActive = false

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(isActive ? RivunePalette.primaryText : RivunePalette.secondaryText)
            .frame(width: 38, height: 38)
            .contentShape(Circle())
    }
}

private struct ComposerPermissionMenu: View {
    @ObservedObject var store: RivuneStore
    var showsTitle = false
    let onChooseDocuments: () -> Void

    var body: some View {
        Menu {
            Section("Current access") {
                Button {
                    store.showPrototypeNotice("Rivune requests text-only CLI runs with tools disabled. This is a CLI boundary, not an operating-system file-system sandbox")
                } label: {
                    Label("Text-only CLI session", systemImage: "checkmark")
                }

                Button(action: onChooseDocuments) {
                    Label(
                        store.draftAttachments.isEmpty
                            ? "Choose files to share…"
                            : "Add selected files…",
                        systemImage: "doc.badge.plus"
                    )
                }

                if !store.draftAttachments.isEmpty {
                    Button("Remove all selected files", systemImage: "xmark.circle") {
                        let attachmentIDs = store.draftAttachments.map(\.id)
                        attachmentIDs.forEach(store.removeAttachment)
                    }
                }
            }

            Section("Unavailable in this build") {
                Button("Workspace editing", systemImage: "folder.badge.gearshape") {}
                    .disabled(true)
                Button("Shell commands", systemImage: "terminal") {}
                    .disabled(true)
                Button("Unrestricted access", systemImage: "lock.open") {}
                    .disabled(true)
            }

            Button("About permissions", systemImage: "info.circle") {
                store.showPrototypeNotice("Rivune only attaches your message, optional recent context, and selected text files. The CLI boundary is not an operating-system sandbox")
            }
        } label: {
            if showsTitle {
                Text("Tools")
                    .font(.system(size: 13))
                    .foregroundStyle(RivunePalette.secondaryText)
                    .padding(.horizontal, 8)
                    .frame(height: 38)
            } else {
                ComposerIconLabel(symbol: "checkmark.shield", isActive: !store.draftAttachments.isEmpty)
            }
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .accessibilityLabel("Permissions")
        .accessibilityValue(permissionAccessibilityValue)
        .accessibilityHint("Review the current access boundary or manage selected files")
    }

    private var permissionAccessibilityValue: String {
        guard !store.draftAttachments.isEmpty else {
            return "Text-only CLI; no files attached"
        }
        return "Text-only CLI; \(store.draftAttachments.count) selected files attached"
    }
}

private struct ContextWindowMenu: View {
    @ObservedObject var store: RivuneStore

    private let preparedInputCapacity = 48 * 1_024

    var body: some View {
        Menu {
            Section("Input estimate") {
                Toggle(isOn: contextBinding) {
                    Label("Use previous messages", systemImage: "text.bubble")
                }
            }

            Section("Next request estimate") {
                Button {
                    store.showPrototypeNotice("About \(approximateTokenText) tokens are currently prepared for the next request")
                } label: {
                    Label("≈ \(approximateTokenText) tokens", systemImage: "circle.dotted")
                }

                Button {
                    store.showPrototypeNotice("Rivune prepares up to 16 KB of message text, 20 KB of selected files, and 12 KB of recent history")
                } label: {
                    Label("\(formattedPreparedBytes) prepared", systemImage: "gauge.with.dots.needle.33percent")
                }
            }

            Button("How the meter works", systemImage: "info.circle") {
                store.showPrototypeNotice("This estimates Rivune's prepared input, not a provider's exact token quota; model context limits can differ")
            }
        } label: {
            ZStack {
                Circle()
                    .stroke(.white.opacity(0.12), lineWidth: 2.2)

                Circle()
                    .trim(from: 0, to: ringProgress)
                    .stroke(
                        LinearGradient(
                            colors: [RivunePalette.secondaryText, RivunePalette.primaryText.opacity(0.9)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        style: StrokeStyle(lineWidth: 2.2, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))

                Circle()
                    .fill(store.memoryEnabled ? RivunePalette.primaryText.opacity(0.72) : RivunePalette.tertiaryText)
                    .frame(width: 5, height: 5)
            }
            .frame(width: 18, height: 18)
            .frame(width: 40, height: 40)
            .contentShape(Circle())
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .accessibilityLabel("Input estimate")
        .accessibilityValue(contextAccessibilityValue)
        .accessibilityHint("Review estimated prepared input or choose whether the next request includes previous Rivune messages")
    }

    private var contextBinding: Binding<Bool> {
        Binding(
            get: { store.memoryEnabled },
            set: { newValue in
                store.memoryEnabled = newValue
                store.showPrototypeNotice(
                    newValue
                        ? "The next request will include up to 8 recent Rivune turns, capped at 12 KB"
                        : "The next request will include only the current message and selected files"
                )
            }
        )
    }

    private var preparedBytes: Int {
        let messageBytes = min(store.composerText.utf8.count, 16 * 1_024)
        let attachmentBytes = min(
            store.draftAttachments.reduce(0) { $0 + $1.byteCount },
            20 * 1_024
        )
        let historyBytes = store.memoryEnabled ? estimatedHistoryBytes : 0
        return min(messageBytes + attachmentBytes + historyBytes, preparedInputCapacity)
    }

    private var estimatedHistoryBytes: Int {
        let entries = store.turns.suffix(8).map { turn -> String in
            let answer: String?
            switch store.mode {
            case .chatGPT:
                answer = turn.chatGPTAnswer?.content
                    ?? turn.combinedAnswer?.content
                    ?? turn.claudeAnswer?.content
            case .claude:
                answer = turn.claudeAnswer?.content
                    ?? turn.combinedAnswer?.content
                    ?? turn.chatGPTAnswer?.content
            case .together:
                answer = turn.combinedAnswer?.content
                    ?? turn.chatGPTAnswer?.content
                    ?? turn.claudeAnswer?.content
            }
            return "USER: \(turn.prompt)\nASSISTANT: \(answer ?? "[No completed answer]")"
        }
        return min(entries.joined(separator: "\n\n").utf8.count, 12_000)
    }

    private var ringProgress: CGFloat {
        let fraction = CGFloat(preparedBytes) / CGFloat(preparedInputCapacity)
        return min(max(fraction, 0), 1)
    }

    private var approximateTokenText: String {
        let tokens = preparedBytes / 4
        if tokens >= 1_000 {
            return String(format: "%.1fK", Double(tokens) / 1_000)
        }
        return "\(tokens)"
    }

    private var formattedPreparedBytes: String {
        ByteCountFormatter.string(fromByteCount: Int64(preparedBytes), countStyle: .file)
    }

    private var contextAccessibilityValue: String {
        let percent = Int((ringProgress * 100).rounded())
        let contextState = store.memoryEnabled ? "previous messages included" : "previous messages not included"
        return "\(percent) percent of Rivune input budget; \(contextState)"
    }
}

private struct ConfigurationMenu: View {
    @ObservedObject var store: RivuneStore
    var compact = false
    var iconOnly = false
    var opensBelow = false
    @Binding var isExpanded: Bool

    var body: some View {
        Button {
            guard !store.hasActiveProviderRuns else { return }
            withAnimation(.snappy(duration: 0.24)) {
                isExpanded.toggle()
            }
        } label: {
            HStack(spacing: 5) {
                if iconOnly {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 12))
                        .foregroundStyle(RivunePalette.secondaryText)
                    Text("Models")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(RivunePalette.secondaryText)
                } else {
                ProviderIdentityMark(mode: store.mode, size: 19)
                ComposerConfigurationLabel(store: store, compact: compact)
                Image(systemName: "chevron.down")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(RivunePalette.tertiaryText)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
                }
            }
            .padding(.horizontal, compact ? 9 : 11)
            .frame(height: 32)
            .background(
                iconOnly ? .clear : (isExpanded ? RivunePalette.surfaceRaised : RivunePalette.control.opacity(0.6)),
                in: RoundedRectangle(cornerRadius: 9, style: .continuous)
            )
            .contentShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            .frame(height: 40)
        }
        .buttonStyle(.plain)
        .disabled(store.hasActiveProviderRuns)
        .accessibilityLabel(configurationAccessibilityLabel)
        .accessibilityValue(isExpanded ? "Expanded" : "Collapsed")
        .accessibilityHint(
            store.hasActiveProviderRuns
                ? "Unavailable while a request is running"
                : (isExpanded ? "Collapse model choices" : "Show model and reasoning choices")
        )
        .popover(isPresented: $isExpanded, arrowEdge: opensBelow ? .top : .bottom) {
            ModelConfigurationPanel(store: store) {
                isExpanded = false
            }
            #if os(macOS)
            .frame(width: 450)
            #else
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .presentationCompactAdaptation(.sheet)
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            .presentationBackground(RivunePalette.surface)
            #endif
            .preferredColorScheme(.dark)
        }
    }
    private var configurationAccessibilityLabel: String {
        #if os(iOS)
        "Models and reasoning, managed on your Mac"
        #else
        "Model configuration, \(store.activeConfigurationSummary)"
        #endif
    }

}

private struct ModelConfigurationPanel: View {
    @ObservedObject var store: RivuneStore
    let onDismiss: () -> Void
    @State private var editingProvider: IntelligenceMode = .chatGPT

    private var visibleProvider: IntelligenceMode {
        store.mode == .together ? editingProvider : store.mode
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
                HStack {
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Models & reasoning").font(.system(size: 15, weight: .semibold))
                        Text("Choose how your next message is handled.")
                            .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    }
                    Spacer(minLength: 8)
                    ModelPickerCloseButton(action: onDismiss)
                }
                if store.mode == .together {
                    HStack(spacing: 6) {
                        providerTab(.chatGPT)
                        providerTab(.claude)
                        Spacer(minLength: 0)
                    }
                }
                ProviderModelChoiceColumns(store: store, mode: visibleProvider) {
                    onDismiss()
                    store.showConnections = true
                }
                #if os(macOS)
                Button("Other AI connections", systemImage: "plus.circle") {
                    onDismiss()
                    store.showConnections = true
                }.buttonStyle(.plain).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                #endif
            }
        .padding(18)
        .background(RivunePalette.surface)
        .foregroundStyle(RivunePalette.primaryText)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Models and reasoning")
    }

    private func providerTab(_ provider: IntelligenceMode) -> some View {
        Button { editingProvider = provider } label: {
            HStack(spacing: 6) {
                ProviderIdentityMark(mode: provider, size: 19)
                Text(provider.displayName).font(.system(size: 12, weight: .medium))
            }
            .padding(.horizontal, 10).frame(height: 33)
            .foregroundStyle(editingProvider == provider ? RivunePalette.primaryText : RivunePalette.secondaryText)
            .background(editingProvider == provider ? RivunePalette.control : .clear, in: RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(editingProvider == provider ? RivunePalette.hairline : .clear, lineWidth: 0.7))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Configure \(provider.displayName)")
        .accessibilityAddTraits(editingProvider == provider ? .isSelected : [])
    }
}

/// Shared by the sidebar and composer; selecting preferences never sends a request.
struct ProviderModelPickerPanel: View {
    @ObservedObject var store: RivuneStore
    let mode: IntelligenceMode
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 10) {
                    ProviderIdentityMark(mode: mode, size: 30)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(mode.displayName).font(.system(size: 15, weight: .semibold))
                        Text("Models & reasoning").font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    }
                    Spacer(minLength: 8)
                    ModelPickerCloseButton(action: onDismiss)
                }
                ProviderModelChoiceColumns(store: store, mode: mode) {
                    onDismiss()
                    store.showConnections = true
                }
            }
            .padding(18)
        }
        .scrollBounceBehavior(.basedOnSize)
        .frame(height: modelPickerHeight(store: store, mode: mode))
        .foregroundStyle(RivunePalette.primaryText)
        .background(RivunePalette.surface)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(mode.displayName) models and reasoning")
    }
}

@MainActor
private func modelPickerHeight(store: RivuneStore, mode: IntelligenceMode) -> CGFloat {
    #if os(iOS)
    return 260
    #else
    let isAPI = mode == .chatGPT ? store.currentCodexRoute.transportKind == .api : store.currentClaudeRoute.transportKind == .api
    if isAPI { return store.hasActiveProviderRuns ? 284 : 260 }
    let rows = mode == .chatGPT
        ? max(store.availableCodexModels.count, store.codexEfforts(for: store.codexModel).count)
        : max(store.availableClaudeModels.count, store.claudeEfforts(for: store.claudeModel).count)
    #if os(macOS)
    let rowHeight: CGFloat = 35
    #else
    let rowHeight: CGFloat = 46
    #endif
    return min(CGFloat(rows) * rowHeight, 245) + 150 + (store.hasActiveProviderRuns ? 24 : 0)
    #endif
}

struct ProviderModelChoiceColumns: View {
    @ObservedObject var store: RivuneStore
    let mode: IntelligenceMode
    let onOpenConnections: () -> Void

    private var isAPI: Bool {
        mode == .chatGPT ? store.currentCodexRoute.transportKind == .api : store.currentClaudeRoute.transportKind == .api
    }
    private var provider: RivuneAPIProvider { mode == .chatGPT ? .openAI : .anthropic }
    private var managedOnMac: Bool {
        #if os(iOS)
        true
        #else
        false
        #endif
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 0) {
                VStack(alignment: .leading, spacing: 8) {
                    columnTitle("Models")
                    ScrollView { modelRows }.frame(height: columnHeight)
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("\(mode.displayName) models")
                Rectangle().fill(RivunePalette.hairline).frame(width: 0.7)
                    .padding(.horizontal, 10)
                VStack(alignment: .leading, spacing: 8) {
                    columnTitle("Reasoning")
                    ScrollView { reasoningRows }.frame(height: columnHeight)
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("\(mode.displayName) reasoning")
            }
            .fixedSize(horizontal: false, vertical: true)
            .padding(10)
            .background(RivunePalette.canvas.opacity(0.70), in: RoundedRectangle(cornerRadius: 11))
            .overlay(RoundedRectangle(cornerRadius: 11).stroke(RivunePalette.hairline, lineWidth: 0.7))

            if managedOnMac {
                Label("Manage models on your Mac", systemImage: "desktopcomputer")
                    .font(.system(size: 11, weight: .medium))
                Text("The Mac’s active model and connection details are not available on this iPhone.")
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            } else if isAPI {
                Text("Uses the API model saved in Connections. Reasoning is managed by the provider.")
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                Button("Edit in Connections", systemImage: "arrow.up.right") { onOpenConnections() }
                    .buttonStyle(.bordered)
                    .font(.system(size: 11, weight: .medium))
                    .disabled(store.hasActiveProviderRuns)
            } else {
                Text(store.capabilityNote(for: mode))
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if store.hasActiveProviderRuns {
                Label("Settings are locked while a task is running.", systemImage: "lock")
                    .font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText)
            }
        }
    }

    private var columnHeight: CGFloat {
        if managedOnMac || isAPI { return 72 }
        let count = mode == .chatGPT ? max(store.availableCodexModels.count, store.codexEfforts(for: store.codexModel).count) : max(store.availableClaudeModels.count, store.claudeEfforts(for: store.claudeModel).count)
        return min(CGFloat(count) * (rowHeight + 2), 210)
    }

    private func columnTitle(_ title: String) -> some View {
        Text(title.uppercased()).font(.system(size: 9, weight: .semibold)).tracking(1.1)
            .foregroundStyle(RivunePalette.tertiaryText).padding(.horizontal, 8).padding(.top, 4)
    }

    @ViewBuilder private var modelRows: some View {
        if managedOnMac {
            Text("Managed on Mac")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(RivunePalette.secondaryText)
                .padding(8)
        } else if isAPI {
            VStack(alignment: .leading, spacing: 8) {
                Text(store.apiProbes[provider]?.modelID ?? "Configured API model")
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .fixedSize(horizontal: false, vertical: true)
                    .textSelection(.enabled)
                Text("API connection").font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText)
            }
            .padding(8)
        } else if mode == .chatGPT {
            VStack(spacing: 2) {
                ForEach(store.availableCodexModels) { model in
                    choice(model == .accountDefault ? "Account default" : store.modelLabel(model), selected: store.codexModel == model) {
                        store.codexModel = model
                    }
                }
            }
        } else {
            VStack(spacing: 2) {
                ForEach(store.availableClaudeModels) { model in
                    choice(model.title, selected: store.claudeModel == model) { store.claudeModel = model }
                }
            }
        }
    }

    @ViewBuilder private var reasoningRows: some View {
        if managedOnMac {
            Text("Managed on Mac")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(RivunePalette.secondaryText)
                .padding(8)
        } else if isAPI {
            VStack(alignment: .leading, spacing: 8) {
                Text("Provider managed").font(.system(size: 12, weight: .medium))
                Text("No reasoning override is sent.").font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText)
            }
            .fixedSize(horizontal: false, vertical: true).padding(8)
        } else if mode == .chatGPT {
            VStack(spacing: 2) {
                ForEach(store.codexEfforts(for: store.codexModel)) { effort in
                    choice(effort.title, selected: store.codexEffort == effort, isUltra: effort == .ultra) { store.codexEffort = effort }
                }
            }
        } else {
            VStack(spacing: 2) {
                ForEach(store.claudeEfforts(for: store.claudeModel)) { effort in
                    choice(effort.title, selected: store.claudeEffort == effort) { store.claudeEffort = effort }
                }
            }
        }
    }

    private func choice(_ title: String, selected: Bool, isUltra: Bool = false, action: @escaping () -> Void) -> some View {
        Button {
            guard !store.hasActiveProviderRuns else { return }
            action()
        } label: {
            HStack(spacing: 6) {
                Text(title).font(.system(size: 12, weight: selected ? .medium : .regular))
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                Image(systemName: "checkmark").font(.system(size: 10, weight: .semibold))
                    .opacity(selected ? 1 : 0)
            }
            .foregroundStyle(isUltra ? RivunePalette.ultraGlow : selected ? RivunePalette.primaryText : RivunePalette.secondaryText)
            .padding(.horizontal, 8)
            .frame(minHeight: rowHeight)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? RivunePalette.control : .clear, in: RoundedRectangle(cornerRadius: 7))
            .contentShape(RoundedRectangle(cornerRadius: 7))
        }
        .buttonStyle(.plain)
        .disabled(store.hasActiveProviderRuns)
        .accessibilityLabel(title)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var rowHeight: CGFloat {
        #if os(macOS)
        33
        #else
        44
        #endif
    }
}

private struct ModelPickerCloseButton: View {
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Image(systemName: "xmark").font(.system(size: 10, weight: .semibold))
                .foregroundStyle(RivunePalette.secondaryText)
                .frame(width: 30, height: 30)
                .background(RivunePalette.control, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Close model configuration")
    }
}

private struct ComposerConfigurationLabel: View {
    @ObservedObject var store: RivuneStore
    let compact: Bool

    var body: some View {
        Group {
            if store.mode == .together { RivuneWordmark(width: 76) }
            else { configurationText }
        }
        .font(.subheadline.weight(.medium))
        .foregroundStyle(RivunePalette.primaryText.opacity(0.94))
        .lineLimit(1)
        .minimumScaleFactor(0.82)
    }

    private var configurationText: Text {
        #if os(iOS)
        return Text(store.mode.displayName)
        #else
        switch store.mode {
        case .chatGPT:
            if store.currentCodexRoute.transportKind == .api {
                return Text("ChatGPT · \(store.configurationSummary(for: .chatGPT, compact: compact))")
            }
            return Text("ChatGPT · \(Text(codexModelTitle))\(codexReasoningText)")

        case .claude:
            if store.currentClaudeRoute.transportKind == .api {
                return Text("Claude · \(store.configurationSummary(for: .claude, compact: compact))")
            }
            return Text("Claude · \(Text(store.claudeModel.compactTitle))\(claudeReasoningText)")

        case .together:
            return Text(compact ? "Rivune" : "Rivune · 2")
        }
        #endif
    }

    private var codexModelTitle: String {
        if compact { return store.codexModel.compactTitle }
        return switch store.codexModel {
        case .accountDefault: "Default"
        case .gpt56Sol: "5.6 Sol"
        case .gpt56Terra: "5.6 Terra"
        case .gpt56Luna: "5.6 Luna"
        case .gpt55: "5.5"
        case .gpt54: "5.4"
        default: store.modelLabel(store.codexModel)
        }
    }

    private var codexReasoningText: Text {
        switch store.codexEffort {
        case .automatic:
            return Text("")
        case .ultra:
            return Text(" Ultra").foregroundColor(RivunePalette.ultra)
        default:
            return Text(" \(store.codexEffort.compactTitle)")
                .foregroundColor(RivunePalette.secondaryText)
        }
    }

    private var claudeReasoningText: Text {
        if store.claudeEffort == .automatic {
            return Text("")
        }
        return Text(" \(store.claudeEffort.compactTitle)")
            .foregroundColor(RivunePalette.secondaryText)
    }
}

struct MarkdownResponseText: View {
    let content: String
    var maximumBlocks: Int? = nil

    private var blocks: [ResponseTextBlock] {
        ResponseTextParser.parse(content)
    }

    private var visibleBlocks: ArraySlice<ResponseTextBlock> {
        guard let maximumBlocks else { return blocks[...] }
        return blocks.prefix(maximumBlocks)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(visibleBlocks.enumerated()), id: \.offset) { _, block in
                ResponseTextBlockView(
                    block: block,
                    isCondensed: maximumBlocks != nil
                )
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .foregroundStyle(RivunePalette.primaryText.opacity(0.90))
        .textSelection(.enabled)
        .fixedSize(horizontal: false, vertical: true)
    }
}

enum ResponseTextBlock: Equatable {
    case paragraph(String)
    case heading(level: Int, text: String)
    case list(ordered: Bool, items: [String])
    case quote(String)
    case code(language: String?, text: String)
    case table(headers: [String], rows: [[String]])
    case divider
}

private struct ResponseTextBlockView: View {
    @State private var copiedCode = false
    let block: ResponseTextBlock
    let isCondensed: Bool

    var body: some View {
        switch block {
        case .paragraph(let text):
            Text(inlineMarkdown(text))
                .font(.system(size: 15, weight: .regular))
                .lineSpacing(5)
                .lineLimit(isCondensed ? 6 : nil)
                .fixedSize(horizontal: false, vertical: true)

        case .heading(let level, let text):
            Text(inlineMarkdown(text))
                .font(headingFont(for: level))
                .accessibilityAddTraits(.isHeader)
                .foregroundStyle(RivunePalette.primaryText)
                .padding(.top, level <= 2 ? 4 : 1)
                .lineLimit(isCondensed ? 2 : nil)
                .fixedSize(horizontal: false, vertical: true)

        case .list(let ordered, let items):
            let visibleItems = isCondensed ? Array(items.prefix(4)) : items
            VStack(alignment: .leading, spacing: 7) {
                ForEach(Array(visibleItems.enumerated()), id: \.offset) { index, item in
                    HStack(alignment: .firstTextBaseline, spacing: 9) {
                        Text(ordered ? "\(index + 1)." : "•")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(RivunePalette.tertiaryText)
                            .frame(width: 20, alignment: .trailing)

                        Text(inlineMarkdown(item))
                            .font(.system(size: 15))
                            .lineSpacing(4)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                if isCondensed, items.count > visibleItems.count {
                    Text("… \(items.count - visibleItems.count) more")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .padding(.leading, 29)
                }
            }

        case .quote(let text):
            HStack(alignment: .top, spacing: 11) {
                Capsule()
                    .fill(RivunePalette.tertiaryText.opacity(0.62))
                    .frame(width: 2)

                Text(inlineMarkdown(text))
                    .font(.system(size: 15))
                    .foregroundStyle(RivunePalette.secondaryText)
                    .lineSpacing(4)
                    .lineLimit(isCondensed ? 6 : nil)
                    .fixedSize(horizontal: false, vertical: true)
            }

        case .code(let language, let text):
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text((language ?? "Code").uppercased())
                        .font(.caption2.monospaced().weight(.medium))
                    Spacer()
                    Button {
                        #if os(macOS)
                        NSPasteboard.general.clearContents()
                        NSPasteboard.general.setString(text, forType: .string)
                        #else
                        UIPasteboard.general.string = text
                        #endif
                        copiedCode = true
                    } label: {
                        Label(copiedCode ? "Copied" : "Copy code", systemImage: copiedCode ? "checkmark" : "doc.on.doc")
                            .font(.caption2).frame(minHeight: 28)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(copiedCode ? "Code copied" : "Copy code")
                    .onChange(of: text) { _, _ in copiedCode = false }
                }
                .foregroundStyle(RivunePalette.secondaryText)
                .padding(.horizontal, 12)
                .padding(.top, 6)

                ScrollView(.horizontal) {
                    Text(text)
                        .font(.system(size: 13, design: .monospaced))
                        .fixedSize(horizontal: true, vertical: true)
                        .lineSpacing(3)
                        .lineLimit(isCondensed ? 8 : nil)
                        .padding(12)
                        .textSelection(.enabled)
                }
                .scrollIndicators(.visible)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RivunePalette.canvas.opacity(0.72), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(RivunePalette.hairline, lineWidth: 0.6)
            }

        case .table(let headers, let rows):
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 6) {
                    Label("Table", systemImage: "tablecells")

                    Spacer(minLength: 12)

                    if headers.count > 1 {
                        Label("Scroll", systemImage: "arrow.left.and.right")
                    }
                }
                .font(.caption2.weight(.medium))
                .foregroundStyle(RivunePalette.tertiaryText)
                .padding(.horizontal, 11)
                .frame(minHeight: 32)

                Divider().overlay(RivunePalette.hairline)

                ScrollView(.horizontal) {
                    VStack(alignment: .leading, spacing: 0) {
                        responseTableRow(headers, isHeader: true, isAlternate: false)

                        ForEach(Array(rows.enumerated()), id: \.offset) { index, row in
                            Divider().overlay(RivunePalette.hairline)
                            responseTableRow(
                                row,
                                isHeader: false,
                                isAlternate: index.isMultiple(of: 2)
                            )
                        }
                    }
                    .fixedSize(horizontal: true, vertical: true)
                    .background(RivunePalette.canvas.opacity(0.40))
                    .padding(.bottom, 3)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .scrollIndicators(.visible)
                .scrollBounceBehavior(.basedOnSize, axes: .horizontal)
                .accessibilityLabel("Table with \(headers.count) columns and \(rows.count) rows")
                .accessibilityHint("Scroll horizontally to read columns that do not fit")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(RivunePalette.canvas.opacity(0.36))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(RivunePalette.hairline, lineWidth: 0.7)
            }

        case .divider:
            Divider()
                .overlay(RivunePalette.hairline)
        }
    }

    private func responseTableRow(
        _ cells: [String],
        isHeader: Bool,
        isAlternate: Bool
    ) -> some View {
        HStack(alignment: .top, spacing: 0) {
            ForEach(Array(cells.enumerated()), id: \.offset) { index, cell in
                Text(inlineMarkdown(cell))
                    .font(isHeader ? .caption.weight(.semibold) : .subheadline)
                    .foregroundStyle(isHeader ? RivunePalette.primaryText : RivunePalette.secondaryText)
                    .lineSpacing(3)
                    .frame(width: index == 0 ? 210 : 138, alignment: .topLeading)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(minHeight: isHeader ? 42 : 48, alignment: .topLeading)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 10)
                    .background(
                        isHeader
                            ? RivunePalette.surfaceRaised.opacity(0.78)
                            : (isAlternate ? RivunePalette.surface.opacity(0.32) : Color.clear)
                    )

                if index < cells.count - 1 {
                    Divider().overlay(RivunePalette.hairline)
                }
            }
        }
        .fixedSize(horizontal: true, vertical: true)
    }

    private func inlineMarkdown(_ text: String) -> AttributedString {
        (try? AttributedString(
            markdown: text,
            options: AttributedString.MarkdownParsingOptions(
                interpretedSyntax: .inlineOnlyPreservingWhitespace
            )
        )) ?? AttributedString(text)
    }

    private func headingFont(for level: Int) -> Font {
        switch level {
        case 1: .title2.weight(.semibold)
        case 2: .title3.weight(.semibold)
        default: .headline.weight(.semibold)
        }
    }
}

enum ResponseTextParser {
    static func parse(_ source: String) -> [ResponseTextBlock] {
        let normalized = normalizeSectionBreaks(in: source)
        let lines = normalized.components(separatedBy: .newlines)
        var blocks: [ResponseTextBlock] = []
        var paragraphLines: [String] = []
        var listItems: [String] = []
        var listIsOrdered = false
        var codeLines: [String] = []
        var codeLanguage: String?
        var isInCodeBlock = false
        var tableRows: [[String]] = []

        func flushParagraph() {
            let paragraph = paragraphLines
                .joined(separator: " ")
                .trimmingCharacters(in: .whitespacesAndNewlines)
            paragraphLines.removeAll(keepingCapacity: true)
            guard !paragraph.isEmpty else { return }
            splitLongProse(paragraph).forEach { blocks.append(.paragraph($0)) }
        }

        func flushList() {
            guard !listItems.isEmpty else { return }
            blocks.append(.list(ordered: listIsOrdered, items: listItems))
            listItems.removeAll(keepingCapacity: true)
        }

        func flushCode() {
            blocks.append(.code(language: codeLanguage, text: codeLines.joined(separator: "\n")))
            codeLines.removeAll(keepingCapacity: true)
            codeLanguage = nil
        }

        func flushTable() {
            defer { tableRows.removeAll(keepingCapacity: true) }
            guard tableRows.count >= 2,
                  isTableSeparator(tableRows[1]) else {
                for row in tableRows {
                    paragraphLines.append("| " + row.joined(separator: " | ") + " |")
                }
                return
            }

            let headers = tableRows[0]
            let columnCount = headers.count
            let rows = tableRows.dropFirst(2).map { row -> [String] in
                if row.count == columnCount { return row }
                if row.count < columnCount {
                    return row + Array(repeating: "", count: columnCount - row.count)
                }
                return Array(row.prefix(columnCount))
            }
            blocks.append(.table(headers: headers, rows: Array(rows)))
        }

        for rawLine in lines {
            let trimmed = rawLine.trimmingCharacters(in: .whitespaces)

            if !isInCodeBlock, let row = tableRow(from: trimmed) {
                flushParagraph()
                flushList()
                tableRows.append(row)
                continue
            } else if !tableRows.isEmpty {
                flushTable()
            }

            if trimmed.hasPrefix("```") {
                if isInCodeBlock {
                    flushCode()
                } else {
                    flushParagraph()
                    flushList()
                    let language = String(trimmed.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                    codeLanguage = language.isEmpty ? nil : language
                }
                isInCodeBlock.toggle()
                continue
            }

            if isInCodeBlock {
                codeLines.append(rawLine)
                continue
            }

            if trimmed.isEmpty {
                flushParagraph()
                flushList()
                continue
            }

            if let heading = heading(from: trimmed) {
                flushParagraph()
                flushList()
                blocks.append(.heading(level: heading.level, text: heading.text))
                continue
            }

            if ["---", "***", "___"].contains(trimmed) {
                flushParagraph()
                flushList()
                blocks.append(.divider)
                continue
            }

            if trimmed.hasPrefix("> ") {
                flushParagraph()
                flushList()
                blocks.append(.quote(String(trimmed.dropFirst(2))))
                continue
            }

            if let listItem = listItem(from: trimmed) {
                flushParagraph()
                if !listItems.isEmpty, listIsOrdered != listItem.ordered {
                    flushList()
                }
                listIsOrdered = listItem.ordered
                listItems.append(listItem.text)
                continue
            }

            flushList()
            paragraphLines.append(trimmed)
        }

        if isInCodeBlock { flushCode() }
        if !tableRows.isEmpty { flushTable() }
        flushParagraph()
        flushList()

        return blocks.isEmpty ? [.paragraph(source)] : blocks
    }

    private static func normalizeSectionBreaks(in source: String) -> String {
        let normalized = source.replacingOccurrences(of: "\r\n", with: "\n")
        guard normalized.count > 160 else { return normalized }

        let pattern = #"(?<!\n)(\(\d+\)\s+|Candidate\s+[A-Z]:|Word\s+count(?:\s*[:.]?)|Self-audit\b|Notes\s+for\s+[A-Za-z]+|I\s+recommend\b|Recommendation\b|Final\s+(?:wording|answer|recommendation)\b)"#
        guard let expression = try? NSRegularExpression(pattern: pattern) else { return normalized }
        let range = NSRange(normalized.startIndex..<normalized.endIndex, in: normalized)
        return expression
            .stringByReplacingMatches(in: normalized, range: range, withTemplate: "\n\n$1")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func splitLongProse(_ paragraph: String) -> [String] {
        guard paragraph.count > 620 else { return [paragraph] }

        let pattern = #".+?(?:[.!?](?=\s|$)|$)"#
        guard let expression = try? NSRegularExpression(
            pattern: pattern,
            options: [.dotMatchesLineSeparators]
        ) else { return [paragraph] }

        let range = NSRange(paragraph.startIndex..<paragraph.endIndex, in: paragraph)
        let sentences = expression.matches(in: paragraph, range: range).compactMap { match -> String? in
            guard let sentenceRange = Range(match.range, in: paragraph) else { return nil }
            let sentence = String(paragraph[sentenceRange]).trimmingCharacters(in: .whitespacesAndNewlines)
            return sentence.isEmpty ? nil : sentence
        }
        guard sentences.count > 1 else { return [paragraph] }

        var result: [String] = []
        var current = ""
        for sentence in sentences {
            if !current.isEmpty, current.count + sentence.count > 520 {
                result.append(current)
                current = sentence
            } else {
                current += current.isEmpty ? sentence : " \(sentence)"
            }
        }
        if !current.isEmpty { result.append(current) }
        return result
    }

    private static func heading(from line: String) -> (level: Int, text: String)? {
        let prefixCount = line.prefix { $0 == "#" }.count
        guard (1...6).contains(prefixCount) else { return nil }
        let remainder = String(line.dropFirst(prefixCount))
            .trimmingCharacters(in: .whitespaces)
        return remainder.isEmpty ? nil : (prefixCount, remainder)
    }

    private static func listItem(from line: String) -> (ordered: Bool, text: String)? {
        if line.hasPrefix("- ") || line.hasPrefix("* ") || line.hasPrefix("• ") {
            return (false, String(line.dropFirst(2)))
        }

        let pattern = #"^\d+[.)]\s+"#
        guard let expression = try? NSRegularExpression(pattern: pattern) else { return nil }
        let range = NSRange(line.startIndex..<line.endIndex, in: line)
        guard let match = expression.firstMatch(in: line, range: range),
              let matchRange = Range(match.range, in: line) else { return nil }
        return (true, String(line[matchRange.upperBound...]))
    }

    private static func tableRow(from line: String) -> [String]? {
        guard line.hasPrefix("|"), line.hasSuffix("|") else { return nil }
        let cells = line
            .dropFirst()
            .dropLast()
            .split(separator: "|", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        return cells.count >= 2 ? cells : nil
    }

    private static func isTableSeparator(_ cells: [String]) -> Bool {
        let pattern = #"^:?-{3,}:?$"#
        guard let expression = try? NSRegularExpression(pattern: pattern) else { return false }
        return !cells.isEmpty && cells.allSatisfy { cell in
            let range = NSRange(cell.startIndex..<cell.endIndex, in: cell)
            return expression.firstMatch(in: cell, range: range)?.range == range
        }
    }
}
