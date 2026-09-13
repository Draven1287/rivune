#if os(macOS)
import AppKit
import SwiftUI

enum RivuneMenuBarCommand: Equatable {
    case showApplication
    case newConversation
    case settings
    case quit
}

/// Keeps menu-bar commands deterministic and independently testable. None of
/// these commands submits a prompt or starts a provider process.
@MainActor
struct RivuneMenuBarCommandRouter {
    let dismissPanel: () -> Void
    let showApplication: () -> Void
    let startNewConversation: () -> Void
    let showSettings: () -> Void
    let terminateApplication: () -> Void

    func perform(_ command: RivuneMenuBarCommand) {
        dismissPanel()
        switch command {
        case .showApplication:
            showApplication()
        case .newConversation:
            startNewConversation()
            showApplication()
        case .settings:
            showSettings()
            showApplication()
        case .quit:
            terminateApplication()
        }
    }
}

struct RivuneMenuBarTaskSnapshot: Equatable {
    struct Item: Equatable, Identifiable {
        let id: UUID
        let title: String
        let stage: String
    }

    let activeCount: Int
    let items: [Item]

    var isActive: Bool { activeCount > 0 }
    var headline: String {
        switch activeCount {
        case 0: "Idle"
        case 1: "1 task running"
        default: "\(activeCount) tasks running"
        }
    }

    static func make(
        runs: [WorkspaceRun],
        conversations: [Conversation],
        hasActiveProviderRuns: Bool,
        currentConversationTitle: String,
        currentStage: CouncilStage
    ) -> Self {
        let titles = Dictionary(uniqueKeysWithValues: conversations.map { ($0.id, $0.title) })
        let running = runs
            .filter { $0.status == .running }
            .sorted { $0.updatedAt > $1.updatedAt }
        let items = running.prefix(3).map {
            Item(
                id: $0.id,
                title: titles[$0.conversationID] ?? "Conversation",
                stage: $0.stage.title
            )
        }

        if !running.isEmpty {
            return .init(activeCount: running.count, items: items)
        }
        guard hasActiveProviderRuns else { return .init(activeCount: 0, items: []) }

        // Direct and paired-device execution does not always have a workspace
        // journal row. Represent the store's real active flag without inventing
        // a provider, model, conversation ID, or completion percentage.
        return .init(
            activeCount: 1,
            items: [.init(id: UUID.zero, title: currentConversationTitle, stage: currentStage.title)]
        )
    }
}

enum RivuneReviewDraftPolicy {
    static let maximumComposerBytes = 16 * 1_024

    static func merging(existingDraft: String, explicitText: String) -> String? {
        let text = explicitText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return nil }
        let request = "Review this text:\n\n\(text)"
        let merged = existingDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? request
            : "\(existingDraft)\n\n---\n\n\(request)"
        guard merged.utf8.count <= maximumComposerBytes else { return nil }
        return merged
    }
}

private extension UUID {
    static let zero = UUID(uuidString: "00000000-0000-0000-0000-000000000000")!
}

struct RivuneMenuBarStatusLabel: View {
    @ObservedObject private var store: RivuneStore
    @ObservedObject private var coordinator: RivuneRunCoordinator

    init(store: RivuneStore) {
        self.store = store
        _coordinator = ObservedObject(wrappedValue: store.runCoordinator)
    }

    private var active: Bool {
        RivuneMenuBarTaskSnapshot.make(
            runs: coordinator.runs,
            conversations: store.conversations,
            hasActiveProviderRuns: store.hasActiveProviderRuns,
            currentConversationTitle: store.currentConversationTitle,
            currentStage: store.councilStage
        ).isActive
    }

    var body: some View {
        RivuneMenuBarMark(active: active)
            .accessibilityLabel(active ? "Rivune, work in progress" : "Rivune, ready")
    }
}

private struct RivuneMenuBarMark: View {
    let active: Bool

    var body: some View {
        Canvas { context, size in
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let orbitRect = CGRect(
                x: size.width * 0.12,
                y: size.height * 0.31,
                width: size.width * 0.76,
                height: size.height * 0.38
            )
            let orbitTransform = CGAffineTransform(translationX: center.x, y: center.y)
                .rotated(by: -.pi / 7.5)
                .translatedBy(x: -center.x, y: -center.y)
            context.stroke(
                Path(ellipseIn: orbitRect).applying(orbitTransform),
                with: .color(.primary),
                style: StrokeStyle(lineWidth: 1.45, lineCap: .round)
            )
            context.fill(
                Path(ellipseIn: CGRect(x: center.x - 2.8, y: center.y - 2.8, width: 5.6, height: 5.6)),
                with: .color(.primary)
            )
            if active {
                context.fill(
                    Path(ellipseIn: CGRect(x: size.width - 4.6, y: 0.8, width: 3.8, height: 3.8)),
                    with: .color(.primary)
                )
            }
        }
        .frame(width: 18, height: 18)
    }
}

struct RivuneMenuBarPanel: View {
    @ObservedObject private var store: RivuneStore
    @ObservedObject private var coordinator: RivuneRunCoordinator
    @Environment(\.openWindow) private var openWindow
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var reviewText = ""
    @State private var reviewError: String?

    init(store: RivuneStore) {
        self.store = store
        _coordinator = ObservedObject(wrappedValue: store.runCoordinator)
    }

    private var snapshot: RivuneMenuBarTaskSnapshot {
        .make(
            runs: coordinator.runs,
            conversations: store.conversations,
            hasActiveProviderRuns: store.hasActiveProviderRuns,
            currentConversationTitle: store.currentConversationTitle,
            currentStage: store.councilStage
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            header
            Divider().overlay(RivunePalette.hairline)
            activity
            VStack(spacing: 8) {
                RivuneMenuBarActionButton("Open Rivune", systemImage: "arrow.up.forward.app") {
                    perform(.showApplication)
                }
                RivuneMenuBarActionButton("New conversation", systemImage: "square.and.pencil") {
                    perform(.newConversation)
                }
                RivuneMenuBarActionButton("Settings", systemImage: "gearshape") {
                    perform(.settings)
                }
            }
            reviewEntry
            Divider().overlay(RivunePalette.hairline)
            RivuneMenuBarActionButton(
                "Quit Rivune",
                systemImage: "power",
                hint: "Saves the workspace and quits when no task is active"
            ) { perform(.quit) }
        }
        .padding(16)
        .frame(width: 320)
        .background(RivunePalette.canvas)
        .preferredColorScheme(.dark)
        .tint(RivunePalette.rivune)
        .onExitCommand { dismiss() }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Rivune quick access")
    }

    private var reviewEntry: some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: 8) {
                Text("Type or paste text here. Rivune adds it to your current draft for you to inspect; it does not send it.")
                    .font(.caption)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .fixedSize(horizontal: false, vertical: true)
                TextEditor(text: $reviewText)
                    .font(.callout)
                    .foregroundStyle(RivunePalette.primaryText)
                    .scrollContentBackground(.hidden)
                    .padding(7)
                    .frame(height: 82)
                    .background(RivunePalette.composer, in: RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(RivunePalette.hairline, lineWidth: 1))
                    .accessibilityLabel("Text to review")
                if let reviewError {
                    Text(reviewError).font(.caption).foregroundStyle(RivunePalette.claude)
                }
                RivuneMenuBarActionButton(
                    "Add to draft",
                    systemImage: "text.badge.plus",
                    hint: "Adds this explicit text to the existing Rivune composer without sending it"
                ) { addReviewToDraft() }
            }
            .padding(.top, 8)
        } label: {
            Label("Review text", systemImage: "text.magnifyingglass")
                .font(.callout.weight(.medium))
                .foregroundStyle(RivunePalette.primaryText)
        }
        .tint(RivunePalette.rivune)
    }

    private var header: some View {
        HStack(spacing: 11) {
            ZStack {
                Circle().fill(RivunePalette.surfaceRaised)
                RivuneMenuBarMark(active: snapshot.isActive)
                    .foregroundStyle(RivunePalette.primaryText)
            }
            .frame(width: 36, height: 36)
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text("Rivune").font(.headline).foregroundStyle(RivunePalette.primaryText)
                Text(snapshot.headline).font(.caption).foregroundStyle(RivunePalette.secondaryText)
            }
            Spacer(minLength: 8)
            if snapshot.isActive {
                if reduceMotion {
                    Circle().fill(RivunePalette.rivune).frame(width: 8, height: 8)
                } else {
                    ProgressView().controlSize(.small).tint(RivunePalette.rivune)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var activity: some View {
        if snapshot.items.isEmpty {
            HStack(spacing: 9) {
                Image(systemName: "minus.circle").foregroundStyle(RivunePalette.tertiaryText)
                VStack(alignment: .leading, spacing: 2) {
                    Text("No tasks running").font(.callout.weight(.medium))
                    Text(store.engineFooterSummary).font(.caption).foregroundStyle(RivunePalette.secondaryText)
                }
            }
            .foregroundStyle(RivunePalette.primaryText)
            .accessibilityElement(children: .combine)
        } else {
            VStack(alignment: .leading, spacing: 9) {
                ForEach(snapshot.items) { item in
                    HStack(alignment: .top, spacing: 9) {
                        Circle().fill(RivunePalette.rivune).frame(width: 7, height: 7).padding(.top, 5)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title).font(.callout.weight(.medium)).lineLimit(1)
                            Text(item.stage).font(.caption).foregroundStyle(RivunePalette.secondaryText).lineLimit(2)
                        }
                    }
                    .foregroundStyle(RivunePalette.primaryText)
                    .accessibilityElement(children: .combine)
                }
                if snapshot.activeCount > snapshot.items.count {
                    Text("\(snapshot.activeCount - snapshot.items.count) more active")
                        .font(.caption).foregroundStyle(RivunePalette.secondaryText)
                }
            }
        }
    }

    private func perform(_ command: RivuneMenuBarCommand) {
        let router = RivuneMenuBarCommandRouter(
            dismissPanel: { dismiss() },
            showApplication: {
                openWindow(id: "main")
                NSApp.activate(ignoringOtherApps: true)
            },
            startNewConversation: { store.newChat() },
            showSettings: { store.presentSettings() },
            terminateApplication: { NSApp.terminate(nil) }
        )
        router.perform(command)
    }

    private func addReviewToDraft() {
        guard let merged = RivuneReviewDraftPolicy.merging(
            existingDraft: store.composerText,
            explicitText: reviewText
        ) else {
            reviewError = reviewText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? "Enter text to review."
                : "The combined draft is too long. Shorten the review text or the current draft."
            return
        }
        store.composerText = merged
        reviewText = ""
        reviewError = nil
        perform(.showApplication)
    }
}

private struct RivuneMenuBarActionButton: View {
    let title: String
    let systemImage: String
    let hint: String?
    let action: () -> Void
    @FocusState private var focused: Bool

    init(_ title: String, systemImage: String, hint: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.hint = hint
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemImage).frame(width: 18)
                Text(title)
                Spacer(minLength: 0)
            }
            .font(.callout.weight(.medium))
            .foregroundStyle(RivunePalette.primaryText)
            .padding(.horizontal, 11)
            .frame(maxWidth: .infinity, minHeight: 38, alignment: .leading)
            .background(RivunePalette.composer, in: RoundedRectangle(cornerRadius: 10))
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .stroke(focused ? RivunePalette.rivune : RivunePalette.hairline, lineWidth: focused ? 1.5 : 1)
            }
        }
        .buttonStyle(.plain)
        .focused($focused)
        .accessibilityHint(hint ?? (title == "New conversation"
            ? "Preserves the current conversation draft and focuses a new conversation in Rivune"
            : "Opens the Rivune application"))
    }
}
#endif
