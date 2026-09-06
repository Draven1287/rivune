import SwiftUI

enum WorkspaceSection: Hashable {
    case home, conversations, chat, connections, projects
}

struct RootView: View {
    @ObservedObject var store: RivuneStore
    @ObservedObject var bridge: PeerBridge
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    #if os(iOS)
    @State private var columnVisibility: NavigationSplitViewVisibility = .detailOnly
    #else
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @Environment(\.openSettings) private var openSettings
    @StateObject private var projectWorkspace = ProjectWorkspaceSession()
    #endif
    @State private var preferredCompactColumn: NavigationSplitViewColumn = .detail
    @State private var workspaceSection: WorkspaceSection = .home
    @State private var hasSelectedInitialSection = false
    @State private var setupStage: ConnectionSetupStage = .account

    private var isStarting: Bool { !store.hasCompletedStartup && !RivuneLaunchContext.isIsolated }
    private var isSettingUp: Bool { store.showAccountSetup && !RivuneLaunchContext.isIsolated }
    private var hasExistingWorkspace: Bool {
        !ConnectionSetupPresentationPolicy.requiresInitialSetup(
            setupCompleted: !RivuneLaunchContext.isIsolated && UserDefaults.standard.bool(forKey: "rivune.connectionSetupSeen.v1"),
            hasLocalHistory: !store.conversations.isEmpty
        )
    }

    var body: some View {
        ZStack {
            appContent
                .disabled(isStarting || isSettingUp)
                .allowsHitTesting(!isStarting && !isSettingUp)
                .accessibilityHidden(isStarting || isSettingUp)

            if isSettingUp {
                ConnectionSetupSheet(store: store, stage: $setupStage, onComplete: finishSetup,
                    allowDismissToWorkspace: hasExistingWorkspace,
                    onDismiss: { store.showAccountSetup = false })
                    .transition(.opacity)
                    .zIndex(20)
            }
            if isStarting {
                SpaceStartupView(store: store, onReady: finishArrival, onConnect: openStartupConnections)
                    .transition(.opacity)
                    .zIndex(30)
            }
        }
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.5), value: isStarting)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.3), value: isSettingUp)
        .tint(RivunePalette.rivune)
        .preferredColorScheme(.dark)
        #if os(macOS)
        .toolbarBackground(RivunePalette.canvas, for: .windowToolbar)
        .toolbarBackground(.visible, for: .windowToolbar)
        #endif
        .environmentObject(bridge)
        .onAppear {
            guard !hasSelectedInitialSection else { return }
            hasSelectedInitialSection = true
            workspaceSection = store.turns.isEmpty ? .home : .chat
        }
        .onChange(of: store.settingsPresentationRevision) { _, _ in
            // An explicit settings request changes presentation only.
            store.hasCompletedStartup = true
            store.showAccountSetup = false
            store.showSettings = true
        }
        .onChange(of: store.showAccountSetup) { _, presented in
            if presented { store.showSettings = false }
            else { setupStage = .account }
        }
        .onChange(of: store.showConnections) { _, isPresented in
            guard isPresented else { return }
            store.showSettings = false
            workspaceSection = .connections
            store.showConnections = false
            #if os(iOS)
            preferredCompactColumn = .detail
            columnVisibility = .detailOnly
            #endif
        }
        .onChange(of: store.selectedConversationID) { _, id in
            if id != nil { workspaceSection = .chat }
        }
        .onChange(of: store.conversationPresentationRevision) { _, _ in
            store.showSettings = false
            workspaceSection = .chat
        }
        #if os(macOS)
        .onChange(of: store.showSettings) { _, requested in
            if requested { openSettings(); store.showSettings = false }
        }
        .sheet(isPresented: $store.showUniversalAPI) {
            UniversalAPIWorkspaceView()
        }
        .sheet(isPresented: $store.showBrowserConnection) {
            BrowserConnectionSheet(server: store.workspaceServer, onStart: store.startBrowserConnection)
        }
        .sheet(isPresented: $store.showProjectWorkspace) {
            ProjectWorkspaceView(store: store, session: projectWorkspace)
        }
        #endif
        .sheet(isPresented: Binding(get: { store.showEvaluationLab && !RivuneLaunchContext.isIsolated }, set: { store.showEvaluationLab = $0 })) {
            EvaluationLabView(store: store)
                .environmentObject(bridge)
        }
        .alert("Use Rivune mode?", isPresented: $store.showTogetherPrivacyPrompt) {
            Button("Cancel", role: .cancel) {
                store.cancelTogetherSharing()
            }
            Button("Allow once") {
                store.approveTogetherSharingOnceAndSend()
            }
            Button("Always allow") {
                store.approveTogetherSharingAlwaysAndSend()
            }
        } message: {
            Text("Rivune mode sends your prompt, recent conversation context, and attached text to both providers. They create and challenge a shared work plan, receive coordinated roles, review each other's contributions, and send the complete collaboration to ChatGPT for integration. Complex collaborations normally use seven model requests; one bounded Claude integration retry can make eight.")
        }
        .overlay(alignment: .top) {
            if let notice = store.showActionNotice {
                ActionNotice(text: notice)
                    .padding(.top, 14)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .zIndex(10)
            }
        }
        .animation(.spring(response: 0.42, dampingFraction: 0.86), value: store.showActionNotice)
    }

    private func finishArrival() {
        guard store.startupPhase == .ready, store.readyProviderCount > 0 else { openStartupConnections(); return }
        store.hasCompletedStartup = true
        if !hasExistingWorkspace {
            setupStage = .account
            store.showAccountSetup = true
        } else {
            store.finishStartup()
        }
    }

    private func openStartupConnections() {
        setupStage = hasExistingWorkspace ? .connections : .account
        store.hasCompletedStartup = true
        store.showAccountSetup = true
    }

    private func finishSetup() {
        guard store.completeConnectionSetup() else { return }
        store.finishStartup()
    }

    private var appContent: some View {
        ZStack {
            workspace
                .opacity(isSettingsPresented ? 0 : 1)
                .disabled(isSettingsPresented)
                .allowsHitTesting(!isSettingsPresented)
                .accessibilityHidden(isSettingsPresented)

            if isSettingsPresented {
                SettingsView(store: store) {
                    store.showSettings = false
                }
            }
        }
    }

    private var isSettingsPresented: Bool {
        #if os(macOS)
        false
        #else
        store.showSettings && !RivuneLaunchContext.isIsolated
        #endif
    }

    private var workspace: some View {
        NavigationSplitView(
            columnVisibility: $columnVisibility,
            preferredCompactColumn: $preferredCompactColumn
        ) {
            SidebarView(store: store, section: $workspaceSection) {
                #if os(iOS)
                withAnimation(.smooth(duration: 0.35)) {
                    preferredCompactColumn = .detail
                    columnVisibility = .detailOnly
                }
                #endif
            }
            .navigationSplitViewColumnWidth(min: 228, ideal: 248, max: 300)
        } detail: {
            WorkspaceView(store: store, section: $workspaceSection)
        }
        .navigationSplitViewStyle(.balanced)
    }
}

struct ActionNotice: View {
    let text: String

    var body: some View {
        Label(text, systemImage: "info.circle.fill")
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 16)
            .padding(.vertical, 11)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .background(RivunePalette.surfaceRaised.opacity(0.86), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(RivunePalette.hairline, lineWidth: 0.7)
            }
            .shadow(color: .black.opacity(0.24), radius: 14, y: 7)
            .padding(.horizontal)
    }
}

#Preview {
    let bridge = PeerBridge()
    RootView(store: RivuneStore(bridge: bridge), bridge: bridge)
}
