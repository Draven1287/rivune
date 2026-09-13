import Foundation

public enum HostPlatform: String, Codable, Sendable {
    case macOS, linux, windowsNative, windowsWSL, unknown

    public var pathSeparator: Character {
        self == .windowsNative ? ";" : ":"
    }

    public var usesWindowsExtensions: Bool { self == .windowsNative }
}

public enum CPUArchitecture: String, Codable, Sendable {
    case arm64, x86_64, unknown
}

public struct HostDescriptor: Equatable, Codable, Sendable {
    public let platform: HostPlatform
    public let architecture: CPUArchitecture

    public init(platform: HostPlatform, architecture: CPUArchitecture) {
        self.platform = platform
        self.architecture = architecture
    }
}

public enum ProviderKind: String, Codable, Sendable {
    case codex, claude
}

public enum VendorSupport: String, Codable, Sendable {
    case vendorDocumented
    case proposedAdapter
    case unverified
}

public struct ProviderSupport: Equatable, Codable, Sendable {
    public let status: VendorSupport
    public let explanation: String

    public init(status: VendorSupport, explanation: String) {
        self.status = status
        self.explanation = explanation
    }
}

public enum SupportMatrix {
    public static func status(provider: ProviderKind, host: HostDescriptor) -> ProviderSupport {
        guard host.architecture == .arm64 || host.architecture == .x86_64 else {
            return .init(status: .unverified, explanation: "This CPU architecture is not covered by the reviewed vendor documentation.")
        }
        switch (provider, host.platform) {
        case (.codex, .macOS), (.codex, .linux), (.codex, .windowsNative), (.codex, .windowsWSL):
            return .init(status: .vendorDocumented, explanation: "The vendor documents this host route; Rivune has not validated it on this machine.")
        case (.claude, .macOS), (.claude, .linux), (.claude, .windowsNative), (.claude, .windowsWSL):
            return .init(status: .vendorDocumented, explanation: "The vendor documents this host route; Rivune has not validated it on this machine.")
        default:
            return .init(status: .unverified, explanation: "No reviewed host route is available for this provider and platform.")
        }
    }
}

public struct ProviderDefinition: Equatable, Sendable {
    public let kind: ProviderKind
    public let executableName: String

    public init(kind: ProviderKind, executableName: String) {
        self.kind = kind
        self.executableName = executableName
    }

    public static let codex = Self(kind: .codex, executableName: "codex")
    public static let claude = Self(kind: .claude, executableName: "claude")
}

public protocol FileSystemChecking {
    func isExecutableFile(at path: String) -> Bool
}

public struct LocalFileSystem: FileSystemChecking {
    public init() {}
    public func isExecutableFile(at path: String) -> Bool {
        FileManager.default.isExecutableFile(atPath: path)
    }
}

public struct DiscoveryRequest: Equatable, Sendable {
    public let executable: String
    public let host: HostDescriptor
    public let environment: [String: String]
    public let explicitPath: String?

    public init(executable: String, host: HostDescriptor, environment: [String: String], explicitPath: String? = nil) {
        self.executable = executable
        self.host = host
        self.environment = environment
        self.explicitPath = explicitPath
    }
}

public enum DiscoveryOutcome: Equatable, Sendable {
    case found(String)
    case missing(message: String)
    case unsupported(message: String)
}

public enum ExecutableDiscovery {
    public static func resolve(_ request: DiscoveryRequest, fileSystem: FileSystemChecking) -> DiscoveryOutcome {
        guard isSafeExecutableName(request.executable) else {
            return .unsupported(message: "The provider executable name is invalid.")
        }
        if let explicitPath = request.explicitPath {
            guard isSafeExplicitPath(explicitPath, platform: request.host.platform) else {
                return .unsupported(message: "The configured executable path is invalid.")
            }
            guard isSupportedDirectExecutable(explicitPath, platform: request.host.platform) else {
                return .unsupported(message: "Native Windows providers must use a direct .exe or .com executable; script wrappers are not supported by this no-shell adapter.")
            }
            return fileSystem.isExecutableFile(at: explicitPath)
                ? .found(explicitPath)
                : .missing(message: "The configured provider executable was not found or is not executable.")
        }
        guard request.host.platform != .unknown else {
            return .unsupported(message: "Provider CLI discovery is not supported on this operating system.")
        }
        let path = environmentValue("PATH", in: request.environment, platform: request.host.platform) ?? ""
        let directories = splitPath(path, separator: request.host.platform.pathSeparator)
            .filter { isAbsoluteDirectory($0, platform: request.host.platform) }
        let extensions = executableExtensions(host: request.host, environment: request.environment)
        for directory in directories {
            for suffix in extensions {
                let candidate = join(directory: directory, file: request.executable + suffix, platform: request.host.platform)
                if fileSystem.isExecutableFile(at: candidate) { return .found(candidate) }
            }
        }
        if request.host.platform == .windowsNative {
            for directory in directories {
                for suffix in scriptExtensions(environment: request.environment) {
                    let candidate = join(directory: directory, file: request.executable + suffix, platform: request.host.platform)
                    if fileSystem.isExecutableFile(at: candidate) {
                        return .unsupported(message: "A provider script wrapper was found, but this no-shell adapter requires a native .exe or .com executable.")
                    }
                }
            }
        }
        return .missing(message: "The provider CLI was not found in this app's PATH. Configure its exact executable path or install it first.")
    }

    static func splitPath(_ value: String, separator: Character) -> [String] {
        var seen = Set<String>()
        return value.split(separator: separator, omittingEmptySubsequences: true)
            .map(String.init)
            .filter { !$0.contains("\0") && !$0.contains("\n") && seen.insert($0).inserted }
    }

    static func executableExtensions(host: HostDescriptor, environment: [String: String]) -> [String] {
        guard host.platform.usesWindowsExtensions else { return [""] }
        let raw = environmentValue("PATHEXT", in: environment, platform: host.platform) ?? ".COM;.EXE;.BAT;.CMD"
        let values = raw.split(separator: ";").map(String.init).filter {
            [".COM", ".EXE"].contains($0.uppercased())
        }
        var seen = Set<String>()
        return (values + values.map { $0.lowercased() }).filter { seen.insert($0.lowercased()).inserted }
    }

    static func scriptExtensions(environment: [String: String]) -> [String] {
        let raw = environmentValue("PATHEXT", in: environment, platform: .windowsNative) ?? ".COM;.EXE;.BAT;.CMD"
        var seen = Set<String>()
        return raw.split(separator: ";").map(String.init).filter {
            [".BAT", ".CMD", ".PS1"].contains($0.uppercased()) && seen.insert($0.lowercased()).inserted
        }
    }

    static func environmentValue(_ name: String, in environment: [String: String], platform: HostPlatform) -> String? {
        if platform == .windowsNative {
            let matches = environment.filter { $0.key.caseInsensitiveCompare(name) == .orderedSame }
            return matches.count == 1 ? matches.first?.value : nil
        }
        return environment[name]
    }

    static func isAbsoluteDirectory(_ value: String, platform: HostPlatform) -> Bool {
        switch platform {
        case .windowsNative:
            return isRootedWindowsPath(value)
        case .macOS, .linux, .windowsWSL:
            return value.hasPrefix("/")
        case .unknown:
            return false
        }
    }

    static func join(directory: String, file: String, platform: HostPlatform) -> String {
        let slash = platform == .windowsNative ? "\\" : "/"
        return directory.hasSuffix("/") || directory.hasSuffix("\\") ? directory + file : directory + slash + file
    }

    static func isSafeExecutableName(_ value: String) -> Bool {
        guard !value.isEmpty, value.count <= 128, !value.contains("/"), !value.contains("\\"), !value.contains("\0"), !value.contains("\n") else { return false }
        return value.unicodeScalars.allSatisfy {
            CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.+")).contains($0)
        }
    }

    static func isSafeExplicitPath(_ value: String, platform: HostPlatform) -> Bool {
        guard !value.isEmpty, value.utf8.count <= 2_048, !value.contains("\0"), !value.contains("\n") else { return false }
        switch platform {
        case .windowsNative:
            return isRootedWindowsPath(value)
        case .macOS, .linux, .windowsWSL:
            return value.hasPrefix("/")
        case .unknown:
            return false
        }
    }

    static func isSupportedDirectExecutable(_ value: String, platform: HostPlatform) -> Bool {
        guard platform == .windowsNative else { return true }
        let lowercased = value.lowercased()
        return lowercased.hasSuffix(".exe") || lowercased.hasSuffix(".com")
    }

    static func isRootedWindowsPath(_ value: String) -> Bool {
        let characters = Array(value)
        if characters.count >= 3,
           characters[0].isLetter,
           characters[1] == ":",
           characters[2] == "\\" || characters[2] == "/" {
            return true
        }
        return value.hasPrefix("\\\\") && value.dropFirst(2).contains("\\")
    }
}

public struct CommandRequest: Equatable, Sendable {
    public let host: HostDescriptor
    public let executablePath: String
    public let arguments: [String]
    public let standardInput: Data?
    public let workingDirectory: String?
    public let environment: [String: String]

    public init(host: HostDescriptor, executablePath: String, arguments: [String], standardInput: Data?, workingDirectory: String?, environment: [String: String]) {
        self.host = host
        self.executablePath = executablePath
        self.arguments = arguments
        self.standardInput = standardInput
        self.workingDirectory = workingDirectory
        self.environment = environment
    }
}

public struct CommandResult: Equatable, Sendable {
    public let exitStatus: Int32
    public let standardOutput: Data
    public let standardError: Data

    public init(exitStatus: Int32, standardOutput: Data = Data(), standardError: Data = Data()) {
        self.exitStatus = exitStatus
        self.standardOutput = standardOutput
        self.standardError = standardError
    }
}

public protocol ProcessLaunching {
    func run(_ request: CommandRequest) throws -> CommandResult
}

public enum RunnerError: Error, Equatable {
    case invalidExecutablePath
    case invalidArgument
    case unsupported(String)
}

public struct ProviderRunner {
    private let launcher: ProcessLaunching

    public init(launcher: ProcessLaunching) { self.launcher = launcher }

    public func run(_ request: CommandRequest, support: ProviderSupport) throws -> CommandResult {
        guard support.status != .unverified else { throw RunnerError.unsupported(support.explanation) }
        guard ExecutableDiscovery.isSafeExplicitPath(request.executablePath, platform: request.host.platform) else {
            throw RunnerError.invalidExecutablePath
        }
        guard ExecutableDiscovery.isSupportedDirectExecutable(request.executablePath, platform: request.host.platform) else {
            throw RunnerError.unsupported("Native Windows script wrappers are not supported by this no-shell adapter; configure a direct .exe or .com executable.")
        }
        guard request.arguments.allSatisfy({ !$0.contains("\0") }) else { throw RunnerError.invalidArgument }
        let sanitizedRequest = CommandRequest(
            host: request.host,
            executablePath: request.executablePath,
            arguments: request.arguments,
            standardInput: request.standardInput,
            workingDirectory: request.workingDirectory,
            environment: EnvironmentPolicy.sanitized(request.environment, platform: request.host.platform)
        )
        return try launcher.run(sanitizedRequest)
    }
}

public enum EnvironmentPolicy {
    private static let allowed = Set(["PATH", "PATHEXT", "HOME", "USERPROFILE", "TMPDIR", "TEMP", "LANG", "LC_ALL", "TERM", "NO_COLOR"])

    public static func sanitized(_ source: [String: String], platform: HostPlatform = .macOS) -> [String: String] {
        allowed.reduce(into: [:]) { result, canonicalKey in
            let value: String?
            if platform == .windowsNative {
                value = ExecutableDiscovery.environmentValue(canonicalKey, in: source, platform: platform)
            } else {
                value = source[canonicalKey]
            }
            guard let value, !value.contains("\0"), !value.contains("\n") else { return }
            result[canonicalKey] = value
        }
    }
}
