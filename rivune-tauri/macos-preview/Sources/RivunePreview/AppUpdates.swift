import Foundation
import Sparkle

@MainActor
final class AppUpdates: ObservableObject {
    private let controller: SPUStandardUpdaterController?
    let configured: Bool

    init() {
        let feed = Bundle.main.object(forInfoDictionaryKey: "SUFeedURL") as? String
        let key = Bundle.main.object(forInfoDictionaryKey: "SUPublicEDKey") as? String
        configured = feed.flatMap(URL.init(string:))?.scheme == "https" && key.flatMap { Data(base64Encoded: $0) }?.count == 32
        controller = configured ? SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: nil, userDriverDelegate: nil) : nil
    }
    func check() { controller?.checkForUpdates(nil) }
}
