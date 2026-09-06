import AVFoundation
import Combine
import Foundation
@preconcurrency import Speech

@MainActor
final class SpeechDictationController: ObservableObject {
    enum State: Equatable {
        case idle
        case requestingAuthorization
        case recording
    }

    @Published private(set) var state: State = .idle
    @Published private(set) var errorMessage: String?

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var hasInputTap = false
    private var sessionID = UUID()
    private var existingText = ""
    private var onTextChange: ((String) -> Void)?

    var isActive: Bool {
        state != .idle
    }

    var accessibilityValue: String {
        switch state {
        case .idle:
            "Not listening"
        case .requestingAuthorization:
            "Requesting permission"
        case .recording:
            "Listening"
        }
    }

    func start(existingText: String, onTextChange: @escaping (String) -> Void) {
        guard state == .idle else { return }

        let newSessionID = UUID()
        sessionID = newSessionID
        self.existingText = existingText
        self.onTextChange = onTextChange
        errorMessage = nil
        state = .requestingAuthorization

        Task { [weak self] in
            guard let self else { return }

            do {
                try await requestPermissions()
                guard sessionID == newSessionID else { return }
                try beginRecording(sessionID: newSessionID)
            } catch {
                guard sessionID == newSessionID else { return }
                fail(with: error.localizedDescription)
            }
        }
    }

    func stop() {
        guard state != .idle || recognitionTask != nil else { return }

        sessionID = UUID()
        state = .idle
        tearDownAudio(cancelRecognition: true)
        existingText = ""
        onTextChange = nil
    }

    private func requestPermissions() async throws {
        let speechStatus = await speechAuthorizationStatus()
        switch speechStatus {
        case .authorized:
            break
        case .denied:
            throw DictationError.speechPermissionDenied
        case .restricted:
            throw DictationError.speechRecognitionRestricted
        case .notDetermined:
            throw DictationError.speechPermissionUndetermined
        @unknown default:
            throw DictationError.speechPermissionUndetermined
        }

        guard await microphonePermissionGranted() else {
            throw DictationError.microphonePermissionDenied
        }
    }

    private func speechAuthorizationStatus() async -> SFSpeechRecognizerAuthorizationStatus {
        let currentStatus = SFSpeechRecognizer.authorizationStatus()
        guard currentStatus == .notDetermined else { return currentStatus }

        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status)
            }
        }
    }

    private func microphonePermissionGranted() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            return true
        case .notDetermined:
            return await AVCaptureDevice.requestAccess(for: .audio)
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }

    private func beginRecording(sessionID: UUID) throws {
        guard let speechRecognizer = SFSpeechRecognizer(locale: .autoupdatingCurrent),
              speechRecognizer.isAvailable else {
            throw DictationError.recognizerUnavailable
        }

        #if os(iOS)
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
        try audioSession.setActive(true)
        #endif

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.addsPunctuation = true
        request.taskHint = .dictation
        recognitionRequest = request

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        guard recordingFormat.sampleRate > 0, recordingFormat.channelCount > 0 else {
            throw DictationError.microphoneUnavailable
        }

        inputNode.installTap(onBus: 0, bufferSize: 1_024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }
        hasInputTap = true

        recognitionTask = speechRecognizer.recognitionTask(with: request) { [weak self] result, error in
            let transcript = result?.bestTranscription.formattedString
            let isFinal = result?.isFinal == true
            let recognitionError = error?.localizedDescription

            Task { @MainActor [weak self] in
                self?.handleRecognitionUpdate(
                    transcript: transcript,
                    isFinal: isFinal,
                    errorMessage: recognitionError,
                    sessionID: sessionID
                )
            }
        }

        audioEngine.prepare()
        try audioEngine.start()
        state = .recording
    }

    private func handleRecognitionUpdate(
        transcript: String?,
        isFinal: Bool,
        errorMessage: String?,
        sessionID: UUID
    ) {
        guard self.sessionID == sessionID else { return }

        if let transcript, !transcript.isEmpty {
            onTextChange?(combinedText(with: transcript))
        }

        if isFinal {
            finishNormally()
        } else if let errorMessage {
            fail(with: "Voice input stopped: \(errorMessage)")
        }
    }

    private func combinedText(with transcript: String) -> String {
        guard !existingText.isEmpty else { return transcript }
        guard existingText.last?.isWhitespace != true else { return existingText + transcript }
        return existingText + " " + transcript
    }

    private func finishNormally() {
        sessionID = UUID()
        state = .idle
        tearDownAudio(cancelRecognition: false)
        existingText = ""
        onTextChange = nil
    }

    private func fail(with message: String) {
        sessionID = UUID()
        state = .idle
        tearDownAudio(cancelRecognition: true)
        existingText = ""
        onTextChange = nil
        errorMessage = message
    }

    private func tearDownAudio(cancelRecognition: Bool) {
        if audioEngine.isRunning {
            audioEngine.stop()
        }

        if hasInputTap {
            audioEngine.inputNode.removeTap(onBus: 0)
            hasInputTap = false
        }

        recognitionRequest?.endAudio()
        recognitionRequest = nil

        if cancelRecognition {
            recognitionTask?.cancel()
        }
        recognitionTask = nil

        #if os(iOS)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        #endif
    }
}

private enum DictationError: LocalizedError {
    case speechPermissionDenied
    case speechRecognitionRestricted
    case speechPermissionUndetermined
    case microphonePermissionDenied
    case microphoneUnavailable
    case recognizerUnavailable

    var errorDescription: String? {
        switch self {
        case .speechPermissionDenied:
            "Speech recognition permission is off. Enable it for Rivune in Settings."
        case .speechRecognitionRestricted:
            "Speech recognition is restricted on this device."
        case .speechPermissionUndetermined:
            "Rivune could not determine speech recognition permission. Try again."
        case .microphonePermissionDenied:
            "Microphone permission is off. Enable it for Rivune in Settings."
        case .microphoneUnavailable:
            "No usable microphone input is available."
        case .recognizerUnavailable:
            "Speech recognition is temporarily unavailable. Check your connection and try again."
        }
    }
}
