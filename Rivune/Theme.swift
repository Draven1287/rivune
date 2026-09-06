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
        if mode == .together {
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
    @State private var open = false
    @State private var cursor = 0
    @FocusState private var optionsFocused: Bool
    @FocusState private var triggerFocused: Bool
    private var selectedLabel: String { options.first { $0.1 == selection }?.0 ?? title }
    var body: some View {
        Button { open.toggle() } label: {
            HStack(spacing: 12) { Text(selectedLabel).lineLimit(1); Spacer(minLength: 12); Image(systemName: "chevron.down").font(.caption) }
                .frame(minWidth: 120)
        }
        .buttonStyle(RivuneButtonStyle()).focused($triggerFocused)
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(triggerFocused ? RivunePalette.rivune : .clear, lineWidth: 1))
        .accessibilityLabel(title).accessibilityValue(selectedLabel)
        .accessibilityHint("Opens choices. Use arrow keys and Return to choose; Escape to dismiss.")
        .popover(isPresented: $open) {
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(options.indices, id: \.self) { index in
                            Button { choose(index) } label: {
                                HStack { Text(options[index].0); Spacer(); if selection == options[index].1 { Image(systemName: "checkmark") } }
                                    .font(.callout).padding(10).frame(maxWidth: .infinity, alignment: .leading)
                                    .background(cursor == index ? RivunePalette.surfaceRaised : .clear, in: RoundedRectangle(cornerRadius: 8))
                            }.buttonStyle(.plain).id(index)
                                .accessibilityAddTraits(selection == options[index].1 ? .isSelected : [])
                        }
                    }.padding(8)
                }.frame(width: 280, height: min(CGFloat(options.count) * 42 + 16, 330))
                    .background(RivunePalette.surface)
                    .focusable().focused($optionsFocused).focusEffectDisabled()
                    .onKeyPress(.upArrow) { cursor = max(0, cursor - 1); return .handled }
                    .onKeyPress(.downArrow) { cursor = min(options.count - 1, cursor + 1); return .handled }
                    .onKeyPress(.return) { choose(cursor); return .handled }
                    .onKeyPress(.space) { choose(cursor); return .handled }
                    .onKeyPress(.escape) { open = false; triggerFocused = true; return .handled }
                    .onChange(of: cursor) { _, value in proxy.scrollTo(value) }
                    .onAppear { cursor = options.firstIndex { $0.1 == selection } ?? 0; optionsFocused = true }
            }
        }
    }
    private func choose(_ index: Int) {
        guard options.indices.contains(index) else { return }
        selection = options[index].1; open = false; triggerFocused = true
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
    var destructive = false
    let action: () -> Void
    var id: String { title }
}
struct RivuneActionMenu: View {
    let title: String
    let actions: [RivuneMenuAction]
    @State private var open = false
    @State private var cursor = 0
    @FocusState private var focused: Bool
    var body: some View {
        Button { open.toggle() } label: { Image(systemName: "ellipsis").frame(width: 32, height: 32) }
            .buttonStyle(.plain).accessibilityLabel(title)
            .popover(isPresented: $open) {
                VStack(spacing: 4) {
                    ForEach(Array(actions.enumerated()), id: \.element.id) { index, item in
                        Button { open = false; item.action() } label: {
                            Text(item.title).font(.callout).frame(maxWidth: .infinity, alignment: .leading).padding(10)
                                .foregroundStyle(item.destructive ? Color.red : RivunePalette.primaryText)
                                .background(cursor == index ? RivunePalette.surfaceRaised : .clear, in: RoundedRectangle(cornerRadius: 8))
                        }.buttonStyle(.plain)
                    }
                }.padding(8).frame(width: 240).background(RivunePalette.surface)
                    .focusable().focused($focused).focusEffectDisabled()
                    .onAppear { focused = true }
                    .onKeyPress(.upArrow) { cursor = max(0, cursor - 1); return .handled }
                    .onKeyPress(.downArrow) { cursor = min(actions.count - 1, cursor + 1); return .handled }
                    .onKeyPress(.return) { if actions.indices.contains(cursor) { open = false; actions[cursor].action() }; return .handled }
                    .onKeyPress(.escape) { open = false; return .handled }
            }
    }
}
