import Foundation
import CryptoKit

public struct BundleManifest: Decodable {
    public let schema: Int
    public let version: String
    public let sourceDigest: String
    public let assets: [String: String]
    public enum ValidationError: Error { case invalidManifest, changedAsset(String) }

    public static func verify(root: URL) throws -> BundleManifest {
        let manifest = try JSONDecoder().decode(Self.self, from: Data(contentsOf: root.appendingPathComponent("bundle-manifest.json")))
        guard manifest.schema == 1, manifest.assets["index.html"] != nil,
              manifest.sourceDigest.count == 64 else { throw ValidationError.invalidManifest }
        let router = AssetRouter(root: root)
        for (path, expected) in manifest.assets {
            guard !path.hasPrefix("/"), !path.split(separator: "/").contains(".."),
                  let url = URL(string: "rivune://app/" + path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)!) else { throw ValidationError.invalidManifest }
            let data = try Data(contentsOf: router.resolve(url))
            let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
            guard digest == expected else { throw ValidationError.changedAsset(path) }
        }
        return manifest
    }
}
