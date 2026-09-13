import SwiftUI
import Combine
#if os(macOS) && !APP_STORE && DIRECT_UPDATES
import Sparkle
import Security
#endif

// Shared by ordinary quit and updater-driven termination. Each admission performs
// a fresh flush; no old successful save is a reusable permission to terminate.
enum RivuneSaveAdmission: Equatable {
    case ready, activeWork, draftFailed, historyFailed, projectsFailed, unavailable
    var message: String {
        switch self {
        case .ready: "Workspace saved."
        case .activeWork: "Finish active work before quitting or installing."
        case .draftFailed: "Your draft could not be saved. Keep Rivune open and retry."
        case .historyFailed: "Your conversations could not be saved. Keep Rivune open and retry."
        case .projectsFailed: "Your projects could not be saved. Keep Rivune open and retry."
        case .unavailable: "The workspace is not ready to save. Keep Rivune open and retry."
        }
    }
    static func evaluate(active: Bool, draft: () -> Bool, history: () -> Bool, projects: () -> Bool) -> Self {
        guard !active else { return .activeWork }
        guard draft() else { return .draftFailed }
        guard history() else { return .historyFailed }
        guard projects() else { return .projectsFailed }
        return .ready
    }
}

#if os(macOS)
@MainActor
final class RivuneTerminationDelegate: NSObject, NSApplicationDelegate {
    weak var store: RivuneStore?
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        guard !RivuneLaunchContext.isIsolated else { return .terminateNow }
        let admission = store?.saveAdmissionForTermination() ?? .unavailable
        guard admission == .ready else {
            #if !APP_STORE && DIRECT_UPDATES
            RivuneSoftwareUpdates.shared.terminationRejected(admission)
            #endif
            let alert = NSAlert()
            alert.messageText = "Rivune needs to stay open"
            alert.informativeText = admission.message
            alert.addButton(withTitle: "Keep working")
            alert.runModal()
            return .terminateCancel
        }
        return .terminateNow
    }
}

/// Owns one postponed install. Pure injected admission/wait operations make
/// races testable without Sparkle, real files, or a running updater service.
@MainActor
final class RivunePendingInstall: ObservableObject {
    enum State: Equatable { case idle, waiting, blocked(RivuneSaveAdmission), paused, invoking }
    @Published private(set) var state: State = .idle
    private var generation = UUID()
    private var build: String?
    private var handler: (() -> Void)?
    private var recovery: (() -> Bool)?
    private var task: Task<Void, Never>?
    private let admission: () -> RivuneSaveAdmission
    private let wait: () async throws -> Void
    init(admission: @escaping () -> RivuneSaveAdmission,
         wait: @escaping () async throws -> Void = { try await Task.sleep(for: .seconds(1)) }) {
        self.admission = admission; self.wait = wait
    }
    deinit { task?.cancel() }
    var canRetry: Bool { (handler != nil || recovery != nil) && state != .waiting }
    var canPause: Bool { handler != nil && state == .waiting }
    func begin(build: String, handler: @escaping () -> Void) {
        // Sparkle can report the same postponed item again; never invoke twice.
        guard self.build != build else { return }
        reset()
        self.build = build; self.handler = handler
        retry()
    }
    func retry() {
        guard handler != nil || recovery != nil, state != .waiting else { return }
        let ticket = generation
        state = .waiting
        task = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled, self.generation == ticket {
                let result = self.admission()
                guard self.generation == ticket else { return }
                if result == .activeWork {
                    do { try await self.wait() }
                    catch { return }
                    continue
                }
                guard result == .ready else { self.state = .blocked(result); return }
                if let recover = self.recovery {
                    // Open SDK-supported progress/resume; never reuse a consumed
                    // relaunch continuation after AppKit rejected final quit.
                    let requested = recover()
                    guard self.generation == ticket else { return }
                    if requested { self.recovery = nil; self.state = .idle }
                    else { self.state = .blocked(.unavailable) }
                    return
                }
                let callback = self.handler
                self.handler = nil; self.state = .invoking
                callback?()
                return
            }
        }
    }
    // This pauses our waiting task, not Sparkle's downloaded install-on-quit.
    // Retain the continuation so Retry remains usable; never claim it is removed.
    func pause() {
        guard handler != nil else { return }
        task?.cancel(); task = nil; generation = UUID(); state = .paused
    }
    @discardableResult
    func rejectedTermination(_ reason: RivuneSaveAdmission, recover: @escaping () -> Bool) -> Bool {
        guard state == .invoking else { return false }
        reset()
        recovery = recover; state = .blocked(reason)
        return true
    }
    func reset() {
        task?.cancel(); task = nil; generation = UUID()
        handler = nil; recovery = nil; build = nil; state = .idle
    }
}

enum RivuneUpdateCycleMessage {
    static func describe(_ error: Error?, domain: String, noUpdate: Int, cancelled: Int) -> String {
        guard let error = error as NSError? else { return "Update check completed." }
        if error.domain == domain {
            if error.code == noUpdate { return "Rivune is up to date." }
            if error.code == cancelled { return "Installation canceled." }
        }
        return "The update could not finish. Try Check Now again."
    }
}

struct RivuneUpdateAttempt: Codable, Equatable {
    let id: UUID
    let fromBuild: String
    let toBuild: String
}

@MainActor
struct RivuneUpdateRecord {
    let defaults: UserDefaults
    private let key = "rivune.update.pendingAttempt"
    func begin(from: String, to: String, notes: URL?) {
        clear()
        defaults.set(try? JSONEncoder().encode(RivuneUpdateAttempt(id: UUID(), fromBuild: from, toBuild: to)), forKey: key)
        replaceNotes(notes)
    }
    func replaceNotes(_ notes: URL?) {
        defaults.removeObject(forKey: "rivune.update.releaseNotes")
        if let notes, notes.scheme == "https" { defaults.set(notes.absoluteString, forKey: "rivune.update.releaseNotes") }
    }
    func clear() {
        defaults.removeObject(forKey: key)
        defaults.removeObject(forKey: "rivune.update.expectedBuild")
        defaults.removeObject(forKey: "rivune.update.releaseNotes")
    }
    func reconcile(current: String) -> Bool {
        let attempt = defaults.data(forKey: key).flatMap { try? JSONDecoder().decode(RivuneUpdateAttempt.self, from: $0) }
        // Consume all old/rollback/superseded records once. A matching version
        // establishes the running version, not how the user installed it.
        let matches = attempt?.toBuild == current && attempt?.fromBuild != current
        clear()
        return matches
    }
}
#endif

@main
struct RivuneApp: App {
    #if os(macOS)
    @NSApplicationDelegateAdaptor(RivuneTerminationDelegate.self) private var terminationDelegate
    #endif
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
                .onOpenURL { url in
                    if !store.handleSettingsURL(url) { Task { await account.finishEmailLink(url) } }
                }
                .task {
                    terminationDelegate.store = store
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
        .commands { RivuneWorkspaceSettingsCommands(store: store) }

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
    private var pendingObservation: AnyCancellable?
    private lazy var pending = RivunePendingInstall(admission: { [weak self] in self?.store?.saveAdmissionForTermination() ?? .unavailable })
    var canRetryInstall: Bool { pending.canRetry }
    var canPauseInstall: Bool { pending.canPause }
    func retryInstall() { pending.retry() }
    func pauseInstall() { pending.pause() }
    func terminationRejected(_ reason: RivuneSaveAdmission) {
        if pending.rejectedTermination(reason, recover: { [weak self] in
            guard let self, let controller = self.controller, controller.updater.canCheckForUpdates else { return false }
            self.status = "Opening the updater to resume installation."
            controller.checkForUpdates(nil)
            return true
        }) { record.clear() }
    }
    private var record: RivuneUpdateRecord { .init(defaults: .standard) }
    private var build: String { Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown" }

    var version: String { "\(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—") (\(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"))" }
    var lastCheck: Date? { controller?.updater.lastUpdateCheckDate }

    func attach(_ store: RivuneStore) {
        self.store = store
        if pendingObservation == nil {
            pendingObservation = pending.$state.sink { [weak self] state in
                guard let self else { return }
                switch state {
                case .idle: break
                case .waiting: self.status = "Waiting for active work to finish and saving your workspace."
                case .blocked(let reason): self.status = reason.message + " Installation is paused. Use Retry save and install."
                case .paused: self.status = "Installation is paused while you work. A downloaded update may still install when you quit safely."
                case .invoking: self.status = "Workspace saved. Continuing installation…"
                }
                self.objectWillChange.send()
            }
        }
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
            if record.reconcile(current: build) {
                store.showPrototypeNotice("Now running Rivune \(version).")
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
    static func cycleMessage(_ error: Error?) -> String {
        RivuneUpdateCycleMessage.describe(error, domain: SUSparkleErrorDomain,
            noUpdate: Int(SUError.noUpdateError.rawValue), cancelled: Int(SUError.installationCanceledError.rawValue))
    }
    func updater(_ updater: SPUUpdater, didFindValidUpdate item: SUAppcastItem) {
        record.replaceNotes(item.releaseNotesURL)
        objectWillChange.send()
    }

    func updater(_ updater: SPUUpdater, didFinishUpdateCycleFor updateCheck: SPUUpdateCheck, error: Error?) {
        if error != nil { pending.reset(); record.clear() }
        status = Self.cycleMessage(error)
        objectWillChange.send()
    }
    func updater(_ updater: SPUUpdater, didAbortWithError error: Error) {
        pending.reset(); record.clear(); status = Self.cycleMessage(error)
    }
    func updater(_ updater: SPUUpdater, shouldPostponeRelaunchForUpdate item: SUAppcastItem, untilInvokingBlock installHandler: @escaping () -> Void) -> Bool {
        pending.begin(build: item.versionString) { [weak self] in
            guard let self else { return }
            self.record.begin(from: self.build, to: item.versionString, notes: item.releaseNotesURL)
            installHandler()
        }
        return true
    }
    func updater(_ updater: SPUUpdater, willInstallUpdateOnQuit item: SUAppcastItem, immediateInstallationBlock immediateInstallHandler: @escaping () -> Void) -> Bool {
        record.begin(from: build, to: item.versionString, notes: item.releaseNotesURL)
        // Keep Sparkle's scheduling. The application delegate checks active work
        // and all saves on every quit, including this install-on-quit path.
        return false
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
    var canRetryInstall: Bool { false }
    var canPauseInstall: Bool { false }
    func retryInstall() {}
    func pauseInstall() {}
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
                if updates.canRetryInstall { Button("Retry save and install") { updates.retryInstall() } }
                if updates.canPauseInstall { Button("Keep working") { updates.pauseInstall() } }
                if let raw = UserDefaults.standard.string(forKey: "rivune.update.releaseNotes"), let url = URL(string: raw), url.scheme == "https" { Link("Latest release notes", destination: url) }
            } else {
                Text("This locally signed build will not contact an update server. Public updates require a configured feed and signed, notarized releases.").font(.caption).foregroundStyle(.secondary)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(18)
            .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 14))
    }
}
#endif


#if os(macOS)
private struct RivuneWorkspaceSettingsCommands: Commands {
    @ObservedObject var store: RivuneStore
    @Environment(\.openWindow) private var openWindow
    var body: some Commands {
        CommandGroup(replacing: .appSettings) {
            Button("Settings…") {
                openWindow(id: "main")
                store.presentSettings()
            }.keyboardShortcut(",", modifiers: .command)
        }
    }
}
#endif
