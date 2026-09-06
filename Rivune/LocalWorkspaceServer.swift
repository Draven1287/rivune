import Foundation
import SwiftUI
#if os(macOS)
import AppKit
@preconcurrency import Network
import Security
#endif

struct LocalWorkspaceRequest: Sendable {
    let method: String
    let path: String
    let body: Data
}

struct LocalWorkspaceResponse: Sendable {
    let status: Int
    let jsonData: Data

    init(status: Int = 200, jsonData: Data) {
        self.status = status
        self.jsonData = jsonData
    }

    static func error(_ status: Int, _ message: String) -> Self {
        let data = (try? JSONSerialization.data(withJSONObject: ["error": message])) ?? Data("{}".utf8)
        return Self(status: status, jsonData: data)
    }
}

struct LocalWorkspaceHTTPPolicy: Sendable {
    static let defaultOrigins: Set<String> = ["http://127.0.0.1:3187", "http://localhost:3187"]
    let port: UInt16
    let token: String
    var allowedOrigins: Set<String> = Self.defaultOrigins
    var maximumHeaderBytes: Int = 16 * 1_024
    var maximumBodyBytes: Int = 256 * 1_024
}

struct LocalWorkspaceHTTPError: Error, Equatable, Sendable {
    let status: Int
    let message: String
    var origin: String?
}

struct LocalWorkspaceParsedRequest: Sendable {
    let request: LocalWorkspaceRequest
    let origin: String
    let isPreflight: Bool
    let allowsPrivateNetwork: Bool
}

/// A deliberately small HTTP/1.1 subset: one framed request per connection, no
/// forwarding, upgrade, transfer encoding, or general-purpose filesystem routes.
enum LocalWorkspaceHTTPParser {
    static func parse(_ data: Data, policy: LocalWorkspaceHTTPPolicy) throws -> LocalWorkspaceParsedRequest? {
        guard data.count <= policy.maximumHeaderBytes + policy.maximumBodyBytes else {
            throw failure(413, "Request is too large.")
        }
        guard let separator = data.range(of: Data([13, 10, 13, 10])) else {
            if data.count > policy.maximumHeaderBytes { throw failure(431, "Request headers are too large.") }
            return nil
        }
        let headerLength = data.distance(from: data.startIndex, to: separator.upperBound)
        guard headerLength <= policy.maximumHeaderBytes else { throw failure(431, "Request headers are too large.") }
        guard let head = String(data: data[..<separator.lowerBound], encoding: .ascii) else {
            throw failure(400, "Invalid request headers.")
        }
        let lines = head.components(separatedBy: "\r\n")
        guard let first = lines.first, lines.count <= 65 else { throw failure(400, "Invalid request headers.") }
        let parts = first.split(separator: " ", omittingEmptySubsequences: false)
        guard parts.count == 3, parts[2] == "HTTP/1.1", !parts[0].isEmpty, !parts[1].isEmpty else {
            throw failure(400, "Expected an HTTP/1.1 request.")
        }
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            guard let colon = line.firstIndex(of: ":") else { throw failure(400, "Invalid request header.") }
            let name = String(line[..<colon]).lowercased()
            guard !name.isEmpty, name.utf8.allSatisfy(isHeaderNameByte), headers[name] == nil else {
                throw failure(400, "Invalid or repeated request header.")
            }
            let rawValue = line[line.index(after: colon)...]
            guard rawValue.utf8.allSatisfy({ $0 == 9 || ($0 >= 32 && $0 < 127) }) else {
                throw failure(400, "Invalid request header value.")
            }
            headers[name] = rawValue.trimmingCharacters(in: CharacterSet(charactersIn: " \t"))
        }

        // An origin is required even for preflight. CORS is an additional check,
        // never a substitute for the bearer token on actual API requests.
        guard let origin = headers["origin"], policy.allowedOrigins.contains(origin) else {
            throw failure(403, "This browser origin is not allowed.")
        }
        do {
            guard let host = headers["host"],
                  ["127.0.0.1:\(policy.port)", "localhost:\(policy.port)"].contains(host.lowercased()) else {
                throw failure(403, "Invalid local host.")
            }
            guard headers["transfer-encoding"] == nil, headers["upgrade"] == nil else {
                throw failure(400, "Transfer encoding and upgrades are not supported.")
            }
            guard headers["expect"] == nil else { throw failure(417, "Expect is not supported.") }
            let method = String(parts[0])
            let path = String(parts[1])
            guard path.hasPrefix("/"), path.utf8.allSatisfy({ $0 > 32 && $0 < 127 }),
                  !path.contains(where: { "%?#\\".contains($0) }),
                  !path.split(separator: "/", omittingEmptySubsequences: false).contains(where: { $0 == "." || $0 == ".." }) else {
                throw failure(400, "Only exact workspace paths are accepted.")
            }
            guard let allowedMethod = allowedMethod(for: path) else { throw failure(404, "Workspace route not found.") }
            guard method == allowedMethod || method == "OPTIONS" else { throw failure(405, "Method not allowed.") }

            let contentLength: Int
            if let value = headers["content-length"] {
                guard !value.isEmpty, value.utf8.allSatisfy({ $0 >= 48 && $0 <= 57 }), let length = Int(value) else {
                    throw failure(400, "Invalid content length.")
                }
                contentLength = length
            } else {
                guard method != "POST" else { throw failure(411, "Content length is required.") }
                contentLength = 0
            }
            guard contentLength <= policy.maximumBodyBytes else { throw failure(413, "Request body is too large.") }
            guard method == "POST" || contentLength == 0 else { throw failure(400, "This request cannot have a body.") }

            if method == "OPTIONS" {
                guard headers["access-control-request-method"] == allowedMethod else {
                    throw failure(405, "Preflight method is not allowed.")
                }
                if let requestedHeaders = headers["access-control-request-headers"] {
                    let names = requestedHeaders.lowercased().split(separator: ",", omittingEmptySubsequences: false)
                        .map { $0.trimmingCharacters(in: .whitespaces) }
                    guard names.allSatisfy({ ["authorization", "content-type"].contains($0) }) else {
                        throw failure(403, "Preflight headers are not allowed.")
                    }
                }
                if let privateNetwork = headers["access-control-request-private-network"], privateNetwork != "true" {
                    throw failure(400, "Invalid private network preflight.")
                }
            } else {
                guard let authorization = headers["authorization"], authorization.hasPrefix("Bearer "),
                      constantTimeEqual(String(authorization.dropFirst(7)), policy.token) else {
                    throw failure(401, "Pair this browser with the current connection code.")
                }
                if method == "POST" {
                    let contentType = headers["content-type"]?.lowercased().split(separator: ";", maxSplits: 1).first?
                        .trimmingCharacters(in: .whitespaces)
                    guard contentType == "application/json" else { throw failure(415, "Use an application/json request body.") }
                }
            }
            let receivedLength = data.distance(from: separator.upperBound, to: data.endIndex)
            guard receivedLength <= contentLength else { throw failure(400, "Only one request per connection is supported.") }
            guard receivedLength == contentLength else { return nil }
            return LocalWorkspaceParsedRequest(
                request: LocalWorkspaceRequest(method: method, path: path, body: Data(data[separator.upperBound...])),
                origin: origin,
                isPreflight: method == "OPTIONS",
                allowsPrivateNetwork: headers["access-control-request-private-network"] == "true"
            )
        } catch var error as LocalWorkspaceHTTPError {
            error.origin = origin
            throw error
        }
    }

    static func allowedMethod(for path: String) -> String? {
        if ["/v1/workspace", "/v1/connections"].contains(path) { return "GET" }
        if ["/v1/runs", "/v1/open", "/v1/readiness", "/v1/settings/open", "/v1/connections/scan", "/v1/connections/cli", "/v1/connections/api"].contains(path) { return "POST" }
        let parts = path.split(separator: "/", omittingEmptySubsequences: false)
        if parts.count == 5, parts[0].isEmpty, parts[1] == "v1", parts[2] == "runs", parts[4] == "cancel",
           parts[3].count == 36, UUID(uuidString: String(parts[3])) != nil { return "POST" }
        return nil
    }

    private static func constantTimeEqual(_ supplied: String, _ expected: String) -> Bool {
        let lhs = Array(supplied.utf8), rhs = Array(expected.utf8)
        guard !rhs.isEmpty, lhs.count == rhs.count else { return false }
        var difference: UInt8 = 0
        for index in rhs.indices { difference |= lhs[index] ^ rhs[index] }
        return difference == 0
    }

    private static func isHeaderNameByte(_ byte: UInt8) -> Bool {
        (byte >= 97 && byte <= 122) || (byte >= 48 && byte <= 57) || "!#$%&'*+-.^_`|~".utf8.contains(byte)
    }

    private static func failure(_ status: Int, _ message: String) -> LocalWorkspaceHTTPError {
        LocalWorkspaceHTTPError(status: status, message: message)
    }
}

#if os(macOS)
@MainActor
final class LocalWorkspaceServer: ObservableObject {
    typealias Handler = @MainActor @Sendable (LocalWorkspaceRequest) async -> LocalWorkspaceResponse

    @Published private(set) var isRunning = false
    @Published private(set) var port: UInt16?
    @Published private(set) var pairingToken: String?
    @Published private(set) var error: String?

    private let allowedOrigins: Set<String>
    private let allowsIsolatedStartup: Bool
    private let queue = DispatchQueue(label: "com.rivune.local-workspace", qos: .userInitiated)
    private var listener: NWListener?
    private var handler: Handler?
    private var generation = UUID()
    private var connections: [UUID: Connection] = [:]
    private static let maximumConnections = 16
    private static let maximumResponseBytes = 8 * 1_024 * 1_024

    @MainActor
    private final class Connection {
        let transport: NWConnection
        var buffer = Data()
        var responding = false
        var timeout: Task<Void, Never>?
        var work: Task<Void, Never>?
        init(_ transport: NWConnection) { self.transport = transport }
    }

    init(allowedOrigins: Set<String> = LocalWorkspaceHTTPPolicy.defaultOrigins, allowsIsolatedStartup: Bool = false) {
        self.allowedOrigins = allowedOrigins
        self.allowsIsolatedStartup = allowsIsolatedStartup
    }

    var endpoint: String? { port.map { "http://127.0.0.1:\($0)" } }

    var connectionCode: String? {
        guard isRunning, let endpoint, let pairingToken,
              let data = try? JSONSerialization.data(withJSONObject: ["version": 1, "endpoint": endpoint, "token": pairingToken], options: [.sortedKeys]),
              let value = String(data: data, encoding: .utf8) else { return nil }
        return value
    }

    func start(handler: @escaping Handler) {
        guard !isRunning, listener == nil else { return }
        guard !RivuneLaunchContext.isIsolated || allowsIsolatedStartup else {
            error = "Browser access is disabled in this isolated session."
            return
        }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            error = "Rivune could not create a browser connection code."
            return
        }
        let token = Data(bytes).base64EncodedString().replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
        let newGeneration = UUID()
        generation = newGeneration
        error = nil
        self.handler = handler
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
            parameters.allowLocalEndpointReuse = false
            parameters.includePeerToPeer = false
            let listener = try NWListener(using: parameters, on: .any)
            self.listener = listener
            listener.stateUpdateHandler = { [weak self, weak listener] state in
                Task { @MainActor in
                    guard let self, self.generation == newGeneration else { return }
                    switch state {
                    case .ready:
                        guard let boundPort = listener?.port?.rawValue else {
                            self.stop()
                            self.error = "Rivune could not open a local browser connection."
                            return
                        }
                        self.port = boundPort
                        self.pairingToken = token
                        self.isRunning = true
                    case .failed:
                        self.stop()
                        self.error = "The local browser connection could not start. Try again."
                    default: break
                    }
                }
            }
            listener.newConnectionHandler = { [weak self] connection in
                Task { @MainActor in
                    guard let self, self.generation == newGeneration else { connection.cancel(); return }
                    self.accept(connection)
                }
            }
            listener.start(queue: queue)
        } catch {
            stop()
            self.error = "Rivune could not open a local browser connection."
        }
    }

    func stop() {
        generation = UUID()
        listener?.cancel()
        listener = nil
        for id in Array(connections.keys) { close(id) }
        handler = nil
        isRunning = false
        port = nil
        pairingToken = nil
        error = nil
    }

    private func accept(_ transport: NWConnection) {
        guard isRunning, connections.count < Self.maximumConnections else { transport.cancel(); return }
        let id = UUID()
        let connection = Connection(transport)
        connections[id] = connection
        transport.stateUpdateHandler = { [weak self] state in
            if case .failed = state { Task { @MainActor in self?.close(id) } }
        }
        transport.start(queue: queue)
        connection.timeout = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(15))
            guard !Task.isCancelled, let self, let connection = self.connections[id] else { return }
            connection.work?.cancel()
            self.respond(.error(408, "The browser request timed out."), to: id, origin: nil)
        }
        receive(id)
    }

    private func receive(_ id: UUID) {
        guard let connection = connections[id], !connection.responding else { return }
        connection.transport.receive(minimumIncompleteLength: 1, maximumLength: 16 * 1_024) { [weak self] data, _, complete, error in
            Task { @MainActor in
                guard let self, let connection = self.connections[id], !connection.responding,
                      let port = self.port, let token = self.pairingToken else { return }
                if let data { connection.buffer.append(data) }
                do {
                    let policy = LocalWorkspaceHTTPPolicy(port: port, token: token, allowedOrigins: self.allowedOrigins)
                    if let parsed = try LocalWorkspaceHTTPParser.parse(connection.buffer, policy: policy) {
                        connection.buffer = Data()
                        if parsed.isPreflight {
                            self.respond(LocalWorkspaceResponse(status: 204, jsonData: Data()), to: id,
                                         origin: parsed.origin, privateNetwork: parsed.allowsPrivateNetwork)
                        } else if let handler = self.handler {
                            let generation = self.generation
                            connection.work = Task { @MainActor [weak self] in
                                let response = await handler(parsed.request)
                                guard !Task.isCancelled, let self, self.generation == generation else { return }
                                self.respond(response, to: id, origin: parsed.origin)
                            }
                        } else {
                            self.close(id)
                        }
                    } else if complete || error != nil {
                        self.respond(.error(400, "The browser request was incomplete."), to: id, origin: nil)
                    } else {
                        self.receive(id)
                    }
                } catch let rejection as LocalWorkspaceHTTPError {
                    self.respond(.error(rejection.status, rejection.message), to: id, origin: rejection.origin)
                } catch {
                    self.respond(.error(400, "Invalid browser request."), to: id, origin: nil)
                }
            }
        }
    }

    private func respond(_ response: LocalWorkspaceResponse, to id: UUID, origin: String?, privateNetwork: Bool = false) {
        guard let connection = connections[id], !connection.responding else { return }
        connection.responding = true
        connection.timeout?.cancel()
        let bounded: LocalWorkspaceResponse
        if response.jsonData.count > Self.maximumResponseBytes {
            bounded = .error(500, "The workspace response is too large. Narrow the requested workspace.")
        } else if !(200...599).contains(response.status) {
            bounded = .error(500, "Invalid workspace response.")
        } else {
            bounded = response
        }
        var headers = [
            "HTTP/1.1 \(bounded.status) \(Self.reason(bounded.status))",
            "Content-Type: application/json; charset=utf-8",
            "Content-Length: \(bounded.jsonData.count)",
            "Cache-Control: no-store",
            "X-Content-Type-Options: nosniff",
            "Connection: close",
            "Vary: Origin"
        ]
        if let origin, allowedOrigins.contains(origin) {
            headers += ["Access-Control-Allow-Origin: \(origin)", "Access-Control-Allow-Methods: GET, POST, OPTIONS",
                        "Access-Control-Allow-Headers: Authorization, Content-Type", "Access-Control-Max-Age: 0"]
            if privateNetwork { headers.append("Access-Control-Allow-Private-Network: true") }
        }
        var data = Data((headers.joined(separator: "\r\n") + "\r\n\r\n").utf8)
        data.append(bounded.jsonData)
        connection.timeout = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(2))
            guard !Task.isCancelled else { return }
            self?.close(id)
        }
        connection.transport.send(content: data, completion: .contentProcessed { [weak self] _ in
            Task { @MainActor in self?.close(id) }
        })
    }

    private func close(_ id: UUID) {
        guard let connection = connections.removeValue(forKey: id) else { return }
        connection.timeout?.cancel()
        connection.work?.cancel()
        connection.transport.cancel()
    }

    private static func reason(_ status: Int) -> String {
        switch status {
        case 200: "OK"
        case 201: "Created"
        case 202: "Accepted"
        case 204: "No Content"
        case 400: "Bad Request"
        case 401: "Unauthorized"
        case 403: "Forbidden"
        case 404: "Not Found"
        case 405: "Method Not Allowed"
        case 408: "Request Timeout"
        case 409: "Conflict"
        case 411: "Length Required"
        case 413: "Content Too Large"
        case 415: "Unsupported Media Type"
        case 417: "Expectation Failed"
        case 422: "Unprocessable Content"
        case 429: "Too Many Requests"
        case 431: "Request Header Fields Too Large"
        case 503: "Service Unavailable"
        default: "Workspace Response"
        }
    }
}

struct BrowserConnectionSheet: View {
    @ObservedObject var server: LocalWorkspaceServer
    let onStart: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var copied = false
    private let websiteURL = URL(string: "http://localhost:3187/workspace")!

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "macbook.and.iphone")
                    .font(.system(size: 25, weight: .light))
                    .foregroundStyle(RivunePalette.rivune)
                    .frame(width: 46, height: 46)
                    .background(RivunePalette.control, in: RoundedRectangle(cornerRadius: 13))
                VStack(alignment: .leading, spacing: 5) {
                    Text("Rivune in your browser").font(.system(size: 22, weight: .semibold))
                    Text("One workspace, on this Mac.").foregroundStyle(RivunePalette.secondaryText)
                }
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark") }
                    .buttonStyle(.plain).foregroundStyle(RivunePalette.secondaryText)
                    .accessibilityLabel("Close browser connection")
            }

            Text("Connect the local website to your conversations and models. Browser requests run on this Mac and use your connected model accounts.")
                .font(.system(size: 14)).foregroundStyle(RivunePalette.secondaryText)
                .fixedSize(horizontal: false, vertical: true)

            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    Circle().fill(server.isRunning ? RivunePalette.success : RivunePalette.tertiaryText).frame(width: 7, height: 7)
                    Text(server.isRunning ? "Browser access is on" : "Browser access is off").font(.system(size: 14, weight: .medium))
                    Spacer()
                    if server.isRunning {
                        Button("Stop access") { server.stop(); copied = false }.buttonStyle(.borderless)
                    }
                }
                if let endpoint = server.endpoint, server.isRunning {
                    Text(endpoint).font(.system(size: 12, design: .monospaced)).foregroundStyle(RivunePalette.secondaryText)
                    Text("Copy the connection code, then paste it into the website’s Connect Mac panel.")
                        .font(.system(size: 13)).foregroundStyle(RivunePalette.secondaryText)
                    HStack(spacing: 12) {
                        Button(copied ? "Copied" : "Copy connection code", systemImage: copied ? "checkmark" : "doc.on.doc") {
                            guard let code = server.connectionCode else { return }
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(code, forType: .string)
                            copied = true
                        }
                        .buttonStyle(.borderedProminent).tint(RivunePalette.rivune).foregroundStyle(.black)
                        Link("Open website ↗", destination: websiteURL).foregroundStyle(RivunePalette.primaryText)
                    }
                    Text("Keep this code private. It works only while access is on; restarting creates a new code.")
                        .font(.system(size: 12)).foregroundStyle(RivunePalette.tertiaryText)
                } else {
                    Text("Access stays off until you start it. Only the Rivune website on this computer can connect.")
                        .font(.system(size: 13)).foregroundStyle(RivunePalette.secondaryText)
                    Button("Start browser access", systemImage: "link") { copied = false; onStart() }
                        .buttonStyle(.borderedProminent).tint(RivunePalette.rivune).foregroundStyle(.black)
                }
            }
            .padding(18).background(RivunePalette.surface, in: RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(RivunePalette.hairline, lineWidth: 1))

            if let error = server.error {
                Text(error).font(.system(size: 13)).foregroundStyle(RivunePalette.claude).fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(28).frame(width: 560)
        .foregroundStyle(RivunePalette.primaryText).background(RivunePalette.canvas)
    }
}
#endif
