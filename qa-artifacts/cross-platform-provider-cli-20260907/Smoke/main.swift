import Foundation

struct FS: FileSystemChecking {
    let paths: Set<String>
    func isExecutableFile(at path: String) -> Bool { paths.contains(path) }
}

final class Launcher: ProcessLaunching {
    var requests: [CommandRequest] = []
    func run(_ request: CommandRequest) throws -> CommandResult {
        requests.append(request)
        return .init(exitStatus: 0)
    }
}

private var checks = 0
private func check(_ condition: @autoclosure () -> Bool, _ label: String) {
    guard condition() else {
        FileHandle.standardError.write(Data("FAIL: \(label)\n".utf8))
        exit(1)
    }
    checks += 1
}

let mac = HostDescriptor(platform: .macOS, architecture: .arm64)
let win = HostDescriptor(platform: .windowsNative, architecture: .x86_64)
check(ExecutableDiscovery.resolve(.init(executable: "codex", host: mac, environment: ["PATH": "/usr/bin:/Applications/AI Tools"]), fileSystem: FS(paths: ["/Applications/AI Tools/codex"])) == .found("/Applications/AI Tools/codex"), "POSIX path with spaces")
check(ExecutableDiscovery.resolve(.init(executable: "claude", host: win, environment: ["PATH": "C:\\Windows;C:\\Program Files\\Claude", "PATHEXT": ".EXE;.CMD"]), fileSystem: FS(paths: ["C:\\Program Files\\Claude\\claude.EXE"])) == .found("C:\\Program Files\\Claude\\claude.EXE"), "Windows PATH and PATHEXT")
check(ExecutableDiscovery.resolve(.init(executable: "codex", host: win, environment: [:], explicitPath: "C:\\AI Tools\\codex.exe"), fileSystem: FS(paths: ["C:\\AI Tools\\codex.exe"])) == .found("C:\\AI Tools\\codex.exe"), "explicit Windows path")
let wsl = HostDescriptor(platform: .windowsWSL, architecture: .x86_64)
check(ExecutableDiscovery.resolve(.init(executable: "claude", host: wsl, environment: ["PATH": "/usr/bin:/home/u/.local/bin", "PATHEXT": ".EXE"]), fileSystem: FS(paths: ["/home/u/.local/bin/claude"])) == .found("/home/u/.local/bin/claude"), "WSL POSIX identity")
if case .missing(let message) = ExecutableDiscovery.resolve(.init(executable: "codex", host: mac, environment: [:]), fileSystem: FS(paths: [])) {
    check(message.contains("exact executable path"), "missing feedback")
} else { check(false, "missing feedback outcome") }
if case .unsupported = ExecutableDiscovery.resolve(.init(executable: "codex", host: .init(platform: .unknown, architecture: .unknown), environment: ["PATH": "/usr/bin"]), fileSystem: FS(paths: ["/usr/bin/codex"])) { check(true, "unknown host") } else { check(false, "unknown host") }
check(ExecutableDiscovery.resolve(.init(executable: "../codex", host: mac, environment: ["PATH": "/usr/bin"]), fileSystem: FS(paths: [])) == .unsupported(message: "The provider executable name is invalid."), "unsafe executable")
let launcher = Launcher()
let args = ["exec", "--model", "model with spaces", "$(touch /tmp/never-run)"]
_ = try ProviderRunner(launcher: launcher).run(.init(host: mac, executablePath: "/Applications/AI Tools/codex", arguments: args, standardInput: nil, workingDirectory: "/tmp/a b", environment: ["PATH": "/usr/bin", "OPENAI_API_KEY": "fictional"]), support: .init(status: .proposedAdapter, explanation: "fixture"))
check(launcher.requests.first?.arguments == args, "argument array preservation")
check(launcher.requests.first?.environment == ["PATH": "/usr/bin"], "runner credential stripping")
let blocked = Launcher()
do {
    _ = try ProviderRunner(launcher: blocked).run(.init(host: mac, executablePath: "/usr/bin/codex", arguments: [], standardInput: nil, workingDirectory: nil, environment: [:]), support: .init(status: .unverified, explanation: "unsupported"))
    check(false, "unverified launch block")
} catch { check(blocked.requests.isEmpty, "unverified launch block") }
let env = EnvironmentPolicy.sanitized(["PATH": "/usr/bin", "HOME": "/Users/test", "OPENAI_API_KEY": "secret", "ANTHROPIC_API_KEY": "secret"])
check(env == ["PATH": "/usr/bin", "HOME": "/Users/test"], "credential stripping")
check(SupportMatrix.status(provider: .claude, host: .init(platform: .linux, architecture: .unknown)).status == .unverified, "architecture fail closed")
check(SupportMatrix.status(provider: .codex, host: win).status == .vendorDocumented, "native Windows classification")
check(SupportMatrix.status(provider: .codex, host: wsl).status == .vendorDocumented, "WSL classification")
let relativeRunner = Launcher()
do {
    _ = try ProviderRunner(launcher: relativeRunner).run(.init(host: mac, executablePath: "bin/codex", arguments: [], standardInput: nil, workingDirectory: nil, environment: [:]), support: .init(status: .proposedAdapter, explanation: "fixture"))
    check(false, "relative runner path")
} catch { check(relativeRunner.requests.isEmpty, "relative runner path") }
check(ExecutableDiscovery.resolve(.init(executable: "codex", host: win, environment: ["Path": "relative;C:\\Tools", "PathExt": ".EXE;.CMD"]), fileSystem: FS(paths: ["C:\\Tools\\codex.EXE"])) == .found("C:\\Tools\\codex.EXE"), "Windows case-insensitive environment")
if case .unsupported(let message) = ExecutableDiscovery.resolve(.init(executable: "codex", host: win, environment: ["PATH": "C:\\Tools", "PATHEXT": ".CMD;.EXE"]), fileSystem: FS(paths: ["C:\\Tools\\codex.CMD"])) { check(message.contains("native .exe"), "Windows script fail closed") } else { check(false, "Windows script fail closed") }
print("PASS: \(checks) isolated checks")
