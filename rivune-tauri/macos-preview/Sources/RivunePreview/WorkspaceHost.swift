import SwiftUI
import WebKit
import AssetRouting

@MainActor
final class WorkspaceHost: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandlerWithReply {
    let updates = AppUpdates()
    @Published var failure: String?
    private(set) var webView: WKWebView?
    private var manifest: BundleManifest?

    override init() {
        super.init()
        do {
            guard let root = Bundle.main.resourceURL?.appendingPathComponent("Web") else { throw BundleManifest.ValidationError.invalidManifest }
            manifest = try BundleManifest.verify(root: root)
            guard manifest?.version == Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String else { throw BundleManifest.ValidationError.invalidManifest }
            let configuration = WKWebViewConfiguration()
            configuration.websiteDataStore = .default()
            configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
            configuration.setURLSchemeHandler(BundledSchemeHandler(root: root), forURLScheme: "rivune")
            configuration.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "rivuneHost")
            let view = WKWebView(frame: .zero, configuration: configuration)
            view.navigationDelegate = self; view.uiDelegate = self
            view.isInspectable = Bundle.main.object(forInfoDictionaryKey: "RivuneDevelopmentBuild") as? Bool == true
            view.allowsBackForwardNavigationGestures = false
            webView = view
            view.load(URLRequest(url: URL(string: "rivune://app/")!))
        } catch { failure = "The shared interface is missing or does not match this app. Rebuild Rivune before opening it." }
    }

    func newConversation() { webView?.evaluateJavaScript("document.querySelector('.new-thread')?.click()", completionHandler: nil) }
    func settings() { webView?.evaluateJavaScript("document.dispatchEvent(new CustomEvent('rivune:settings'))", completionHandler: nil) }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.scheme == "rivune", message.frameInfo.request.url?.host == "app",
              let body = message.body as? [String: Any], body.count == 2,
              body["protocolVersion"] as? Int == 1, let method = body["method"] as? String else {
            replyHandler(nil, "Unsupported host request"); return
        }
        switch method {
        case "host.info":
            replyHandler(["protocolVersion": 1, "runtime": "swift", "os": "macos", "version": manifest?.version ?? "",
                          "sourceDigest": manifest?.sourceDigest ?? "", "updates": updates.configured], nil)
        case "updates.check":
            guard updates.configured else { replyHandler(nil, "Updates are not configured for this build"); return }
            updates.check(); replyHandler(["opened": true], nil)
        default: replyHandler(nil, "Unsupported host method")
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        let url = action.request.url
        decisionHandler(url?.scheme == "rivune" && url?.host == "app" ? .allow : .cancel)
    }
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping ([URL]?) -> Void) {
        guard let window = webView.window else { completionHandler(nil); return }
        let panel = NSOpenPanel(); panel.allowsMultipleSelection = parameters.allowsMultipleSelection
        panel.canChooseDirectories = parameters.allowsDirectories; panel.canChooseFiles = true
        panel.beginSheetModal(for: window) { response in completionHandler(response == .OK ? panel.urls : nil) }
    }
}

struct SharedWorkspace: NSViewRepresentable {
    let webView: WKWebView
    func makeNSView(context: Context) -> WKWebView { webView }
    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
