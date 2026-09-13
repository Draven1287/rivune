import Foundation

/// A sanitized status result; raw stdout/stderr never enters recovery copy.
/// Status checks do not establish model entitlement, quota, or request success.
enum ProviderStatusRecovery: Equatable {
    case signedIn
    case signInRequired
    case executableMissing
    case unknown

    enum Action: Equatable {
        case none
        case openProviderSetup
        case checkConnection
    }

    var readiness: ProviderReadiness {
        switch self {
        case .signedIn: .ready
        case .signInRequired: .signedOut
        case .executableMissing: .missing
        case .unknown: .unavailable
        }
    }

    var action: Action {
        switch self {
        case .signedIn: .none
        case .signInRequired, .executableMissing: .openProviderSetup
        case .unknown: .checkConnection
        }
    }

    var message: String {
        switch self {
        case .signedIn: "Provider sign-in checked. Model access is confirmed when you send."
        case .signInRequired: "The provider reports that you are signed out. Open provider setup to sign in."
        case .executableMissing: "The provider CLI was not found. Open provider setup."
        case .unknown: "Could not verify provider sign-in. Check the connection and try again."
        }
    }

    static func classify(provider: TerminalProvider, exitStatus: Int32, stdout: Data) -> Self {
        // No documented structured error contract is consumed here. Nonzero
        // status, including apparent auth text, remains unknown. A future
        // adapter can add version-tested structured error handling separately.
        guard exitStatus == 0, stdout.count <= 256 * 1_024 else { return .unknown }
        switch provider {
        case .codex:
            // Preserve existing Codex login-status exit-zero success semantics.
            // We do not parse its human-readable text or copy API-key details.
            return .signedIn
        case .claude:
            struct Status: Decodable { let loggedIn: Bool }
            guard let status = try? JSONDecoder().decode(Status.self, from: stdout) else { return .unknown }
            return status.loggedIn ? .signedIn : .signInRequired
        }
    }

    /// A timeout/launch/transport failure proves no authentication state.
    static let checkFailed: Self = .unknown
}
