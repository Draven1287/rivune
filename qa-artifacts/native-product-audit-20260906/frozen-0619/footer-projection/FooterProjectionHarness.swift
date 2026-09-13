import Foundation
struct AccountInputs {
    var busy = false
    var signOutPending = false
    var verificationFailed = false
    var verifiedUserID: String? = nil
    var identity: String? = nil
    var configuration: Bool? = nil
}
struct FooterOutput: Codable, Equatable {
    let name: String
    let status: String
    let verifiedIdentity: String?
}
struct ExactFooterProjection {
    var account: AccountInputs
    private var verifiedAccountIdentity: String? {
        guard !account.busy, !account.signOutPending, !account.verificationFailed,
              let userID = account.verifiedUserID, !userID.isEmpty,
              let identity = account.identity?.trimmingCharacters(in: .whitespacesAndNewlines),
              !identity.isEmpty else { return nil }
        return identity
    }

    private var accountFooterName: String {
        verifiedAccountIdentity ?? "Local workspace"
    }

    private var accountFooterStatus: String {
        if account.signOutPending { return "Account needs attention" }
        if account.busy { return "Checking account…" }
        if account.verificationFailed { return "Account needs attention" }
        if verifiedAccountIdentity != nil { return "Rivune account · Verified" }
        return account.configuration == nil ? "Account settings" : "Signed out · Account settings"
    }

    func output() -> FooterOutput {
        FooterOutput(name: accountFooterName, status: accountFooterStatus, verifiedIdentity: verifiedAccountIdentity)
    }
}
struct CaseResult: Codable {
    let name: String
    let actual: FooterOutput
    let expected: FooterOutput
    let contractPassed: Bool
}
func local(_ status: String) -> FooterOutput { .init(name: "Local workspace", status: status, verifiedIdentity: nil) }
func verified(_ identity: String) -> FooterOutput { .init(name: identity, status: "Rivune account · Verified", verifiedIdentity: identity) }
@main struct Main {
    static func main() throws {
        var cases: [CaseResult] = []
        func record(_ name: String, _ inputs: AccountInputs, _ expected: FooterOutput) {
            let actual = ExactFooterProjection(account: inputs).output()
            cases.append(.init(name: name, actual: actual, expected: expected, contractPassed: actual == expected))
        }
        record("local_unconfigured", .init(), local("Account settings"))
        record("signed_out_configured", .init(configuration: true), local("Signed out · Account settings"))
        record("verified_identity", .init(verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true), verified("a@example.test"))
        record("trimmed_display_identity", .init(verifiedUserID: "synthetic-A", identity: "  a@example.test \n", configuration: true), verified("a@example.test"))
        record("pending_hides_prior_identity", .init(signOutPending: true, verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true), local("Account needs attention"))
        record("busy_hides_prior_identity", .init(busy: true, verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true), local("Checking account…"))
        record("pending_precedes_busy", .init(busy: true, signOutPending: true, verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true), local("Account needs attention"))
        record("failed_verification_hides_identity", .init(verificationFailed: true, verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true), local("Account needs attention"))
        record("empty_verified_id", .init(verifiedUserID: "", identity: "a@example.test", configuration: true), local("Signed out · Account settings"))
        record("whitespace_verified_id_contract", .init(verifiedUserID: "  \t\n", identity: "a@example.test", configuration: true), local("Signed out · Account settings"))
        record("nil_verified_id", .init(identity: "a@example.test", configuration: true), local("Signed out · Account settings"))
        record("whitespace_identity", .init(verifiedUserID: "synthetic-A", identity: "  \t\n", configuration: true), local("Signed out · Account settings"))
        record("nil_identity", .init(verifiedUserID: "synthetic-A", configuration: true), local("Signed out · Account settings"))
        var projection = ExactFooterProjection(account: .init(verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true))
        for (name, next, expected) in [
            ("sequence_A", AccountInputs(verifiedUserID: "synthetic-A", identity: "a@example.test", configuration: true), verified("a@example.test")),
            ("sequence_signed_out", AccountInputs(configuration: true), local("Signed out · Account settings")),
            ("sequence_B", AccountInputs(verifiedUserID: "synthetic-B", identity: "b@example.test", configuration: true), verified("b@example.test"))
        ] {
            projection.account = next
            let actual = projection.output()
            cases.append(.init(name: name, actual: actual, expected: expected, contractPassed: actual == expected))
        }
        let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        print(String(decoding: try encoder.encode(cases), as: UTF8.self))
    }
}
