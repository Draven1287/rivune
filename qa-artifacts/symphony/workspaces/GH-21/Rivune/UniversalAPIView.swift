import SwiftUI

/// The API workspace uses the same native chrome and space identity. It runs
/// text APIs directly on the Mac; browser pairing is not involved.
struct UniversalAPIWorkspaceView: View {
    @StateObject private var api = UniversalAPIWorkspaceStore()
    @Environment(\.dismiss) private var dismiss
    @State private var replacingKey = false
    @State private var replacementKey = ""
    @State private var adding = false
    @State private var confirmRemoval = false
    @State private var confirmClear = false

    var body: some View {
        ZStack {
            RivuneBackground()
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    RivuneOrb(size: 34, motionEnabled: false)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Your AI connections").font(.system(size: 18, weight: .semibold))
                        Text("One space. More perspectives.").font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    }
                    Spacer()
                    Button("Add provider", systemImage: "plus") { adding = true }.buttonStyle(.bordered)
                    Button { dismiss() } label: { Image(systemName: "xmark").frame(width: 28, height: 28) }
                        .buttonStyle(.plain).accessibilityLabel("Close API workspace")
                }.padding(22)
                Divider().overlay(RivunePalette.hairline)
                if api.snapshot.connections.isEmpty {
                    Spacer()
                    RivuneOrb(size: 72, motionEnabled: false)
                    Text("Bring your own intelligence.").font(.system(size: 28, weight: .medium)).padding(.top, 18)
                    Text("Choose a provider, connect your API key, and start a conversation.\nUse a custom endpoint for any service that speaks a supported API format.")
                        .font(.system(size: 13)).foregroundStyle(RivunePalette.secondaryText)
                        .multilineTextAlignment(.center).lineSpacing(5).padding(.top, 10)
                    Button("Connect an AI", systemImage: "plus") { adding = true }
                        .buttonStyle(.borderedProminent).padding(.top, 22)
                    Spacer()
                } else {
                    connectionBar
                    transcript
                    if let notice = api.notice {
                        Text(notice).font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 24).padding(.vertical, 8)
                            .accessibilityAddTraits(.updatesFrequently)
                    }
                    composer
                }
            }
        }
        .foregroundStyle(RivunePalette.primaryText)
        .preferredColorScheme(.dark).tint(RivunePalette.rivune)
        .frame(minWidth: 680, idealWidth: 880, minHeight: 580, idealHeight: 740)
        .alert("Replace API key", isPresented: $replacingKey) {
            SecureField("New API key", text: $replacementKey)
            Button("Cancel", role: .cancel) { replacementKey = "" }
            Button("Save key") {
                do { try api.replaceKey(replacementKey) } catch { api.notice = UniversalAPIRuntime.message(error) }
                replacementKey = ""
            }
        } message: { Text("Your conversation is preserved. The new key replaces this connection’s saved key in Keychain.") }
        .sheet(isPresented: $adding) { UniversalAPIConnectionSheet(api: api) }
        .confirmationDialog("Remove this connection and its API conversation?", isPresented: $confirmRemoval) {
            Button("Remove connection", role: .destructive) {
                guard let connection = api.selected else { return }
                do { try api.remove(connection) } catch { api.notice = UniversalAPIRuntime.message(error) }
            }
        } message: { Text("Its saved API key will also be removed from Keychain.") }
        .confirmationDialog("Start a new conversation with this provider?", isPresented: $confirmClear) {
            Button("Clear conversation", role: .destructive) {
                do { try api.clearConversation() } catch { api.notice = UniversalAPIRuntime.message(error) }
            }
        } message: { Text("This clears this provider’s current API conversation from this Mac.") }
        .interactiveDismissDisabled(api.runningID != nil)
        .onDisappear { api.stop() }
    }
    private var connectionBar: some View {
        HStack(spacing: 12) {
            Picker("Provider", selection: $api.selectedID) {
                ForEach(api.snapshot.connections) { connection in
                    Text(connection.name).tag(Optional(connection.id))
                }
            }.frame(maxWidth: 230)
            VStack(alignment: .leading, spacing: 3) {
                Text(api.selected?.model ?? "Select an AI").font(.system(size: 12, weight: .medium, design: .monospaced)).lineLimit(1)
                Text(api.selected?.endpoint.host ?? "").font(.system(size: 10)).foregroundStyle(RivunePalette.secondaryText).lineLimit(1)
            }
            Spacer(minLength: 5)
            Menu {
                if api.selected?.usesKey == true { Button("Replace API key") { replacementKey = ""; replacingKey = true } }
                Button("Check available models") { Task { await api.checkModels() } }
                Button("New conversation") { confirmClear = true }
                Divider()
                Button("Remove connection", role: .destructive) { confirmRemoval = true }
            } label: { Image(systemName: "slider.horizontal.3").frame(width: 30, height: 30) }
                .menuStyle(.borderlessButton).fixedSize().accessibilityLabel("API connection settings")
        }
        .disabled(api.runningID != nil || api.isChecking)
        .padding(.horizontal, 24).padding(.vertical, 14)
        .background(RivunePalette.surface.opacity(0.85))
        .onChange(of: api.selectedID) { _, _ in api.notice = nil; api.draft = "" }
    }
    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 22) {
                    if api.exchanges.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("What would you like to explore?").font(.system(size: 24, weight: .medium))
                            Text("Your messages go to \(api.selected?.name ?? "your selected provider"). This conversation is saved on this Mac.")
                                .font(.system(size: 13)).foregroundStyle(RivunePalette.secondaryText).lineSpacing(4)
                        }.padding(.vertical, 42)
                    }
                    ForEach(api.exchanges) { exchange in
                        VStack(alignment: .leading, spacing: 15) {
                            Text(exchange.prompt).font(.system(size: 14)).textSelection(.enabled)
                                .padding(15).frame(maxWidth: .infinity, alignment: .leading)
                                .background(RivunePalette.surfaceRaised.opacity(0.9), in: RoundedRectangle(cornerRadius: 14))
                            if let answer = exchange.answer {
                                Label(api.selected?.name ?? "AI", systemImage: "circle.fill")
                                    .font(.system(size: 11, weight: .medium)).foregroundStyle(RivunePalette.rivune)
                                Text(.init(answer)).font(.system(size: 14)).lineSpacing(5).textSelection(.enabled)
                            } else if let error = exchange.error {
                                Label(error, systemImage: "exclamationmark.circle").font(.system(size: 12)).foregroundStyle(.orange)
                            } else if api.runningID != nil {
                                ProgressView("Waiting for your AI…").font(.system(size: 12))
                            } else {
                                Text("This request was interrupted. Send another message to continue.")
                                    .font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText)
                            }
                        }.id(exchange.id)
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }.padding(24)
            }
            .onChange(of: api.exchanges.count) { _, _ in proxy.scrollTo("bottom", anchor: .bottom) }
            .onChange(of: api.runningID) { _, running in if running == nil { proxy.scrollTo("bottom", anchor: .bottom) } }
        }
    }
    private var composer: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Send a message", text: $api.draft, axis: .vertical)
                .lineLimit(2...6).textFieldStyle(.plain).font(.system(size: 14)).disabled(api.runningID != nil)
            HStack {
                Text("API · Text conversation").font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                Spacer()
                if api.runningID != nil {
                    Button("Stop", systemImage: "stop.fill") { api.stop() }.buttonStyle(.bordered)
                } else {
                    Button("Send", systemImage: "arrow.up") { api.send() }
                        .buttonStyle(.borderedProminent).keyboardShortcut(.return, modifiers: .command)
                        .disabled(api.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || api.isChecking)
                }
            }
        }.padding(18).rivuneGlass(cornerRadius: 18).padding(20)
    }
}

struct UniversalAPIConnectionSheet: View {
    @ObservedObject var api: UniversalAPIWorkspaceStore
    @Environment(\.dismiss) private var dismiss
    @State private var presetID = "openrouter"
    @State private var name = "OpenRouter"
    @State private var endpoint = "https://openrouter.ai/api/v1"
    @State private var style = UniversalAPIStyle.chatCompletions
    @State private var model = ""
    @State private var key = ""
    @State private var noKey = false
    @State private var error: String?
    private var isLocal: Bool { (try? UniversalAPIConnection.endpoint(endpoint)).map(UniversalAPIConnection.isLoopback) == true }
    var body: some View {
        ZStack {
            RivuneBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack {
                        RivuneOrb(size: 40, motionEnabled: false)
                        Text("Connect your AI").font(.system(size: 22, weight: .medium))
                        Spacer()
                        Button("Cancel") { dismiss() }.buttonStyle(.plain)
                    }
                    Text("Use your own provider account. OpenRouter offers many models through one API, or connect a service directly.")
                        .font(.system(size: 12)).foregroundStyle(RivunePalette.secondaryText).lineSpacing(4)
                    Picker("Provider", selection: $presetID) {
                        ForEach(UniversalAPIPreset.all) { Text($0.name).tag($0.id) }
                    }
                    field("Connection name", placeholder: "Name your AI", text: $name)
                    field("Base URL", placeholder: "https://your-provider.example/v1", text: $endpoint)
                    Picker("API format", selection: $style) {
                        ForEach(UniversalAPIStyle.allCases) { Text($0.title).tag($0) }
                    }
                    Text("Supports text models using Chat Completions, Responses, or Messages. Other protocols and media APIs need their own adapters.")
                        .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    field("Model ID", placeholder: "Exact model ID from your provider", text: $model)
                    if isLocal { Toggle("Local server does not require an API key", isOn: $noKey).font(.system(size: 12)) }
                    if !isLocal || !noKey {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("API key").font(.system(size: 12, weight: .medium))
                            SecureField("Paste your provider’s key", text: $key)
                                .textFieldStyle(.roundedBorder).privacySensitive()
                        }
                    }
                    Label("Saved in this Mac’s Keychain. Usage is billed by your provider.", systemImage: "lock.shield")
                        .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                    if let error { Text(error).font(.system(size: 12)).foregroundStyle(.orange).fixedSize(horizontal: false, vertical: true) }
                    Button("Save connection", systemImage: "arrow.right") { save() }
                        .buttonStyle(.borderedProminent).controlSize(.large)
                        .disabled(model.isEmpty || name.isEmpty || endpoint.isEmpty || ((!isLocal || !noKey) && key.isEmpty) || RivuneLaunchContext.isIsolated)
                }.padding(30)
            }
        }.foregroundStyle(RivunePalette.primaryText).preferredColorScheme(.dark).tint(RivunePalette.rivune)
        .frame(width: 560, height: 720)
        .onChange(of: presetID) { _, id in
            guard let preset = UniversalAPIPreset.all.first(where: { $0.id == id }) else { return }
            name = preset.id == "custom" ? "" : preset.name
            endpoint = preset.endpoint; style = preset.style; noKey = preset.local
            key = ""; model = ""; error = nil
        }
        .onChange(of: endpoint) { _, _ in key = ""; error = nil }
        .onDisappear { key = "" }
    }
    private func field(_ title: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.system(size: 12, weight: .medium))
            TextField(placeholder, text: text).textFieldStyle(.roundedBorder)
        }
    }
    private func save() {
        do {
            let connection = UniversalAPIConnection(id: UUID(), name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                endpoint: try UniversalAPIConnection.endpoint(endpoint), style: style,
                model: model.trimmingCharacters(in: .whitespacesAndNewlines), usesKey: !(isLocal && noKey))
            try api.add(connection, key: key.trimmingCharacters(in: .whitespacesAndNewlines))
            key = ""; dismiss()
        } catch { self.error = UniversalAPIRuntime.message(error) }
    }
}

struct MoreAPIProvidersButton: View {
    @ObservedObject var store: RivuneStore
    var inSettings = false
    var body: some View {
        Button { if inSettings { store.showSettingsAPI = true } else { store.showUniversalAPI = true } } label: {
            HStack(spacing: 13) {
                Image(systemName: "globe").font(.system(size: 22)).frame(width: 32)
                VStack(alignment: .leading, spacing: 5) {
                    Text("More API providers").font(.system(size: 13, weight: .semibold))
                    Text("Gemini, Grok, OpenRouter, local models, or your own endpoint.")
                        .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                }
                Spacer(minLength: 8)
                Image(systemName: "arrow.up.right")
            }.padding(18).rivuneGlass(cornerRadius: 14)
        }.buttonStyle(.plain)
    }
}
