import SwiftUI
import UniformTypeIdentifiers
import CoreImage.CIFilterBuiltins

#if os(macOS)
import AppKit
#else
import UIKit
#endif

enum SettingsSection: String, CaseIterable, Identifiable, Hashable {
    case account, general, providers, models, appearance, privacy, devices, about
    var id: Self { self }
    var title: String {
        switch self {
        case .account: "Account"
        case .general: "General"
        case .providers: "AI Connections"
        case .models: "Models & reasoning"
        case .appearance: "Appearance"
        case .privacy: "Data & privacy"
        case .devices: "Devices"
        case .about: "About & shortcuts"
        }
    }
    var symbol: String {
        switch self {
        case .account: "person.crop.circle"
        case .general: "gearshape"
        case .providers: "point.3.connected.trianglepath.dotted"
        case .models: "slider.horizontal.3"
        case .appearance: "circle.lefthalf.filled"
        case .privacy: "lock.shield"
        case .devices: "macbook.and.iphone"
        case .about: "info.circle"
        }
    }
    var detail: String {
        switch self {
        case .account: "Your Rivune identity and the workspace on this device."
        case .general: "Choose how conversations begin and what context follows your requests."
        case .providers: "Connect your providers once. See which CLI or API each conversation will use."
        case .models: "Model and reasoning controls follow each provider’s active connection."
        case .appearance: "A workspace that feels comfortable, focused, and unmistakably yours."
        case .privacy: "Control shared context and take your conversation history with you."
        case .devices: "Connect Rivune on iPhone to the providers running through your Mac."
        case .about: "App information and shortcuts for everyday work."
        }
    }
    var group: String {
        switch self {
        case .account, .general: "PERSONAL"
        case .providers, .models: "INTELLIGENCE"
        case .appearance, .privacy, .devices: "WORKSPACE"
        case .about: "RESOURCES"
        }
    }
    var searchTerms: String {
        switch self {
        case .account: "sign in login email google apple local cloud profile setup"
        case .general: "conversation context memory default mode rivune chatgpt claude"
        case .providers: "openai anthropic chatgpt codex claude terminal cli api key credentials connection refresh provider"
        case .models: "openai anthropic chatgpt codex claude model reasoning effort api cli"
        case .appearance: "theme dark black glass motion animation startup arrival replay accessibility"
        case .privacy: "data history export json sharing consent context privacy storage keychain"
        case .devices: "mac iphone bridge pair pairing qr code encryption network"
        case .about: "version build keyboard shortcut help about"
        }
    }
    static func matching(_ query: String) -> [Self] {
        let terms = query.lowercased().split(whereSeparator: \.isWhitespace)
        return allCases.filter { section in
            let text = "\(section.title) \(section.detail) \(section.searchTerms)".lowercased()
            return terms.allSatisfy { text.contains($0) }
        }
    }
    static func from(_ destination: NativeSettingsDestination) -> Self {
        switch destination {
        case .connections: .providers
        case .models: .models
        case .privacy: .privacy
        case .devices: .devices
        case .account: .account
        }
    }
}

struct SettingsView: View {
    @ObservedObject var store: RivuneStore
    var onClose: (() -> Void)? = nil
    var embeddedSection: SettingsSection? = nil
    var setupDeviceOnly = false
    @EnvironmentObject private var bridge: PeerBridge
    @Environment(\.dismiss) private var dismiss
    private let providerRegistry = CLIProviderRegistry.current
    @AppStorage("rivune.appearance.galaxy") private var galaxy = true
    @AppStorage("rivune.appearance.stars") private var stars = true
    @AppStorage("rivune.appearance.dim") private var backgroundDim = 0.35
    @FocusState private var backButtonFocused: Bool
    @State private var pairingInput = ""
    @State private var showRevokeConfirmation = false
    @State private var showReplacePairingConfirmation = false
    @State private var cliInstallations: [String: CLIExecutableInstallation] = [:]
    @State private var providerScanComplete = false
    @State private var selectedSection: SettingsSection? = .providers
    @State private var settingsQuery = ""
    @State private var isExportingHistory = false
    @State private var historyExport: RivuneHistoryExport?
    private var visibleSections: [SettingsSection] { SettingsSection.matching(settingsQuery) }
    #if os(iOS)
    @State private var showPairingScanner = false
    #endif

    var body: some View {
        Group {
            if setupDeviceOnly {
                deviceSection
            } else if let embeddedSection {
                settingsDetail(for: embeddedSection)
            } else {
                settingsLayout
            }
        }
        .preferredColorScheme(.dark)
        .task {
            refreshProviderDiscovery()
            if embeddedSection == nil && !setupDeviceOnly {
                selectedSection = SettingsSection.from(store.requestedSettingsSection)
            }
        }
        .onChange(of: store.settingsPresentationRevision) { _, _ in
            settingsQuery = ""
            selectedSection = SettingsSection.from(store.requestedSettingsSection)
        }
        .onChange(of: settingsQuery) { _, query in
            if !query.isEmpty, let selectedSection, !visibleSections.contains(selectedSection) {
                self.selectedSection = visibleSections.first
            }
        }
        .fileExporter(isPresented: $isExportingHistory, document: historyExport,
            contentType: .json, defaultFilename: "Rivune-conversations") { result in
            if case .failure = result { store.showPrototypeNotice("The export could not be saved. Your history is unchanged.") }
        }
        #if os(iOS)
        .fullScreenCover(isPresented: $showPairingScanner) {
            PairingScannerView(
                onPayload: { payload in
                    showPairingScanner = false
                    completePairing(using: payload)
                },
                onCancel: {
                    showPairingScanner = false
                }
            )
        }
        #endif
    }

    @ViewBuilder
    private var settingsLayout: some View {
        #if os(macOS)
        HStack(spacing: 0) {
            settingsSidebar
                .frame(width: 250)
            settingsDetail(for: selectedSection ?? .providers)
                .background(RivunePalette.canvas, in: RoundedRectangle(cornerRadius: 20))
                .padding(.vertical, 16)
                .padding(.trailing, 16)
        }
        .background(RivunePalette.sidebar.ignoresSafeArea())
        .frame(minWidth: 820, minHeight: 600)
        #else
        NavigationSplitView {
            List(selection: $selectedSection) {
                ForEach(["PERSONAL", "INTELLIGENCE", "WORKSPACE", "RESOURCES"], id: \.self) { group in
                    let sections = visibleSections.filter { $0.group == group }
                    if !sections.isEmpty {
                        Section(group.capitalized) {
                            ForEach(sections) { section in
                                NavigationLink(value: section) { Label(section.title, systemImage: section.symbol) }.tag(section)
                            }
                        }
                    }
                }
            }
            .searchable(text: $settingsQuery, prompt: "Search settings")
            .navigationTitle("Settings")
            .listStyle(.sidebar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Back to workspace", action: closeSettings)
                }
            }
        } detail: {
            settingsDetail(for: selectedSection ?? .providers)
                .navigationTitle((selectedSection ?? .providers).title)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done", action: closeSettings)
                    }
                }
        }
        .navigationSplitViewStyle(.balanced)
        #endif
    }

    private var settingsSidebar: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 9) {
                RivuneOrb(size: 29, motionEnabled: false)
                RivuneWordmark(width: 124)
                Spacer()
            }
            .padding(.horizontal, 8)
            Button(action: closeSettings) {
                Label("Done", systemImage: "checkmark")
                    .font(.system(size: 12)).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10)
            }
            .buttonStyle(.plain).foregroundStyle(RivunePalette.secondaryText)
            .focused($backButtonFocused)
            .focusEffectDisabled()
            .padding(.vertical, 6)
            .overlay(RoundedRectangle(cornerRadius: 7).stroke(backButtonFocused ? RivunePalette.rivune : .clear, lineWidth: 1))
            .keyboardShortcut(.escape, modifiers: [])
            .tint(RivunePalette.rivune)
            HStack(spacing: 7) {
                Image(systemName: "magnifyingglass").font(.system(size: 11))
                TextField("Search settings", text: $settingsQuery).textFieldStyle(.plain).font(.system(size: 12))
                if !settingsQuery.isEmpty {
                    Button { settingsQuery = "" } label: { Image(systemName: "xmark.circle.fill").font(.system(size: 10)) }
                        .buttonStyle(.plain).accessibilityLabel("Clear settings search")
                }
            }
            .foregroundStyle(RivunePalette.secondaryText).padding(11)
            .background(RivunePalette.control, in: RoundedRectangle(cornerRadius: 9))
            .overlay(RoundedRectangle(cornerRadius: 9).stroke(RivunePalette.hairline, lineWidth: 0.7))
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    ForEach(["PERSONAL", "INTELLIGENCE", "WORKSPACE", "RESOURCES"], id: \.self) { group in
                        let sections = visibleSections.filter { $0.group == group }
                        if !sections.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(group).font(.system(size: 9, weight: .medium)).tracking(1)
                                    .foregroundStyle(RivunePalette.tertiaryText).padding(.horizontal, 10).padding(.bottom, 4)
                                ForEach(sections) { section in
                                    Button { selectedSection = section } label: {
                                        Label(section.title, systemImage: section.symbol)
                                            .font(.system(size: 12, weight: selectedSection == section ? .medium : .regular))
                                            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 10).frame(height: 37)
                                            .background(selectedSection == section ? RivunePalette.composer : .clear, in: RoundedRectangle(cornerRadius: 8))
                                            .contentShape(Rectangle())
                                    }
                                    .buttonStyle(.plain)
                                    .foregroundStyle(selectedSection == section ? RivunePalette.primaryText : RivunePalette.secondaryText)
                                    .accessibilityAddTraits(selectedSection == section ? .isSelected : [])
                                }
                            }
                        }
                    }
                    if visibleSections.isEmpty {
                        Text("No settings found").font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText).padding(10)
                    }
                }
            }
            Label("Local workspace", systemImage: "externaldrive")
                .font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText).padding(10)
        }
        .padding(.horizontal, 16).padding(.top, 22).padding(.bottom, 12)
        .accessibilityElement(children: .contain).accessibilityLabel("Settings navigation")
    }

    private func closeSettings() {
        if let onClose { onClose() } else { dismiss() }
    }

    private func settingsDetail(for section: SettingsSection) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(section.title)
                        .font(.system(size: 22, weight: .medium))
                    Text(section.detail)
                        .font(.system(size: 13))
                        .foregroundStyle(RivunePalette.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Divider().overlay(RivunePalette.hairline)
                sectionContent(section)
            }
            .frame(maxWidth: 860, alignment: .leading)
            .padding(30)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(RivunePalette.canvas.opacity(embeddedSection == nil ? 1 : 0.82))
        .clipShape(RoundedRectangle(cornerRadius: 20))
    }

    @ViewBuilder
    private func sectionContent(_ section: SettingsSection) -> some View {
        switch section {
        case .account:
            accountSettingsSection
        case .general:
            intelligenceSection
            #if os(macOS) && !APP_STORE
            RivuneUpdatesSettings()
            #endif
        case .providers:
            unifiedConnectionsSection
            DisclosureGroup("Advanced connection details") {
                providerArchitectureSection.padding(.top, 18)
            }
            .font(.system(size: 12))
            .foregroundStyle(RivunePalette.secondaryText)
        case .models:
            modelSection
        case .privacy:
            privacySection
            DisclosureGroup("How requests and credentials are handled") {
                engineNote.padding(.top, 12)
            }
            .font(.system(size: 12))
            .foregroundStyle(RivunePalette.secondaryText)
        case .devices:
            deviceSection
        case .appearance:
            appearanceSection
        case .about:
            aboutSection
            DisclosureGroup("Interface preview") { RivuneComponentGallery() }
        }
    }

    private func openSection(_ section: SettingsSection) {
        if embeddedSection == nil { selectedSection = section; return }
        switch section {
        case .account: store.requestedSettingsSection = .account
        case .models: store.requestedSettingsSection = .models
        case .privacy: store.requestedSettingsSection = .privacy
        case .devices: store.requestedSettingsSection = .devices
        default: store.requestedSettingsSection = .connections
        }
        store.showSettings = true
        store.settingsPresentationRevision += 1
    }

    private var unifiedConnectionsSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack(spacing: 12) {
                Label("\(store.readyProviderCount) of \(AIProviderRegistry.current.registrations.filter { $0.workspaceProvider != nil }.count) providers ready", systemImage: "checkmark.circle")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(store.engineIsOnline ? RivunePalette.success : RivunePalette.secondaryText)
                Spacer(minLength: 5)
                Button(store.startupPhase == .checking ? "Checking…" : "Check connections", systemImage: "arrow.clockwise") {
                    guard !RivuneLaunchContext.isIsolated, !store.hasActiveProviderRuns else { return }
                    refreshProviderDiscovery()
                    store.refreshConnections()
                }
                .buttonStyle(.bordered)
                .disabled(RivuneLaunchContext.isIsolated || store.startupPhase == .checking || store.hasActiveProviderRuns)
            }
            #if os(macOS)
            MoreAPIProvidersButton(store: store, inSettings: onClose == nil && !setupDeviceOnly && embeddedSection == nil)
            CLIInventorySettingsView(store: store)
            Text("Rivune uses a signed-in CLI when available, otherwise a checked API connection. You can configure both; each task keeps its selected connection until it finishes.")
                .font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            ForEach(AIProviderRegistry.current.registrations) { provider in
                SettingsCard(title: provider.displayName, symbol: "cpu", accent: providerAccent(provider.id)) {
                    HStack(spacing: 10) {
                        if let mode = mode(for: provider.id) { ProviderIdentityMark(mode: mode, size: 30) }
                        else { Image(systemName: "cpu").frame(width: 30, height: 30) }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(provider.configuration.displayName).font(.system(size: 12, weight: .medium))
                            Text(activeTransportLabel(for: provider.id)).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                        }
                        Spacer(minLength: 8)
                        if mode(for: provider.id) != nil {
                            Button("Models", systemImage: "slider.horizontal.3") { openSection(.models) }.buttonStyle(.bordered)
                        }
                    }
                    ForEach(cliProviderPresentations.filter { $0.registration.provider.id == provider.id }) { item in
                        cliConnectionControl(item)
                    }
                    ForEach(provider.transports.filter { $0.configuration.kind == .api }) { transport in
                        if transport.executionRoute == .openAIResponsesAPI {
                            APIConnectionSettingsView(store: store, providerFilter: .openAI, showsSecurityNote: false)
                        } else if transport.executionRoute == .anthropicMessagesAPI {
                            APIConnectionSettingsView(store: store, providerFilter: .anthropic, showsSecurityNote: false)
                        } else {
                            SettingLabel(title: transport.configuration.displayName, detail: "This connection needs a runtime adapter before it can accept credentials or run requests.", symbol: "shippingbox")
                        }
                    }
                }
            }
            Label("API keys stay in this Mac’s Keychain. Access checks verify credentials and model availability; your first message verifies response generation. API usage is billed by your provider.", systemImage: "lock.shield")
                .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            #else
            SettingsCard(title: "Providers run through your Mac", symbol: "desktopcomputer", accent: RivunePalette.rivune) {
                Text("Add and manage CLI or API connections in Rivune on your Mac, then pair this iPhone. API keys remain in the Mac’s Keychain.")
                    .font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText)
                Button("Manage paired devices", systemImage: "macbook.and.iphone") { openSection(.devices) }.buttonStyle(.bordered)
                ConnectionRow(name: "ChatGPT", detail: "Through the paired Mac", symbol: "cpu", status: store.codexReadiness.label, color: store.codexReadiness.isReady ? RivunePalette.success : RivunePalette.tertiaryText, providerID: "openai")
                ConnectionRow(name: "Claude", detail: "Through the paired Mac", symbol: "cpu", status: store.claudeReadiness.label, color: store.claudeReadiness.isReady ? RivunePalette.success : RivunePalette.tertiaryText, providerID: "anthropic")
            }
            #endif
            if store.hasActiveProviderRuns {
                Label("Connection and model changes are locked while any task is running.", systemImage: "lock")
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
            }
        }
    }

    private func cliConnectionControl(_ item: CLIProviderPresentation) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            ConnectionRow(name: item.registration.transport.displayName, detail: connectionDetail(item), symbol: "terminal", status: item.state.label, color: statusColor(item.state, identity: providerAccent(item.registration.provider.id)))
            #if os(macOS)
            if let route = item.registration.executionRoute, let command = AITextRuntimeRegistry.current.setupAction(for: route)?.commandToCopy {
                HStack(spacing: 10) {
                    Text(command).font(.system(size: 11, design: .monospaced)).textSelection(.enabled)
                    Spacer(minLength: 6)
                    Button("Copy sign-in", systemImage: "doc.on.doc") { copyAuthenticationCommand(for: item.registration) }
                        .buttonStyle(.bordered).disabled(store.hasActiveProviderRuns)
                }
                Text("Install the official client if needed, paste this in Terminal, complete the provider’s sign-in, then check connections. Copying never runs the command.")
                    .font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
            #endif
        }
        .padding(18).background(RivunePalette.canvas.opacity(0.75), in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(RivunePalette.hairline, lineWidth: 0.7))
    }

    private func mode(for providerID: String) -> IntelligenceMode? {
        switch AIProviderRegistry.current.registrations.first(where: { $0.id == providerID })?.workspaceProvider {
        case "codex": .chatGPT
        case "claude": .claude
        default: nil
        }
    }

    private func activeTransportLabel(for providerID: String) -> String {
        #if os(iOS)
        return "Managed on your Mac"
        #else
        guard let mode = mode(for: providerID) else { return "Runtime adapter required" }
        let readiness = mode == .chatGPT ? store.codexReadiness : store.claudeReadiness
        guard readiness.isReady else { return readiness == .checking ? "Checking connections…" : "No verified connection" }
        let route = mode == .chatGPT ? store.currentCodexRoute : store.currentClaudeRoute
        return route.transportKind == .api ? "Active connection · API" : "Active connection · CLI"
        #endif
    }

    private func modelSummary(for mode: IntelligenceMode) -> String {
        #if os(iOS)
        return "Configure models and reasoning on the execution Mac."
        #else
        return store.configurationSummary(for: mode).replacingOccurrences(of: "Codex default", with: "Account default")
        #endif
    }

    private var accountSettingsSection: some View {
        VStack(alignment: .leading, spacing: 22) {
            SettingsCard(title: "Your account", symbol: "person.crop.circle", accent: RivunePalette.rivune) {
                RivuneAccountPanel(onPrivacy: { selectedSection = .privacy })
                Button("Manage AI connections", systemImage: "arrow.right") { openSection(.providers) }.buttonStyle(.bordered)
            }
            Button("Restart local setup", systemImage: "arrow.counterclockwise") {
                store.showSettings = false
                store.showAccountSetup = true
            }
            .buttonStyle(.bordered)
            Text("Reopens Account, Connect AI, and Ready without clearing your conversations or drafts.")
                .font(.system(size: 11)).foregroundStyle(RivunePalette.tertiaryText)
        }
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 22) {
            SettingsCard(title: "Rivune", symbol: "info.circle", accent: RivunePalette.rivune) {
                HStack(spacing: 15) {
                    RivuneOrb(size: 52, motionEnabled: false)
                    VStack(alignment: .leading, spacing: 7) {
                        Text("Multiple perspectives. One workspace.").font(.system(size: 15, weight: .medium))
                        Text("Version \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1") · Build \(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1")")
                            .font(.system(size: 11, design: .monospaced)).foregroundStyle(RivunePalette.secondaryText)
                    }
                }
                Text("This build supports ChatGPT and Claude through registered CLI and API adapters. Additional catalog entries appear only with the capabilities their installed adapters provide.")
                    .font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText).fixedSize(horizontal: false, vertical: true)
            }
            #if os(macOS)
            SettingsCard(title: "Keyboard shortcuts", symbol: "keyboard", accent: RivunePalette.rivune) {
                shortcutRow("New conversation", keys: "⌘ N")
                shortcutRow("Toggle work inspector", keys: "⇧ ⌘ I")
                shortcutRow("Return from Settings", keys: "Esc")
                Text("Shortcuts apply when their workspace controls are available.")
                    .font(.system(size: 10)).foregroundStyle(RivunePalette.tertiaryText)
            }
            #endif
            SettingsCard(title: "Connection diagnostics", symbol: "waveform.path", accent: RivunePalette.rivune) {
                Text(store.startupStatusText).font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText)
                Button("Open AI Connections", systemImage: "arrow.right") { openSection(.providers) }.buttonStyle(.bordered)
            }
        }
    }

    private func shortcutRow(_ title: String, keys: String) -> some View {
        HStack {
            Text(title).font(.system(size: 12))
            Spacer()
            Text(keys).font(.system(size: 11, design: .monospaced)).padding(.horizontal, 9).padding(.vertical, 5)
                .background(RivunePalette.control, in: RoundedRectangle(cornerRadius: 6))
        }
    }

    private var providerArchitectureSection: some View {
        SettingsCard(
            title: "Provider adapters",
            symbol: "point.3.connected.trianglepath.dotted",
            accent: RivunePalette.rivune
        ) {
            VStack(alignment: .leading, spacing: 14) {
                ProviderSectionLabel(
                    title: "Command-line providers",
                    detail: "Rivune checks registered executable names only in trusted install locations. Discovery never launches a CLI.",
                    color: RivunePalette.success
                )

                ForEach(cliProviderPresentations) { item in
                    ProviderCLITransportRow(
                        presentation: item,
                        color: providerAccent(item.registration.provider.id)
                    )
                }

                Divider().overlay(RivunePalette.hairline)

                ProviderSectionLabel(
                    title: "Direct API connections",
                    detail: "OpenAI Responses and Anthropic Messages support text requests. Credentials stay in Keychain; model IDs are configured in API connections above.",
                    color: RivunePalette.rivune
                )

                HStack(alignment: .top, spacing: 11) {
                    Image(systemName: "shippingbox.and.arrow.backward")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(RivunePalette.rivune)
                        .frame(width: 30, height: 30)
                        .background(
                            RivunePalette.rivune.opacity(0.10),
                            in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                        )

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Open provider core")
                            .font(.subheadline.weight(.medium))
                        Text("The catalog can describe any number of CLI or API providers, model capabilities, effort levels, and Rivune participant roles. A discovered CLI is never treated as runnable until its registered adapter implements safe arguments, output parsing, and authentication checks.")
                            .font(.caption)
                            .foregroundStyle(RivunePalette.secondaryText)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(13)
                .background(
                    RivunePalette.canvas.opacity(0.45),
                    in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                )
            }
        }
    }

    private var modelSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            ForEach(AIProviderRegistry.current.registrations.filter { $0.transports.contains(where: \.supportsModelSettings) }) { registration in
                if let mode = mode(for: registration.id) {
                    SettingsCard(title: mode.displayName, symbol: "slider.horizontal.3", accent: providerAccent(registration.id)) {
                        HStack(spacing: 10) {
                            ProviderIdentityMark(mode: mode, size: 29)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(activeTransportLabel(for: registration.id))
                                    .font(.system(size: 12, weight: .medium))
                                Text(modelSummary(for: mode))
                                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                            }
                            Spacer(minLength: 0)
                        }
                        ProviderModelChoiceColumns(store: store, mode: mode) { openSection(.providers) }
                    }
                }
            }
            Text("Your provider controls model access, billing, and usage limits. Changes apply to the next request; active tasks keep their original configuration.")
                .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var deviceSection: some View {
        SettingsCard(title: "Mac & iPhone", symbol: "macbook.and.iphone", accent: RivunePalette.rivune) {
            VStack(spacing: 13) {
                ConnectionRow(
                    name: executionMacName,
                    detail: macDetail,
                    symbol: "macbook",
                    status: macStatus,
                    color: macStatusColor
                )

                Divider().overlay(.white.opacity(0.07))

                bridgeControls
            }
        }
        .confirmationDialog(
            "Forget the paired device?",
            isPresented: $showRevokeConfirmation,
            titleVisibility: .visible
        ) {
            Button("Forget and revoke", role: .destructive) {
                bridge.revokePairing()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("The encrypted key is removed from this device. Pair again to reconnect.")
        }
        .confirmationDialog(
            "Replace the paired iPhone?",
            isPresented: $showReplacePairingConfirmation,
            titleVisibility: .visible
        ) {
            Button("Replace pairing", role: .destructive) {
                bridge.beginPairing()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Creating a new code revokes this Mac's current iPhone pairing immediately. The existing phone will need the new code to reconnect.")
        }
    }

    @ViewBuilder
    private var bridgeControls: some View {
        ConnectionRow(
            name: bridgeName,
            detail: bridgeDetail,
            symbol: "macbook.and.iphone",
            status: bridge.state.label,
            color: bridge.state.isConnected ? RivunePalette.success : RivunePalette.rivune
        )

        #if os(macOS)
        Toggle(isOn: Binding(
            get: { bridge.isAdvertising },
            set: { bridge.setAdvertising($0) }
        )) {
            SettingLabel(
                title: "Allow iPhone connections",
                detail: "Uses an encrypted same-network connection while Rivune is open",
                symbol: "network"
            )
        }
        .tint(RivunePalette.rivune)

        if let code = bridge.pairingCode {
            VStack(spacing: 12) {
                PairingQRCode(code: "rivune://pair?code=" + code)
                    .frame(width: 164, height: 164)

                Text("Install Rivune on your iPhone first. Scan with Camera to open Rivune, or use Devices → Scan pairing QR inside Rivune. Keep both devices on the same Wi-Fi. This code expires in two minutes.")
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 420)

                if let expiry = bridge.pairingExpiresAt {
                    Text(expiry, style: .timer)
                        .font(.caption.monospacedDigit().weight(.semibold))
                        .foregroundStyle(RivunePalette.rivune)
                }

                Button("Copy pairing code", systemImage: "doc.on.doc") {
                    copyToPasteboard(code)
                    store.showPrototypeNotice("Encrypted pairing code copied")
                }
                .buttonStyle(.bordered)
            }
            .padding(14)
            .frame(maxWidth: .infinity)
            .background(RivunePalette.canvas.opacity(0.52), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
        }

        HStack(spacing: 10) {
            Button(
                bridge.hasSavedPairing ? "Replace paired iPhone" : "Pair iPhone",
                systemImage: "qrcode"
            ) {
                if bridge.hasSavedPairing {
                    showReplacePairingConfirmation = true
                } else {
                    bridge.beginPairing()
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(RivunePalette.surfaceRaised)

            if bridge.state.isConnected {
                Button("Disconnect", systemImage: "xmark.circle") {
                    bridge.disconnect()
                }
                .buttonStyle(.bordered)
            }

            if bridge.hasSavedPairing {
                Button("Forget", systemImage: "trash", role: .destructive) {
                    showRevokeConfirmation = true
                }
                .buttonStyle(.bordered)
            }
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        #else
        if !bridge.state.isConnected {
            VStack(spacing: 10) {
                Button("Scan pairing QR", systemImage: "qrcode.viewfinder") {
                    showPairingScanner = true
                }
                .buttonStyle(.borderedProminent)
                .tint(RivunePalette.primaryText)
                .foregroundStyle(RivunePalette.canvas)
                .controlSize(.large)
                .frame(maxWidth: .infinity)

                Text("or enter the code manually")
                    .font(.caption2)
                    .foregroundStyle(RivunePalette.tertiaryText)

                SecureField("Paste pairing code from your Mac", text: $pairingInput)
                    .textContentType(.oneTimeCode)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 12)
                    .frame(height: 44)
                    .background(RivunePalette.canvas.opacity(0.62), in: RoundedRectangle(cornerRadius: 12, style: .continuous))

                HStack(spacing: 10) {
                    Button("Pair securely", systemImage: "lock.shield") {
                        completePairing(using: pairingInput)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(RivunePalette.surfaceRaised)
                    .disabled(pairingInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if bridge.hasSavedPairing {
                        Button("Forget Mac", systemImage: "trash", role: .destructive) {
                            showRevokeConfirmation = true
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }

            ForEach(bridge.discoveredPeers) { peer in
                Button {
                    bridge.connect(to: peer)
                } label: {
                    HStack {
                        Label("Connect to \(peer.name)", systemImage: "macbook")
                        Spacer()
                        Image(systemName: "chevron.right")
                    }
                    .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                .disabled(!bridge.hasSavedPairing)
            }
        } else {
            HStack {
                Text("Prompts are encrypted in transit and executed by the Mac terminal engine.")
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                Spacer()
                Button("Disconnect") { bridge.disconnect() }
                    .buttonStyle(.bordered)
            }
        }
        #endif

        if let error = bridge.lastError {
            Label(error, systemImage: "exclamationmark.triangle")
                .font(.caption)
                .foregroundStyle(RivunePalette.claude)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var intelligenceSection: some View {
        SettingsCard(title: "Conversation", symbol: "text.bubble", accent: RivunePalette.rivune) {
            VStack(spacing: 15) {
                Toggle(isOn: $store.memoryEnabled) {
                    SettingLabel(
                        title: "Include previous messages",
                        detail: "Adds up to 8 recent Rivune turns, capped at 12 KB, to the next request.",
                        symbol: "brain.head.profile"
                    )
                }
                .tint(RivunePalette.rivune)

                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "text.bubble")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(RivunePalette.rivune)
                        .padding(.top, 2)
                    Text(store.memoryEnabled
                         ? "Up to 8 recent turns, capped at 12 KB, are included with the next request only. Rivune sends the same bounded context to every participating provider. It does not import account memory or history from other apps."
                         : "Only the current prompt and selected attachments are sent in the next request. Earlier Rivune messages and history from other apps are not included.")
                        .font(.caption2)
                        .foregroundStyle(RivunePalette.tertiaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    RivunePalette.canvas.opacity(0.45),
                    in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                )

                Divider().overlay(.white.opacity(0.07))

                HStack {
                    SettingLabel(
                        title: "Default mode",
                        detail: "Used whenever a new conversation begins",
                        symbol: "point.3.connected.trianglepath.dotted"
                    )

                    Picker("Default mode", selection: $store.defaultMode) {
                        ForEach(IntelligenceModeSelectionOption.available()) { option in
                            Text(option.title).tag(option.mode)
                        }
                    }
                    .labelsHidden()
                    .pickerStyle(.segmented)
                }
            }
        }
    }

    private var privacySection: some View {
        SettingsCard(title: "Data & sharing", symbol: "lock.shield", accent: RivunePalette.openAI) {
            VStack(spacing: 15) {
                SettingLabel(
                    title: "Encrypted Mac bridge",
                    detail: bridgePrivacyDetail,
                    symbol: "lock.laptopcomputer"
                )

                Divider().overlay(.white.opacity(0.07))

                SettingLabel(
                    title: "Local chat history",
                    detail: "\(store.conversations.count) conversation\(store.conversations.count == 1 ? "" : "s") saved on this device",
                    symbol: "externaldrive"
                )

                Button("Export conversations", systemImage: "square.and.arrow.up") {
                    do {
                        historyExport = try RivuneHistoryExport(conversations: store.conversations)
                        isExportingHistory = true
                    } catch {
                        store.showPrototypeNotice("Could not prepare the export. Your history is unchanged.")
                    }
                }
                .buttonStyle(.bordered).disabled(store.conversations.isEmpty)
                .frame(maxWidth: .infinity, alignment: .leading)
                Text("Exports a JSON copy of saved conversations, including messages and attached text. API keys and pairing credentials are not part of conversation history.")
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText).fixedSize(horizontal: false, vertical: true)

                Divider().overlay(.white.opacity(0.07))

                HStack(spacing: 12) {
                    SettingLabel(
                        title: "Rivune mode sharing",
                        detail: store.togetherSharingApproved
                            ? "Approved until reset; drafts may be shared across both providers"
                            : "Ask before sending each provider's draft to the other provider",
                        symbol: "arrow.triangle.branch"
                    )

                    Spacer(minLength: 12)

                    Button("Reset consent") {
                        store.resetTogetherSharingApproval()
                        store.showPrototypeNotice("Rivune will ask before the next Rivune mode request")
                    }
                    .buttonStyle(.bordered)
                    .disabled(!store.togetherSharingApproved)
                }
            }
        }
    }

    private var appearanceSection: some View {
        SettingsCard(title: "Appearance", symbol: "circle.lefthalf.filled", accent: RivunePalette.claude) {
            VStack(spacing: 15) {
                Toggle("Milky Way background", isOn: $galaxy)
                Toggle("Stars", isOn: $stars)
                VStack(alignment: .leading) {
                    Text("Background brightness").font(.subheadline)
                    Slider(value: Binding(get: { 1 - backgroundDim }, set: { backgroundDim = 1 - $0 }), in: 0.15...0.85).accessibilityLabel("Background brightness")
                }
                Toggle(isOn: $store.subtleMotionEnabled) {
                    SettingLabel(
                        title: "Subtle motion",
                        detail: "Use subtle movement while models collaborate",
                        symbol: "move.3d"
                    )
                }
                .tint(RivunePalette.rivune)

                Divider().overlay(.white.opacity(0.07))

                Button {
                    store.showSettings = false
                    store.replayStartup()
                } label: {
                    Label("Replay arrival", systemImage: "play.circle")
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity, alignment: .leading)

                Button {
                    store.showSettings = false
                    store.showAccountSetup = true
                } label: {
                    Label("Restart setup", systemImage: "person.crop.circle.badge.plus")
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity, alignment: .leading)

                HStack {
                    SettingLabel(
                        title: "Theme",
                        detail: "Black glass, silver highlights and restrained starlight",
                        symbol: "circle.lefthalf.filled"
                    )
                    Spacer()
                    Text("Orbit")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(RivunePalette.secondaryText)
                }
            }
        }
    }

    private var engineNote: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text("Local terminal engine")
                .font(.caption.weight(.semibold))
            Text("CLI routes use provider-managed sign-ins; Rivune does not store those account credentials. Registered CLI adapters request text-only runs in temporary workspaces and reject reported tool use. A CLI read-only flag is an adapter boundary, not an operating-system guarantee. Direct API routes use a key stored in this Mac’s Keychain and send the model ID selected in Connections. Rivune can share contributions between ChatGPT and Claude. Pairing secrets are also stored in Keychain.")
                .font(.caption2)
                .foregroundStyle(RivunePalette.tertiaryText)
                .multilineTextAlignment(.leading)
        }
        .padding(.vertical, 8)
    }

    private var macDetail: String {
        #if os(macOS)
        "Runs the terminal engine and encrypted iPhone bridge"
        #else
        bridge.state.isConnected
            ? "Your prompts run through the paired Mac terminal engine"
            : "Pair with Rivune on your Mac to run prompts"
        #endif
    }

    private var executionMacName: String {
        #if os(macOS)
        "This Mac"
        #else
        "Execution Mac"
        #endif
    }

    private var macStatus: String {
        #if os(macOS)
        store.engineIsOnline ? "Sign-in found" : "Needs setup"
        #else
        bridge.state.isConnected ? "Connected" : "Not paired"
        #endif
    }

    private var macStatusColor: Color {
        #if os(macOS)
        store.engineIsOnline ? RivunePalette.success : RivunePalette.tertiaryText
        #else
        bridge.state.isConnected ? RivunePalette.success : RivunePalette.tertiaryText
        #endif
    }

    private var bridgeName: String {
        #if os(macOS)
        "iPhone bridge"
        #else
        "Mac bridge"
        #endif
    }

    private var bridgeDetail: String {
        #if os(macOS)
        if bridge.state.isConnected {
            "Encrypted local connection is active"
        } else if bridge.pairingCode != nil {
            "Pairing mode is open for two minutes"
        } else if bridge.hasSavedPairing {
            "Ready to reconnect to the paired iPhone"
        } else {
            "Create a pairing code for Rivune on iPhone"
        }
        #else
        if bridge.state.isConnected {
            "Encrypted connection to your Mac"
        } else if bridge.hasSavedPairing {
            "Looking for your paired Mac on the local network"
        } else {
            "Paste the pairing code shown on your Mac"
        }
        #endif
    }

    private var bridgePrivacyDetail: String {
        if bridge.state.isConnected {
            return "Prompts and responses travel over an encrypted local connection; the Mac executes them"
        }
        if bridge.hasSavedPairing {
            return "The reconnect credential is stored in Keychain on this device"
        }
        return "No device is paired; prompts stay on this device until you connect a Mac"
    }

    private var previewProviderTransports: [ProviderTransportPresentation] {
        providerTransports(with: .configurationPreview)
            .filter { $0.transport.kind == .api }
    }

    private var cliProviderPresentations: [CLIProviderPresentation] {
        providerRegistry.registrations.map { registration in
            let installation = cliInstallations[registration.id]
            let readiness = providerReadiness(for: registration)
            let state: CLIProviderConnectionState
            if !providerScanComplete, readiness == nil {
                state = .checking
            } else {
                state = CLIProviderDiscovery.connectionState(
                    registration: registration,
                    installation: installation,
                    readiness: readiness,
                    isMac: isMacPlatform
                )
            }
            return CLIProviderPresentation(
                registration: registration,
                installation: installation,
                state: state
            )
        }
    }

    private var signedOutProviderPresentations: [CLIProviderPresentation] {
        cliProviderPresentations.filter {
            $0.state == .signedOut && $0.registration.executionRoute != nil
        }
    }

    private var isMacPlatform: Bool {
        #if os(macOS)
        true
        #else
        false
        #endif
    }

    private func providerTransports(
        with implementation: AITransportImplementation
    ) -> [ProviderTransportPresentation] {
        AIProviderCatalog.currentDefaults.providers.flatMap { provider in
            provider.transports.compactMap { transport in
                guard transport.implementation == implementation else { return nil }
                return ProviderTransportPresentation(provider: provider, transport: transport)
            }
        }
    }

    private func providerAccent(_ providerID: String) -> Color {
        switch providerID {
        case AIProviderConfiguration.openAIDefault.id:
            RivunePalette.openAI
        case AIProviderConfiguration.anthropicDefault.id:
            RivunePalette.claude
        default:
            RivunePalette.rivune
        }
    }

    private func connectionDetail(_ item: CLIProviderPresentation) -> String {
        let executable = item.registration.transport.executableName
        let path = item.installation?.executableURL.map { displayPath($0) }
        switch item.state {
        case .checking:
            return "Checking the registered \(executable) executable and provider-managed sign-in"
        case .ready:
            return path.map { "Provider-managed sign-in confirmed · \($0)" }
                ?? "Provider-managed sign-in confirmed; the selected model is checked when a request runs"
        case .signedOut:
            return path.map { "Installed at \($0); one-time provider sign-in is required" }
                ?? "One-time provider sign-in is required before direct or Rivune mode requests"
        case .adapterRequired:
            return path.map { "Found at \($0); add a reviewed runtime adapter before Rivune can launch it" }
                ?? "Installed, but a reviewed runtime adapter is required before Rivune can launch it"
        case .missing:
            return "No \(executable) executable was found in Rivune's trusted install locations"
        case .macRequired:
            return "Available after this iPhone is paired with a Mac running Rivune"
        case .unavailable:
            return "The authentication status check could not finish"
        }
    }

    private func statusColor(_ state: CLIProviderConnectionState, identity: Color) -> Color {
        switch state {
        case .ready: RivunePalette.success
        case .signedOut, .adapterRequired: identity
        default: RivunePalette.tertiaryText
        }
    }

    private func providerReadiness(for registration: CLIProviderRegistration) -> ProviderReadiness? {
        switch registration.terminalProvider {
        case .codex?: store.codexCLIReadiness
        case .claude?: store.claudeCLIReadiness
        case nil: nil
        }
    }

    private func providerSymbol(_ registration: CLIProviderRegistration) -> String {
        switch registration.terminalProvider {
        case .codex?: "terminal"
        case .claude?: "text.bubble"
        case nil: "terminal"
        }
    }

    private func refreshProviderDiscovery() {
        let installations = CLIProviderDiscovery.discover(registry: providerRegistry)
        cliInstallations = Dictionary(
            uniqueKeysWithValues: installations.map { ($0.registrationID, $0) }
        )
        providerScanComplete = true
    }

    private func displayPath(_ url: URL) -> String {
        let home = URL(fileURLWithPath: NSHomeDirectory(), isDirectory: true)
            .standardizedFileURL.path
        let path = url.standardizedFileURL.path
        guard path == home || path.hasPrefix(home + "/") else { return path }
        return "~" + path.dropFirst(home.count)
    }

    #if os(macOS)
    private func copyAuthenticationCommand(for registration: CLIProviderRegistration) {
        guard let route = registration.executionRoute,
              let command = AITextRuntimeRegistry.current
                  .setupAction(for: route)?
                  .commandToCopy else {
            store.showPrototypeNotice("No safe sign-in command is registered for this provider")
            return
        }
        copyToPasteboard(command)
        store.showPrototypeNotice("\(registration.provider.displayName) sign-in command copied — paste it into Terminal")
    }
    #endif

    private func copyToPasteboard(_ text: String) {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #else
        UIPasteboard.general.string = text
        #endif
    }

    #if os(iOS)
    private func completePairing(using code: String) {
        do {
            try bridge.pair(using: code)
            pairingInput = ""
            store.showPrototypeNotice("Pairing code accepted — connecting to your Mac")
        } catch {
            store.showPrototypeNotice("That pairing code is invalid or expired")
        }
    }
    #endif
}

struct RivuneHistoryExport: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    let data: Data

    init(conversations: [Conversation]) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        data = try encoder.encode(conversations)
    }

    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

private struct CLIProviderPresentation: Identifiable {
    let registration: CLIProviderRegistration
    let installation: CLIExecutableInstallation?
    let state: CLIProviderConnectionState

    var id: String { registration.id }
}

private struct ProviderTransportPresentation: Identifiable {
    let provider: AIProviderConfiguration
    let transport: AITransportConfiguration

    var id: String { "\(provider.id)::\(transport.id)" }
}

private struct ProviderCLITransportRow: View {
    let presentation: CLIProviderPresentation
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: presentation.registration.supportsExecution ? "terminal.fill" : "terminal")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(color)
                .frame(width: 30, height: 30)
                .background(
                    color.opacity(0.10),
                    in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 7) {
                    Text("\(presentation.registration.provider.displayName) · \(presentation.registration.transport.displayName)")
                        .font(.subheadline.weight(.medium))

                    Text("CLI")
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundStyle(color)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(color.opacity(0.10), in: Capsule())
                }

                Text(detail)
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 10)

            Text(presentation.state.label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(statusColor)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: true, vertical: true)
        }
        .padding(.vertical, 2)
    }

    private var detail: String {
        let executable = presentation.registration.transport.executableName
        if presentation.registration.supportsExecution {
            return "Registered runtime adapter for the \(executable) executable. Authentication remains provider-managed."
        }
        return "Rivune can discover \(executable), but will not launch it until a reviewed runtime adapter is registered."
    }

    private var statusColor: Color {
        switch presentation.state {
        case .ready: RivunePalette.success
        case .signedOut, .adapterRequired: color
        default: RivunePalette.tertiaryText
        }
    }
}

private struct ProviderSectionLabel: View {
    let title: String
    let detail: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 9) {
            Circle()
                .fill(color)
                .frame(width: 7, height: 7)
                .padding(.top, 5)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(RivunePalette.primaryText)
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(RivunePalette.tertiaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

private struct ProviderTransportRow: View {
    let provider: AIProviderConfiguration
    let transport: AITransportConfiguration
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(color)
                .frame(width: 30, height: 30)
                .background(
                    color.opacity(0.10),
                    in: RoundedRectangle(cornerRadius: 9, style: .continuous)
                )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 7) {
                    Text("\(provider.displayName) · \(transport.displayName)")
                        .font(.subheadline.weight(.medium))

                    Text(transport.kind.title)
                        .font(.system(size: 9, weight: .bold, design: .rounded))
                        .foregroundStyle(color)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(color.opacity(0.10), in: Capsule())
                }

                Text(detail)
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 10)

            Text(status)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(statusColor)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: true, vertical: true)
        }
        .padding(.vertical, 2)
    }

    private var symbol: String {
        switch transport.kind {
        case .commandLine: "terminal"
        case .api: "network"
        }
    }

    private var status: String {
        switch transport.implementation {
        case .executableAdapter: "Runtime wired"
        case .configurationPreview: "Not wired"
        }
    }

    private var statusColor: Color {
        switch transport.implementation {
        case .executableAdapter: RivunePalette.success
        case .configurationPreview: RivunePalette.tertiaryText
        }
    }

    private var detail: String {
        switch transport {
        case .commandLine(let configuration):
            "Uses the provider-managed sign-in for the \(configuration.executableName) executable. The current adapter exposes text and imported-text documents only."
        case .api(let configuration):
            "Configuration for \(configuration.baseURL.host ?? configuration.baseURL.absoluteString). Its credential is a \(secretStorageName(configuration.credential.storage)) reference only; no API request is sent by this build."
        }
    }

    private func secretStorageName(_ storage: AISecretReference.Storage) -> String {
        switch storage {
        case .keychain: "Keychain"
        case .externalCredentialBroker: "credential-broker"
        }
    }
}

private struct PairingQRCode: View {
    let code: String

    private var image: CGImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(code.utf8)
        filter.correctionLevel = "M"

        guard let output = filter.outputImage?.transformed(
            by: CGAffineTransform(scaleX: 9, y: 9)
        ) else { return nil }

        return CIContext(options: [.useSoftwareRenderer: false]).createCGImage(
            output,
            from: output.extent
        )
    }

    var body: some View {
        Group {
            if let image {
                Image(decorative: image, scale: 1)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "qrcode")
                    .font(.system(size: 64, weight: .light))
                    .foregroundStyle(.black)
            }
        }
        .padding(11)
        .background(.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .accessibilityLabel("Secure iPhone pairing code")
    }
}

private struct SettingsCard<Content: View>: View {
    let title: String
    let symbol: String
    let accent: Color
    @ViewBuilder let content: Content

    init(
        title: String,
        symbol: String,
        accent: Color,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.symbol = symbol
        self.accent = accent
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Text(title)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(RivunePalette.primaryText)
            content
            Divider().overlay(RivunePalette.hairline)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RivunePalette.surface.opacity(0.82), in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(RivunePalette.hairline, lineWidth: 0.7))
    }
}

private struct SettingLabel: View {
    let title: String
    let detail: String
    let symbol: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
            Text(detail)
                .font(.system(size: 12))
                .foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

private struct ConnectionRow: View {
    let name: String
    let detail: String
    let symbol: String
    let status: String
    let color: Color
    var providerID: String? = nil

    var body: some View {
        HStack(spacing: 12) {
            if providerID == "openai" || providerID == "codex" {
                ProviderIdentityMark(mode: .chatGPT, size: 32)
            } else if providerID == "anthropic" || providerID == "claude" {
                ProviderIdentityMark(mode: .claude, size: 32)
            } else {
                Image(systemName: symbol)
                    .font(.system(size: 16))
                    .foregroundStyle(RivunePalette.secondaryText)
                    .frame(width: 32, height: 32)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.subheadline.weight(.medium))
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
            }

            Spacer()

            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 6, height: 6)
                Text(status)
                    .font(.caption2.weight(.medium))
            }
            .foregroundStyle(color)
        }
    }
}

/// Setup keeps the account, provider connection and readiness review on
/// separate pages while the existing workspace stays mounted underneath.
enum ConnectionSetupStage: Equatable {
    case splash
    case connections
    case account
    case ready
    case privacy
    case feature

}

struct ConnectionSetupSheet: View {
    @ObservedObject var store: RivuneStore
    @Binding var stage: ConnectionSetupStage
    let onComplete: () -> Void
    var allowDismissToWorkspace = false
    var onDismiss: (() -> Void)? = nil

    @State private var connectionMethod = ConnectionMethod.cli
    @State private var expandedProvider: IntelligenceMode?
    @State private var copiedProvider: IntelligenceMode?
    @State private var featurePage = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private enum ConnectionMethod { case cli, api }
    private let setupBackground = RivunePalette.canvas
    private let featureAccent = Color(red: 0.17, green: 0.73, blue: 0.93)
    private var isPreview: Bool { RivuneLaunchContext.isIsolated }
    private var isChecking: Bool {
        !isPreview && (store.codexCLIReadiness == .checking || store.claudeCLIReadiness == .checking)
    }
    private var hasReadyCLI: Bool {
        !isPreview && (store.codexCLIReadiness.isReady || store.claudeCLIReadiness.isReady)
    }
    private var hasReadyProvider: Bool {
        !isPreview && (store.codexReadiness.isReady || store.claudeReadiness.isReady)
    }
    private var deviceName: String {
        #if os(macOS)
        "Mac"
        #else
        "device"
        #endif
    }

    var body: some View {
        GeometryReader { geometry in
            Group {
                switch stage {
                case .splash:
                    splash(in: geometry.size)
                case .connections, .account, .ready:
                    connectionSetup(in: geometry.size)
                case .privacy:
                    privacy(in: geometry.size)
                case .feature:
                    featureTour(in: geometry.size)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .foregroundStyle(.white.opacity(0.93))
        .preferredColorScheme(.dark)
        .tint(RivunePalette.startupAccent)
        .animation(reduceMotion ? nil : .easeInOut(duration: 0.18), value: stage)
        .accessibilityAddTraits(.isModal)
        #if os(macOS)
        .onExitCommand {
            if stage == .feature { onComplete() }
        }
        #endif
    }

    private func splash(in size: CGSize) -> some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if size.width >= 700 {
                splashCaption("SHARED CONTEXT")
                    .position(x: size.width * 0.62, y: size.height * 0.18)
                splashCaption("ONE CONVERSATION")
                    .position(x: size.width * 0.18, y: size.height * 0.49)
                splashCaption("YOUR MODELS")
                    .position(x: size.width * 0.82, y: size.height * 0.49)
                splashCaption("CLEAR OUTCOMES")
                    .position(x: size.width * 0.33, y: size.height * 0.78)
            }
            VStack(spacing: 24) {
                outlinedWordmark
                RivuneOrb(size: 110, motionEnabled: false)
                Button {
                    stage = .account
                } label: {
                    HStack(spacing: 14) {
                        Text("Continue").font(.system(size: 12, weight: .medium, design: .monospaced))
                        Image(systemName: "arrow.right").font(.system(size: 13))
                    }
                    .foregroundStyle(.white.opacity(0.78))
                    .padding(.horizontal, 18)
                    .frame(height: 39)
                    .overlay(RoundedRectangle(cornerRadius: 5).stroke(.white.opacity(0.20), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .keyboardShortcut(.defaultAction)
                .padding(.top, 8)
            }
            .position(x: size.width / 2, y: size.height * 0.49)
            HStack(spacing: 9) {
                RivuneOrb(size: 22, motionEnabled: false)
                RivuneWordmark(width: 108)
            }
            .foregroundStyle(.white.opacity(0.43))
            .position(x: size.width / 2, y: max(40, size.height - 38))
        }
    }

    private var outlinedWordmark: some View {
        ZStack {
            ForEach(0..<8, id: \.self) { index in
                Text("RIVUNE")
                    .offset(
                        x: cos(Double(index) * .pi / 4) * 0.65,
                        y: sin(Double(index) * .pi / 4) * 0.65
                    )
                    .foregroundStyle(.white.opacity(0.52))
            }
            Text("RIVUNE").foregroundStyle(.black)
        }
        .font(.system(size: 25, weight: .semibold, design: .monospaced))
        .tracking(2.2)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Rivune")
    }

    private func splashCaption(_ value: String) -> some View {
        Text(value)
            .font(.system(size: 11, weight: .medium, design: .monospaced))
            .foregroundStyle(.white.opacity(0.30))
            .accessibilityHidden(true)
    }

    private func connectionSetup(in size: CGSize) -> some View {
        ZStack {
            RivuneBackground()
            setupBackground.opacity(0.54).ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    HStack {
                        HStack(spacing: 9) {
                            RivuneOrb(size: 30, motionEnabled: false)
                            RivuneWordmark(width: 108)
                        }
                        Spacer()
                        if allowDismissToWorkspace {
                            Button("Back to workspace") { onDismiss?() }
                                .font(.system(size: 12))
                                .buttonStyle(.plain)
                                .foregroundStyle(RivunePalette.secondaryText)
                        }
                    }
                    .padding(.bottom, 10)
                    setupSteps
                    switch stage {
                    case .account: accountContent
                    case .connections: connectionContent
                    default: readyContent
                    }
                    setupNavigation
                }
                .frame(maxWidth: 720, alignment: .leading)
                .padding(.horizontal, size.width < 600 ? 22 : 38)
                .padding(.top, min(56, max(28, size.height * 0.055)))
                .padding(.bottom, 42)
                .frame(maxWidth: .infinity)
            }
        }
    }

    private var setupSteps: some View {
        let steps: [(String, ConnectionSetupStage)] = [("Account", .account), ("Connect AI", .connections), ("Ready", .ready)]
        return HStack(spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, item in
                HStack(spacing: 7) {
                    Text(String(format: "%02d", index + 1))
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .frame(width: 24, height: 24)
                        .background(stage == item.1 ? RivunePalette.rivune.opacity(0.12) : RivunePalette.control, in: Circle())
                        .overlay(Circle().stroke(stage == item.1 ? RivunePalette.rivune.opacity(0.35) : .clear, lineWidth: 0.7))
                    Text(item.0).font(.system(size: 11, weight: stage == item.1 ? .medium : .regular))
                }
                .foregroundStyle(stage == item.1 ? RivunePalette.primaryText : RivunePalette.tertiaryText)
                if index < 2 {
                    Rectangle().fill(RivunePalette.hairline).frame(height: 0.7)
                        .padding(.horizontal, 14)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Setup: \(stage == .account ? "Account, step 1 of 3" : stage == .connections ? "Connect AI, step 2 of 3" : "Ready, step 3 of 3")")
    }

    private var setupNavigation: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 14) {
                setupBackButton
                Spacer(minLength: 10)
                setupContinueButton
            }
            VStack(alignment: .leading, spacing: 15) {
                setupContinueButton
                setupBackButton
            }
        }
        .padding(.top, 5)
    }

    private var setupBackButton: some View {
        Button {
            if stage == .account {
                store.showAccountSetup = false
                store.replayStartup()
            } else {
                stage = stage == .ready ? .connections : .account
            }
        } label: {
            Label(stage == .account ? "Replay arrival" : "Back", systemImage: "arrow.left")
                .font(.system(size: 12))
                .foregroundStyle(RivunePalette.secondaryText)
        }
        .buttonStyle(.plain)
    }

    private var setupContinueButton: some View {
        Button {
            switch stage {
            case .account: stage = .connections
            case .connections:
                guard hasReadyProvider else { return }
                stage = .ready
            case .ready:
                guard hasReadyProvider else { return }
                onComplete()
            default: break
            }
        } label: {
            HStack(spacing: 10) {
                Text(stage == .account ? "Continue locally" : stage == .connections ? "Review setup" : "Open Rivune")
                Image(systemName: "arrow.right").font(.system(size: 11))
            }
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(RivunePalette.canvas)
            .padding(.horizontal, 21)
            .frame(height: 42)
            .background(LinearGradient(colors: [.white, RivunePalette.rivune], startPoint: .topLeading, endPoint: .bottomTrailing), in: Capsule())
        }
        .buttonStyle(.plain)
        .keyboardShortcut(.defaultAction)
        .disabled(stage != .account && !hasReadyProvider)
        .opacity(stage != .account && !hasReadyProvider ? 0.42 : 1)
        .accessibilityHint(stage == .account ? "Continues with local setup without creating a cloud account" : "Requires one ready AI provider")
    }

    private var readyContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            introduction(title: hasReadyProvider ? "Your workspace is ready." : "Your connection needs attention.",
                detail: hasReadyProvider ? "Your local workspace is set up. Start with one provider, or bring both into a Rivune conversation." : "Go back to Connect AI and check your provider before opening Rivune.")
            VStack(spacing: 18) {
                setupReadinessRow(.chatGPT, ready: store.codexReadiness.isReady)
                Rectangle().fill(RivunePalette.hairline).frame(height: 0.7)
                setupReadinessRow(.claude, ready: store.claudeReadiness.isReady)
            }
            .padding(22)
            .background(RivunePalette.surface.opacity(0.90), in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(RivunePalette.hairline, lineWidth: 0.7))
            informationRow(symbol: "person.crop.circle", title: "Local workspace", detail: "No cloud account has been created. Your conversations are saved on this device.")
            dataExplanation
            if store.apiProbes.values.contains(where: { $0.readiness.isReady }) {
                Text("API checks confirm access and model availability. Your first message verifies response generation.")
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func setupReadinessRow(_ mode: IntelligenceMode, ready: Bool) -> some View {
        HStack(spacing: 12) {
            ProviderIdentityMark(mode: mode, size: 30)
            VStack(alignment: .leading, spacing: 5) {
                Text(mode.displayName).font(.system(size: 13, weight: .medium))
                Text(setupReadinessDetail(mode, ready: ready))
                    .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
            }
            Spacer(minLength: 8)
            Image(systemName: ready ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(ready ? RivunePalette.success : RivunePalette.tertiaryText)
        }
    }

    private func setupReadinessDetail(_ mode: IntelligenceMode, ready: Bool) -> String {
        guard ready else { return "Connect later" }
        #if os(macOS)
        let route = mode == .chatGPT ? store.currentCodexRoute : store.currentClaudeRoute
        return route.transportKind == .api ? "API access checked" : "CLI connected"
        #else
        return "Ready through your Mac"
        #endif
    }

    private func privacy(in size: CGSize) -> some View {
        ZStack {
            setupBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 0) {
                    Text("Data Handling & Privacy")
                        .font(.system(size: 26, weight: .semibold))
                        .tracking(-0.45)
                        .multilineTextAlignment(.center)
                    Text("Understand where your work goes, and what stays with you.")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.56))
                        .multilineTextAlignment(.center)
                        .padding(.top, 22)
                        .padding(.bottom, 55)

                    privacySection(
                        title: "Provider access",
                        symbol: "network",
                        label: "Your connected providers",
                        detail: "Model requests go to the providers you select. CLI routes use the provider’s sign-in. API routes use a key in your Mac’s Keychain, with the provider’s API billing and usage limits."
                    )
                    privacySection(
                        title: "Conversation history",
                        symbol: "externaldrive",
                        label: "Saved in Rivune on this \(deviceName)",
                        detail: "Conversations are saved locally. When conversation memory is on, recent context can be included with your next request."
                    )
                    privacySection(
                        title: "Shared context",
                        symbol: "text.bubble",
                        label: "The message and context you include",
                        detail: "Selected text and shared team contributions can be sent between connected providers. Your existing approval choices still apply."
                    )

                    Text("You can revisit your connection and sharing preferences in Settings.")
                        .font(.system(size: 13))
                        .foregroundStyle(.white.opacity(0.55))
                        .multilineTextAlignment(.center)
                        .padding(.top, 28)
                    if size.width < 1_000 {
                        HStack {
                            Button("Back") { stage = .account }
                                .font(.system(size: 12))
                                .buttonStyle(.plain)
                                .foregroundStyle(.white.opacity(0.55))
                            Spacer()
                            nextArrow(label: "Continue to the Rivune introduction") {
                                featurePage = 0
                                stage = .feature
                            }
                        }
                        .padding(.top, 26)
                    }
                }
                .frame(maxWidth: 670)
                .padding(.horizontal, 28)
                .padding(.top, min(100, max(44, size.height * 0.11)))
                .padding(.bottom, 64)
                .frame(maxWidth: .infinity)
            }
            if size.width >= 1_000 {
                nextArrow(label: "Continue to the Rivune introduction") {
                    featurePage = 0
                    stage = .feature
                }
                .position(x: size.width * 0.90, y: size.height * 0.57)
                Button {
                    stage = .account
                } label: {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 15))
                        .foregroundStyle(.white.opacity(0.50))
                        .frame(width: 34, height: 34)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Back to account setup")
                .position(x: 38, y: 35)
            }
        }
    }

    private func privacySection(title: String, symbol: String, label: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 17) {
            Text(title).font(.system(size: 16, weight: .semibold))
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: symbol)
                    .font(.system(size: 19, weight: .medium))
                    .foregroundStyle(.white.opacity(0.86))
                    .frame(width: 30, height: 31)
                VStack(alignment: .leading, spacing: 9) {
                    Text(label).font(.system(size: 14, weight: .medium))
                    Text(detail)
                        .font(.system(size: 13))
                        .lineSpacing(4)
                        .foregroundStyle(.white.opacity(0.56))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Rectangle().fill(.white.opacity(0.10)).frame(height: 1)
                .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, 29)
    }

    private func nextArrow(label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: "arrow.right")
                .font(.system(size: 24, weight: .regular))
                .foregroundStyle(.white.opacity(0.62))
                .frame(width: 49, height: 49)
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(.white.opacity(0.17), lineWidth: 1.5))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .help(label)
        .keyboardShortcut(.defaultAction)
    }

    private struct FeatureItem {
        let symbol: String
        let title: String
        let detail: String
    }

    private var featureTitle: String {
        ["Work together.", "Bring your context.", "Make it a real project.", "Keep control."][featurePage]
    }

    private var featureCategory: String {
        ["Rivune", "Your Context", "Project Workspace", "Your Controls"][featurePage]
    }

    private var featureDescription: String {
        [
            "Give ChatGPT and Claude one request. Follow their contributions and return to one shared answer.",
            "Include selected text and useful conversation history, so the models have something concrete to work with.",
            "On Mac, turn a proposed static website into reviewed files and a local preview.",
            "Know which providers are connected, see what is happening, and stop a request when you need to."
        ][featurePage]
    }

    private var featureItems: [FeatureItem] {
        switch featurePage {
        case 0:
            [
                FeatureItem(symbol: "bubble.left", title: "One conversation", detail: "One place for your request"),
                FeatureItem(symbol: "arrow.triangle.branch", title: "Shared review", detail: "Inspect model contributions"),
                FeatureItem(symbol: "text.alignleft", title: "One answer", detail: "A final result to work with"),
                FeatureItem(symbol: "list.bullet", title: "Activity", detail: "Follow the request stages")
            ]
        case 1:
            [
                FeatureItem(symbol: "doc.text", title: "Selected text", detail: "Add the documents you choose"),
                FeatureItem(symbol: "clock.arrow.circlepath", title: "Memory", detail: "Include recent conversation"),
                FeatureItem(symbol: "eye", title: "Review context", detail: "Inspect it before sending"),
                FeatureItem(symbol: "person.2", title: "Provider choice", detail: "Choose a direct or team route")
            ]
        case 2:
            [
                FeatureItem(symbol: "folder", title: "Choose a folder", detail: "A bounded local project"),
                FeatureItem(symbol: "doc.text.magnifyingglass", title: "Review changes", detail: "Inspect original and new text"),
                FeatureItem(symbol: "arrow.uturn.backward", title: "Apply or revert", detail: "You decide when files change"),
                FeatureItem(symbol: "macwindow", title: "Static preview", detail: "Scripts remain disabled")
            ]
        default:
            [
                FeatureItem(symbol: "key.horizontal", title: "Provider access", detail: "Your provider's own sign-in"),
                FeatureItem(symbol: "circle.dotted", title: "Clear status", detail: "Connected, waiting, or stopped"),
                FeatureItem(symbol: "stop", title: "Stop requests", detail: "End active model work"),
                FeatureItem(symbol: "externaldrive", title: "Local history", detail: "Conversations saved in Rivune")
            ]
        }
    }

    private func featureTour(in size: CGSize) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                featureIllustration
                    .frame(height: 210)
                    .clipped()
                VStack(alignment: .leading, spacing: 19) {
                    VStack(alignment: .leading, spacing: 9) {
                        HStack(spacing: 5) {
                            Circle().fill(featureAccent).frame(width: 5, height: 5)
                            Text(featureCategory).font(.system(size: 11, weight: .medium))
                        }
                        .foregroundStyle(featureAccent)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .overlay(Capsule().stroke(featureAccent.opacity(0.38), lineWidth: 1))
                        Text(featureTitle)
                            .font(.system(size: 27, weight: .semibold))
                            .tracking(-0.6)
                        Text(featureDescription)
                            .font(.system(size: 14))
                            .lineSpacing(4)
                            .foregroundStyle(.white.opacity(0.59))
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 20) {
                        ForEach(Array(featureItems.enumerated()), id: \.offset) { _, item in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: item.symbol)
                                    .font(.system(size: 16))
                                    .foregroundStyle(featureAccent)
                                    .frame(width: 33, height: 33)
                                    .background(featureAccent.opacity(0.10), in: RoundedRectangle(cornerRadius: 8))
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(item.title).font(.system(size: 13, weight: .medium))
                                    Text(item.detail)
                                        .font(.system(size: 11))
                                        .foregroundStyle(.white.opacity(0.54))
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                    .padding(.vertical, 5)
                    Button(action: onComplete) {
                        Text("Open workspace")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(featureAccent, in: RoundedRectangle(cornerRadius: 9))
                    }
                    .buttonStyle(.plain)
                    .keyboardShortcut(.defaultAction)
                    VStack(spacing: 18) {
                        HStack(spacing: 7) {
                            ForEach(0..<4, id: \.self) { page in
                                Button { featurePage = page } label: {
                                    Circle()
                                        .fill(.white.opacity(page == featurePage ? 0.93 : 0.22))
                                        .frame(width: 6, height: 6)
                                        .padding(4)
                                        .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Introduction page \(page + 1) of 4")
                                .accessibilityAddTraits(page == featurePage ? .isSelected : [])
                            }
                        }
                        Button("Dismiss for now", action: onComplete)
                            .font(.system(size: 13))
                            .buttonStyle(.plain)
                            .foregroundStyle(.white.opacity(0.53))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 2)
                }
                .padding(24)
                .background(Color(red: 27 / 255, green: 27 / 255, blue: 30 / 255))
            }
            .frame(maxWidth: 560)
            .background(.black)
            .clipShape(RoundedRectangle(cornerRadius: 15))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(.white.opacity(0.22), lineWidth: 1))
            .shadow(color: .black.opacity(0.40), radius: 32, y: 16)
            .padding(.horizontal, 22)
            .padding(.vertical, 24)
            .frame(maxWidth: .infinity)
            .frame(minHeight: size.height)
        }
        .background(.clear)
    }

    private var featureIllustration: some View {
        ZStack(alignment: .trailing) {
            VStack(spacing: 9) {
                HStack(spacing: 8) {
                    miniaturePanel(
                        mode: featurePage == 0 ? .chatGPT : nil,
                        title: ["ChatGPT", "Selected notes", "Proposed files", "Your providers"][featurePage],
                        line: ["Explore the approach", "The details that matter", "index.html · style.css", "Your connected clients"][featurePage],
                        symbol: ["terminal", "doc.text", "curlybraces", "network"][featurePage]
                    )
                    miniaturePanel(
                        mode: featurePage == 0 ? .claude : nil,
                        title: ["Claude", "Conversation", "Local preview", "Request activity"][featurePage],
                        line: ["Challenge the details", "Recent, relevant context", "Review before applying", "Follow each stage"][featurePage],
                        symbol: ["text.bubble", "bubble.left", "macwindow", "list.bullet"][featurePage]
                    )
                }
                Image(systemName: "arrow.triangle.merge")
                    .font(.system(size: 15, weight: .light))
                    .foregroundStyle(.white.opacity(0.50))
                HStack(spacing: 8) {
                    RivuneOrb(size: 20, motionEnabled: false)
                    Text(["One shared answer", "A request with context", "A project you can inspect", "A workspace you control"][featurePage])
                        .font(.system(size: 11, weight: .medium))
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.42))
                }
                .padding(.horizontal, 12)
                .frame(height: 34)
                .background(.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 6))
                Text("How it works")
                    .font(.system(size: 8, design: .monospaced))
                    .foregroundStyle(.white.opacity(0.35))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 17)
            Button {
                featurePage = (featurePage + 1) % 4
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 18, weight: .light))
                    .foregroundStyle(.white.opacity(0.9))
                    .frame(width: 35, height: 35)
                    .background(.black.opacity(0.85), in: Circle())
                    .overlay(Circle().stroke(.white.opacity(0.40), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next introduction page")
            .padding(.trailing, 12)
        }
        .background(
            LinearGradient(colors: [Color(white: 0.07), .black], startPoint: .top, endPoint: .bottom)
        )
    }

    private func miniaturePanel(mode: IntelligenceMode?, title: String, line: String, symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 5) {
                HStack(spacing: 3) {
                    ForEach(0..<3, id: \.self) { _ in
                        Circle().fill(.white.opacity(0.18)).frame(width: 4, height: 4)
                    }
                }
                Spacer()
                Text(title).font(.system(size: 9, weight: .medium)).foregroundStyle(.white.opacity(0.60))
            }
            HStack(spacing: 7) {
                if let mode { ProviderIdentityMark(mode: mode, size: 21) }
                else {
                    Image(systemName: symbol)
                        .font(.system(size: 13))
                        .foregroundStyle(featureAccent.opacity(0.8))
                        .frame(width: 21, height: 21)
                }
                Text(line)
                    .font(.system(size: 9))
                    .foregroundStyle(.white.opacity(0.76))
                    .lineLimit(2)
            }
            VStack(alignment: .leading, spacing: 5) {
                RoundedRectangle(cornerRadius: 1).fill(.white.opacity(0.10)).frame(height: 2)
                RoundedRectangle(cornerRadius: 1).fill(.white.opacity(0.07)).frame(maxWidth: 125).frame(height: 2)
            }
        }
        .padding(11)
        .frame(maxWidth: .infinity)
        .frame(height: 103)
        .background(.white.opacity(0.045), in: RoundedRectangle(cornerRadius: 5))
        .overlay(RoundedRectangle(cornerRadius: 5).stroke(.white.opacity(0.11), lineWidth: 0.7))
    }

    private var accountContent: some View {
        VStack(alignment: .leading, spacing: 24) {
            introduction(title: "Make Rivune yours.", detail: "Sign in to your Rivune account, or continue with your local workspace.")
            RivuneAccountPanel()
                .padding(22)
                .background(RivunePalette.surface.opacity(0.92), in: RoundedRectangle(cornerRadius: 16))
            informationRow(symbol: "desktopcomputer", title: "Continue locally", detail: "No cloud account is created. Next, connect your own AI provider using a CLI or API key.")
        }
    }

    private var connectionContent: some View {
        VStack(alignment: .leading, spacing: 20) {
            #if os(macOS)
            introduction(
                title: "How would you like to connect?",
                detail: "Configure a CLI or API connection. One ready provider is enough to start; a second enables shared work."
            )
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) {
                    connectionChoice(.cli)
                    connectionChoice(.api)
                }
                VStack(spacing: 10) {
                    connectionChoice(.cli)
                    connectionChoice(.api)
                }
            }
            if connectionMethod == .cli { cliContent } else { apiContent }
            Text("Routing stays automatic: a signed-in CLI first, then an API. Your selection here opens setup; each chat uses the active connection shown in Settings.")
                .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            #else
            introduction(
                title: "Connect your Mac.",
                detail: "Set up a CLI or API in Rivune on your Mac, then pair this iPhone. One ready provider is enough to start."
            )
            SettingsView(store: store, setupDeviceOnly: true)
            Button("Check connections", systemImage: "arrow.clockwise") {
                guard !isPreview else { return }
                store.refreshConnections()
            }
            .buttonStyle(.bordered)
            .disabled(isPreview || store.startupPhase == .checking)
            VStack(spacing: 16) {
                setupReadinessRow(.chatGPT, ready: store.codexReadiness.isReady)
                setupReadinessRow(.claude, ready: store.claudeReadiness.isReady)
            }
            .padding(18)
            .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 14))
            #endif
            dataExplanation
        }
    }

    private func connectionChoice(_ method: ConnectionMethod) -> some View {
        let selected = connectionMethod == method
        return Button {
            connectionMethod = method
        } label: {
            VStack(alignment: .leading, spacing: 11) {
                HStack {
                    Image(systemName: method == .cli ? "terminal" : "key.horizontal")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(selected ? RivunePalette.startupAccent : RivunePalette.secondaryText)
                    Spacer()
                    Image(systemName: selected ? "largecircle.fill.circle" : "circle")
                        .font(.system(size: 16))
                        .foregroundStyle(selected ? RivunePalette.startupAccent : RivunePalette.secondaryText)
                }
                VStack(alignment: .leading, spacing: 5) {
                    Text(method == .cli ? "Installed CLI" : "API key")
                        .font(.system(size: 14, weight: .semibold))
                    Text(method == .cli
                         ? (hasReadyCLI ? "Recommended · a CLI is ready" : "Use your existing sign-in")
                         : "Connect your provider’s developer key")
                        .font(.system(size: 11))
                        .foregroundStyle(method == .cli && hasReadyCLI ? RivunePalette.success : RivunePalette.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .padding(16)
            .frame(minWidth: 210, maxWidth: .infinity, alignment: .leading)
            .background(selected ? RivunePalette.surfaceRaised : RivunePalette.surface, in: RoundedRectangle(cornerRadius: 13))
            .overlay {
                RoundedRectangle(cornerRadius: 13)
                    .stroke(selected ? RivunePalette.startupAccent.opacity(0.48) : RivunePalette.hairline, lineWidth: selected ? 1 : 0.7)
            }
            .contentShape(RoundedRectangle(cornerRadius: 13))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(method == .cli ? "Installed CLI, \(hasReadyCLI ? "recommended, a CLI is ready" : "available in this build")" : "API key, connect OpenAI or Anthropic")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private var cliContent: some View {
        VStack(alignment: .leading, spacing: 13) {
            MoreAPIProvidersButton(store: store)
            CLIInventorySettingsView(store: store)
            HStack {
                Text("Your installed clients").font(.system(size: 12, weight: .semibold))
                Spacer()
                Button {
                    guard !isPreview else { return }
                    store.refreshConnections()
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.clockwise")
                        Text(isChecking ? "Checking…" : "Refresh")
                    }.font(.system(size: 11, weight: .medium))
                }
                .buttonStyle(.plain)
                .foregroundStyle(RivunePalette.secondaryText)
                .disabled(isPreview || isChecking)
                .accessibilityLabel("Refresh CLI connection status")
            }
            VStack(spacing: 0) {
                providerRow(mode: .chatGPT, name: "ChatGPT", detail: "OpenAI · Codex CLI", readiness: store.codexCLIReadiness)
                Rectangle().fill(RivunePalette.hairline).frame(height: 1).padding(.horizontal, 17)
                providerRow(mode: .claude, name: "Claude", detail: "Anthropic · Claude Code", readiness: store.claudeCLIReadiness)
            }
            .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(RivunePalette.hairline))
            Text(isPreview
                 ? "UI preview: live connection checks and model requests are disabled."
                 : "Sign in using the provider’s own CLI flow. The account and authentication method used by that client determine billing and usage limits.")
                .font(.system(size: 11))
                .lineSpacing(3)
                .foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var apiContent: some View {
        APIConnectionSettingsView(store: store)
    }

    private var dataExplanation: some View {
        informationRow(
            symbol: "externaldrive",
            title: "Local history. Provider-powered answers.",
            detail: "Rivune saves conversations on this \(deviceName). Messages and included context are sent to the selected providers; team mode can share contributions between them."
        )
    }

    private func informationRow(symbol: String, title: String, detail: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 14))
                .foregroundStyle(RivunePalette.secondaryText)
                .frame(width: 20)
                .padding(.top, 2)
            VStack(alignment: .leading, spacing: 6) {
                Text(title).font(.system(size: 12, weight: .medium))
                Text(detail)
                    .font(.system(size: 11))
                    .lineSpacing(3)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func providerRow(mode: IntelligenceMode, name: String, detail: String, readiness: ProviderReadiness) -> some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(spacing: 11) {
                ProviderIdentityMark(mode: mode, size: 31)
                VStack(alignment: .leading, spacing: 4) {
                    Text(name).font(.system(size: 13, weight: .semibold))
                    Text(detail).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                }
                Spacer(minLength: 8)
                VStack(alignment: .trailing, spacing: 6) {
                    HStack(spacing: 5) {
                        Circle()
                            .fill(!isPreview && readiness.isReady ? RivunePalette.success : RivunePalette.secondaryText)
                            .frame(width: 5, height: 5)
                        Text(isPreview ? "Preview" : readiness.label)
                            .font(.system(size: 11, weight: .medium))
                            .multilineTextAlignment(.trailing)
                    }
                    .foregroundStyle(!isPreview && readiness.isReady ? RivunePalette.success : RivunePalette.secondaryText)
                    Button {
                        expandedProvider = expandedProvider == mode ? nil : mode
                    } label: {
                        HStack(spacing: 3) {
                            Text("Sign-in help")
                            Image(systemName: expandedProvider == mode ? "chevron.up" : "chevron.down")
                                .font(.system(size: 8))
                        }
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(RivunePalette.startupAccent)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(name) sign-in help")
                    .accessibilityValue(expandedProvider == mode ? "Expanded" : "Collapsed")
                }
            }
            if expandedProvider == mode {
                VStack(alignment: .leading, spacing: 10) {
                    Text("On your Mac, install the official \(mode == .chatGPT ? "Codex" : "Claude Code") CLI if needed. Open Terminal, run its login command, and complete the provider’s sign-in flow. Then return here and refresh.")
                        .font(.system(size: 11))
                        .lineSpacing(3)
                        .foregroundStyle(RivunePalette.secondaryText)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: 8) {
                        Text(loginCommand(for: mode))
                            .font(.system(size: 11, design: .monospaced))
                            .textSelection(.enabled)
                        Spacer(minLength: 0)
                        Button { copyLoginCommand(for: mode) } label: {
                            Image(systemName: copiedProvider == mode ? "checkmark" : "doc.on.doc")
                                .font(.system(size: 11))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Copy \(name) login command")
                    }
                    .padding(10)
                    .background(RivunePalette.canvas, in: RoundedRectangle(cornerRadius: 8))
                    Text("Copying does not run the command. Sign-in happens in the provider’s flow.")
                        .font(.system(size: 10))
                        .foregroundStyle(RivunePalette.secondaryText)
                }
            }
        }
        .padding(17)
    }

    private func introduction(title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 26, weight: .medium))
                .tracking(-0.7)
                .fixedSize(horizontal: false, vertical: true)
            Text(detail)
                .font(.system(size: 13))
                .lineSpacing(4)
                .foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func loginCommand(for mode: IntelligenceMode) -> String {
        mode == .chatGPT ? "codex login" : "claude auth login --claudeai"
    }

    private func copyLoginCommand(for mode: IntelligenceMode) {
        let command = loginCommand(for: mode)
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(command, forType: .string)
        #else
        UIPasteboard.general.string = command
        #endif
        copiedProvider = mode
    }
}
