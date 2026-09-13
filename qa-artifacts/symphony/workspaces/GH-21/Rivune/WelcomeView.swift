import SwiftUI

struct WelcomeView: View {
    @ObservedObject var store: RivuneStore
    @EnvironmentObject private var bridge: PeerBridge

    private let suggestions = [
        HomeSuggestion(title: "Think", symbol: "circle.hexagongrid", detail: "Explore the possibilities", prompt: "Help me think through this question. Compare the strongest perspectives, make the tradeoffs clear, and suggest a practical next step:\n\n"),
        HomeSuggestion(title: "Build", symbol: "square.stack.3d.up", detail: "Turn an idea into a plan", prompt: "Help me turn this idea into something useful. Define a focused first version, the main decisions, and a practical sequence to build it:\n\n"),
        HomeSuggestion(title: "Review", symbol: "checkmark.bubble", detail: "Find what can be better", prompt: "Review the work below. Find the most important problems, explain why they matter, and suggest focused improvements:\n\n")
    ]

    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack(spacing: 0) {
                    Spacer(minLength: 28)
                    VStack(alignment: .leading, spacing: 0) {
                        HStack(spacing: 7) {
                            Circle().fill(RivunePalette.rivune).frame(width: 4, height: 4)
                            Text("YOUR WORKSPACE")
                                .font(.system(size: 9, weight: .medium))
                                .tracking(1.8)
                                .foregroundStyle(RivunePalette.tertiaryText)
                        }
                        .padding(.bottom, 16)

                        Text("What would you like to work on?")
                            .font(.system(size: 29, weight: .medium))
                            .tracking(-0.75)
                            .foregroundStyle(LinearGradient(colors: [.white, RivunePalette.rivune.opacity(0.88)], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.bottom, 10)

                        Text(modeSubtitle)
                            .font(.system(size: 13))
                            .foregroundStyle(RivunePalette.secondaryText)
                            .lineSpacing(3)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.bottom, 28)

                        modeChoices
                            .padding(.bottom, 12)

                        ComposerView(store: store, isEmbedded: true)

                        promptActions
                            .padding(.top, 20)

                        #if os(iOS)
                        if !bridge.state.isConnected {
                            Button("Connect this iPhone to your Mac") { store.showSettings = true }
                                .font(.system(size: 12))
                                .foregroundStyle(RivunePalette.secondaryText)
                                .buttonStyle(.plain)
                                .padding(.top, 18)
                        }
                        #endif
                    }
                    .frame(maxWidth: 740, alignment: .leading)
                    .padding(.horizontal, horizontalPadding)
                    .frame(maxWidth: .infinity)
                    Spacer(minLength: 28)
                }
                .frame(width: geometry.size.width)
                .frame(minHeight: geometry.size.height)
            }
            .scrollIndicators(.hidden)
        }
    }

    private var modeSubtitle: String {
        switch store.mode {
        case .together:
            "Different perspectives. One clearer answer."
        case .chatGPT:
            "A clear space to work through questions, code, and ideas with ChatGPT."
        case .claude:
            "A clear space to work through questions, writing, and ideas with Claude."
        }
    }

    private var modeChoices: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 6) {
                ForEach(IntelligenceModeSelectionOption.available()) { option in
                    modeButton(option.mode)
                }
            }
            VStack(spacing: 6) {
                ForEach(IntelligenceModeSelectionOption.available()) { option in
                    modeButton(option.mode)
                }
            }
        }
        .padding(4)
        .background(RivunePalette.sidebar.opacity(0.76), in: RoundedRectangle(cornerRadius: 13))
        .overlay(RoundedRectangle(cornerRadius: 13).stroke(RivunePalette.hairline, lineWidth: 0.6))
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Choose your assistant")
    }

    private func modeButton(_ mode: IntelligenceMode) -> some View {
        let selected = store.mode == mode
        let ready = isReady(mode)
        let title = switch mode {
        case .together: "Rivune"
        case .chatGPT: "ChatGPT"
        case .claude: "Claude"
        }
        return Button { store.mode = mode } label: {
            HStack(spacing: 7) {
                ProviderIdentityMark(mode: mode, size: 19)
                if mode == .together { RivuneWordmark(width: 69) }
                else { Text(title).font(.system(size: 12, weight: selected ? .medium : .regular)) }
                Circle()
                    .fill(ready ? RivunePalette.success : RivunePalette.tertiaryText.opacity(0.65))
                    .frame(width: 4, height: 4)
            }
            .foregroundStyle(selected ? RivunePalette.primaryText : RivunePalette.secondaryText)
            .padding(.horizontal, 11)
            .frame(height: 35)
            .fixedSize(horizontal: true, vertical: false)
            .background(selected ? RivunePalette.surfaceRaised : .clear, in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(selected ? RivunePalette.rivune.opacity(0.2) : .clear, lineWidth: 0.7))
            .contentShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
        .disabled(store.isGenerating)
        .accessibilityLabel(title)
        .accessibilityValue(ready ? "Ready" : "Connection required")
        .accessibilityAddTraits(selected ? .isSelected : [])
        .help("\(title) · \(ready ? "Ready" : "Connect in Connections")")
    }

    private func isReady(_ mode: IntelligenceMode) -> Bool {
        #if os(iOS)
        guard bridge.state.isConnected else { return false }
        #endif
        return switch mode {
        case .together: store.codexReadiness.isReady && store.claudeReadiness.isReady
        case .chatGPT: store.codexReadiness.isReady
        case .claude: store.claudeReadiness.isReady
        }
    }

    private var horizontalPadding: CGFloat {
        #if os(macOS)
        36
        #else
        20
        #endif
    }

    private var promptActions: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 185), spacing: 8)], spacing: 8) {
            ForEach(suggestions) { suggestion in promptButton(suggestion) }
        }
    }

    private func promptButton(_ suggestion: HomeSuggestion) -> some View {
        Button {
            let draft = store.composerText
            store.composerText = draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? suggestion.prompt : draft + "\n\n" + suggestion.prompt
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: suggestion.symbol)
                    .font(.system(size: 14, weight: .regular))
                    .foregroundStyle(RivunePalette.rivune.opacity(0.85))
                    .frame(width: 18)
                    .padding(.top, 1)
                VStack(alignment: .leading, spacing: 5) {
                    Text(suggestion.title)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(RivunePalette.primaryText)
                    Text(suggestion.detail)
                        .font(.system(size: 10))
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
            .padding(13)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 67)
            .background(RivunePalette.surface.opacity(0.70), in: RoundedRectangle(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(RivunePalette.hairline.opacity(0.7), lineWidth: 0.7))
        }
        .buttonStyle(.plain)
        .accessibilityHint("Adds an editable starter prompt to your draft")
        .help("Add a starter prompt")
    }
}

private struct HomeSuggestion: Identifiable {
    var id: String { title }
    let title: String
    let symbol: String
    let detail: String
    let prompt: String
}
