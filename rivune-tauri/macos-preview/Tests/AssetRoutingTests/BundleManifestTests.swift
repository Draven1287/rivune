import XCTest
import CryptoKit
@testable import AssetRouting
final class BundleManifestTests: XCTestCase {
    func testMissingOrChangedAssetsAreRejected() throws {
        let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: root) }
        let data = Data("original".utf8)
        try data.write(to: root.appendingPathComponent("index.html"))
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        let manifest: [String: Any] = ["schema": 1, "version": "1.0.0", "sourceDigest": String(repeating: "0", count: 64), "assets": ["index.html": digest]]
        try JSONSerialization.data(withJSONObject: manifest).write(to: root.appendingPathComponent("bundle-manifest.json"))
        XCTAssertEqual(try BundleManifest.verify(root: root).version, "1.0.0")
        try Data("changed".utf8).write(to: root.appendingPathComponent("index.html"))
        XCTAssertThrowsError(try BundleManifest.verify(root: root))
        try FileManager.default.removeItem(at: root.appendingPathComponent("index.html"))
        XCTAssertThrowsError(try BundleManifest.verify(root: root))
    }
}
