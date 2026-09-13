import XCTest
@testable import CrossPlatformProviderCLI

private struct MemoryFileSystem: FileSystemChecking {
    let executablePaths: Set<String>
    func isExecutableFile(at path: String) -> Bool { executablePaths.contains(path) }
}

private final class RecordingLauncher: ProcessLaunching {
    var requests: [CommandRequest] = []
    func run(_ request: CommandRequest) throws -> CommandResult {
        requests.append(request)
        return .init(exitStatus: 0, standardOutput: Data("ok".utf8))
    }
}

final class CrossPlatformProviderCLITests: XCTestCase {
    private let armMac = HostDescriptor(platform: .macOS, architecture: .arm64)
    private let x64Windows = HostDescriptor(platform: .windowsNative, architecture: .x86_64)

    func testPOSIXPathDiscoveryPreservesDirectorySpaces() {
        let expected = "/Applications/Provider Tools/codex"
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "codex", host: armMac, environment: ["PATH": "/usr/bin:/Applications/Provider Tools"]),
            fileSystem: MemoryFileSystem(executablePaths: [expected])
        )
        XCTAssertEqual(outcome, .found(expected))
    }

    func testWindowsPathAndPATHEXTDiscovery() {
        let expected = "C:\\Program Files\\Claude\\claude.EXE"
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "claude", host: x64Windows, environment: ["PATH": "C:\\Windows;C:\\Program Files\\Claude", "PATHEXT": ".EXE;.CMD"]),
            fileSystem: MemoryFileSystem(executablePaths: [expected])
        )
        XCTAssertEqual(outcome, .found(expected))
    }

    func testExplicitWindowsPathWithSpacesIsNotSplit() {
        let expected = "C:\\AI Tools\\codex.exe"
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "codex", host: x64Windows, environment: [:], explicitPath: expected),
            fileSystem: MemoryFileSystem(executablePaths: [expected])
        )
        XCTAssertEqual(outcome, .found(expected))
    }

    func testWSLUsesPOSIXPathRulesRatherThanWindowsRules() {
        let wsl = HostDescriptor(platform: .windowsWSL, architecture: .x86_64)
        let expected = "/home/user/.local/bin/claude"
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "claude", host: wsl, environment: ["PATH": "/usr/bin:/home/user/.local/bin", "PATHEXT": ".EXE"]),
            fileSystem: MemoryFileSystem(executablePaths: [expected])
        )
        XCTAssertEqual(outcome, .found(expected))
    }

    func testEmptyPATHReturnsActionableMissingFeedback() {
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "codex", host: armMac, environment: [:]),
            fileSystem: MemoryFileSystem(executablePaths: [])
        )
        guard case .missing(let message) = outcome else { return XCTFail("Expected missing") }
        XCTAssertTrue(message.contains("exact executable path"))
    }

    func testUnknownHostFailsClosed() {
        let host = HostDescriptor(platform: .unknown, architecture: .unknown)
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "codex", host: host, environment: ["PATH": "/usr/bin"]),
            fileSystem: MemoryFileSystem(executablePaths: ["/usr/bin/codex"])
        )
        guard case .unsupported = outcome else { return XCTFail("Expected unsupported") }
    }

    func testUnsafeExecutableNameIsRejected() {
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "../codex", host: armMac, environment: ["PATH": "/usr/bin"]),
            fileSystem: MemoryFileSystem(executablePaths: [])
        )
        XCTAssertEqual(outcome, .unsupported(message: "The provider executable name is invalid."))
    }

    func testArgumentsRemainDistinctWithoutShellQuoting() throws {
        let launcher = RecordingLauncher()
        let request = CommandRequest(
            host: armMac,
            executablePath: "/Applications/AI Tools/codex",
            arguments: ["exec", "--model", "model with spaces", "$(touch /tmp/never-run)"],
            standardInput: Data("prompt".utf8),
            workingDirectory: "/tmp/project with spaces",
            environment: ["PATH": "/usr/bin"]
        )
        _ = try ProviderRunner(launcher: launcher).run(request, support: .init(status: .proposedAdapter, explanation: "fixture"))
        XCTAssertEqual(launcher.requests.single?.arguments, request.arguments)
        XCTAssertEqual(launcher.requests.single?.executablePath, request.executablePath)
    }

    func testUnverifiedSupportNeverLaunches() {
        let launcher = RecordingLauncher()
        let request = CommandRequest(host: armMac, executablePath: "/usr/bin/codex", arguments: [], standardInput: nil, workingDirectory: nil, environment: [:])
        XCTAssertThrowsError(try ProviderRunner(launcher: launcher).run(request, support: .init(status: .unverified, explanation: "unsupported")))
        XCTAssertTrue(launcher.requests.isEmpty)
    }

    func testEnvironmentPolicyDoesNotForwardCredentials() {
        let output = EnvironmentPolicy.sanitized([
            "PATH": "/usr/bin", "HOME": "/Users/test", "OPENAI_API_KEY": "secret",
            "ANTHROPIC_API_KEY": "secret", "CLAUDE_CODE_OAUTH_TOKEN": "secret", "CUSTOM_SECRET": "secret"
        ])
        XCTAssertEqual(output, ["PATH": "/usr/bin", "HOME": "/Users/test"])
    }

    func testRunnerEnforcesEnvironmentSanitization() throws {
        let launcher = RecordingLauncher()
        let request = CommandRequest(host: armMac, executablePath: "/usr/bin/codex", arguments: [], standardInput: nil, workingDirectory: nil,
            environment: ["PATH": "/usr/bin", "OPENAI_API_KEY": "fictional", "ANTHROPIC_API_KEY": "fictional"])
        _ = try ProviderRunner(launcher: launcher).run(request, support: .init(status: .proposedAdapter, explanation: "fixture"))
        XCTAssertEqual(launcher.requests.single?.environment, ["PATH": "/usr/bin"])
    }

    func testRunnerRejectsRelativeAndDriveRelativePaths() {
        let launcher = RecordingLauncher()
        let relative = CommandRequest(host: armMac, executablePath: "bin/codex", arguments: [], standardInput: nil, workingDirectory: nil, environment: [:])
        XCTAssertThrowsError(try ProviderRunner(launcher: launcher).run(relative, support: .init(status: .proposedAdapter, explanation: "fixture")))
        let driveRelative = CommandRequest(host: x64Windows, executablePath: "C:tools\\codex.exe", arguments: [], standardInput: nil, workingDirectory: nil, environment: [:])
        XCTAssertThrowsError(try ProviderRunner(launcher: launcher).run(driveRelative, support: .init(status: .proposedAdapter, explanation: "fixture")))
        XCTAssertTrue(launcher.requests.isEmpty)
    }

    func testWindowsEnvironmentKeysAreCaseInsensitive() {
        let expected = "C:\\Tools\\codex.EXE"
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "codex", host: x64Windows, environment: ["Path": "relative;C:\\Tools", "PathExt": ".EXE;.CMD"]),
            fileSystem: MemoryFileSystem(executablePaths: [expected])
        )
        XCTAssertEqual(outcome, .found(expected))
    }

    func testWindowsScriptWrapperIsReportedButNotLaunched() {
        let script = "C:\\Tools\\codex.CMD"
        let outcome = ExecutableDiscovery.resolve(
            .init(executable: "codex", host: x64Windows, environment: ["PATH": "C:\\Tools", "PATHEXT": ".CMD;.EXE"]),
            fileSystem: MemoryFileSystem(executablePaths: [script])
        )
        guard case .unsupported(let message) = outcome else { return XCTFail("Expected unsupported script wrapper") }
        XCTAssertTrue(message.contains("native .exe"))
    }

    func testArchitectureOutsideVendorDocumentationIsUnverified() {
        let host = HostDescriptor(platform: .linux, architecture: .unknown)
        XCTAssertEqual(SupportMatrix.status(provider: .claude, host: host).status, .unverified)
    }

    func testBothWindowsRoutesRemainDistinctAndDocumented() {
        let native = SupportMatrix.status(provider: .codex, host: x64Windows)
        let wsl = SupportMatrix.status(provider: .codex, host: .init(platform: .windowsWSL, architecture: .x86_64))
        XCTAssertEqual(native.status, .vendorDocumented)
        XCTAssertEqual(wsl.status, .vendorDocumented)
    }
}

private extension Array {
    var single: Element? { count == 1 ? self[0] : nil }
}
