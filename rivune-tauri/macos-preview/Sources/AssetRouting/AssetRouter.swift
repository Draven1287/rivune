import Foundation

/// Resolves bundled assets only. No SPA fallback for unknown paths and no network proxy.
public struct AssetRouter {
    public enum RoutingError: Error { case invalidURL, traversal, missingAsset }
    private let root: URL

    public init(root: URL) { self.root = root.resolvingSymlinksInPath().standardizedFileURL }

    public func resolve(_ url: URL) throws -> URL {
        guard let parts = URLComponents(url: url, resolvingAgainstBaseURL: false),
              parts.scheme == "rivune", parts.host == "app", parts.port == nil,
              parts.user == nil, parts.password == nil,
              let decoded = parts.percentEncodedPath.removingPercentEncoding,
              !decoded.contains("\0"), !decoded.contains("\\") else {
            throw RoutingError.invalidURL
        }
        let components = decoded.split(separator: "/", omittingEmptySubsequences: true)
        guard !components.contains(".."), !components.contains(".") else { throw RoutingError.traversal }
        let path = components.isEmpty ? "index.html" : components.joined(separator: "/")
        let candidate = root.appendingPathComponent(path).resolvingSymlinksInPath().standardizedFileURL
        guard candidate.path.hasPrefix(root.path + "/") else { throw RoutingError.traversal }
        var directory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: candidate.path, isDirectory: &directory),
              !directory.boolValue else { throw RoutingError.missingAsset }
        return candidate
    }

    public static func mimeType(for url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "html": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "ico": return "image/x-icon"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "mp4": return "video/mp4"
        default: return "application/octet-stream"
        }
    }
}
