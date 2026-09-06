import SwiftUI
#if os(macOS)
import AppKit
#endif

struct WorkspaceView: View {
    @ObservedObject var store: RivuneStore
    @Binding var section: WorkspaceSection
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.colorSchemeContrast) private var contrast
    @State private var isNearTranscriptBottom = true
    @State private var hasNewTranscriptContent = false
    #if os(macOS)
    @State private var isWorkPanelPresented = false
    #endif
    private let providerCatalog = AIProviderCatalog.currentDefaults
    #if os(iOS)
    @State private var isMobileProviderSelectorExpanded = false
    #endif

    var body: some View {
        ZStack {
            RivuneBackground()

            VStack(spacing: 0) {
                #if os(macOS)
                workspaceHeader
                #endif

                switch section {
                case .home:
                    WelcomeView(store: store)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                case .conversations:
                    ConversationLibraryView(store: store, section: $section)
                case .projects:
                    #if os(macOS)
                    RivuneProjectsView(store: store, section: $section)
                    #else
                    ContentUnavailableView("Projects on Mac", systemImage: "folder", description: Text("Local project files are managed on your Mac. Project sync is not available yet."))
                    #endif
                case .connections:
                    SettingsView(store: store, embeddedSection: .providers)
                case .chat:
                    if store.turns.isEmpty {
                        WelcomeView(store: store)
                    } else {
                        transcript
                    }
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if section == .chat && !store.turns.isEmpty {
                    ComposerView(store: store)
                }
            }
            .background {
                LinearGradient(stops: [
                    .init(color: RivunePalette.canvas.opacity(0.38), location: 0),
                    .init(color: RivunePalette.canvas.opacity(contrast == .increased ? 1 : 0.88), location: 0.16),
                    .init(color: RivunePalette.canvas.opacity(contrast == .increased ? 1 : 0.88), location: 0.84),
                    .init(color: RivunePalette.canvas.opacity(0.38), location: 1)
                ], startPoint: .leading, endPoint: .trailing)
            }
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(LinearGradient(colors: [.white.opacity(0.13), RivunePalette.rivune.opacity(0.04), .white.opacity(0.07)], startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 0.8)
            }
            .padding(panelPadding)
        }
        .navigationTitle("")
        .onChange(of: store.turns.count) { oldCount, newCount in
            if section == .home && newCount > oldCount { section = .chat }
        }
        #if os(macOS)
        .inspector(isPresented: $isWorkPanelPresented) {
            DeveloperWorkPanel(store: store)
                .inspectorColumnWidth(min: 290, ideal: 340, max: 480)
        }
        #endif
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbarBackground(RivunePalette.canvas.opacity(0.96), for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .principal) {
                if section == .chat, let project = store.activeProject {
                    Button(project.name, systemImage: "folder") { store.selectedProjectID = project.id; section = .projects }
                        .font(.caption).buttonStyle(.plain).foregroundStyle(RivunePalette.rivune)
                }
                Text(workspaceTitle).font(.system(size: 14, weight: .medium)).lineLimit(1)
            }
            ToolbarItem(placement: .topBarTrailing) {
                mobileOptionsMenu
            }
        }
        .popover(isPresented: $isMobileProviderSelectorExpanded) {
            ProviderSelectionPanel(
                selection: $store.mode,
                catalog: providerCatalog,
                onDismiss: { isMobileProviderSelectorExpanded = false }
            )
            .frame(width: 290)
            .padding(10)
            .presentationCompactAdaptation(.popover)
        }
        #endif
    }

    private var panelPadding: CGFloat {
        #if os(macOS)
        16
        #else
        8
        #endif
    }

    private var workspaceTitle: String {
        switch section {
        case .projects: "Projects"
        case .home: "Home"
        case .conversations: "Conversations"
        case .connections: "Connections"
        case .chat: store.conversations.first(where: { $0.id == store.selectedConversationID })?.title ?? "New conversation"
        }
    }

    #if os(macOS)
    private var workspaceHeader: some View {
        headerRow
            .padding(.horizontal, 22)
            .padding(.vertical, 12)
            .background(RivunePalette.canvas.opacity(0.55))
            .overlay(alignment: .bottom) { Rectangle().fill(RivunePalette.hairline.opacity(0.5)).frame(height: 0.5) }
    }

    private var headerRow: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 3) {
                Text(workspaceTitle)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(RivunePalette.primaryText)
                    .lineLimit(1)
                if section == .chat {
                    Text(store.activeConfigurationSummary.replacingOccurrences(of: "Codex", with: "ChatGPT"))
                        .font(.system(size: 10))
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            Button { store.showConnections = true } label: {
                HStack(spacing: 6) {
                    Circle().fill(store.canSendInCurrentMode ? RivunePalette.success : RivunePalette.tertiaryText).frame(width: 4, height: 4)
                    Text(store.canSendInCurrentMode ? "Ready" : "Connect")
                        .font(.system(size: 10, weight: .medium))
                }
                .foregroundStyle(RivunePalette.secondaryText)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(RivunePalette.control, in: Capsule())
            }
            .buttonStyle(.plain)
            .help("Manage your connections")
            headerActions
        }
    }

    private var headerActions: some View {
        Menu {
            Button("API conversations", systemImage: "globe") { store.showUniversalAPI = true }
            Button {
                store.showProjectWorkspace = true
            } label: {
                Label("Project", systemImage: "folder")
            }
            Button {
                isWorkPanelPresented.toggle()
            } label: {
                Label(isWorkPanelPresented ? "Hide work inspector" : "Show work inspector", systemImage: "sidebar.right")
            }
            .keyboardShortcut("i", modifiers: [.command, .shift])

            Divider()

            Button(action: toggleConversationContext) {
                Label(
                    store.memoryEnabled ? "Do not include previous messages" : "Include previous messages",
                    systemImage: store.memoryEnabled ? "brain.head.profile.fill" : "brain.head.profile"
                )
            }

            Divider()

            Button {
                store.showConnections = true
            } label: {
                Label("Connections", systemImage: "network")
            }
            Button {
                store.showSettings = true
            } label: {
                Label("Settings", systemImage: "gearshape")
            }
        } label: {
            Image(systemName: "slider.horizontal.3")
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(RivunePalette.secondaryText)
                .frame(width: 32, height: 32)
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .fixedSize()
        .help("Workspace options")
        .accessibilityLabel("Workspace options")
        .accessibilityValue(store.memoryEnabled ? "Previous messages included" : "Previous messages not included")
    }
    #endif

    #if os(iOS)
    private var mobileModeMenu: some View {
        ModelSelector(
            selection: $store.mode,
            isDisabled: store.isGenerating,
            presentation: .compact,
            catalog: providerCatalog,
            isExpanded: isMobileProviderSelectorExpanded,
            onToggle: {
                guard !store.isGenerating else { return }
                isMobileProviderSelectorExpanded.toggle()
            }
        )
    }

    private var mobileOptionsMenu: some View {
        Menu {
            Button(action: toggleConversationContext) {
                Label(
                    store.memoryEnabled ? "Do not include previous messages" : "Include previous messages",
                    systemImage: store.memoryEnabled ? "brain.head.profile.fill" : "brain.head.profile"
                )
            }

            Divider()

            Button("Settings", systemImage: "gearshape") {
                store.showSettings = true
            }
        } label: {
            Image(systemName: "ellipsis.circle")
                .font(.system(size: 15, weight: .semibold))
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel("Chat options")
        .accessibilityValue(store.memoryEnabled ? "Previous messages included" : "Previous messages not included")
    }
    #endif

    private func toggleConversationContext() {
        store.memoryEnabled.toggle()
        store.showPrototypeNotice(
            store.memoryEnabled
                ? "The next request will include up to 8 recent Rivune turns, capped at 12 KB"
                : "The next request will include only the current message and selected files"
        )
    }

    private var transcript: some View {
        ScrollViewReader { proxy in
            ZStack(alignment: .bottomTrailing) {
                ScrollView {
                    LazyVStack(spacing: 36) {
                        ForEach(store.turns) { turn in
                            TurnView(
                                turn: turn,
                                stage: turn.id == store.turns.last?.id && store.isGenerating
                                    ? store.councilStage
                                    : turn.executionState?.councilStage ?? .complete,
                                isGenerating: turn.id == store.turns.last?.id && store.isGenerating,
                                allowsRetry: !store.isGenerating,
                                onRetry: { store.retry(turn) }
                            )
                            .id(turn.id)
                        }

                        Color.clear
                            .frame(height: 64)
                            .id("transcript-bottom")
                    }
                    .frame(maxWidth: 860)
                    .padding(.horizontal, 18)
                    .padding(.top, 28)
                    .padding(.bottom, 20)
                    .frame(maxWidth: .infinity)
                }
                #if os(macOS)
                .scrollIndicators(.visible)
                #else
                .scrollIndicators(.automatic)
                #endif
                .onScrollGeometryChange(for: Bool.self) { geometry in
                    geometry.contentSize.height <= geometry.containerSize.height
                        || geometry.visibleRect.maxY >= geometry.contentSize.height - 96
                } action: { _, isNearBottom in
                    isNearTranscriptBottom = isNearBottom
                    if isNearBottom { hasNewTranscriptContent = false }
                }

                if !isNearTranscriptBottom {
                    Button {
                        scrollToBottom(proxy)
                    } label: {
                        Image(systemName: hasNewTranscriptContent ? "arrow.down.circle.fill" : "arrow.down")
                            .font(.system(size: 14, weight: .semibold))
                            .frame(width: 44, height: 44)
                            .background(.regularMaterial, in: Circle())
                            .overlay { Circle().stroke(RivunePalette.hairline, lineWidth: 0.6) }
                            .shadow(color: .black.opacity(0.22), radius: 10, y: 5)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(hasNewTranscriptContent ? RivunePalette.rivune : RivunePalette.secondaryText)
                    .padding(18)
                    .accessibilityLabel(hasNewTranscriptContent ? "Show new answer" : "Scroll to latest")
                }
            }
            .onChange(of: store.turns) { oldTurns, newTurns in
                if let completedTurnID = newlyCompletedTogetherTurnID(
                    from: oldTurns,
                    to: newTurns
                ) {
                    if isNearTranscriptBottom {
                        scrollToFinalAnswer(proxy, turnID: completedTurnID)
                    } else {
                        hasNewTranscriptContent = true
                    }
                } else if newTurns.count > oldTurns.count || isNearTranscriptBottom {
                    scrollToLatestTurnStart(proxy)
                } else {
                    hasNewTranscriptContent = true
                }
            }
            .onChange(of: store.councilStage) { _, _ in
                if !isNearTranscriptBottom {
                    hasNewTranscriptContent = true
                }
            }
        }
    }

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        if reduceMotion {
            proxy.scrollTo("transcript-bottom", anchor: .bottom)
        } else {
            withAnimation(.easeOut(duration: 0.32)) {
                proxy.scrollTo("transcript-bottom", anchor: .bottom)
            }
        }
        hasNewTranscriptContent = false
    }

    private func scrollToLatestTurnStart(_ proxy: ScrollViewProxy) {
        guard let lastTurnID = store.turns.last?.id else { return }
        if reduceMotion {
            proxy.scrollTo(lastTurnID, anchor: .top)
        } else {
            withAnimation(.easeOut(duration: 0.28)) {
                proxy.scrollTo(lastTurnID, anchor: .top)
            }
        }
        hasNewTranscriptContent = false
    }

    private func scrollToFinalAnswer(_ proxy: ScrollViewProxy, turnID: UUID) {
        let anchor = finalAnswerAnchorID(for: turnID)
        if reduceMotion {
            proxy.scrollTo(anchor, anchor: .top)
        } else {
            withAnimation(.easeOut(duration: 0.32)) {
                proxy.scrollTo(anchor, anchor: .top)
            }
        }
        hasNewTranscriptContent = false
    }

    private func newlyCompletedTogetherTurnID(
        from oldTurns: [ChatTurn],
        to newTurns: [ChatTurn]
    ) -> UUID? {
        for newTurn in newTurns.reversed()
        where newTurn.mode == .together && newTurn.combinedAnswer != nil {
            guard let oldTurn = oldTurns.first(where: { $0.id == newTurn.id }) else {
                continue
            }
            if oldTurn.combinedAnswer == nil {
                return newTurn.id
            }
        }
        return nil
    }
}

private struct ConversationLibraryView: View {
    @ObservedObject var store: RivuneStore
    @Binding var section: WorkspaceSection

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Pick up where you left off.")
                        .font(.system(size: 25, weight: .medium)).tracking(-0.5)
                    Text("Your ideas, questions, and work in one place.")
                        .font(.system(size: 13)).foregroundStyle(RivunePalette.secondaryText)
                }
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").foregroundStyle(RivunePalette.tertiaryText)
                    TextField("Search conversations", text: $store.searchText).textFieldStyle(.plain)
                    Menu {
                        Picker("Show conversations", selection: $store.sidebarDestination) {
                            ForEach(SidebarDestination.allCases) { Text($0.rawValue).tag($0) }
                        }
                    } label: {
                        Label(store.sidebarDestination.rawValue, systemImage: "line.3.horizontal.decrease")
                    }
                    .fixedSize()
                }
                .font(.system(size: 12))
                .padding(13)
                .background(RivunePalette.control, in: RoundedRectangle(cornerRadius: 11))
                RivuneSelect(title: "Filter by project", selection: $store.projectFilterID, options: [("All chats", nil)] + store.projects.map { ($0.name, Optional($0.id)) })
                if store.filteredConversations.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "bubble.left.and.bubble.right").font(.system(size: 25, weight: .light))
                        Text(store.searchText.isEmpty ? "Your next idea starts here." : "No conversations match your search.")
                            .font(.system(size: 14))
                        Button("New conversation", systemImage: "plus") {
                            store.newChat()
                            section = .home
                        }
                        .buttonStyle(.bordered)
                        #if os(iOS)
                        .disabled(store.isGenerating)
                        #endif
                    }
                    .foregroundStyle(RivunePalette.secondaryText)
                    .frame(maxWidth: .infinity).padding(.vertical, 70)
                } else {
                    LazyVStack(spacing: 8) {
                        ForEach(store.filteredConversations) { conversation in
                            Button {
                                store.selectConversation(conversation.id)
                                section = .chat
                            } label: {
                                HStack(spacing: 13) {
                                    ProviderIdentityMark(mode: conversation.mode, size: 31)
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(conversation.title).font(.system(size: 13, weight: .medium)).foregroundStyle(RivunePalette.primaryText).lineLimit(1)
                                        Text(conversation.preview).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText).lineLimit(1)
                                    }
                                    Spacer(minLength: 5)
                                    Text(conversation.updatedAt, style: .relative)
                                        .font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText)
                                        .lineLimit(1)
                                    Image(systemName: "chevron.right").font(.system(size: 9)).foregroundStyle(RivunePalette.tertiaryText)
                                }
                                .padding(16)
                                .background(RivunePalette.surface.opacity(0.78), in: RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(RivunePalette.hairline.opacity(0.7), lineWidth: 0.6))
                                .contentShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .buttonStyle(.plain)
                            #if os(iOS)
                            .disabled(store.isGenerating)
                            #endif
                        }
                    }
                }
            }
            .frame(maxWidth: 860, alignment: .leading)
            .padding(30)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct TurnView: View {
    let turn: ChatTurn
    let stage: CouncilStage
    let isGenerating: Bool
    let allowsRetry: Bool
    let onRetry: () -> Void

    @State private var isCollaborationInspectorPresented = false

    var body: some View {
        VStack(spacing: 14) {
            HStack {
                Spacer(minLength: 36)
                VStack(alignment: .trailing, spacing: 8) {
                    if !turn.attachments.isEmpty {
                        HStack(spacing: 6) {
                            if let attachment = turn.attachments.first {
                                Label(attachment.name, systemImage: "doc.text")
                                    .font(.caption2.weight(.medium))
                                    .lineLimit(1)
                                    .frame(maxWidth: 180)
                                    .padding(.horizontal, 9)
                                    .frame(height: 26)
                                    .background(RivunePalette.surface, in: Capsule())
                            }
                            if turn.attachments.count > 1 {
                                Text("+\(turn.attachments.count - 1)")
                                    .font(.caption2.weight(.medium))
                                    .foregroundStyle(RivunePalette.tertiaryText)
                            }
                        }
                    }

                    Text(turn.prompt)
                        .font(.system(size: 15))
                        .foregroundStyle(RivunePalette.primaryText.opacity(0.94))
                        .lineSpacing(3)
                        .padding(.horizontal, 15)
                        .padding(.vertical, 11)
                        .frame(maxWidth: 680, alignment: .trailing)
                        .background(RivunePalette.surfaceRaised, in: RoundedRectangle(cornerRadius: 15, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 15, style: .continuous)
                                .stroke(.white.opacity(0.09), lineWidth: 0.6)
                        }
                }
            }

            switch turn.mode {
            case .chatGPT:
                ResponseCard(
                    source: .chatGPT,
                    answer: turn.chatGPTAnswer,
                    isLoading: isGenerating && turn.chatGPTAnswer == nil,
                    error: turn.chatGPTError,
                    progressStage: stage == .cancelled ? .cancelled : nil,
                    onRetry: retryAction,
                    isPrimary: true
                )

            case .claude:
                ResponseCard(
                    source: .claude,
                    answer: turn.claudeAnswer,
                    isLoading: isGenerating && turn.claudeAnswer == nil,
                    error: turn.claudeError,
                    progressStage: stage == .cancelled ? .cancelled : nil,
                    onRetry: retryAction,
                    isPrimary: true
                )

            case .together:
                // Keep the answer in one stable place throughout the run. The
                // card carries live phase feedback while work is underway; the
                // detailed audit trail always follows it instead of jumping
                // above the answer and swapping positions at completion.
                togetherFinalAnswer
                collaborationReceipt
            }
        }
        .animation(.easeInOut(duration: 0.24), value: stage)
        .sheet(isPresented: $isCollaborationInspectorPresented) {
            collaborationInspector
        }
    }

    private var retryAction: (() -> Void)? {
        allowsRetry ? onRetry : nil
    }

    private var collaborationReceipt: some View {
        CollaborationProgressCard(
            turn: turn,
            stage: stage,
            isGenerating: isGenerating,
            onShowWork: { isCollaborationInspectorPresented = true }
        )
    }

    private var togetherFinalAnswer: some View {
        ResponseCard(
            source: .alloy,
            answer: turn.combinedAnswer,
            isLoading: isGenerating && turn.combinedAnswer == nil,
            error: turn.combinedError,
            progressStage: isGenerating || turn.combinedError != nil ? stage : nil,
            onRetry: retryAction,
            retryLabel: "Run collaboration again",
            eyebrow: "Final answer",
            emptyStateMessage: finalAnswerEmptyStateMessage,
            isPrimary: true
        )
        .id(finalAnswerAnchorID(for: turn.id))
    }

    @ViewBuilder
    private var collaborationInspector: some View {
        CollaborationInspectorView(
            turn: turn,
            stage: stage,
            isGenerating: isGenerating
        )
        #if os(macOS)
        .frame(minWidth: 680, idealWidth: 760, minHeight: 590, idealHeight: 700)
        #else
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        #endif
    }

    private var finalAnswerEmptyStateMessage: String {
        guard let trace = turn.togetherTrace else {
            return "Rivune is preparing the final answer"
        }

        let terminalPhase: TogetherPhase?
        switch trace.phase {
        case .failed:
            terminalPhase = trace.failedPhase
        case .cancelled:
            terminalPhase = trace.stoppedPhase
        default:
            return "This response will appear here"
        }

        switch terminalPhase {
        case .planning:
            return "The collaboration stopped before work began"
        case .contributing, .reviewing:
            return "The collaboration stopped before the final answer was resolved"
        case .integrating, .complete, .failed, .cancelled:
            return "The final answer did not finish"
        case nil:
            return "Rivune is preparing the final answer"
        }
    }
}

private func finalAnswerAnchorID(for turnID: UUID) -> String {
    "final-answer-\(turnID.uuidString)"
}

// Only code from the user-facing answer belongs in the output browser. Peer
// contributions can disagree and remain available in the collaboration record.
struct ReturnedCodeSnippet: Identifiable, Equatable {
    let id: Int
    let language: String
    let content: String

    static func extract(from turn: ChatTurn?) -> [ReturnedCodeSnippet] {
        guard let turn else { return [] }
        let answer: AIAnswer?
        switch turn.mode {
        case .chatGPT: answer = turn.chatGPTAnswer
        case .claude: answer = turn.claudeAnswer
        case .together: answer = turn.combinedAnswer
        }
        guard let answer else { return [] }
        return ResponseTextParser.parse(answer.content).enumerated().compactMap { index, block in
            guard case .code(let language, let text) = block, !text.isEmpty else { return nil }
            return ReturnedCodeSnippet(id: index, language: language ?? "text", content: text)
        }
    }
}

#if os(macOS)
private struct DeveloperWorkPanel: View {
    @ObservedObject var store: RivuneStore
    @State private var section = "Activity"
    @State private var selectedTurnID: UUID?
    @State private var showDetails = false
    @State private var copiedID: Int?
    @State private var inspectDraft = false

    private var selectedTurn: ChatTurn? {
        store.turns.first(where: { $0.id == selectedTurnID }) ?? store.turns.last
    }
    private var isActive: Bool { store.isGenerating && selectedTurn?.id == store.turns.last?.id }
    private var stage: CouncilStage { isActive ? store.councilStage : selectedTurn?.executionState?.councilStage ?? .idle }
    private var inspectingNextMessage: Bool { inspectDraft || selectedTurn == nil }
    private var attachments: [PromptAttachment] { inspectingNextMessage ? store.draftAttachments : selectedTurn?.attachments ?? [] }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Image(systemName: "square.stack.3d.up")
                    .foregroundStyle(RivunePalette.rivune)
                Text("Workbench").font(.system(size: 13, weight: .semibold))
                Spacer()
                if isActive {
                    ProgressView().controlSize(.mini)
                }
            }
            .padding(20)

            Picker("Inspect", selection: $section) {
                Text("Activity").tag("Activity")
                Text("Code").tag("Code")
                Text("Context").tag("Context")
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.bottom, 16)

            if !store.turns.isEmpty {
                Picker("Request", selection: $selectedTurnID) {
                    Text("Latest request").tag(Optional<UUID>.none)
                    ForEach(store.turns.dropLast()) { turn in
                        Text(turn.prompt).lineLimit(1).tag(Optional(turn.id))
                    }
                }
                .font(.caption)
                .padding(.horizontal, 18)
                .padding(.bottom, 14)
            }

            Rectangle().fill(RivunePalette.hairline).frame(height: 1)
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    switch section {
                    case "Code": codeContent
                    case "Context": contextContent
                    default: activityContent
                    }
                }
                .padding(20)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .scrollIndicators(.automatic)
        }
        .background(RivunePalette.sidebar)
        .foregroundStyle(RivunePalette.primaryText)
        .onChange(of: store.selectedConversationID) { _, _ in selectedTurnID = nil }
        .onChange(of: selectedTurn) { _, _ in copiedID = nil }
        .sheet(isPresented: $showDetails) {
            if let turn = selectedTurn {
                CollaborationInspectorView(turn: turn, stage: stage, isGenerating: isActive)
                    .frame(minWidth: 680, idealWidth: 760, minHeight: 590, idealHeight: 700)
            }
        }
    }

    @ViewBuilder private var activityContent: some View {
        if let turn = selectedTurn {
            sectionLabel("THIS REQUEST")
            Text(turn.prompt)
                .font(.system(size: 13))
                .lineSpacing(4)
                .textSelection(.enabled)
            if turn.mode == .together {
                let receipt = CollaborationReceipt(turn: turn, stage: stage, isGenerating: isActive)
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: receipt.outcome.symbol).foregroundStyle(receipt.outcome.color)
                    VStack(alignment: .leading, spacing: 6) {
                        Text(receipt.statusTitle).font(.system(size: 13, weight: .medium))
                        Text(receipt.statusDetail).font(.caption).foregroundStyle(RivunePalette.secondaryText)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 10))
                VStack(spacing: 0) {
                    if !receipt.isDirectResponse {
                        activityRow("Shared brief", detail: "Direction and division of work", complete: turn.togetherTrace?.sharedPlan?.isEmpty == false)
                    }
                    activityRow("Contributions", detail: "\(receipt.contributionCount) of 2 responses saved", complete: receipt.contributionCount == 2)
                    if !receipt.isDirectResponse {
                        activityRow("Peer review", detail: "\(receipt.reviewCount) of 2 reviews saved", complete: receipt.reviewCount == 2)
                    }
                    activityRow("Final answer", detail: turn.combinedAnswer == nil ? "No integrated answer yet" : "Available in the conversation", complete: turn.combinedAnswer != nil)
                }
                if let issue = receipt.issueDetail {
                    Label(issue, systemImage: "exclamationmark.circle")
                        .font(.caption).foregroundStyle(RivunePalette.claude)
                }
                Button { showDetails = true } label: {
                    HStack { Text("Open full decision record"); Spacer(); Image(systemName: "arrow.up.right") }
                        .font(.caption.weight(.medium))
                        .foregroundStyle(RivunePalette.rivune)
                }
                .buttonStyle(.plain)
            } else {
                Label(isActive ? "Waiting for \(turn.mode.displayName)" : (stage == .complete ? "Response received" : stage.title), systemImage: isActive ? "circle.dotted" : stage.symbol)
                    .font(.subheadline).foregroundStyle(RivunePalette.rivune)
                Text("A direct conversation uses one provider. Any returned code appears in the Code tab.")
                    .font(.caption).foregroundStyle(RivunePalette.secondaryText)
            }
            Text("Model review is recorded here. Build and test commands are not run by this version.")
                .font(.caption2).foregroundStyle(RivunePalette.tertiaryText)
        } else {
            emptyState(symbol: "square.stack.3d.up", title: "Room for the work.", detail: "Start a conversation to follow its progress, inspect returned code, and see exactly which text files were shared.")
            sectionLabel("CONNECTED ENGINES")
            engineRow("ChatGPT", ready: store.codexReadiness.isReady, color: RivunePalette.openAI)
            engineRow("Claude", ready: store.claudeReadiness.isReady, color: RivunePalette.claude)
        }
    }

    @ViewBuilder private var codeContent: some View {
        let snippets = ReturnedCodeSnippet.extract(from: selectedTurn)
        if snippets.isEmpty {
            emptyState(symbol: "chevron.left.forwardslash.chevron.right", title: "Code, with room to read.", detail: "Fenced code blocks from the final answer appear here. You can inspect, copy, or save them without searching through the conversation.")
        } else {
            sectionLabel("RETURNED CODE · \(snippets.count)")
            Text("These are answer excerpts, not files changed in a repository. Review before running.")
                .font(.caption).foregroundStyle(RivunePalette.secondaryText)
            ForEach(snippets) { snippet in
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) {
                        Text(snippet.language.uppercased()).font(.system(size: 10, weight: .semibold, design: .monospaced))
                        Spacer()
                        Button {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(snippet.content, forType: .string)
                            copiedID = snippet.id
                        } label: { Image(systemName: copiedID == snippet.id ? "checkmark" : "doc.on.doc") }
                        .buttonStyle(.plain).help("Copy code").accessibilityLabel("Copy \(snippet.language) code")
                        Button { save(snippet) } label: { Image(systemName: "square.and.arrow.down") }
                            .buttonStyle(.plain).help("Save code as a file").accessibilityLabel("Save \(snippet.language) code")
                    }
                    .foregroundStyle(RivunePalette.rivune)
                    .padding(12)
                    Divider().overlay(RivunePalette.hairline)
                    ScrollView(.horizontal) {
                        Text(snippet.content)
                            .font(.system(size: 11, design: .monospaced))
                            .lineSpacing(4)
                            .textSelection(.enabled)
                            .fixedSize(horizontal: true, vertical: false)
                            .padding(12)
                    }
                    Text("\(snippet.content.split(separator: "\n", omittingEmptySubsequences: false).count) lines")
                        .font(.caption2.monospaced()).foregroundStyle(RivunePalette.tertiaryText)
                        .padding(.horizontal, 12).padding(.bottom, 10)
                }
                .background(RivunePalette.canvas, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(RivunePalette.hairline))
            }
        }
    }

    @ViewBuilder private var contextContent: some View {
        if selectedTurn != nil {
            Picker("Context source", selection: $inspectDraft) {
                Text("This request").tag(false)
                Text("Next message").tag(true)
            }
            .pickerStyle(.segmented)
        }
        sectionLabel(inspectingNextMessage ? "NEXT MESSAGE" : "SHARED WITH THIS REQUEST")
        if attachments.isEmpty {
            emptyState(symbol: "doc.text", title: "Only the context you choose.", detail: "No text files \(inspectingNextMessage ? "are attached to the next message" : "were attached to this request"). Use the paperclip in the composer to add a text or code file.")
        } else {
            ForEach(attachments) { attachment in
                DisclosureGroup {
                    ScrollView(.horizontal) {
                        Text(attachment.textContent)
                            .font(.system(size: 11, design: .monospaced))
                            .textSelection(.enabled)
                            .padding(.vertical, 10)
                    }
                } label: {
                    HStack {
                        Image(systemName: "doc.text")
                        Text(attachment.name).lineLimit(1)
                        Spacer()
                        Text(attachment.sizeLabel).font(.caption2).foregroundStyle(RivunePalette.tertiaryText)
                    }
                    .font(.caption)
                }
                .tint(RivunePalette.rivune)
                .padding(12)
                .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 10))
            }
        }
        Label("\(store.memoryEnabled ? "Recent conversation included" : "Previous messages excluded") on the next send", systemImage: "text.bubble")
            .font(.caption).foregroundStyle(RivunePalette.secondaryText)
        Text("Attaching a file shares its text. It does not grant access to the surrounding folder.")
            .font(.caption2).foregroundStyle(RivunePalette.tertiaryText)
    }

    private func sectionLabel(_ title: String) -> some View {
        Text(title).font(.system(size: 9, weight: .semibold)).tracking(1.3).foregroundStyle(RivunePalette.tertiaryText)
    }
    private func emptyState(symbol: String, title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            Image(systemName: symbol).font(.system(size: 23, weight: .light)).foregroundStyle(RivunePalette.rivune).padding(.top, 15)
            Text(title).font(.system(size: 21, weight: .medium)).tracking(-0.5)
            Text(detail).font(.system(size: 12)).lineSpacing(4).foregroundStyle(RivunePalette.secondaryText)
        }
        .padding(.bottom, 12)
    }
    private func activityRow(_ title: String, detail: String, complete: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: complete ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(complete ? RivunePalette.success : RivunePalette.tertiaryText)
            VStack(alignment: .leading, spacing: 5) {
                Text(title).font(.system(size: 12, weight: .medium))
                Text(detail).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) { Rectangle().fill(RivunePalette.hairline).frame(height: 0.5) }
    }
    private func engineRow(_ title: String, ready: Bool, color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(title).font(.system(size: 12, weight: .medium))
            Spacer()
            Text(ready ? "Ready" : "Check Settings").font(.caption2).foregroundStyle(RivunePalette.secondaryText)
        }
    }
    private func save(_ snippet: ReturnedCodeSnippet) {
        let panel = NSSavePanel()
        panel.title = "Save returned code"
        let extensions = ["swift": "swift", "html": "html", "css": "css", "javascript": "js", "js": "js", "typescript": "ts", "tsx": "tsx", "python": "py", "json": "json", "bash": "sh", "sh": "sh"]
        panel.nameFieldStringValue = "response.\(extensions[snippet.language.lowercased()] ?? "txt")"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            try snippet.content.write(to: url, atomically: true, encoding: .utf8)
            store.showPrototypeNotice("Saved \(url.lastPathComponent)")
        } catch {
            store.showPrototypeNotice("Could not save the file: \(error.localizedDescription)")
        }
    }
}
#endif
