import Foundation
import XCTest
@testable import Rivune

final class ProviderStatusRecoveryTests: XCTestCase {
    func testSanitizedStatusClassificationAndActions() {
        func check(_ actual: ProviderStatusRecovery, _ expected: ProviderStatusRecovery, _ name: String) {
            XCTAssertEqual(actual, expected, name)
        }
        func classify(_ provider: TerminalProvider, _ status: Int32, _ output: String) -> ProviderStatusRecovery {
            ProviderStatusRecovery.classify(provider: provider, exitStatus: status, stdout: Data(output.utf8))
        }
        check(classify(.codex, 0, "Logged in using ChatGPT"), .signedIn, "Codex existing exit-zero contract")
        check(classify(.codex, 1, "network failure"), .unknown, "Codex nonzero not signed out")
        check(classify(.codex, 1, "Not logged in"), .unknown, "Codex unstructured sign-out text not trusted")
        check(classify(.codex, 127, "authentication module failed"), .unknown, "Codex launch diagnostic not auth proof")
        check(classify(.claude, 0, "{\"loggedIn\":true}"), .signedIn, "Claude explicit boolean true")
        check(classify(.claude, 0, "{\"loggedIn\":false}"), .signInRequired, "Claude explicit boolean false")
        check(classify(.claude, 1, "{\"loggedIn\":false}"), .unknown, "Claude unsuccessful command stays unknown")
        check(classify(.claude, 1, "{\"loggedIn\":true}"), .unknown, "Claude failed command cannot prove ready")
        for (name, json) in [("empty", ""), ("malformed", "{"), ("missing field", "{}"), ("null", "{\"loggedIn\":null}"), ("number", "{\"loggedIn\":0}"), ("string", "{\"loggedIn\":\"false\"}"), ("array", "[]")] {
            check(classify(.claude, 0, json), .unknown, "Claude \(name) is unknown")
        }
        check(classify(.claude, -1, "timeout"), .unknown, "negative exit status unknown")
        check(.checkFailed, .unknown, "timeout/transport result maps unknown")
        check(.executableMissing, .executableMissing, "missing executable distinct")
        check(ProviderStatusRecovery.classify(provider:.codex, exitStatus:0, stdout:Data(repeating:65, count:262145)), .unknown, "oversized output rejected")
        XCTAssertTrue(ProviderStatusRecovery.signInRequired.action == .openProviderSetup, "Signed-out recovery opens provider setup")
        XCTAssertTrue(ProviderStatusRecovery.executableMissing.action == .openProviderSetup, "Missing executable recovery opens provider setup")
        XCTAssertTrue(ProviderStatusRecovery.unknown.action == .checkConnection, "Unknown recovery checks the connection")
        XCTAssertTrue(ProviderStatusRecovery.signedIn.action == .none, "Signed-in state needs no recovery action")
        let marker = "SECRET_FIXTURE_ONLY"
        let outcome = classify(.claude, 1, "authentication \(marker)")
        XCTAssertTrue(!outcome.message.contains(marker) && outcome == .unknown, "Raw diagnostics must not appear in recovery copy")
    }
}
