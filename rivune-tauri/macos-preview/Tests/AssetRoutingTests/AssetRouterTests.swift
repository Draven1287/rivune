import XCTest
@testable import AssetRouting

final class AssetRouterTests: XCTestCase {
    private var root: URL!
    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: root.appendingPathComponent("assets"), withIntermediateDirectories: true)
        try Data("<html></html>".utf8).write(to: root.appendingPathComponent("index.html"))
        try Data("export {};".utf8).write(to: root.appendingPathComponent("assets/app.js"))
    }
    override func tearDownWithError() throws { try FileManager.default.removeItem(at: root) }

    func testRootAndModuleAsset() throws {
        let router = AssetRouter(root: root)
        XCTAssertEqual(try router.resolve(URL(string: "rivune://app/")!).lastPathComponent, "index.html")
        let file = try router.resolve(URL(string: "rivune://app/assets/app.js?v=1")!)
        XCTAssertEqual(AssetRouter.mimeType(for: file), "text/javascript")
    }

    func testRejectsTraversalWrongOriginAndMissingAsset() {
        let router = AssetRouter(root: root)
        for url in ["rivune://app/%2e%2e/index.html", "rivune://app/assets/%2e%2e/index.html",
                    "rivune://app/assets%2f..%2findex.html", "rivune://app/%5cindex.html",
                    "rivune://elsewhere/index.html", "https://app/index.html", "rivune://app:80/",
                    "rivune://user@app/", "rivune://app/missing.js", "rivune://app/assets/"] {
            XCTAssertThrowsError(try router.resolve(URL(string: url)!))
        }
    }

    func testRejectsSymlinkEscape() throws {
        let outside = root.deletingLastPathComponent().appendingPathComponent(UUID().uuidString)
        try Data("private".utf8).write(to: outside)
        defer { try? FileManager.default.removeItem(at: outside) }
        try FileManager.default.createSymbolicLink(at: root.appendingPathComponent("escape"), withDestinationURL: outside)
        XCTAssertThrowsError(try AssetRouter(root: root).resolve(URL(string: "rivune://app/escape")!))
    }
}
