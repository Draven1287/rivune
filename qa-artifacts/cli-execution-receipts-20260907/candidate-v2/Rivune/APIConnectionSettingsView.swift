import SwiftUI

struct APIConnectionSettingsView: View {
    @ObservedObject var store: RivuneStore
    var providerFilter: RivuneAPIProvider? = nil
    var showsSecurityNote = true
    private var providers: [RivuneAPIProvider] { providerFilter.map { [$0] } ?? RivuneAPIProvider.allCases }

    var body: some View {
        #if os(macOS)
        VStack(alignment: .leading, spacing: 16) {
            if providerFilter == nil { MoreAPIProvidersButton(store: store) }
            ForEach(providers) { provider in
                APIProviderConnectionForm(store: store, provider: provider)
            }
            if showsSecurityNote {
                Label("Keys are stored in this Mac’s Keychain. API usage is billed by your provider.", systemImage: "lock.shield")
                    .font(.system(size: 11))
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Access checks verify credentials and model availability without generating a response. The first message verifies response generation.")
                    .font(.system(size: 10))
                    .lineSpacing(3)
                    .foregroundStyle(RivunePalette.tertiaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        #else
        VStack(alignment: .leading, spacing: 10) {
            Label("Connect APIs on your Mac", systemImage: "desktopcomputer")
                .font(.system(size: 14, weight: .medium))
            Text("Add an OpenAI or Anthropic API key in Rivune on your Mac, then pair this iPhone. Your keys stay in the Mac’s Keychain.")
                .font(.system(size: 12))
                .foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(20)
        .rivuneGlass(cornerRadius: 14)
        #endif
    }
}

#if os(macOS)
private struct APIProviderConnectionForm: View {
    @ObservedObject var store: RivuneStore
    let provider: RivuneAPIProvider
    @State private var apiKey = ""
    @State private var modelID = ""
    @State private var hasSavedKey = false
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var localStatus: String?
    @State private var hasLocalError = false

    private var isPreview: Bool { RivuneLaunchContext.isIsolated }
    private var probe: APIConnectionProbe? { store.apiProbes[provider] }
    private var mode: IntelligenceMode { provider == .openAI ? .chatGPT : .claude }
    private var isChecking: Bool { probe?.readiness == .checking }
    private var controlsDisabled: Bool { isLoading || isSaving || store.hasActiveProviderRuns || isPreview }
    private var canSave: Bool {
        !controlsDisabled && !modelID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && (hasSavedKey || !apiKey.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 17) {
            HStack(spacing: 11) {
                ProviderIdentityMark(mode: mode, size: 30)
                VStack(alignment: .leading, spacing: 4) {
                    Text(provider.displayName + " API").font(.system(size: 13, weight: .semibold))
                    Text(provider == .openAI ? "Responses API" : "Messages API")
                        .font(.system(size: 10))
                        .foregroundStyle(RivunePalette.tertiaryText)
                }
                Spacer(minLength: 8)
                HStack(spacing: 5) {
                    Circle().fill(probe?.readiness.isReady == true ? RivunePalette.success : RivunePalette.tertiaryText).frame(width: 4, height: 4)
                    Text(statusLabel).font(.system(size: 10, weight: .medium))
                }
                .foregroundStyle(RivunePalette.secondaryText)
            }

            VStack(alignment: .leading, spacing: 7) {
                Text("API key").font(.system(size: 11, weight: .medium))
                SecureField(hasSavedKey ? "Key saved · enter a new key to replace it" : "Paste your API key", text: $apiKey)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12))
                    .padding(11)
                    .background(RivunePalette.canvas, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(RivunePalette.hairline))
                    .privacySensitive()
                    .disabled(controlsDisabled)
                    .accessibilityLabel("\(provider.displayName) API key")
                Text(hasSavedKey ? "Leave this blank to keep the saved key." : "Use a key from your provider’s developer account.")
                    .font(.system(size: 10))
                    .foregroundStyle(RivunePalette.tertiaryText)
            }

            VStack(alignment: .leading, spacing: 7) {
                Text("Model ID").font(.system(size: 11, weight: .medium))
                TextField("Exact model ID from your provider", text: $modelID)
                    .textFieldStyle(.plain)
                    .font(.system(size: 12, design: .monospaced))
                    .padding(11)
                    .background(RivunePalette.canvas, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(RivunePalette.hairline))
                    .disabled(controlsDisabled)
                    .accessibilityLabel("\(provider.displayName) API model ID")
            }

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 12) { actionButtons }
                VStack(alignment: .leading, spacing: 12) { actionButtons }
            }

            if let detail = localStatus ?? probe?.detail {
                Text(detail)
                    .font(.system(size: 11))
                    .lineSpacing(3)
                    .foregroundStyle(hasLocalError ? RivunePalette.claude : RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if store.hasActiveProviderRuns {
                Text("Connection settings are locked while any task is running, including tasks in other conversations.")
                    .font(.system(size: 10))
                    .foregroundStyle(RivunePalette.tertiaryText)
            }
        }
        .foregroundStyle(RivunePalette.primaryText)
        .padding(19)
        .rivuneGlass(cornerRadius: 15, shadow: false)
        .task { await loadConfiguration() }
        .onChange(of: probe) { _, _ in
            if !hasLocalError { localStatus = nil }
        }
        .onDisappear { apiKey = "" }
    }

    @ViewBuilder private var actionButtons: some View {
        Button(isSaving ? "Saving…" : "Save & check") { save() }
            .buttonStyle(.borderedProminent)
            .tint(RivunePalette.rivune)
            .foregroundStyle(RivunePalette.canvas)
            .disabled(!canSave)
        Button(isChecking ? "Checking…" : "Check access") {
            guard !controlsDisabled, hasSavedKey else { return }
            localStatus = nil
            hasLocalError = false
            store.refreshConnections()
        }
        .buttonStyle(.bordered)
        .disabled(controlsDisabled || !hasSavedKey || isChecking)
        if hasSavedKey {
            Button("Remove key", role: .destructive) { remove() }
                .buttonStyle(.plain)
                .font(.system(size: 11))
                .foregroundStyle(RivunePalette.secondaryText)
                .disabled(controlsDisabled)
        }
    }

    private var statusLabel: String {
        if isPreview { return "Preview" }
        if isLoading { return "Loading" }
        if isChecking { return "Checking" }
        if probe?.executionVerified == true && probe?.readiness.isReady == true { return "Response verified" }
        if probe?.readiness.isReady == true { return "Access checked" }
        return hasSavedKey ? "Needs check" : "Not connected"
    }

    private func loadConfiguration() async {
        guard !isPreview else { isLoading = false; return }
        let configuration = await APIConnectionStore.shared.configuration(for: provider)
        hasSavedKey = configuration.hasKey
        modelID = configuration.modelID ?? ""
        isLoading = false
    }

    private func save() {
        guard canSave else { return }
        isSaving = true
        hasLocalError = false
        localStatus = nil
        Task { @MainActor in
            guard !store.hasActiveProviderRuns else { isSaving = false; return }
            store.isSavingProviderConnection = true
            defer { store.isSavingProviderConnection = false }
            do {
                try await APIConnectionStore.shared.save(apiKey: apiKey, modelID: modelID, for: provider)
                apiKey = ""
                await loadConfiguration()
                localStatus = "Saved securely. Checking provider access…"
                store.refreshConnections()
            } catch {
                // Never display a provider payload or interpolate a secret into errors.
                localStatus = (error as? APIRuntimeError)?.userMessage ?? "Could not save this connection. Please try again."
                hasLocalError = true
            }
            isSaving = false
        }
    }

    private func remove() {
        guard !controlsDisabled else { return }
        isSaving = true
        hasLocalError = false
        Task { @MainActor in
            guard !store.hasActiveProviderRuns else { isSaving = false; return }
            store.isSavingProviderConnection = true
            defer { store.isSavingProviderConnection = false }
            do {
                try await APIConnectionStore.shared.remove(for: provider)
                apiKey = ""
                await loadConfiguration()
                localStatus = "API key removed from this Mac."
                store.refreshConnections()
            } catch {
                localStatus = "Could not remove this key from Keychain. Please try again."
                hasLocalError = true
            }
            isSaving = false
        }
    }
}
#endif

struct CLIInventorySettingsView: View {
    @ObservedObject var store: RivuneStore
    @State private var entries: [MacCLIEntry] = []
    @State private var title = ""
    @State private var executable = ""
    @State private var feedback = ""
    @State private var showAdd = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Label("CLI tools on this Mac", systemImage: "terminal").font(.system(size: 14, weight: .semibold))
                Spacer()
                Button("Scan Mac", systemImage: "arrow.clockwise") { scan() }
                    .buttonStyle(.bordered).disabled(RivuneLaunchContext.isIsolated)
            }
            Text("ChatGPT and Claude are included by default. Rivune also looks for other AI tools in common install locations. Scanning does not launch them.")
                .font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)
            ForEach(entries) { item in
                HStack(spacing: 10) {
                    if item.isDefault { ProviderIdentityMark(mode: item.command == "codex" ? .chatGPT : .claude, size: 25) }
                    else { Image(systemName: "terminal").frame(width: 25) }
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.title).font(.system(size: 12, weight: .medium))
                        Text(item.command).font(.system(size: 10, design: .monospaced)).foregroundStyle(RivunePalette.secondaryText)
                    }
                    Spacer()
                    Text(!item.installed ? "Not found" : item.supported ? "Installed" : "Found · adapter needed")
                        .font(.system(size: 10)).foregroundStyle(RivunePalette.secondaryText)
                }
            }
            DisclosureGroup("Add another CLI", isExpanded: $showAdd) {
                VStack(alignment: .leading, spacing: 12) {
                    TextField("Tool name", text: $title).textFieldStyle(.roundedBorder)
                    TextField("Executable name or full path", text: $executable).textFieldStyle(.roundedBorder)
                    Text("Add a tool installed outside the usual locations. An additional tool appears in your inventory; a compatible runtime adapter is still needed to use it for chat.")
                        .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    Button("Add CLI") {
                        do {
                            try MacCLIInventory.add(title: title, executable: executable, defaults: .standard)
                            title = ""; executable = ""; feedback = "CLI added to this Mac’s inventory."; scan()
                        } catch { feedback = (error as? MacCLIInventoryError)?.message ?? "Could not add this CLI." }
                    }.buttonStyle(.bordered).disabled(RivuneLaunchContext.isIsolated || store.hasActiveProviderRuns || title.isEmpty || executable.isEmpty)
                }.padding(.top, 12)
            }
            if !feedback.isEmpty { Text(feedback).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText) }
        }
        .padding(20).rivuneGlass(cornerRadius: 15, shadow: false)
        .task { scan() }
    }
    private func scan() {
        guard !RivuneLaunchContext.isIsolated else { feedback = "CLI discovery is unavailable in this isolated preview."; return }
        entries = MacCLIInventory.scan(defaults: .standard)
        feedback = "Scan complete. \(entries.filter { $0.installed }.count) installed AI tools found on this Mac."
    }
}
