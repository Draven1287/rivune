#if os(iOS)
import SwiftUI
import UIKit
import Vision
import VisionKit

/// A focused, one-shot QR scanner for accepting a Mac pairing payload.
///
/// The caller owns presentation and dismissal. `onPayload` is invoked at most
/// once per presentation, as soon as a non-empty QR payload is recognized.
struct PairingScannerView: View {
    let onPayload: (String) -> Void
    let onCancel: () -> Void

    @Environment(\.scenePhase) private var scenePhase
    @State private var phase: ScannerPhase = .checking
    @State private var didDeliverPayload = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch phase {
            case .checking:
                preparingView

            case .starting, .scanning, .captured:
                scannerView

            case .unavailable(let message, let offersSettings):
                unavailableView(message: message, offersSettings: offersSettings)
            }
        }
        .preferredColorScheme(.dark)
        .onAppear(perform: evaluateAvailability)
        .onChange(of: scenePhase) { _, newPhase in
            guard newPhase == .active else { return }
            if case .unavailable = phase {
                evaluateAvailability()
            }
        }
    }

    private var preparingView: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
                .tint(RivunePalette.primaryText)
            Text("Preparing camera…")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(RivunePalette.secondaryText)
        }
        .accessibilityElement(children: .combine)
    }

    private var scannerView: some View {
        ZStack {
            QRDataScannerRepresentable(
                onScanning: {
                    guard !didDeliverPayload else { return }
                    phase = .scanning
                },
                onPayload: handlePayload,
                onUnavailable: { message, offersSettings in
                    guard !didDeliverPayload else { return }
                    phase = .unavailable(message, offersSettings: offersSettings)
                }
            )
            .ignoresSafeArea()
            .accessibilityHidden(true)

            ScannerChrome(phase: phase, onCancel: onCancel)
        }
    }

    private func unavailableView(message: String, offersSettings: Bool) -> some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "camera.viewfinder")
                .font(.system(size: 30, weight: .medium))
                .foregroundStyle(RivunePalette.primaryText)
                .frame(width: 68, height: 68)
                .background(RivunePalette.surfaceRaised, in: Circle())
                .overlay {
                    Circle()
                        .stroke(RivunePalette.hairline, lineWidth: 0.8)
                }

            VStack(spacing: 9) {
                Text("Camera unavailable")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(RivunePalette.primaryText)

                Text(message)
                    .font(.body)
                    .foregroundStyle(RivunePalette.secondaryText)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: 360)

            VStack(spacing: 10) {
                if offersSettings {
                    Button("Open Camera Settings", systemImage: "gear") {
                        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
                        UIApplication.shared.open(url)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(RivunePalette.primaryText)
                    .foregroundStyle(RivunePalette.canvas)
                    .controlSize(.large)
                }

                Button("Cancel", action: onCancel)
                    .buttonStyle(.bordered)
                    .controlSize(.large)
            }

            Spacer()
        }
        .padding(28)
    }

    private func evaluateAvailability() {
        guard DataScannerViewController.isSupported else {
            phase = .unavailable(
                "Live QR scanning is not supported on this device. Pairing requires a compatible iPhone with a working rear camera.",
                offersSettings: false
            )
            return
        }

        guard DataScannerViewController.isAvailable else {
            phase = .unavailable(
                "Allow Camera access for Rivune and make sure another app is not currently using the camera, then return here to try again.",
                offersSettings: true
            )
            return
        }

        phase = .starting
    }

    private func handlePayload(_ payload: String) {
        guard !didDeliverPayload,
              !payload.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        didDeliverPayload = true
        phase = .captured
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        onPayload(payload)
    }
}

private enum ScannerPhase: Equatable {
    case checking
    case starting
    case scanning
    case captured
    case unavailable(String, offersSettings: Bool)
}

private struct ScannerChrome: View {
    let phase: ScannerPhase
    let onCancel: () -> Void

    var body: some View {
        GeometryReader { geometry in
            let scanRect = scanRect(in: geometry)

            ZStack {
                ScannerScrim(cutout: scanRect)
                    .fill(.black.opacity(0.50), style: FillStyle(eoFill: true))
                    .ignoresSafeArea()

                RoundedRectangle(cornerRadius: 30, style: .continuous)
                    .strokeBorder(
                        phase == .captured ? RivunePalette.success : RivunePalette.primaryText.opacity(0.92),
                        lineWidth: phase == .captured ? 3 : 2
                    )
                    .frame(width: scanRect.width, height: scanRect.height)
                    .position(x: scanRect.midX, y: scanRect.midY)
                    .shadow(color: .black.opacity(0.35), radius: 12, y: 6)

                header
                    .frame(maxHeight: .infinity, alignment: .top)

                instructionPanel
                    .frame(maxHeight: .infinity, alignment: .bottom)
            }
        }
        .animation(.easeOut(duration: 0.22), value: phase)
    }

    private var header: some View {
        HStack(spacing: 12) {
            Button(action: onCancel) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .frame(width: 44, height: 44)
                    .background(.ultraThinMaterial, in: Circle())
                    .overlay {
                        Circle().stroke(.white.opacity(0.14), lineWidth: 0.7)
                    }
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white)
            .accessibilityLabel("Cancel pairing")

            Spacer(minLength: 0)

            VStack(spacing: 3) {
                Text("Pair with your Mac")
                    .font(.headline.weight(.semibold))
                Text("Scan the code shown in Rivune")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.72))
            }
            .multilineTextAlignment(.center)

            Spacer(minLength: 0)

            Color.clear
                .frame(width: 44, height: 44)
                .accessibilityHidden(true)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.top, 10)
    }

    private var instructionPanel: some View {
        HStack(spacing: 12) {
            Image(systemName: phase == .captured ? "checkmark.circle.fill" : "viewfinder")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(phase == .captured ? RivunePalette.success : RivunePalette.primaryText)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 3) {
                Text(statusTitle)
                    .font(.subheadline.weight(.semibold))
                Text(statusDetail)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.70))
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(16)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .background(.black.opacity(0.36), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.14), lineWidth: 0.7)
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 18)
        .accessibilityElement(children: .combine)
    }

    private var statusTitle: String {
        switch phase {
        case .starting:
            "Starting camera…"
        case .captured:
            "Pairing code captured"
        default:
            "Hold the code inside the frame"
        }
    }

    private var statusDetail: String {
        switch phase {
        case .captured:
            "Verifying the secure connection with your Mac."
        default:
            "The code is read automatically—there is no shutter button."
        }
    }

    private func scanRect(in geometry: GeometryProxy) -> CGRect {
        let horizontalLimit = max(160, geometry.size.width - 56)
        let verticalLimit = max(
            160,
            geometry.size.height
                - geometry.safeAreaInsets.top
                - geometry.safeAreaInsets.bottom
                - 230
        )
        let size = min(320, horizontalLimit, verticalLimit)
        let centeredY = (geometry.size.height - size) / 2 - 12
        let minimumY = geometry.safeAreaInsets.top + 92
        let originY = min(max(minimumY, centeredY), geometry.size.height - size - 112)

        return CGRect(
            x: (geometry.size.width - size) / 2,
            y: max(geometry.safeAreaInsets.top + 76, originY),
            width: size,
            height: size
        )
    }
}

private struct ScannerScrim: Shape {
    let cutout: CGRect

    func path(in rect: CGRect) -> Path {
        var path = Path(rect)
        path.addPath(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .path(in: cutout)
        )
        return path
    }
}

private struct QRDataScannerRepresentable: UIViewControllerRepresentable {
    let onScanning: () -> Void
    let onPayload: (String) -> Void
    let onUnavailable: (String, Bool) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onPayload: onPayload, onUnavailable: onUnavailable)
    }

    func makeUIViewController(context: Context) -> PairingScannerHostViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.qr])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: true,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator

        return PairingScannerHostViewController(
            scanner: scanner,
            onScanning: onScanning,
            onUnavailable: onUnavailable
        )
    }

    func updateUIViewController(_ viewController: PairingScannerHostViewController, context: Context) {
        viewController.onScanning = onScanning
        viewController.onUnavailable = onUnavailable
        context.coordinator.onPayload = onPayload
        context.coordinator.onUnavailable = onUnavailable
    }

    static func dismantleUIViewController(
        _ viewController: PairingScannerHostViewController,
        coordinator: Coordinator
    ) {
        viewController.stopScanning()
    }

    @MainActor
    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var onPayload: (String) -> Void
        var onUnavailable: (String, Bool) -> Void
        private var didDeliverPayload = false

        init(
            onPayload: @escaping (String) -> Void,
            onUnavailable: @escaping (String, Bool) -> Void
        ) {
            self.onPayload = onPayload
            self.onUnavailable = onUnavailable
        }

        func dataScanner(
            _ dataScanner: DataScannerViewController,
            didAdd addedItems: [RecognizedItem],
            allItems: [RecognizedItem]
        ) {
            deliverFirstQR(from: addedItems, scanner: dataScanner)
        }

        func dataScanner(
            _ dataScanner: DataScannerViewController,
            didUpdate updatedItems: [RecognizedItem],
            allItems: [RecognizedItem]
        ) {
            deliverFirstQR(from: updatedItems, scanner: dataScanner)
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            deliverFirstQR(from: [item], scanner: dataScanner)
        }

        func dataScanner(
            _ dataScanner: DataScannerViewController,
            becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable
        ) {
            guard !didDeliverPayload else { return }

            let message = switch error {
            case .unsupported:
                "Live QR scanning is not supported on this device."
            case .cameraRestricted:
                "Camera access is restricted. Allow Camera access for Rivune in Settings, then try again."
            @unknown default:
                "The camera became unavailable. Check Camera access and try again."
            }
            onUnavailable(message, error != .unsupported)
        }

        private func deliverFirstQR(
            from items: [RecognizedItem],
            scanner: DataScannerViewController
        ) {
            guard !didDeliverPayload else { return }

            for item in items {
                guard case .barcode(let barcode) = item,
                      let payload = barcode.payloadStringValue,
                      !payload.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                    continue
                }

                didDeliverPayload = true
                scanner.stopScanning()
                onPayload(payload)
                return
            }
        }
    }
}

@MainActor
private final class PairingScannerHostViewController: UIViewController {
    let scanner: DataScannerViewController
    var onScanning: () -> Void
    var onUnavailable: (String, Bool) -> Void

    init(
        scanner: DataScannerViewController,
        onScanning: @escaping () -> Void,
        onUnavailable: @escaping (String, Bool) -> Void
    ) {
        self.scanner = scanner
        self.onScanning = onScanning
        self.onUnavailable = onUnavailable
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is unavailable")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        addChild(scanner)
        scanner.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scanner.view)
        NSLayoutConstraint.activate([
            scanner.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scanner.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scanner.view.topAnchor.constraint(equalTo: view.topAnchor),
            scanner.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        scanner.didMove(toParent: self)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startScanningIfPossible()
    }

    override func viewWillDisappear(_ animated: Bool) {
        stopScanning()
        super.viewWillDisappear(animated)
    }

    func stopScanning() {
        guard scanner.isScanning else { return }
        scanner.stopScanning()
    }

    private func startScanningIfPossible() {
        guard !scanner.isScanning else {
            onScanning()
            return
        }

        do {
            try scanner.startScanning()
            onScanning()
        } catch {
            onUnavailable(
                "The scanner could not start. Check Camera access for Rivune and make sure the camera is not in use, then try again.",
                true
            )
        }
    }
}
#endif
