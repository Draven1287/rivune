import WebKit
import AssetRouting

final class BundledSchemeHandler: NSObject, WKURLSchemeHandler {
    private let router: AssetRouter
    init(root: URL) { router = AssetRouter(root: root) }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        do {
            guard let url = urlSchemeTask.request.url,
                  ["GET", "HEAD"].contains(urlSchemeTask.request.httpMethod ?? "GET") else {
                throw AssetRouter.RoutingError.invalidURL
            }
            let file = try router.resolve(url)
            let data = try Data(contentsOf: file)
            let response = URLResponse(url: url, mimeType: AssetRouter.mimeType(for: file),
                                       expectedContentLength: data.count, textEncodingName: "utf-8")
            urlSchemeTask.didReceive(response)
            if urlSchemeTask.request.httpMethod != "HEAD" { urlSchemeTask.didReceive(data) }
            urlSchemeTask.didFinish()
        } catch { urlSchemeTask.didFailWithError(error) }
    }

    // Each small bundled request completes synchronously, so there is no pending task to cancel.
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

