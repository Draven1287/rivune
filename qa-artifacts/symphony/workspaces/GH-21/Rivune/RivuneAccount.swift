import SwiftUI
import Auth
import AuthenticationServices
import Security


enum RivuneAccountLaunchPolicy {
    static func permitsAutomaticRestore(enabled: Bool, distribution: String?, expectedTeam: String?, verifiedDeveloperID: Bool, isolated: Bool) -> Bool {
        enabled && distribution == "developer-id" && !(expectedTeam ?? "").isEmpty && verifiedDeveloperID && !isolated
    }
    static var trustedBundle: Bool {
        #if os(macOS)
        let values = Bundle.main.infoDictionary ?? [:]
        guard let team = values["RivuneAccountTeamID"] as? String, team.range(of: "^[A-Z0-9]{10}$", options: .regularExpression) != nil else { return false }
        var code: SecCode?
        var requirement: SecRequirement?
        let rule = "anchor apple generic and certificate leaf[field.1.2.840.113635.100.6.1.13] exists and certificate leaf[subject.OU] = \"\(team)\""
        let verified = SecCodeCopySelf([], &code) == errSecSuccess &&
            SecRequirementCreateWithString(rule as CFString, [], &requirement) == errSecSuccess &&
            code != nil && requirement != nil && SecCodeCheckValidity(code!, [], requirement!) == errSecSuccess
        return permitsAutomaticRestore(enabled: (values["RivuneAccount"] as? [String: Any])?["Enabled"] as? Bool == true,
            distribution: values["RivuneDistribution"] as? String, expectedTeam: team, verifiedDeveloperID: verified, isolated: RivuneLaunchContext.isIsolated)
        #else
        return false // iOS account activation requires its own signed distribution policy.
        #endif
    }
}

/// Public application configuration only. Provider secrets belong in Supabase, never here.
struct RivuneAccountConfiguration {
    let url: URL
    let key: String
    let methods: Set<String>
    static let callback = URL(string: "rivune://auth/callback")!

    init?(values: [String: Any]) {
        guard values["Enabled"] as? Bool == true,
              let raw = values["URL"] as? String,
              let url = URL(string: raw), url.scheme == "https",
              let host = url.host, host.hasSuffix(".supabase.co"),
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.path.isEmpty || url.path == "/",
              let key = values["PublishableKey"] as? String,
              key.hasPrefix("sb_publishable_"), key.count > 20 else { return nil }
        self.url = url
        self.key = key
        self.methods = Set(["email", "google", "apple"].filter { values[$0] as? Bool == true })
    }

    static var bundled: Self? {
        guard RivuneAccountLaunchPolicy.trustedBundle else { return nil }
        return (Bundle.main.object(forInfoDictionaryKey: "RivuneAccount") as? [String: Any]).flatMap(Self.init)
    }
}

enum RivuneAccountEvent: Sendable { case refreshed, signedOut }
struct RivuneVerifiedAccount: Sendable { let id: String; let email: String }

@MainActor
protocol RivuneAccountBackend: AnyObject {
    var events: AsyncStream<RivuneAccountEvent> { get }
    func verifiedAccount() async throws -> RivuneVerifiedAccount
    func oauth(_ provider: Provider) async throws
    func sendCode(_ email: String) async throws
    func verify(_ email: String, code: String) async throws
    func callback(_ url: URL) async throws
    func signOut() async throws
}

@MainActor
private final class SupabaseAccountBackend: RivuneAccountBackend {
    let client: AuthClient
    init(_ configuration: RivuneAccountConfiguration) {
        client = AuthClient(configuration: .init(
            url: configuration.url.appendingPathComponent("auth/v1"),
            headers: ["apikey": configuration.key], flowType: .pkce,
            redirectToURL: RivuneAccountConfiguration.callback,
            localStorage: KeychainLocalStorage(service: "app.rivune.account.\(configuration.url.host!)"),
            fetch: { request in
                var request = request; request.timeoutInterval = 25
                return try await URLSession.shared.data(for: request)
            }))
    }
    var events: AsyncStream<RivuneAccountEvent> {
        let client = client
        return AsyncStream { continuation in
            let task = Task {
                for await (event, _) in client.authStateChanges {
                    if Task.isCancelled { break }
                    switch event {
                    case .signedOut: continuation.yield(.signedOut)
                    case .initialSession, .tokenRefreshed, .userUpdated: continuation.yield(.refreshed)
                    default: break
                    }
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }
    func verifiedAccount() async throws -> RivuneVerifiedAccount {
        let user = try await client.user()
        guard !user.isAnonymous else { throw AuthError.sessionMissing }
        return RivuneVerifiedAccount(id: user.id.uuidString, email: user.email ?? "Rivune account")
    }
    func oauth(_ provider: Provider) async throws { try await client.signInWithOAuth(provider: provider, redirectTo: RivuneAccountConfiguration.callback) }
    func sendCode(_ email: String) async throws { try await client.signInWithOTP(email: email) }
    func verify(_ email: String, code: String) async throws { try await client.verifyOTP(email: email, token: code, type: .email) }
    func callback(_ url: URL) async throws { try await client.session(from: url) }
    func signOut() async throws { try await client.signOut(scope: .local) }
}

@MainActor
final class RivuneAccount: ObservableObject {
    @Published private(set) var verifiedUserID: String?
    @Published private(set) var identity: String?
    @Published private(set) var busy = false
    @Published private(set) var challengeEmail: String?
    @Published private(set) var message: String?
    @Published private(set) var signOutPending = false
    @Published private(set) var verificationFailed = false
    let configuration: RivuneAccountConfiguration?
    private var client: (any RivuneAccountBackend)?
    private let injectedFactory: (() -> any RivuneAccountBackend)?
    private var observation: Task<Void, Never>?
    private var signOutInFlight = false
    private var revision: UInt64 = 0
    private(set) var observerStarts = 0
    private(set) var sessionAccessRequested = false
    private let defaults: UserDefaults
    private var signedOutKey: String { "rivune.account.explicitlySignedOut.\(configuration?.url.host ?? "unconfigured")" }
    private var pendingKey: String { signedOutKey + ".pending" }

    init(configuration: RivuneAccountConfiguration? = .bundled, defaults: UserDefaults = .standard,
         backendFactory: (() -> any RivuneAccountBackend)? = nil) {
        self.configuration = configuration; self.defaults = defaults
        // Only hosted tests may inject a backend; normal app entry points never do.
        self.injectedFactory = RivuneLaunchContext.isIsolated ? backendFactory : nil
        self.signOutPending = defaults.bool(forKey: "rivune.account.explicitlySignedOut.\(configuration?.url.host ?? "unconfigured").pending")
    }
    deinit { observation?.cancel() }
    private func clientForUserAction() -> (any RivuneAccountBackend)? {
        guard let configuration, RivuneAccountLaunchPolicy.trustedBundle || injectedFactory != nil else { return nil }
        sessionAccessRequested = true
        if client == nil { client = injectedFactory?() ?? SupabaseAccountBackend(configuration) }
        startObservation()
        return client
    }
    private func startObservation() {
        guard observation == nil, let client else { return }
        observerStarts += 1
        let events = client.events
        observation = Task { [weak self] in
            for await event in events {
                guard !Task.isCancelled else { break }
                switch event {
                case .signedOut: self?.invalidateIdentity()
                case .refreshed:
                    // Do not hold the observer while verification is in flight:
                    // signed-out events must be able to invalidate its result.
                    Task { [weak self] in await self?.restore() }
                }
            }
        }
    }
    private func invalidateIdentity() {
        revision &+= 1; identity = nil; verifiedUserID = nil; busy = false
    }
    func monitor() async {
        // Launch is intentionally inert. Explicit client creation owns observation.
        guard sessionAccessRequested else { return }
        startObservation()
    }
    func supports(_ method: String) -> Bool { configuration?.methods.contains(method) == true }
    func restore() async {
        guard sessionAccessRequested, let client, !busy, !defaults.bool(forKey: signedOutKey) else { return }
        revision &+= 1; let ticket = revision
        busy = true; identity = nil; verifiedUserID = nil
        defer { if revision == ticket { busy = false } }
        do {
            let user = try await client.verifiedAccount()
            guard !Task.isCancelled, revision == ticket, !defaults.bool(forKey: signedOutKey) else { return }
            identity = user.email; verifiedUserID = user.id; verificationFailed = false; message = nil
        } catch {
            guard revision == ticket else { return }
            identity = nil; verifiedUserID = nil; verificationFailed = true
            message = "We couldn’t verify your account. Retry when connected. Your local workspace is available."
        }
    }
    func retryVerification() async {
        guard clientForUserAction() != nil else { return }
        await restore()
    }
    static func acceptsCallback(_ url: URL) -> Bool {
        url.scheme == "rivune" && url.host == "auth" && url.path == "/callback" && url.fragment == nil &&
        URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.filter({ $0.name == "code" && !($0.value ?? "").isEmpty }).count == 1
    }
    private func authenticate(_ action: @MainActor (any RivuneAccountBackend) async throws -> Void) async {
        guard !busy, !signOutPending, let client = clientForUserAction() else { return }
        revision &+= 1; let ticket = revision
        busy = true; message = nil
        defer { if revision == ticket { busy = false } }
        do {
            try await action(client)
            let user = try await client.verifiedAccount()
            guard !Task.isCancelled, revision == ticket else { return }
            identity = user.email; verifiedUserID = user.id; verificationFailed = false
            defaults.set(false, forKey: signedOutKey); challengeEmail = nil
        } catch {
            guard revision == ticket else { return }
            identity = nil; verifiedUserID = nil
            let ns = error as NSError
            if ns.domain != ASWebAuthenticationSessionError.errorDomain || ns.code != ASWebAuthenticationSessionError.canceledLogin.rawValue {
                message = "Sign-in couldn’t finish. Check your connection and try again."
            }
        }
    }
    func finishEmailLink(_ url: URL) async {
        guard Self.acceptsCallback(url), supports("email"), sessionAccessRequested, challengeEmail != nil else { return }
        await authenticate { try await $0.callback(url) }
    }
    func oauth(_ provider: Provider) async {
        guard supports(provider.rawValue) else { return }
        await authenticate { try await $0.oauth(provider) }
    }
    func verify(code: String) async {
        guard let email = challengeEmail else { return }
        await authenticate { try await $0.verify(email, code: code.trimmingCharacters(in: .whitespacesAndNewlines)) }
    }
    func sendCode(email: String) async {
        let email = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard supports("email"), !busy, !signOutPending, email.contains("@"), let client = clientForUserAction() else { return }
        revision &+= 1; let ticket = revision
        busy = true; message = nil
        defer { if revision == ticket { busy = false } }
        do {
            try await client.sendCode(email)
            guard !Task.isCancelled, revision == ticket else { return }
            challengeEmail = email; message = "Open the sign-in link in your email to return to Rivune."
        } catch { if revision == ticket { message = "We couldn’t send a sign-in link. Check your address and try again shortly." } }
    }
    func signOut() async {
        guard !signOutInFlight, let client = clientForUserAction() else { return }
        signOutInFlight = true
        defer { signOutInFlight = false }
        invalidateIdentity(); let ticket = revision
        busy = true; signOutPending = true; challengeEmail = nil; verificationFailed = false
        defaults.set(true, forKey: signedOutKey); defaults.set(true, forKey: pendingKey)
        defer { if revision == ticket { busy = false } }
        do {
            try await client.signOut()
            // SDK signedOut events may invalidate the revision; persisted intent
            // remains authoritative, and no new sign-in is allowed while pending.
            signOutPending = false; defaults.set(false, forKey: pendingKey); busy = false
            message = "Signed out of Rivune. Your AI connections and local conversations are unchanged."
        } catch {
            busy = false
            message = "Sign-out is incomplete. Your account is hidden, but saved-session removal is not confirmed. Retry sign-out."
        }
    }
    func cancelCode() { guard !busy else { return }; challengeEmail = nil; message = nil }
}

struct RivuneAccountPanel: View {
    @EnvironmentObject private var account: RivuneAccount
    var onPrivacy: (() -> Void)? = nil
    @State private var email = ""
    @State private var code = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if account.signOutPending {
                Text("Sign-out needs another attempt").font(.headline)
                Text("Saved-session removal has not been confirmed. Your local workspace remains available.")
                Button("Retry sign-out") { Task { await account.signOut() } }
            } else if let identity = account.identity {
                HStack(spacing: 12) {
                    Text(String(identity.prefix(1)).uppercased()).font(.title2).frame(width: 44, height: 44).background(RivunePalette.surfaceRaised, in: Circle()).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(identity).font(.headline).textSelection(.enabled)
                        Text("Account verified with Rivune").font(.caption).foregroundStyle(.secondary)
                    }
                }
                Text("Conversations and projects are stored on this Mac. Cloud sync and billing are not enabled.").font(.callout).foregroundStyle(.secondary)
                if let id = account.verifiedUserID { DisclosureGroup("Account details") { Text(id).font(.caption.monospaced()).textSelection(.enabled) } }
                if let onPrivacy { Button("Data & Privacy", action: onPrivacy) }
                Button("Sign out") { Task { await account.signOut() } }
            } else {
                Text(account.configuration == nil ? "Local workspace" : "Sign in to Rivune")
                    .font(.headline)
                if account.configuration == nil {
                    Text("Account services are not configured in this build. Your local conversations and AI provider connections still work.")
                        .foregroundStyle(.secondary)
                }
                if account.supports("google") {
                Button { Task { await account.oauth(.google) } } label: {
                    Label("Continue with Google", systemImage: "globe")
                }
                }
                if account.supports("apple") {
                Button { Task { await account.oauth(.apple) } } label: {
                    Label("Continue with Apple", systemImage: "apple.logo")
                }
                }
                if account.supports("email") {
                    if let address = account.challengeEmail {
                        Text("Open the sign-in link sent to \(address). It will bring you back to Rivune.").font(.callout)
                        DisclosureGroup("My email contains a code instead") {
                        TextField("Email code", text: $code).textContentType(.oneTimeCode)
                        HStack {
                            Button("Verify code") { Task { await account.verify(code: code); code = "" } }.disabled(code.isEmpty)
                        }
                        }
                        Button("Use another email") { account.cancelCode(); code = "" }
                    } else {
                        TextField("Email address", text: $email).textContentType(.emailAddress)
                        Button("Send sign-in link") { Task { await account.sendCode(email: email) } }.disabled(!email.contains("@"))
                    }
                }
                if account.verificationFailed {
                    Button("Retry account verification") { Task { await account.retryVerification() } }
                }
                if account.configuration != nil {
                    if !account.supports("google") || !account.supports("apple") {
                        Label("Additional sign-in methods", systemImage: "person.crop.circle")
                            .font(.subheadline.weight(.medium))
                        Text("Google and Apple sign-in require additional service configuration. Continue locally, or use email if your address is enabled for this development build.")
                            .font(.callout).foregroundStyle(.secondary)
                    }
                }
            }
            if account.busy { ProgressView("Connecting…") }
            if let message = account.message { Text(message).font(.callout).foregroundStyle(.secondary) }
            Text("Your Rivune account is separate from your AI provider accounts. Conversations currently stay on this device.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .fixedSize(horizontal: false, vertical: true)
        .buttonStyle(.bordered)
        .textFieldStyle(.roundedBorder)
        .disabled(account.busy)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
