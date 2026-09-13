import SwiftUI

@main
struct RivuneApp: App {
    @StateObject private var host = WorkspaceHost()
    var body: some Scene {
        Window("Rivune", id: "workspace") {
            Group {
                if let view = host.webView { SharedWorkspace(webView: view) }
                else { ContentUnavailableView("Rivune could not open", systemImage: "exclamationmark.triangle", description: Text(host.failure ?? "Rebuild the app and try again.")) }
            }
            .frame(minWidth: 800, minHeight: 600)
            .preferredColorScheme(.dark)
        }
        .defaultSize(width: 1280, height: 820)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Conversation", action: host.newConversation).keyboardShortcut("n")
            }
            CommandGroup(after: .appInfo) {
                Button("Check for Updates…", action: host.updates.check).disabled(!host.updates.configured)
            }
            CommandGroup(replacing: .appSettings) {
                Button("Settings…", action: host.settings).keyboardShortcut(",")
            }
        }
    }
}
