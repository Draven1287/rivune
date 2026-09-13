import Foundation
import SwiftUI
@preconcurrency import Network
import Security

enum PeerBridgeError: Error {
    case notConnected
    case messageTooLarge
    case encodingFailed
    case sendFailed
    case invalidPairingCode
}

private struct BridgeCredential: Codable, Sendable {
    let serviceID: String
    let identity: Data
    let secret: Data
}

private struct BridgePairingPayload: Codable, Sendable {
    let version: Int
    let serviceID: String
    let identity: String
    let secret: String
    let expiresAt: Date
}

final class PeerBridge: ObservableObject, @unchecked Sendable {
    static let serviceType = RivuneBrand.bridgeServiceType
    static let maximumMessageBytes = 1 * 1_024 * 1_024

    @Published private(set) var state: BridgeLinkState = .off
    @Published private(set) var discoveredPeers: [BridgePeer] = []
    @Published private(set) var isAdvertising = false
    @Published private(set) var hasSavedPairing = false
    @Published private(set) var pairingCode: String?
    @Published private(set) var pairingExpiresAt: Date?
    @Published private(set) var lastError: String?

    var onEnvelope: ((BridgeEnvelope) -> Void)?
    var onConnectionChanged: ((Bool) -> Void)?

    private let queue = DispatchQueue(label: "com.aaravshah.rivune.bridge", qos: .userInitiated)
    private let keychainAccount = "primary-device"
    private var credential: BridgeCredential?
    private var listener: NWListener?
    private var browser: NWBrowser?
    private var connection: NWConnection?
    private var pendingConnection: NWConnection?
    private var peerEndpoints: [String: NWEndpoint] = [:]
    private var receiveBuffer = Data()
    private var pairingGeneration = UUID()
    private var pendingPairingExpiresAt: Date?
    private var pendingReconnectCredential: BridgeCredential?
    private var reconnectEnabled = true

    init() {
        guard !RivuneLaunchContext.isIsolated else { return }
        RivuneBrand.migrateLegacyDefaults()
        credential = BridgeKeychain.load(account: keychainAccount)
        hasSavedPairing = credential != nil
    }

    func start() {
        guard !RivuneLaunchContext.isIsolated else { return }
        queue.async { [weak self] in
            guard let self else { return }
            #if os(macOS)
            if UserDefaults.standard.bool(forKey: "rivune.bridgeAdvertising"), credential != nil {
                startListener()
            } else {
                publishState(.off)
            }
            #else
            // Ask for local-network access only after the user has deliberately
            // paired this iPhone. This keeps the permission prompt contextual.
            if credential != nil {
                startBrowser()
            } else {
                publishState(.off)
            }
            #endif
        }
    }

    func setAdvertising(_ enabled: Bool) {
        guard !RivuneLaunchContext.isIsolated else { return }
        #if os(macOS)
        UserDefaults.standard.set(enabled, forKey: "rivune.bridgeAdvertising")
        queue.async { [weak self] in
            guard let self else { return }
            if enabled {
                if credential == nil {
                    DispatchQueue.main.async { [weak self] in self?.beginPairing() }
                } else {
                    startListener()
                }
            } else if pendingPairingExpiresAt != nil {
                revokePairingOnQueue()
            } else {
                stopTransport(clearPairing: false)
            }
        }
        #endif
    }

    func beginPairing() {
        guard !RivuneLaunchContext.isIsolated else { return }
        #if os(macOS)
        UserDefaults.standard.set(true, forKey: "rivune.bridgeAdvertising")
        queue.async { [weak self] in
            guard let self,
                  let secret = Self.randomData(count: 32),
                  let identity = Self.randomData(count: 24) else {
                self?.publishError("Rivune could not create a secure pairing secret.")
                return
            }

            let newCredential = BridgeCredential(
                serviceID: UUID().uuidString.lowercased(),
                identity: identity,
                secret: secret
            )
            // This QR credential is deliberately memory-only. After the first
            // authenticated connection, Rivune replaces it with a fresh durable
            // reconnect credential delivered inside the encrypted channel.
            BridgeKeychain.delete(account: keychainAccount)
            credential = newCredential
            pendingReconnectCredential = nil
            pairingGeneration = UUID()
            let generation = pairingGeneration
            let expiry = Date().addingTimeInterval(120)
            pendingPairingExpiresAt = expiry
            let payload = BridgePairingPayload(
                version: 1,
                serviceID: newCredential.serviceID,
                identity: Self.base64URL(newCredential.identity),
                secret: Self.base64URL(newCredential.secret),
                expiresAt: expiry
            )
            let encoded = (try? JSONEncoder().encode(payload))
                .map { Self.base64URL($0) }

            stopTransport(clearPairing: false)
            startListener()
            DispatchQueue.main.async { [weak self] in
                self?.pairingCode = encoded
                self?.pairingExpiresAt = expiry
                self?.hasSavedPairing = false
                self?.lastError = nil
            }

            queue.asyncAfter(deadline: .now() + 120) { [weak self] in
                guard let self,
                      pairingGeneration == generation,
                      pendingPairingExpiresAt != nil else { return }
                revokePairingOnQueue()
                publishError("The pairing code expired. Start pairing again for a fresh code.")
            }
        }
        #endif
    }

    func pair(using code: String) throws {
        guard !RivuneLaunchContext.isIsolated else { throw PeerBridgeError.notConnected }
        #if os(iOS)
        let input = code.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalized: String
        if input.hasPrefix("rivune:") {
            guard let parts = URLComponents(string: input), parts.scheme == "rivune", parts.host == "pair", parts.path.isEmpty, parts.fragment == nil,
                  let items = parts.queryItems, items.count == 1, items[0].name == "code", let value = items[0].value else { throw PeerBridgeError.invalidPairingCode }
            normalized = value
        } else { normalized = input }
        guard let encoded = Self.dataFromBase64URL(normalized),
              let payload = try? JSONDecoder().decode(BridgePairingPayload.self, from: encoded),
              payload.version == 1,
              payload.expiresAt > Date(),
              payload.expiresAt < Date().addingTimeInterval(180),
              UUID(uuidString: payload.serviceID) != nil,
              let identity = Self.dataFromBase64URL(payload.identity),
              let secret = Self.dataFromBase64URL(payload.secret),
              identity.count >= 16,
              secret.count == 32 else {
            throw PeerBridgeError.invalidPairingCode
        }

        let newCredential = BridgeCredential(
            serviceID: payload.serviceID,
            identity: identity,
            secret: secret
        )
        DispatchQueue.main.async { [weak self] in
            self?.lastError = nil
        }
        queue.async { [weak self] in
            guard let self else { return }
            credential = newCredential
            reconnectEnabled = true
            if browser == nil {
                startBrowser()
            } else {
                connectToSavedMacIfAvailable()
            }
        }
        #else
        throw PeerBridgeError.invalidPairingCode
        #endif
    }

    func connect(to peer: BridgePeer) {
        guard !RivuneLaunchContext.isIsolated else { return }
        #if os(iOS)
        queue.async { [weak self] in
            guard let self,
                  let credential,
                  credential.serviceID == peer.id,
                  let endpoint = peerEndpoints[peer.id] else {
                self?.publishError("Scan or paste the pairing code from your Mac first.")
                return
            }
            reconnectEnabled = true
            startConnection(to: endpoint, peerName: "Rivune Mac")
        }
        #endif
    }

    func disconnect() {
        queue.async { [weak self] in
            guard let self else { return }
            reconnectEnabled = false
            pendingConnection?.cancel()
            pendingConnection = nil
            connection?.cancel()
            connection = nil
            receiveBuffer.removeAll(keepingCapacity: false)
            #if os(macOS)
            publishState(listener != nil ? .searching : .off)
            #else
            publishState(credential != nil ? .searching : .off)
            #endif
        }
    }

    func revokePairing() {
        guard !RivuneLaunchContext.isIsolated else { return }
        queue.async { [weak self] in
            self?.revokePairingOnQueue()
        }
    }

    func send(_ envelope: BridgeEnvelope) throws {
        guard !RivuneLaunchContext.isIsolated else { throw PeerBridgeError.notConnected }
        guard let data = try? JSONEncoder().encode(envelope) else {
            throw PeerBridgeError.encodingFailed
        }
        guard data.count <= Self.maximumMessageBytes else {
            throw PeerBridgeError.messageTooLarge
        }
        let activeConnection = queue.sync { connection }
        guard let activeConnection else {
            throw PeerBridgeError.notConnected
        }

        let frame = Self.frame(data)
        activeConnection.send(content: frame, completion: .contentProcessed { [weak self, weak activeConnection] error in
            guard let self, let activeConnection, error != nil else { return }
            self.queue.async { [self] in
                guard self.connection === activeConnection else { return }
                self.publishError("The encrypted Mac connection could not send that message.")
                activeConnection.cancel()
            }
        })
    }

    private func send(
        _ envelope: BridgeEnvelope,
        on candidate: NWConnection,
        completion: @escaping @Sendable (NWError?) -> Void
    ) {
        guard let data = try? JSONEncoder().encode(envelope),
              data.count <= Self.maximumMessageBytes else {
            publishError("Rivune could not encode a secure bridge message.")
            candidate.cancel()
            return
        }
        candidate.send(content: Self.frame(data), completion: .contentProcessed(completion))
    }

    private func startListener() {
        #if os(macOS)
        guard listener == nil, let credential else { return }
        do {
            let newListener = try NWListener(using: Self.parameters(for: credential))
            newListener.service = NWListener.Service(
                name: credential.serviceID,
                type: Self.serviceType
            )
            newListener.newConnectionHandler = { [weak self, weak newListener] candidate in
                guard let self, let newListener else { return }
                self.queue.async { [self] in
                    guard self.listener === newListener,
                          self.connection == nil,
                          self.pendingConnection == nil else {
                        candidate.cancel()
                        return
                    }
                    self.pendingConnection = candidate
                    self.receiveBuffer.removeAll(keepingCapacity: false)
                    self.startConnection(candidate, peerName: "iPhone")
                }
            }
            newListener.stateUpdateHandler = { [weak self, weak newListener] newState in
                guard let self, let newListener else { return }
                self.queue.async { [self] in
                    guard self.listener === newListener else { return }
                    switch newState {
                    case .ready:
                        self.publishAdvertising(true)
                        if self.connection == nil, self.pendingConnection == nil { self.publishState(.searching) }
                    case .failed(let error):
                        self.publishError("Mac bridge could not start: \(error.localizedDescription)")
                        self.stopTransport(clearPairing: false)
                    case .cancelled:
                        self.publishAdvertising(false)
                    default:
                        break
                    }
                }
            }
            listener = newListener
            newListener.start(queue: queue)
        } catch {
            publishError("Mac bridge could not open a secure local connection.")
            stopTransport(clearPairing: false)
        }
        #endif
    }

    private func startBrowser() {
        #if os(iOS)
        guard browser == nil else { return }
        let parameters = NWParameters.tcp
        parameters.includePeerToPeer = true
        let newBrowser = NWBrowser(
            for: .bonjour(type: Self.serviceType, domain: nil),
            using: parameters
        )
        newBrowser.browseResultsChangedHandler = { [weak self, weak newBrowser] results, _ in
            guard let self, let newBrowser else { return }
            self.queue.async { [self] in
                guard self.browser === newBrowser else { return }
                var endpoints: [String: NWEndpoint] = [:]
                var peers: [BridgePeer] = []
                for result in results {
                    guard case .service(let name, _, _, _) = result.endpoint else { continue }
                    endpoints[name] = result.endpoint
                    peers.append(BridgePeer(id: name, name: "Rivune Mac"))
                }
                self.peerEndpoints = endpoints
                let ordered = peers.sorted { $0.id < $1.id }
                DispatchQueue.main.async { [weak self] in
                    self?.discoveredPeers = ordered
                }
                self.connectToSavedMacIfAvailable()
            }
        }
        newBrowser.stateUpdateHandler = { [weak self, weak newBrowser] newState in
            guard let self, let newBrowser else { return }
            self.queue.async { [self] in
                guard self.browser === newBrowser else { return }
                switch newState {
                case .ready:
                    if self.connection == nil { self.publishState(.searching) }
                case .failed(let error):
                    self.publishError("Mac discovery failed: \(error.localizedDescription)")
                case .cancelled:
                    if self.connection == nil { self.publishState(.off) }
                default:
                    break
                }
            }
        }
        browser = newBrowser
        newBrowser.start(queue: queue)
        publishState(.searching)
        #endif
    }

    private func connectToSavedMacIfAvailable() {
        #if os(iOS)
        guard reconnectEnabled,
              connection == nil,
              pendingConnection == nil,
              let credential,
              let endpoint = peerEndpoints[credential.serviceID] else { return }
        startConnection(to: endpoint, peerName: "Rivune Mac")
        #endif
    }

    private func startConnection(to endpoint: NWEndpoint, peerName: String) {
        guard let credential else { return }
        let oldPending = pendingConnection
        pendingConnection = nil
        oldPending?.cancel()
        let oldConnection = connection
        connection = nil
        oldConnection?.cancel()
        receiveBuffer.removeAll(keepingCapacity: false)
        let newConnection = NWConnection(to: endpoint, using: Self.parameters(for: credential))
        pendingConnection = newConnection
        startConnection(newConnection, peerName: peerName)
    }

    private func startConnection(_ candidate: NWConnection, peerName: String) {
        publishState(.connecting(peerName))
        candidate.stateUpdateHandler = { [weak self, weak candidate] newState in
            guard let self, let candidate else { return }
            self.queue.async { [self] in
                guard self.pendingConnection === candidate || self.connection === candidate else { return }
                switch newState {
                case .ready:
                    self.pendingConnection = nil
                    self.connection = candidate
                    self.publishState(.connected(peerName))
                    self.onConnectionChangedOnMain(true)
                    self.receiveNext(on: candidate)
                    #if os(macOS)
                    if self.pendingPairingExpiresAt != nil {
                        self.completeInitialPairing(on: candidate)
                    }
                    #endif
                case .failed(let error):
                    if self.pendingConnection === candidate { self.pendingConnection = nil }
                    if self.connection === candidate { self.connection = nil }
                    #if os(macOS)
                    if self.pendingPairingExpiresAt != nil {
                        self.pendingReconnectCredential = nil
                    }
                    #endif
                    self.publishError("Secure connection failed: \(error.localizedDescription)")
                    self.publishDisconnectedState()
                case .cancelled:
                    if self.pendingConnection === candidate { self.pendingConnection = nil }
                    if self.connection === candidate { self.connection = nil }
                    #if os(macOS)
                    if self.pendingPairingExpiresAt != nil {
                        self.pendingReconnectCredential = nil
                    }
                    #endif
                    self.publishDisconnectedState()
                default:
                    break
                }
            }
        }
        candidate.start(queue: queue)

        queue.asyncAfter(deadline: .now() + 10) { [weak self, weak candidate] in
            guard let self, let candidate,
                  pendingConnection === candidate else { return }
            pendingConnection = nil
            candidate.cancel()
            publishError("Secure connection timed out. Check that both devices are on the same network.")
            publishDisconnectedState()
        }
    }

    #if os(macOS)
    private func completeInitialPairing(on candidate: NWConnection) {
        guard connection === candidate,
              let temporaryCredential = credential,
              let expiry = pendingPairingExpiresAt,
              expiry > Date(),
              pendingReconnectCredential == nil,
              let identity = Self.randomData(count: 24),
              let secret = Self.randomData(count: 32) else {
            revokePairingOnQueue()
            publishError("Rivune could not finish secure pairing. Start again for a fresh code.")
            return
        }

        let durableCredential = BridgeCredential(
            serviceID: temporaryCredential.serviceID,
            identity: identity,
            secret: secret
        )
        pendingReconnectCredential = durableCredential
        let payload = BridgeReconnectCredential(
            serviceID: durableCredential.serviceID,
            identity: durableCredential.identity,
            secret: durableCredential.secret
        )

        send(.pairingCredential(payload), on: candidate) { [weak self, weak candidate] error in
            guard let self, let candidate, let error else { return }
            self.queue.async { [self] in
                guard self.connection === candidate, self.pendingReconnectCredential != nil else { return }
                self.revokePairingOnQueue()
                self.publishError("The iPhone could not receive its secure reconnect credential: \(error.localizedDescription)")
            }
        }
    }

    private func finishInitialPairing(on candidate: NWConnection) {
        guard connection === candidate,
              pendingPairingExpiresAt != nil,
              let durableCredential = pendingReconnectCredential,
              BridgeKeychain.save(durableCredential, account: keychainAccount) else {
            revokePairingOnQueue()
            publishError("Rivune could not save the paired iPhone credential in Keychain.")
            return
        }

        credential = durableCredential
        pendingReconnectCredential = nil
        pendingPairingExpiresAt = nil
        pairingGeneration = UUID()
        DispatchQueue.main.async { [weak self] in
            self?.pairingCode = nil
            self?.pairingExpiresAt = nil
            self?.hasSavedPairing = true
            self?.lastError = nil
        }

        let oldListener = listener
        listener = nil
        oldListener?.cancel()
        connection = nil
        receiveBuffer.removeAll(keepingCapacity: false)
        candidate.cancel()
        onConnectionChangedOnMain(false)
        publishState(.searching)
        startListener()
    }
    #endif

    #if os(iOS)
    private func acceptReconnectCredential(
        _ payload: BridgeReconnectCredential,
        on candidate: NWConnection
    ) {
        guard connection === candidate,
              let temporaryCredential = credential,
              payload.serviceID == temporaryCredential.serviceID,
              UUID(uuidString: payload.serviceID) != nil,
              payload.identity.count >= 16,
              payload.secret.count == 32 else {
            publishError("The Mac sent an invalid reconnect credential.")
            candidate.cancel()
            return
        }

        let durableCredential = BridgeCredential(
            serviceID: payload.serviceID,
            identity: payload.identity,
            secret: payload.secret
        )
        guard BridgeKeychain.save(durableCredential, account: keychainAccount) else {
            publishError("Rivune could not save the Mac pairing in Keychain.")
            candidate.cancel()
            return
        }

        credential = durableCredential
        DispatchQueue.main.async { [weak self] in
            self?.hasSavedPairing = true
            self?.lastError = nil
        }
        send(.pairingAccepted(), on: candidate) { [weak self] error in
            if error != nil {
                self?.publishError("Rivune paired, but the Mac did not receive confirmation.")
            }
        }
    }
    #endif

    private func receiveNext(on candidate: NWConnection) {
        candidate.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1_024) { [weak self, weak candidate] data, _, isComplete, error in
            guard let self, let candidate else { return }
            self.queue.async { [self] in
                guard self.connection === candidate else { return }
                if let data { self.receiveBuffer.append(data) }
                self.parseFrames(on: candidate)

                if error != nil || isComplete {
                    candidate.cancel()
                    return
                }
                if self.connection === candidate {
                    self.receiveNext(on: candidate)
                }
            }
        }
    }

    private func parseFrames(on candidate: NWConnection) {
        while receiveBuffer.count >= MemoryLayout<UInt32>.size {
            let lengthData = receiveBuffer.prefix(MemoryLayout<UInt32>.size)
            let length = lengthData.withUnsafeBytes { rawBuffer in
                rawBuffer.loadUnaligned(as: UInt32.self).bigEndian
            }
            guard length > 0, length <= Self.maximumMessageBytes else {
                publishError("The paired device sent an invalid message.")
                connection?.cancel()
                return
            }
            let frameLength = MemoryLayout<UInt32>.size + Int(length)
            guard receiveBuffer.count >= frameLength else { return }

            let payload = receiveBuffer.subdata(in: MemoryLayout<UInt32>.size..<frameLength)
            receiveBuffer.removeSubrange(0..<frameLength)
            guard let envelope = try? JSONDecoder().decode(BridgeEnvelope.self, from: payload),
                  envelope.protocolVersion == BridgeEnvelope.currentProtocolVersion else {
                continue
            }

            switch envelope.kind {
            case .pairingCredential:
                #if os(iOS)
                if let payload = envelope.pairingCredential {
                    acceptReconnectCredential(payload, on: candidate)
                }
                #endif
                continue
            case .pairingAccepted:
                #if os(macOS)
                finishInitialPairing(on: candidate)
                #endif
                continue
            default:
                break
            }
            DispatchQueue.main.async { [weak self] in
                self?.onEnvelope?(envelope)
            }
        }
    }

    private func publishDisconnectedState() {
        receiveBuffer.removeAll(keepingCapacity: false)
        onConnectionChangedOnMain(false)
        #if os(macOS)
        publishState(listener != nil ? .searching : .off)
        #else
        publishState(credential != nil ? .searching : .off)
        if reconnectEnabled, credential != nil {
            queue.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                guard let self,
                      reconnectEnabled,
                      connection == nil,
                      pendingConnection == nil else { return }
                connectToSavedMacIfAvailable()
            }
        }
        #endif
    }

    private func stopTransport(clearPairing: Bool) {
        listener?.cancel()
        listener = nil
        browser?.cancel()
        browser = nil
        pendingConnection?.cancel()
        pendingConnection = nil
        connection?.cancel()
        connection = nil
        receiveBuffer.removeAll(keepingCapacity: false)
        if clearPairing {
            reconnectEnabled = false
            credential = nil
            pendingPairingExpiresAt = nil
            pendingReconnectCredential = nil
            BridgeKeychain.delete(account: keychainAccount)
        }
        publishAdvertising(false)
        publishState(.off)
        onConnectionChangedOnMain(false)
    }

    private func revokePairingOnQueue() {
        pairingGeneration = UUID()
        stopTransport(clearPairing: true)
        UserDefaults.standard.set(false, forKey: "rivune.bridgeAdvertising")
        DispatchQueue.main.async { [weak self] in
            self?.hasSavedPairing = false
            self?.pairingCode = nil
            self?.pairingExpiresAt = nil
            self?.discoveredPeers = []
        }
    }

    private func publishState(_ newState: BridgeLinkState) {
        DispatchQueue.main.async { [weak self] in
            self?.state = newState
        }
    }

    private func publishAdvertising(_ value: Bool) {
        DispatchQueue.main.async { [weak self] in
            self?.isAdvertising = value
        }
    }

    private func publishError(_ message: String) {
        DispatchQueue.main.async { [weak self] in
            self?.lastError = message
        }
    }

    private func onConnectionChangedOnMain(_ connected: Bool) {
        DispatchQueue.main.async { [weak self] in
            self?.onConnectionChanged?(connected)
        }
    }

    private static func frame(_ payload: Data) -> Data {
        var length = UInt32(payload.count).bigEndian
        var frame = Data(bytes: &length, count: MemoryLayout<UInt32>.size)
        frame.append(payload)
        return frame
    }

    private static func parameters(for credential: BridgeCredential) -> NWParameters {
        let tls = NWProtocolTLS.Options()
        let options = tls.securityProtocolOptions
        sec_protocol_options_set_min_tls_protocol_version(options, .TLSv12)
        sec_protocol_options_set_max_tls_protocol_version(options, .TLSv12)
        if let rawSuite = UInt16(exactly: TLS_PSK_WITH_AES_128_GCM_SHA256),
           let suite = tls_ciphersuite_t(rawValue: rawSuite) {
            sec_protocol_options_append_tls_ciphersuite(options, suite)
        }
        let keyData: DispatchData = credential.secret.withUnsafeBytes { DispatchData(bytes: $0) }
        let identityData: DispatchData = credential.identity.withUnsafeBytes { DispatchData(bytes: $0) }
        sec_protocol_options_add_pre_shared_key(
            options,
            keyData as dispatch_data_t,
            identityData as dispatch_data_t
        )

        let parameters = NWParameters(tls: tls, tcp: NWProtocolTCP.Options())
        parameters.includePeerToPeer = true
        return parameters
    }

    private static func randomData(count: Int) -> Data? {
        var data = Data(count: count)
        let status = data.withUnsafeMutableBytes { buffer in
            SecRandomCopyBytes(kSecRandomDefault, count, buffer.baseAddress!)
        }
        return status == errSecSuccess ? data : nil
    }

    private static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    private static func dataFromBase64URL(_ value: String) -> Data? {
        var normalized = value
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = normalized.count % 4
        if remainder != 0 {
            normalized += String(repeating: "=", count: 4 - remainder)
        }
        return Data(base64Encoded: normalized)
    }
}

private enum BridgeKeychain {
    static func load(account: String) -> BridgeCredential? {
        for service in RivuneBrand.keychainServiceCandidates {
            guard let credential = load(account: account, service: service) else { continue }
            if service != RivuneBrand.keychainService {
                // Copy forward without deleting the legacy item. Paired devices
                // keep working even if a migration write is temporarily unavailable.
                _ = save(credential, account: account, service: RivuneBrand.keychainService)
            }
            return credential
        }
        return nil
    }

    private static func load(account: String, service: String) -> BridgeCredential? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return try? JSONDecoder().decode(BridgeCredential.self, from: data)
    }

    static func save(_ credential: BridgeCredential, account: String) -> Bool {
        save(credential, account: account, service: RivuneBrand.keychainService)
    }

    private static func save(
        _ credential: BridgeCredential,
        account: String,
        service: String
    ) -> Bool {
        guard let data = try? JSONEncoder().encode(credential) else { return false }
        let base: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let updateStatus = SecItemUpdate(base as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess { return true }
        guard updateStatus == errSecItemNotFound else { return false }
        return SecItemAdd(base.merging(attributes) { _, new in new } as CFDictionary, nil) == errSecSuccess
    }

    static func delete(account: String) {
        // A deliberate unpair/credential rotation must revoke both identities;
        // otherwise the legacy item could restore a secret the user removed.
        for service in RivuneBrand.keychainServiceCandidates {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account
            ]
            SecItemDelete(query as CFDictionary)
        }
    }
}
