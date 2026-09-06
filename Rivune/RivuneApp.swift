import SwiftUI
#if os(macOS) && !APP_STORE && DIRECT_UPDATES
import Sparkle
import Security
#endif

@main
struct RivuneApp: App {
    @StateObject private var account = RivuneAccount()
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var bridge: PeerBridge
    @StateObject private var store: RivuneStore

    init() {
        if !RivuneLaunchContext.isIsolated {
            RivuneBrand.migrateLegacyDefaults()
        }
        let bridge = PeerBridge()
        _bridge = StateObject(wrappedValue: bridge)
        _store = StateObject(wrappedValue: RivuneStore(bridge: bridge))
    }

    var body: some Scene {
        #if os(macOS)
        Window(RivuneBrand.displayName, id: "main") {
            RootView(store: store, bridge: bridge)
                .environmentObject(account)
                .tint(RivunePalette.rivune)
                .onOpenURL { url in Task { await account.finishEmailLink(url) } }
                .task {
                    #if !APP_STORE
                    RivuneSoftwareUpdates.shared.attach(store)
                    #endif
                    await account.monitor()
                }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await account.restore() } }
                }
                .frame(minWidth: 920, minHeight: 680)
        }
        .windowStyle(.titleBar)
        .defaultSize(width: 1_260, height: 840)
        #if !APP_STORE
        .commands {
            CommandGroup(after: .appInfo) {
                Button("Check for Updates…") { RivuneSoftwareUpdates.shared.check() }
            }
        }
        #endif
        Settings {
            SettingsView(store: store)
                .environmentObject(account)
                .tint(RivunePalette.rivune)
                .environmentObject(bridge)
                .frame(minWidth: 820, minHeight: 620)
                .sheet(isPresented: $store.showSettingsAPI) { UniversalAPIWorkspaceView() }
        }

        #else
        WindowGroup {
            RootView(store: store, bridge: bridge)
                .environmentObject(account)
                .tint(RivunePalette.rivune)
                 .onOpenURL { url in
                    if url.scheme == "rivune", url.host == "pair" {
                        do { try bridge.pair(using: url.absoluteString) }
                        catch { store.showPrototypeNotice("Pairing link is invalid or expired. Create a new code on your Mac.") }
                    } else { Task { await account.finishEmailLink(url) } }
                }
                .task { await account.monitor() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await account.restore() } }
                }
        }
        #endif
    }
}

#if os(macOS) && !APP_STORE
#if DIRECT_UPDATES
@MainActor
final class RivuneSoftwareUpdates: NSObject, ObservableObject, SPUUpdaterDelegate {
    static let shared = RivuneSoftwareUpdates()
    @Published private(set) var available = false
    @Published private(set) var status = "Software updates are unavailable in this local preview."
    @Published var automatic = false { didSet { controller?.updater.automaticallyChecksForUpdates = automatic } }
    @Published var downloads = false { didSet { controller?.updater.automaticallyDownloadsUpdates = downloads } }
    private var controller: SPUStandardUpdaterController?
    private weak var store: RivuneStore?
    var version: String { "\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"))" }
    var lastCheck: Date? { controller?.updater.lastUpdateCheckDate }

    func attach(_ store: RivuneStore) {
        self.store = store
        guard controller == nil, !RivuneLaunchContext.isIsolated else { return }
        let info = Bundle.main.infoDictionary ?? [:]
        guard info["RivuneDistribution"] as? String == "developer-id",
              let feed = info["SUFeedURL"] as? String, let url = URL(string: feed), url.scheme == "https", url.host != nil,
              let key = info["SUPublicEDKey"] as? String, Data(base64Encoded: key)?.count == 32,
              let team = info["RivuneUpdateTeamID"] as? String, !team.isEmpty,
              Self.hasDeveloperSignature(team: team) else { return }
        controller = SPUStandardUpdaterController(startingUpdater: false, updaterDelegate: self, userDriverDelegate: nil)
        do {
            try controller?.updater.start()
            available = true
            automatic = controller?.updater.automaticallyChecksForUpdates ?? false
            downloads = controller?.updater.automaticallyDownloadsUpdates ?? false
            status = "Ready to check for updates."
            let defaults = UserDefaults.standard
            let build = info["CFBundleVersion"] as? String
            if let expected = defaults.string(forKey: "rivune.update.expectedBuild"), expected == build {
                store.showPrototypeNotice("Rivune was updated to \(version). Release notes are in Software Updates.")
                defaults.removeObject(forKey: "rivune.update.expectedBuild")
            }
        } catch { status = "Software updates could not start. \(error.localizedDescription)" }
    }
    private static func hasDeveloperSignature(team: String) -> Bool {
        var code: SecCode?
        guard SecCodeCopySelf([], &code) == errSecSuccess, let code else { return false }
        var requirement: SecRequirement?
        let rule = "anchor apple generic and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = \"\(team)\""
        guard SecRequirementCreateWithString(rule as CFString, [], &requirement) == errSecSuccess, let requirement else { return false }
        return SecCodeCheckValidity(code, [], requirement) == errSecSuccess
    }
    func check() {
        guard available, let controller else {
            let alert = NSAlert(); alert.messageText = "Software updates unavailable"
            alert.informativeText = status; alert.addButton(withTitle: "OK"); alert.runModal(); return
        }
        status = "Checking for updates…"
        controller.checkForUpdates(nil)
    }
    func updater(_ updater: SPUUpdater, didFinishUpdateCycleFor updateCheck: SPUUpdateCheck, error: Error?) {
        status = error == nil ? "Last check completed. Updates are presented by Rivune when available." : "The last check could not finish. Try Check Now when you are online."
        objectWillChange.send()
    }
    func updater(_ updater: SPUUpdater, shouldPostponeRelaunchForUpdate item: SUAppcastItem, untilInvokingBlock installHandler: @escaping () -> Void) -> Bool {
        guard let store else { return true }
        status = "Waiting for active replies to finish before installing. Your workspace will be saved."
        Task { @MainActor in
            while store.hasActiveProviderRuns { try? await Task.sleep(for: .seconds(1)) }
            guard store.prepareForUpdate() else { status = "The workspace could not be saved. Installation is paused."; return }
            UserDefaults.standard.set(item.versionString, forKey: "rivune.update.expectedBuild")
            if let notes = item.releaseNotesURL, notes.scheme == "https" { UserDefaults.standard.set(notes.absoluteString, forKey: "rivune.update.releaseNotes") }
            installHandler()
        }
        return true
    }
}

#else
@MainActor
final class RivuneSoftwareUpdates: ObservableObject {
    static let shared = RivuneSoftwareUpdates()
    let available = false
    let status = "Software updates are unavailable in this local preview."
    @Published var automatic = false
    @Published var downloads = false
    var lastCheck: Date? { nil }
    var version: String { "\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"))" }
    func attach(_ store: RivuneStore) {}
    func check() {
        let alert = NSAlert(); alert.messageText = "Software updates unavailable"
        alert.informativeText = status; alert.addButton(withTitle: "OK"); alert.runModal()
    }
}
#endif

struct RivuneUpdatesSettings: View {
    @ObservedObject private var updates = RivuneSoftwareUpdates.shared
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Software Updates", systemImage: "arrow.down.circle").font(.headline)
            Text("Rivune \(updates.version)").font(.callout)
            Text(updates.status).font(.callout).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            if updates.available {
                Toggle("Check for updates automatically", isOn: $updates.automatic)
                Toggle("Download updates automatically", isOn: $updates.downloads)
                if let date = updates.lastCheck { Text("Last checked: \(date.formatted())").font(.caption).foregroundStyle(.secondary) }
                Button("Check Now") { updates.check() }
                if let raw = UserDefaults.standard.string(forKey: "rivune.update.releaseNotes"), let url = URL(string: raw), url.scheme == "https" { Link("Latest release notes", destination: url) }
            } else {
                Text("This locally signed build will not contact an update server. Public updates require a configured feed and signed, notarized releases.").font(.caption).foregroundStyle(.secondary)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
            .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 14))
    }
}
#endif
