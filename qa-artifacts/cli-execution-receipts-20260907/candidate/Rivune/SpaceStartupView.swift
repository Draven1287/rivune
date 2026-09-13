import SwiftUI

/// The reveal always finishes. Connection readiness selects chat or setup;
/// finishing the animation cannot mark a provider ready.
struct SpaceStartupView: View {
    @ObservedObject var store: RivuneStore
    let onReady: () -> Void
    let onConnect: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var arrival: Double = 0
    @State private var hasSettled = false
    @State private var elapsed: TimeInterval = 0
    private var mayEnter: Bool { destination == .workspace }
    private var destination: StartupArrivalDestination? {
        StartupArrivalPolicy.destination(elapsed: elapsed, phase: store.startupPhase, readyProviderCount: store.readyProviderCount)
    }
    private var percentage: Int {
        StartupArrivalPolicy.percentage(elapsed: elapsed)
    }

    var body: some View {
        GeometryReader { geometry in
            let compact = geometry.size.width < 600
            // The artwork is the stage. Account and connection controls belong
            // on the following page rather than reducing the poster's size.
            let artworkWidth = min(geometry.size.width * (compact ? 1.08 : 1.02), max(220, geometry.size.height - 150) * 1.5, 1880)
            let artworkSize = CGSize(width: artworkWidth, height: artworkWidth / 1.5)
            ZStack {
                Color.black
                RivuneStarfield(density: 240, opacity: 0.7)
                    .opacity(ease(arrival / 0.23))
                RadialGradient(colors: [Color(red: 0.03, green: 0.11, blue: 0.18).opacity(0.43), .clear], center: .center, startRadius: 10, endRadius: artworkSize.width * 0.55)
                    .opacity(ease(arrival / 0.3))

                identity(size: artworkSize)
                    .position(x: geometry.size.width / 2, y: geometry.size.height / 2 - 48)

                if !compact && geometry.size.width > 960 {
                    HStack {
                        peripheral("YOUR IDEAS")
                        Spacer()
                        peripheral("MULTIPLE PERSPECTIVES")
                    }
                    .padding(.horizontal, 54)
                    .offset(y: -8)
                    .opacity(ease((arrival - 0.3) / 0.4))
                }

                VStack {
                    HStack {
                        RivuneWordmark(width: 86)
                        Spacer()
                    }
                    Spacer()
                    connectionStatus
                }
                .padding(.horizontal, compact ? 22 : 34)
                // The full-bleed stage ignores safe areas, but its header must
                // clear the native title-bar controls (including during replay).
                #if os(macOS)
                .padding(.top, max(geometry.safeAreaInsets.top, 52) + 22)
                #else
                .padding(.top, geometry.safeAreaInsets.top + 22)
                #endif
                .padding(.bottom, compact ? 22 : 24)
            }
            .clipped()
        }
        .background(.black)
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Preparing Rivune")
        .task { await store.checkStartupReadiness() }
        .task {
            let clock = ContinuousClock()
            let start = clock.now
            while !Task.isCancelled {
                let duration = start.duration(to: clock.now).components
                elapsed = Double(duration.seconds) + Double(duration.attoseconds) / 1e18
                arrival = reduceMotion ? 1 : min(1, elapsed / StartupArrivalPolicy.duration)
                hasSettled = elapsed >= StartupArrivalPolicy.duration
                do { try await Task.sleep(for: .milliseconds(50)) } catch { return }
            }
        }
        .task(id: hasSettled) {
            guard hasSettled else { return }
            try? await Task.sleep(for: .seconds(StartupArrivalPolicy.handoffDelay))
            guard !Task.isCancelled else { return }
            if destination == .workspace { onReady() }
            else { onConnect() }
        }
        .onChange(of: reduceMotion) { _, reduced in
            if reduced { arrival = 1 }
        }
    }

    private func identity(size: CGSize) -> some View {
        let revealed = ease((arrival - 0.15) / 0.63)
        return ZStack(alignment: .topLeading) {
            // One continuous poster with a broad feathered reveal. Splitting the
            // star field at the wordmark created a visible rectangular seam.
            Image("RivuneSpaceIdentity")
                .resizable().scaledToFit()
                .frame(width: size.width, height: size.height)
                .mask(alignment: .top) {
                    LinearGradient(stops: [
                        .init(color: .white, location: 0),
                        .init(color: .white, location: 0.45),
                        .init(color: .clear, location: 0.60),
                        .init(color: .clear, location: 1)
                    ], startPoint: .top, endPoint: .bottom)
                    .frame(height: size.height * 3)
                    .offset(y: -size.height * 2 * (1 - revealed))
                }
                .mask {
                    LinearGradient(stops: [
                        .init(color: .clear, location: 0),
                        .init(color: .white, location: 0.16),
                        .init(color: .white, location: 0.84),
                        .init(color: .clear, location: 1)
                    ], startPoint: .leading, endPoint: .trailing)
                    .mask {
                        LinearGradient(stops: [
                            .init(color: .clear, location: 0),
                            .init(color: .white, location: 0.16),
                            .init(color: .white, location: 0.88),
                            .init(color: .clear, location: 1)
                        ], startPoint: .top, endPoint: .bottom)
                    }
                }
            HStack {
                Text("\(percentage)%")
                Spacer()
                Text("\(percentage)%")
            }
            .padding(.horizontal, size.width * 0.065)
            .font(.system(size: 11, weight: .regular, design: .monospaced))
            .monospacedDigit()
            .foregroundStyle(RivunePalette.rivune.opacity(0.78))
            .offset(y: size.height * 0.43)
            .accessibilityHidden(true)
        }
        .frame(width: size.width, height: size.height)
        .blendMode(.screen)
        .accessibilityLabel("Silver Rivune R with a luminous pearl and tilted silver ring, surrounded by planets and stars")
    }

    private var connectionStatus: some View {
        VStack(spacing: 12) {
            VStack(spacing: 7) {
                HStack {
                    Text(hasSettled ? "LOADED" : "LOADING")
                    Spacer()
                    Text("\(percentage)%").monospacedDigit()
                }
                .font(.system(size: 9, design: .monospaced)).tracking(2)
                .foregroundStyle(RivunePalette.rivune)
                ProgressView(value: Double(percentage), total: 100).tint(RivunePalette.rivune)
            }
            Text(mayEnter ? "Ready for your next idea." : hasSettled ? "Welcome to Rivune." : "Preparing your workspace.")
                .font(.system(size: 14, weight: .medium))
            Text(hasSettled ? (mayEnter ? "Opening your workspace…" : "Opening setup to connect your AI…") : store.startupPhase == .ready ? "Connections checked. Bringing everything into view." : store.startupStatusText)
                .font(.system(size: 11)).foregroundStyle(RivunePalette.secondaryText)
                .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: 420)
        .padding(17)
        .background(Color.black.opacity(0.83), in: RoundedRectangle(cornerRadius: 14))
        .foregroundStyle(RivunePalette.primaryText)
        .accessibilityElement(children: .contain)
    }

    private func peripheral(_ text: String) -> some View {
        Text(text).font(.system(size: 9, design: .monospaced)).tracking(2)
            .foregroundStyle(RivunePalette.rivune.opacity(0.43))
    }

    private func ease(_ value: Double) -> Double {
        let t = min(1, max(0, value))
        return t * t * (3 - 2 * t)
    }
}
