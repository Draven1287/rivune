import SwiftUI

struct SidebarView: View {
    @ObservedObject var store: RivuneStore
    @Binding var section: WorkspaceSection
    let openDetail: () -> Void
    @State private var conversationToRename: UUID?
    @State private var showAllChats = false
    @State private var renameText = ""
    @State private var conversationToDelete: UUID?
    @State private var hoveredConversationID: UUID?
    @State private var configurationProvider: IntelligenceMode?
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            brandHeader
                .padding(.bottom, 26)
            newConversationButton
                .padding(.bottom, 17)
            primaryNavigation
                .padding(.bottom, 20)
            searchRow
                .padding(.bottom, 15)
            projectNavigation
                .padding(.bottom, 12)
            workspaceHeading
                .padding(.bottom, 8)
            conversationList
            footerControls
        }
        .padding(.horizontal, 14)
        .padding(.top, 18)
        .padding(.bottom, 12)
        .background { RivuneBackground().overlay(RivunePalette.sidebar.opacity(0.68)) }
        .navigationTitle("")
        .alert("Rename chat", isPresented: renameIsPresented) {
            TextField("Chat title", text: $renameText)
            Button("Cancel", role: .cancel) { conversationToRename = nil }
            Button("Save") {
                if let id = conversationToRename { store.renameConversation(id, to: renameText) }
                conversationToRename = nil
            }
        }
        .confirmationDialog("Delete this conversation?", isPresented: deleteIsPresented, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                if let id = conversationToDelete { store.deleteConversation(id) }
                conversationToDelete = nil
            }
            Button("Cancel", role: .cancel) { conversationToDelete = nil }
        } message: {
            Text("This removes the locally saved conversation from Rivune.")
        }
    }

    private var brandHeader: some View {
        HStack(spacing: 9) {
            RivuneOrb(size: 35, motionEnabled: false)
            RivuneWordmark(width: 124)
            Spacer(minLength: 0)
        }
        .frame(height: 30)
        .padding(.horizontal, 6)
    }

    private var newConversationButton: some View {
        Button(action: newThread) {
            HStack(spacing: 9) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 14, weight: .regular))
                Text("New conversation")
                    .font(.system(size: 12, weight: .medium))
                Spacer(minLength: 0)
                #if os(macOS)
                Text("⌘ N")
                    .font(.system(size: 10))
                    .foregroundStyle(RivunePalette.tertiaryText)
                #endif
            }
            .foregroundStyle(RivunePalette.primaryText)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity, minHeight: 40)
            .background(LinearGradient(colors: [RivunePalette.surfaceRaised, RivunePalette.surface], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(RivunePalette.hairline, lineWidth: 0.7))
            .contentShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .keyboardShortcut("n", modifiers: .command)
        .help("New conversation (⌘N)")
        #if os(iOS)
        .disabled(store.isGenerating)
        #endif
    }

    private var primaryNavigation: some View {
        VStack(spacing: 3) {
            navigationRow("Home", symbol: "house", destination: .home) {
                if store.selectedConversationID != nil { store.newChat() }
            }
            navigationRow("Conversations", symbol: "bubble.left.and.bubble.right", destination: .conversations) {
                store.sidebarDestination = .chats
            }
            navigationRow("Projects", symbol: "folder", destination: .projects) { store.selectedProjectID = nil }
            navigationRow("Connections", symbol: "point.3.connected.trianglepath.dotted", destination: .connections) {}
        }
    }

    private var projectNavigation: some View {
        VStack(alignment: .leading, spacing: 3) {
            ForEach(Array(store.projects.filter { !$0.isArchived && (store.searchText.isEmpty || $0.name.localizedCaseInsensitiveContains(store.searchText)) }.prefix(4))) { project in
                HStack {
                    Button { store.selectedProjectID = project.id; section = .projects; openDetail() } label: {
                        Label(project.name, systemImage: "folder").font(.caption).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading).padding(8)
                    }.buttonStyle(.plain)
                    RivuneActionMenu(title: "Actions for project \(project.name)", actions: [
                        RivuneMenuAction(title: "Open project", id: "open", systemImage: "folder") {
                            store.selectedProjectID = project.id
                            section = .projects
                        },
                        RivuneMenuAction(title: "New chat", id: "new-chat", systemImage: "square.and.pencil") {
                            store.startProjectChat(project)
                            section = .chat
                        }
                    ])
                }.background(section == .projects && store.selectedProjectID == project.id ? RivunePalette.surfaceRaised : .clear, in: RoundedRectangle(cornerRadius: 8))
                .accessibilityAddTraits(section == .projects && store.selectedProjectID == project.id ? .isSelected : [])
            }
        }
    }

    private func navigationRow(_ title: String, symbol: String, destination: WorkspaceSection, action: @escaping () -> Void) -> some View {
        let selected = section == destination
        return Button {
            action()
            section = destination
            openDetail()
        } label: {
            HStack(spacing: 10) {
                Image(systemName: symbol).font(.system(size: 13, weight: .regular)).frame(width: 18)
                Text(title).font(.system(size: 12, weight: selected ? .medium : .regular))
                Spacer(minLength: 0)
            }
            .foregroundStyle(selected ? RivunePalette.primaryText : RivunePalette.secondaryText)
            .padding(.horizontal, 11)
            .frame(height: 35)
            .background(selected ? RivunePalette.surfaceRaised.opacity(0.75) : .clear, in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(selected ? RivunePalette.hairline : .clear, lineWidth: 0.6))
            .contentShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
        #if os(iOS)
        .disabled(store.isGenerating && destination == .home)
        #endif
    }

    private var searchRow: some View {
        HStack(spacing: 9) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 12))
                .foregroundStyle(RivunePalette.tertiaryText)
            TextField("Search conversations", text: $store.searchText)
                .textFieldStyle(.plain)
                .font(.system(size: 12))
                .focused($isSearchFocused)
                .accessibilityLabel("Search conversations")
            if !store.searchText.isEmpty {
                Button { store.searchText = "" } label: {
                    Image(systemName: "xmark.circle.fill").font(.system(size: 11))
                }
                .buttonStyle(.plain)
                .foregroundStyle(RivunePalette.tertiaryText)
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, 12)
        .frame(height: 34)
        .background(isSearchFocused ? RivunePalette.control : .clear, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(isSearchFocused ? RivunePalette.rivune.opacity(0.3) : .clear, lineWidth: 0.7))
    }

    private var workspaceHeading: some View {
        HStack(spacing: 7) {
            Text("RECENT")
                .font(.system(size: 9, weight: .medium))
                .tracking(1.3)
                .foregroundStyle(RivunePalette.tertiaryText)
                .lineLimit(1)
            Spacer(minLength: 2)
            if store.sidebarDestination != .chats {
                Text(store.sidebarDestination.rawValue)
                    .font(.system(size: 10))
                    .foregroundStyle(RivunePalette.secondaryText)
            }
            workspaceMenu
        }
        .padding(.leading, 11)
        .padding(.trailing, 4)
        .frame(height: 25)
        .accessibilityElement(children: .contain)
    }

    private var workspaceActions: [RivuneMenuAction] {
        var actions = SidebarDestination.allCases.map { destination in
            RivuneMenuAction(
                title: destination.rawValue,
                id: "filter-\(destination.id)",
                systemImage: destination.symbol,
                section: "Show conversations",
                isSelected: store.sidebarDestination == destination
            ) { store.sidebarDestination = destination }
        }
        actions += [
            RivuneMenuAction(title: "Connections", id: "connections", systemImage: "network", section: "Workspace") { store.showConnections = true },
            RivuneMenuAction(title: "Refresh connections", id: "refresh", systemImage: "arrow.clockwise", section: "Workspace") { store.refreshConnections() }
        ]
        #if os(macOS)
        actions += [
            RivuneMenuAction(title: "Open project", id: "project", systemImage: "folder", section: "Workspace") { store.showProjectWorkspace = true },
            RivuneMenuAction(title: "Evaluation Lab", id: "evaluation", systemImage: "checkmark.seal", section: "Workspace", isEnabled: !store.isGenerating) { store.showEvaluationLab = true }
        ]
        #endif
        actions.append(RivuneMenuAction(title: "Settings", id: "settings", systemImage: "gearshape", section: "Workspace") { store.showSettings = true })
        return actions
    }

    private var workspaceMenu: some View {
        RivuneActionMenu(title: "Workspace filters and settings", actions: workspaceActions) {
            Image(systemName: "line.3.horizontal.decrease")
                .font(.system(size: 12, weight: .regular))
                .foregroundStyle(RivunePalette.tertiaryText)
                .frame(width: 25, height: 25)
        }
        .fixedSize()
        .accessibilityValue(store.sidebarDestination.rawValue)
        .help("Filter conversations and manage this workspace")
    }

    private var conversationList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 3) {
                ForEach(showAllChats || !store.searchText.isEmpty ? store.filteredConversations : Array(store.filteredConversations.prefix(8))) { conversation in
                    conversationRow(conversation)
                }
                if store.searchText.isEmpty && store.filteredConversations.count > 8 {
                    Button(showAllChats ? "Show fewer" : "Show all \(store.filteredConversations.count) conversations") { showAllChats.toggle() }
                        .buttonStyle(.plain).font(.caption).foregroundStyle(RivunePalette.rivune).padding(10)
                }
                if store.filteredConversations.isEmpty {
                    Text(emptyStateTitle)
                        .font(.system(size: 12))
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .padding(.horizontal, 11)
                        .padding(.top, 14)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(.bottom, 18)
        }
        .scrollIndicators(.hidden)
    }

    private func conversationRow(_ conversation: Conversation) -> some View {
        let selected = section == .chat && store.selectedConversationID == conversation.id
        let hovered = hoveredConversationID == conversation.id
        return HStack(spacing: 0) {
            Button {
                store.selectConversation(conversation.id)
                section = .chat
                openDetail()
            } label: {
                HStack(spacing: 9) {
                    ProviderIdentityMark(mode: conversation.mode, size: 20)
                    Text(conversation.title)
                        .font(.system(size: 12, weight: selected ? .medium : .regular))
                        .lineLimit(1)
                    if conversation.isFavorite {
                        Image(systemName: "star.fill")
                            .font(.system(size: 7))
                            .foregroundStyle(RivunePalette.tertiaryText)
                    }
                    #if os(macOS)
                    if store.runCoordinator.activeRun(in: conversation.id) != nil {
                        ProgressView().controlSize(.mini).accessibilityLabel("Task running")
                    }
                    #endif
                    Spacer(minLength: 0)
                }
                .padding(.leading, 10)
                .frame(maxWidth: .infinity, minHeight: 32, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .foregroundStyle(selected ? RivunePalette.primaryText : RivunePalette.secondaryText)
            .accessibilityAddTraits(selected ? .isSelected : [])
            #if os(iOS)
            .disabled(store.isGenerating)
            #endif
            RivuneActionMenu(title: "Actions for \(conversation.title)", actions: conversationActions(conversation)) {
                Image(systemName: "ellipsis")
                    .font(.system(size: 10))
                    .foregroundStyle(RivunePalette.tertiaryText)
                    .frame(width: 25, height: 32)
            }
            .fixedSize()
            .accessibilityLabel("Actions for \(conversation.title)")
            #if os(iOS)
            .disabled(store.isGenerating)
            #endif
        }
        .background(selected ? RivunePalette.surfaceRaised : hovered ? RivunePalette.control : .clear, in: RoundedRectangle(cornerRadius: 9))
        .onHover { hoveredConversationID = $0 ? conversation.id : nil }
        .rivuneContextActions(title: "Actions for \(conversation.title)", actions: conversationActions(conversation))
    }

    private var conversationActionsEnabled: Bool {
        #if os(iOS)
        !store.isGenerating
        #else
        true
        #endif
    }

    private func conversationActions(_ conversation: Conversation) -> [RivuneMenuAction] {
        let enabled = conversationActionsEnabled
        let canMove = enabled && !store.hasActiveProviderRuns
        var actions = [
            RivuneMenuAction(title: conversation.isFavorite ? "Remove from Starred" : "Add to Starred", id: "favorite", systemImage: "star", section: "Conversation", isEnabled: enabled) { store.toggleFavorite(conversation.id) },
            RivuneMenuAction(title: "Rename", id: "rename", systemImage: "pencil", section: "Conversation", isEnabled: enabled) {
                renameText = conversation.title
                conversationToRename = conversation.id
            },
            RivuneMenuAction(title: conversation.isArchived ? "Move to Chats" : "Archive", id: "archive", systemImage: conversation.isArchived ? "tray.and.arrow.up" : "archivebox", section: "Conversation", isEnabled: enabled) {
                store.toggleArchive(conversation.id)
            },
            RivuneMenuAction(title: "All chats (no project)", id: "project-none", systemImage: "bubble.left.and.bubble.right", section: "Move to project", isEnabled: canMove, isSelected: conversation.projectID == nil) {
                store.moveConversation(conversation.id, to: nil)
            }
        ]
        actions += store.projects.filter { !$0.isArchived }.map { project in
            RivuneMenuAction(title: project.name, id: "project-\(project.id.uuidString)", systemImage: "folder", section: "Move to project", isEnabled: canMove, isSelected: conversation.projectID == project.id) {
                store.moveConversation(conversation.id, to: project.id)
            }
        }
        actions.append(RivuneMenuAction(title: "Delete", id: "delete", systemImage: "trash", section: "Remove conversation", isEnabled: enabled, destructive: true) {
            conversationToDelete = conversation.id
        })
        return actions
    }

    private var footerControls: some View {
        VStack(spacing: 8) {
            Rectangle()
                .fill(RivunePalette.hairline)
                .frame(height: 0.5)
                .padding(.bottom, 8)
            HStack(spacing: 4) {
                #if os(macOS)

                #else
                footerButton("Refresh connections", symbol: "arrow.clockwise") { store.refreshConnections() }
                #endif
                Spacer(minLength: 0)
                Button { store.showSettings = true } label: {
                    Label("Settings", systemImage: "gearshape")
                        .font(.system(size: 11))
                        .foregroundStyle(RivunePalette.secondaryText)
                        .padding(.horizontal, 8)
                        .frame(height: 34)
                }
                .buttonStyle(.plain)
                .help("Settings")
            }
            .padding(.horizontal, 3)
        }
        .padding(.top, 8)
    }

    private func providerConfigurationRow(_ mode: IntelligenceMode) -> some View {
        let isExpanded = Binding(
            get: { configurationProvider == mode },
            set: { shown in
                if shown { configurationProvider = mode }
                else if configurationProvider == mode { configurationProvider = nil }
            }
        )
        let ready = mode == .chatGPT ? store.codexReadiness.isReady : store.claudeReadiness.isReady
        return Button {
            guard !store.hasActiveProviderRuns else { return }
            configurationProvider = mode
        } label: {
            HStack(spacing: 9) {
                ProviderIdentityMark(mode: mode, size: 23)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(mode.displayName).font(.system(size: 11, weight: .medium))
                        Circle().fill(ready ? RivunePalette.success : RivunePalette.tertiaryText).frame(width: 4, height: 4)
                    }
                    Text(providerConfigurationSummary(mode))
                        .font(.system(size: 10))
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.down").font(.system(size: 8, weight: .semibold))
                    .foregroundStyle(RivunePalette.tertiaryText)
            }
            .foregroundStyle(RivunePalette.primaryText)
            .padding(.horizontal, 10)
            .frame(height: 45)
            .background(configurationProvider == mode ? RivunePalette.surfaceRaised : RivunePalette.surface.opacity(0.82), in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(RivunePalette.hairline, lineWidth: 0.6))
            .contentShape(RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
        .disabled(store.hasActiveProviderRuns)
        .help("Choose \(mode.displayName) model and reasoning")
        .accessibilityLabel("\(mode.displayName) models and reasoning")
        .accessibilityValue(providerConfigurationSummary(mode) + (ready ? ", ready" : ", connection required"))
        .accessibilityHint(store.hasActiveProviderRuns ? "Settings are locked while a task is running" : "Opens model and reasoning choices")
        .rivuneDismissOnFocusLoss(isPresented: isExpanded)
        .popover(isPresented: isExpanded, arrowEdge: .trailing) {
            ProviderModelPickerPanel(store: store, mode: mode) {
                configurationProvider = nil
            }
            #if os(macOS)
            .frame(width: 430)
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

    private func providerConfigurationSummary(_ mode: IntelligenceMode) -> String {
        #if os(iOS)
        "Managed on your Mac"
        #else
        store.configurationSummary(for: mode, compact: true).replacingOccurrences(of: "Codex default", with: "Account default")
        #endif
    }

    private func footerButton(_ title: String, symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(RivunePalette.secondaryText)
                .frame(width: 34, height: 34)
                .contentShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .help(title)
        .accessibilityLabel(title)
    }

    private func newThread() {
        store.newChat()
        section = .home
        openDetail()
    }

    private var emptyStateTitle: String {
        if !store.searchText.isEmpty { return "No matching conversations" }
        switch store.sidebarDestination {
        case .chats: return "Your conversations will appear here."
        case .starred: return "No starred conversations"
        case .archive: return "No archived conversations"
        }
    }

    private var renameIsPresented: Binding<Bool> {
        Binding(get: { conversationToRename != nil }, set: { if !$0 { conversationToRename = nil } })
    }

    private var deleteIsPresented: Binding<Bool> {
        Binding(get: { conversationToDelete != nil }, set: { if !$0 { conversationToDelete = nil } })
    }
}
