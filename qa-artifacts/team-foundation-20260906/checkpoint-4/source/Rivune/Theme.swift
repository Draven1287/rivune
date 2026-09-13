import SwiftUI
#if os(macOS)
import AppKit
#elseif os(iOS)
import UIKit
#endif

enum RivunePalette {
    // Black glass, polished silver and a small amount of orbital blue.
    static let canvas = Color(red: 7 / 255, green: 10 / 255, blue: 14 / 255)
    static let sidebar = Color(red: 6 / 255, green: 8 / 255, blue: 11 / 255)
    static let surface = Color(red: 13 / 255, green: 17 / 255, blue: 23 / 255)
    static let surfaceRaised = Color(red: 23 / 255, green: 30 / 255, blue: 39 / 255)
    static let composer = Color(red: 18 / 255, green: 24 / 255, blue: 32 / 255)
    static let control = Color.white.opacity(0.060)
    static let raised = surfaceRaised
    static let primaryText = Color.white.opacity(0.94)
    static let hairline = Color(red: 0.78, green: 0.87, blue: 0.95).opacity(0.12)

    // Model identity is intentionally restrained and is only used for small details.
    static let openAI = Color(red: 230 / 255, green: 232 / 255, blue: 235 / 255)
    static let claude = Color(red: 223 / 255, green: 155 / 255, blue: 124 / 255)
    static let rivune = Color(red: 192 / 255, green: 222 / 255, blue: 243 / 255)
    static let startupAccent = Color(red: 48 / 255, green: 191 / 255, blue: 238 / 255)
    // A single jewel-tone accent is reserved for the highest reasoning tier.
    // Keeping it out of general chrome gives the setting a small, useful pop.
    static let ultra = Color(red: 0.733, green: 0.435, blue: 0.976)
    static let ultraGlow = Color(red: 0.835, green: 0.565, blue: 1.000)
    static let success = Color(red: 0.604, green: 0.749, blue: 0.650)
    static let secondaryText = Color.white.opacity(0.70)
    static let tertiaryText = Color.white.opacity(0.52)
}

struct RivuneBackground: View {
    @AppStorage("rivune.appearance.galaxy") private var galaxy = true
    @AppStorage("rivune.appearance.stars") private var stars = true
    @AppStorage("rivune.appearance.dim") private var dim = 0.35
    var body: some View {
        ZStack {
            RivunePalette.canvas
            GeometryReader { geometry in
                Image("RivuneWorkspaceCosmos")
                    .resizable()
                    .scaledToFill()
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
                    .opacity(galaxy ? 0.92 : 0)
            }
            .accessibilityHidden(true)
            Color.black.opacity(dim)
            RivuneStarfield(density: 210, opacity: stars ? 0.62 : 0)
        }
        .ignoresSafeArea()
    }
}

/// Fixed, tiny points of light provide depth without moving behind text.
struct RivuneStarfield: View {
    var density: Int = 86
    var opacity: Double = 0.42

    var body: some View {
        Canvas { context, size in
            for index in 0..<density {
                let x = fraction(index * 73 + 17) * size.width
                let y = fraction(index * 139 + 53) * size.height
                let radius: CGFloat = index.isMultiple(of: 17) ? 0.9 : 0.45
                let brightness = 0.25 + fraction(index * 41 + 9) * 0.75
                context.fill(Path(ellipseIn: CGRect(x: x, y: y, width: radius * 2, height: radius * 2)), with: .color(Color(red: 0.72, green: 0.85, blue: 0.98).opacity(brightness * opacity)))
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func fraction(_ seed: Int) -> CGFloat {
        let value = sin(Double(seed) * 12.9898) * 43758.5453
        return CGFloat(value - floor(value))
    }
}

struct GlassPanelModifier: ViewModifier {
    let cornerRadius: CGFloat
    var tint: Color = .white
    var shadow: Bool = true

    func body(content: Content) -> some View {
        content
            .background {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(LinearGradient(colors: [RivunePalette.surfaceRaised.opacity(0.74), RivunePalette.surface.opacity(0.97)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .overlay(tint.opacity(0.012))
            }
            .overlay {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(RivunePalette.hairline, lineWidth: 0.75)
            }
            .shadow(
                color: shadow ? .black.opacity(0.16) : .clear,
                radius: shadow ? 12 : 0,
                x: 0,
                y: shadow ? 6 : 0
            )
    }
}

extension View {
    func rivuneGlass(
        cornerRadius: CGFloat = 24,
        tint: Color = .white,
        shadow: Bool = true
    ) -> some View {
        modifier(GlassPanelModifier(cornerRadius: cornerRadius, tint: tint, shadow: shadow))
    }
}

/// Shared silver lettering for brand labels. Prose stays in the UI typeface.
struct RivuneWordmark: View {
    var width: CGFloat = 112
    var body: some View {
        Image("RivuneWordmark").resizable().scaledToFit()
            .frame(width: width, height: width * 64 / 650)
            .accessibilityLabel("Rivune")
    }
}

struct RivuneOrb: View {
    var size: CGFloat = 74
    var isActive: Bool = false
    var motionEnabled: Bool = true

    @State private var breathe = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var shouldAnimate: Bool {
        isActive && motionEnabled && !reduceMotion
    }

    var body: some View {
        // One identity across the Dock and workspace: silver R, tilted ring,
        // central pearl and stars. Startup uses its full landscape composition.
        Image("RivuneIdentity")
            .resizable()
            .interpolation(.high)
            .scaledToFit()
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.22, style: .continuous))
        .shadow(color: .black.opacity(0.22), radius: size * 0.08, y: size * 0.035)
        .scaleEffect(shouldAnimate && breathe ? 1.015 : 1)
        .opacity(shouldAnimate && breathe ? 0.94 : 1)
        .animation(
            shouldAnimate ? .easeInOut(duration: 1.8).repeatForever(autoreverses: true) : .default,
            value: breathe
        )
        .onAppear { breathe = true }
        .accessibilityHidden(true)
    }
}

/// Provider marks identify ChatGPT and Claude alongside Rivune’s silver identity.
/// LobeHub Icons vectors and MIT notice ship in the asset catalog.
struct ProviderIdentityMark: View {
    let mode: IntelligenceMode
    var size: CGFloat = 28

    var body: some View {
        if mode == .together || mode == .council || mode == .swarm {
            RivuneOrb(size: size, motionEnabled: false)
        } else {
            ZStack {
                RoundedRectangle(cornerRadius: size * 0.29, style: .continuous)
                    .fill(LinearGradient(
                        colors: [RivunePalette.surfaceRaised, RivunePalette.surface],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                RoundedRectangle(cornerRadius: size * 0.29, style: .continuous)
                    .stroke(mode.accent.opacity(0.18), lineWidth: 0.7)
                Image(mode == .chatGPT ? "ProviderCodex" : "ProviderClaude")
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .foregroundStyle(mode.accent)
                    .frame(width: size * 0.68, height: size * 0.68)
            }
            .frame(width: size, height: size)
            .accessibilityHidden(true)
        }
    }
}

/// Shared interior tokens; mirrored by website/app/rivune-tokens.css.
enum RivuneInterface {
    static let controlHeight: CGFloat = 36
    static let controlRadius: CGFloat = 10
    static let panelRadius: CGFloat = 16
    static let spacing: CGFloat = 12
}

struct RivuneButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.callout.weight(.medium))
            .padding(.horizontal, 12).frame(minHeight: RivuneInterface.controlHeight)
            .foregroundStyle(enabled ? RivunePalette.primaryText : RivunePalette.tertiaryText)
            .background(configuration.isPressed ? RivunePalette.surfaceRaised : RivunePalette.composer, in: RoundedRectangle(cornerRadius: RivuneInterface.controlRadius))
            .overlay(RoundedRectangle(cornerRadius: RivuneInterface.controlRadius).stroke(RivunePalette.hairline, lineWidth: 1))
            .opacity(enabled ? 1 : 0.5)
    }
}

struct RivuneSelect<Value: Hashable>: View {
    let title: String
    @Binding var selection: Value
    let options: [(String, Value)]
    var isOptionEnabled: (Value) -> Bool = { _ in true }
    private var selectedLabel: String { options.first { $0.1 == selection }?.0 ?? title }
    var body: some View {
        RivuneActionMenu(title: title, actions: options.enumerated().map { index, option in
            RivuneMenuAction(title: option.0, id: "option-\(index)",
                             isEnabled: isOptionEnabled(option.1), isSelected: selection == option.1) {
                selection = option.1
            }
        }) {
            HStack(spacing: 12) {
                Text(selectedLabel).lineLimit(1)
                Spacer(minLength: 12)
                Image(systemName: "chevron.down").font(.caption)
            }
            .font(.callout.weight(.medium))
            .padding(.horizontal, 12).frame(minWidth: 120, minHeight: RivuneInterface.controlHeight)
            .background(RivunePalette.composer, in: RoundedRectangle(cornerRadius: RivuneInterface.controlRadius))
            .overlay(RoundedRectangle(cornerRadius: RivuneInterface.controlRadius).stroke(RivunePalette.hairline, lineWidth: 1))
        }
        .accessibilityValue(selectedLabel)
    }
}

struct RivuneComponentGallery: View {
    @State private var selection = "rivune"
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Rivune components").font(.title2)
            Text("Shared interior controls · the operating system owns the window and security prompts.").font(.caption).foregroundStyle(.secondary)
            RivuneSelect(title: "Assistant", selection: $selection, options: [("Rivune", "rivune"), ("ChatGPT", "chatgpt"), ("Claude", "claude")])
            HStack { Button("Enabled") {} ; Button("Disabled") {}.disabled(true) }.buttonStyle(RivuneButtonStyle())
            Label("Selected context is shared only after approval.", systemImage: "checkmark.shield").padding(14).background(RivunePalette.composer, in: RoundedRectangle(cornerRadius: 12))
            Label("File unavailable · choose its current location.", systemImage: "exclamationmark.triangle").foregroundStyle(.orange)
        }.padding(18).frame(maxWidth: 520).background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct RivuneCardStyle: GroupBoxStyle {
    func makeBody(configuration: Configuration) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            configuration.label.font(.headline)
            configuration.content
        }.padding(16).frame(maxWidth: .infinity, alignment: .leading)
            .background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: RivuneInterface.panelRadius))
            .overlay(RoundedRectangle(cornerRadius: RivuneInterface.panelRadius).stroke(RivunePalette.hairline, lineWidth: 1))
    }
}

struct RivuneCheckmarkStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .foregroundStyle(configuration.isOn ? RivunePalette.rivune : RivunePalette.secondaryText)
                configuration.label.frame(maxWidth: .infinity, alignment: .leading)
            }.padding(.vertical, 6).contentShape(Rectangle())
        }.buttonStyle(.plain).accessibilityValue(configuration.isOn ? "Selected" : "Not selected")
    }
}

struct RivuneMenuAction: Identifiable {
    let title: String
    let id: String
    var systemImage: String?
    var section: String?
    var isEnabled: Bool
    var isSelected: Bool
    var destructive: Bool
    let action: () -> Void

    init(title: String, id: String? = nil, systemImage: String? = nil,
         section: String? = nil, isEnabled: Bool = true, isSelected: Bool = false,
         destructive: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.id = id ?? title
        self.systemImage = systemImage
        self.section = section
        self.isEnabled = isEnabled
        self.isSelected = isSelected
        self.destructive = destructive
        self.action = action
    }
}

struct RivuneActionMenu<Trigger: View>: View {
    let title: String
    let actions: [RivuneMenuAction]
    private let trigger: Trigger
    @State private var open = false
    @FocusState private var triggerFocused: Bool
    @Environment(\.isEnabled) private var enabled

    init(title: String, actions: [RivuneMenuAction], @ViewBuilder label: () -> Trigger) {
        self.title = title
        self.actions = actions
        self.trigger = label()
    }

    var body: some View {
        Button { if enabled { open.toggle() } } label: { trigger }
            .buttonStyle(.plain)
            .focused($triggerFocused)
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(triggerFocused ? RivunePalette.rivune : .clear, lineWidth: 1))
            .disabled(actions.isEmpty)
            .accessibilityLabel(title)
            .accessibilityValue(open ? "Expanded" : "Collapsed")
            .accessibilityHint("Use arrow keys to browse, Return to choose, and Escape to dismiss.")
            .popover(isPresented: $open) {
                RivuneActionMenuContent(title: title, actions: actions) { restoreFocus in
                    open = false
                    if restoreFocus && enabled { triggerFocused = true }
                }.disabled(!enabled)
            }
            .onChange(of: enabled) { _, value in if !value { open = false } }
            .rivuneDismissOnFocusLoss(isPresented: $open)
    }
}

struct RivuneActionMenuDefaultTrigger: View {
    var body: some View {
        Image(systemName: "ellipsis").frame(width: 32, height: 32).contentShape(Rectangle())
    }
}

extension RivuneActionMenu where Trigger == RivuneActionMenuDefaultTrigger {
    init(title: String, actions: [RivuneMenuAction]) {
        self.init(title: title, actions: actions) { RivuneActionMenuDefaultTrigger() }
    }
}

private struct RivuneActionMenuContent: View {
    let title: String
    let actions: [RivuneMenuAction]
    let dismiss: (_ restoreFocus: Bool) -> Void
    @State private var cursor: Int?
    @FocusState private var focused: Bool
    @Environment(\.isEnabled) private var enabled
    private var enabledIndices: [Int] { actions.indices.filter { enabled && actions[$0].isEnabled } }
    private var contentHeight: CGFloat {
        let sections = actions.indices.filter { index in
            actions[index].section != nil && (index == 0 || actions[index - 1].section != actions[index].section)
        }.count
        return min(CGFloat(actions.count) * 42 + CGFloat(sections) * 30 + 16, 360)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(actions.indices, id: \.self) { index in
                        let item = actions[index]
                        if let section = item.section,
                           index == 0 || actions[index - 1].section != section {
                            Text(section).font(.caption.weight(.semibold))
                                .foregroundStyle(RivunePalette.secondaryText)
                                .padding(.horizontal, 10).padding(.top, index == 0 ? 2 : 8)
                                .accessibilityAddTraits(.isHeader)
                        }
                        Button { activate(index) } label: {
                            HStack(spacing: 9) {
                                if let icon = item.systemImage { Image(systemName: icon).frame(width: 16).accessibilityHidden(true) }
                                Text(item.title).fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 8)
                                if item.isSelected { Image(systemName: "checkmark").accessibilityHidden(true) }
                            }
                            .font(.callout).padding(10).frame(maxWidth: .infinity, alignment: .leading)
                            .foregroundStyle(item.destructive ? Color.red : RivunePalette.primaryText)
                            .background(cursor == index ? RivunePalette.surfaceRaised : .clear,
                                        in: RoundedRectangle(cornerRadius: 8))
                            .opacity(item.isEnabled ? 1 : 0.45)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain).disabled(!item.isEnabled).focusable(false).id(index)
                        .accessibilityLabel(item.title)
                        .accessibilityAddTraits(item.isSelected ? .isSelected : [])
                        .onHover { hovering in if hovering && item.isEnabled { cursor = index } }
                    }
                }.padding(8)
            }
            .frame(width: 280, height: max(52, contentHeight))
            .background(RivunePalette.surface)
            .foregroundStyle(RivunePalette.primaryText)
            .focusable().focused($focused).focusEffectDisabled()
            .accessibilityElement(children: .contain).accessibilityLabel(title)
            .onAppear { resetCursor(); focused = true }
            .onChange(of: actions.map(\.isEnabled)) { _, _ in resetCursor() }
            .onChange(of: actions.map(\.isSelected)) { _, _ in resetCursor() }
            .onChange(of: enabled) { _, value in if !value { dismiss(false) } }
            .onChange(of: cursor) { _, value in if let value { proxy.scrollTo(value) } }
            .onKeyPress(.upArrow) { move(-1); return .handled }
            .onKeyPress(.downArrow) { move(1); return .handled }
            .onKeyPress(.return) { if let cursor { activate(cursor) }; return .handled }
            .onKeyPress(.space) { if let cursor { activate(cursor) }; return .handled }
            .onKeyPress(.escape) { dismiss(true); return .handled }
            .onKeyPress(.tab) { dismiss(false); return .ignored }
        }
    }

    private func resetCursor() {
        cursor = enabledIndices.first { actions[$0].isSelected } ?? enabledIndices.first
    }
    private func move(_ direction: Int) {
        let enabled = enabledIndices
        guard !enabled.isEmpty else { cursor = nil; return }
        guard let cursor, let position = enabled.firstIndex(of: cursor) else {
            self.cursor = direction < 0 ? enabled.last : enabled.first
            return
        }
        self.cursor = enabled[(position + direction + enabled.count) % enabled.count]
    }
    private func activate(_ index: Int) {
        guard enabled, actions.indices.contains(index), actions[index].isEnabled else { return }
        dismiss(true)
        actions[index].action()
    }
}

extension View {
    /// Attach to the presenting control, not its popover content. Never activates an app/window.
    func rivuneDismissOnFocusLoss(isPresented: Binding<Bool>) -> some View {
        modifier(RivuneTransientPresentationGuard(isPresented: isPresented))
    }

    /// A custom row menu. The row must already be keyboard-focusable for keyboard invocation.
    func rivuneContextActions(title: String, actions: [RivuneMenuAction]) -> some View {
        modifier(RivuneContextActionModifier(title: title, actions: actions))
    }
}

private struct RivuneContextActionModifier: ViewModifier {
    let title: String
    let actions: [RivuneMenuAction]
    @State private var open = false
    @Environment(\.isEnabled) private var enabled
    func body(content: Content) -> some View {
        content
            #if os(macOS)
            .overlay { RivuneSecondaryClickTarget { if enabled && !actions.isEmpty { open = true } }.accessibilityHidden(true) }
            #endif
            .onKeyPress(phases: .down) { press in
                let contextKey = press.characters == "\u{F70D}" && press.modifiers.contains(.shift)
                let controlReturn = press.key == .return && press.modifiers.contains(.control)
                guard enabled, (contextKey || controlReturn), !actions.isEmpty else { return .ignored }
                open = true
                return .handled
            }
            .accessibilityAction(named: Text("Show actions")) { if enabled && !actions.isEmpty { open = true } }
            .popover(isPresented: $open) {
                RivuneActionMenuContent(title: title, actions: actions) { _ in open = false }.disabled(!enabled)
            }
            .onChange(of: enabled) { _, value in if !value { open = false } }
            .rivuneDismissOnFocusLoss(isPresented: $open)
    }
}

private struct RivuneTransientPresentationGuard: ViewModifier {
    @Binding var isPresented: Bool
    @Environment(\.scenePhase) private var scenePhase
    func body(content: Content) -> some View {
        content
            .onChange(of: scenePhase) { _, phase in if phase != .active { isPresented = false } }
            .onDisappear { isPresented = false }
            #if os(macOS)
            .background { RivuneWindowFocusObserver(isPresented: $isPresented).frame(width: 0, height: 0).accessibilityHidden(true) }
            .onReceive(NotificationCenter.default.publisher(for: NSApplication.didResignActiveNotification)) { _ in isPresented = false }
            .onReceive(NotificationCenter.default.publisher(for: NSApplication.didHideNotification)) { _ in isPresented = false }
            .onReceive(NSWorkspace.shared.notificationCenter.publisher(for: NSWorkspace.didActivateApplicationNotification)) { note in
                if let application = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
                   application.processIdentifier != ProcessInfo.processInfo.processIdentifier { isPresented = false }
            }
            #endif
    }
}

#if os(macOS)
private struct RivuneWindowFocusObserver: NSViewRepresentable {
    @Binding var isPresented: Bool
    func makeNSView(context: Context) -> ObserverView { ObserverView() }
    func updateNSView(_ view: ObserverView, context: Context) {
        view.dismiss = { isPresented = false }
    }
    static func dismantleNSView(_ view: ObserverView, coordinator: ()) { view.dismiss = nil }

    final class ObserverView: NSView {
        var dismiss: (() -> Void)?
        override init(frame frameRect: NSRect) {
            super.init(frame: frameRect)
            let center = NotificationCenter.default
            for name in [NSWindow.didResignMainNotification, NSWindow.didMiniaturizeNotification, NSWindow.willCloseNotification] {
                center.addObserver(self, selector: #selector(ownerLostFocus(_:)), name: name, object: nil)
            }
            center.addObserver(self, selector: #selector(ownerResignedKey(_:)), name: NSWindow.didResignKeyNotification, object: nil)
        }
        required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
        deinit { NotificationCenter.default.removeObserver(self) }
        override func hitTest(_ point: NSPoint) -> NSView? { nil }
        @objc private func ownerLostFocus(_ notification: Notification) {
            guard let owner = window, notification.object as? NSWindow === owner else { return }
            dismiss?()
        }
        @objc private func ownerResignedKey(_ notification: Notification) {
            guard let owner = window, notification.object as? NSWindow === owner else { return }
            // A native popover may become key while its owner remains main. Do not close
            // that legitimate transfer; defer until AppKit settles the new owner.
            Task { @MainActor [weak self, weak owner] in
                await Task.yield()
                guard let self, let owner else { return }
                if !NSApp.isActive || (!owner.isMainWindow && !owner.isKeyWindow) { self.dismiss?() }
            }
        }
    }
}

private struct RivuneSecondaryClickTarget: NSViewRepresentable {
    let action: () -> Void
    func makeNSView(context: Context) -> TargetView { TargetView() }
    func updateNSView(_ view: TargetView, context: Context) { view.action = action }
    final class TargetView: NSView {
        var action: (() -> Void)?
        override func hitTest(_ point: NSPoint) -> NSView? {
            guard let event = NSApp.currentEvent,
                  event.type == .rightMouseDown || (event.type == .leftMouseDown && event.modifierFlags.contains(.control)) else { return nil }
            return super.hitTest(point)
        }
        override func rightMouseDown(with event: NSEvent) { action?() }
        override func mouseDown(with event: NSEvent) {
            if event.modifierFlags.contains(.control) { action?() } else { super.mouseDown(with: event) }
        }
    }
}
#endif
