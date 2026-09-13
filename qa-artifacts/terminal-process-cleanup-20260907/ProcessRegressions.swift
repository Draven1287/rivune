import Foundation
import Darwin
enum TerminalProvider: Sendable, Equatable { case codex }
enum TerminalEngineError: Error, Equatable { case timedOut(TerminalProvider), launchFailed(TerminalProvider), outputTooLarge(TerminalProvider) }
struct TerminalProcessOutput: Sendable { let status: Int32; let stdout: Data; let stderr: Data }
private final class TerminalProcessJob: @unchecked Sendable {
    private let provider: TerminalProvider
    private let executable: URL
    private let arguments: [String]
    private let stdin: Data?
    private let workingDirectory: URL?
    private let outputLimit: Int
    private let lock = NSLock()
    private var process: Process?
    private var cancellationRequested = false
    private var timeoutRequested = false

    init(
        provider: TerminalProvider,
        executable: URL,
        arguments: [String],
        stdin: Data?,
        workingDirectory: URL? = nil,
        outputLimit: Int
    ) {
        self.provider = provider
        self.executable = executable
        self.arguments = arguments
        self.stdin = stdin
        self.workingDirectory = workingDirectory
        self.outputLimit = outputLimit
    }

    func value(timeout: Duration) async throws -> TerminalProcessOutput {
        try await withThrowingTaskGroup(of: TerminalProcessOutput.self) { group in
            group.addTask { [self] in
                try await valueWithoutTimeout()
            }
            group.addTask { [self] in
                try await Task.sleep(for: timeout)
                timeOut()
                throw TerminalEngineError.timedOut(provider)
            }

            defer { group.cancelAll() }
            guard let first = try await group.next() else {
                throw TerminalEngineError.launchFailed(provider)
            }
            return first
        }
    }

    private func valueWithoutTimeout() async throws -> TerminalProcessOutput {
        try await withTaskCancellationHandler {
            try await Task.detached(priority: .userInitiated) { [self] in
                try execute()
            }.value
        } onCancel: { [self] in
            cancel()
        }
    }

    private func execute() throws -> TerminalProcessOutput {
        let fileManager = FileManager.default
        let ioRoot = fileManager.temporaryDirectory
            .appendingPathComponent("RivuneProcessIO", isDirectory: true)
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try fileManager.createDirectory(at: ioRoot, withIntermediateDirectories: true)
        defer { try? fileManager.removeItem(at: ioRoot) }

        let stdoutURL = ioRoot.appendingPathComponent("stdout")
        let stderrURL = ioRoot.appendingPathComponent("stderr")
        fileManager.createFile(atPath: stdoutURL.path, contents: nil)
        fileManager.createFile(atPath: stderrURL.path, contents: nil)

        let stdoutHandle = try FileHandle(forWritingTo: stdoutURL)
        let stderrHandle = try FileHandle(forWritingTo: stderrURL)
        let inputPipe = Pipe()
        // A provider may close stdin before accepting the entire request. Limit
        // SIGPIPE suppression to this owned descriptor so write reports EPIPE
        // instead of terminating the app or changing global signal handling.
        guard fcntl(inputPipe.fileHandleForWriting.fileDescriptor, F_SETNOSIGPIPE, 1) == 0 else {
            throw TerminalEngineError.launchFailed(provider)
        }
        defer {
            try? stdoutHandle.close()
            try? stderrHandle.close()
            try? inputPipe.fileHandleForWriting.close()
        }

        let process = Process()
        process.executableURL = executable
        process.arguments = arguments
        process.currentDirectoryURL = workingDirectory
        process.environment = Self.safeEnvironment
        process.standardInput = inputPipe
        process.standardOutput = stdoutHandle
        process.standardError = stderrHandle

        lock.lock()
        self.process = process
        let initialCancellation = cancellationRequested
        let initialTimeout = timeoutRequested
        lock.unlock()

        if initialTimeout { throw TerminalEngineError.timedOut(provider) }
        if initialCancellation { throw CancellationError() }

        do {
            try process.run()
        } catch {
            throw error
        }

        // Any error after launch (including a closed input pipe) must finish
        // the owned process before this job releases its output files or returns.
        defer {
            if process.isRunning {
                cancel()
                try? inputPipe.fileHandleForWriting.close()
                process.waitUntilExit()
            }
        }

        // A cancellation can arrive after the pre-launch snapshot but before
        // Process.run() publishes a live PID. Re-check immediately so that
        // race cannot leave an unobserved terminal request running.
        let postLaunchStopState = currentStopState
        if postLaunchStopState.timedOut || postLaunchStopState.cancelled {
            cancel()
            try? inputPipe.fileHandleForWriting.close()
            process.waitUntilExit()
            if postLaunchStopState.timedOut {
                throw TerminalEngineError.timedOut(provider)
            }
            throw CancellationError()
        }

        if let stdin {
            try inputPipe.fileHandleForWriting.write(contentsOf: stdin)
        }
        try inputPipe.fileHandleForWriting.close()

        var exceededOutputLimit = false
        while process.isRunning {
            let stdoutSize = fileSize(at: stdoutURL, fileManager: fileManager)
            let stderrSize = fileSize(at: stderrURL, fileManager: fileManager)
            if stdoutSize > outputLimit || stderrSize > outputLimit {
                exceededOutputLimit = true
                cancel()
                break
            }
            Thread.sleep(forTimeInterval: 0.05)
        }
        process.waitUntilExit()
        try stdoutHandle.synchronize()
        try stderrHandle.synchronize()
        try stdoutHandle.close()
        try stderrHandle.close()

        let stopState = currentStopState
        if stopState.timedOut { throw TerminalEngineError.timedOut(provider) }
        if exceededOutputLimit { throw TerminalEngineError.outputTooLarge(provider) }
        if stopState.cancelled { throw CancellationError() }

        let stdoutSize = fileSize(at: stdoutURL, fileManager: fileManager)
        let stderrSize = fileSize(at: stderrURL, fileManager: fileManager)
        guard stdoutSize <= outputLimit, stderrSize <= outputLimit else {
            throw TerminalEngineError.outputTooLarge(provider)
        }

        return TerminalProcessOutput(
            status: process.terminationStatus,
            stdout: try Data(contentsOf: stdoutURL),
            stderr: try Data(contentsOf: stderrURL)
        )
    }

    private func fileSize(at url: URL, fileManager: FileManager) -> Int {
        (try? fileManager.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
    }

    private var currentStopState: (cancelled: Bool, timedOut: Bool) {
        lock.lock()
        defer { lock.unlock() }
        return (cancellationRequested, timeoutRequested)
    }

    private func timeOut() {
        lock.lock()
        timeoutRequested = true
        lock.unlock()
        cancel()
    }

    private func cancel() {
        lock.lock()
        cancellationRequested = true
        let pid = process?.isRunning == true ? process?.processIdentifier : nil
        lock.unlock()

        guard let pid else { return }
        Darwin.kill(pid, SIGINT)

        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.75) { [weak self] in
            self?.escalateCancellation(pid: pid)
        }
    }

    private func escalateCancellation(pid: Int32) {
        lock.lock()
        let stillRunning = process?.isRunning == true && process?.processIdentifier == pid
        lock.unlock()
        guard stillRunning else { return }
        Darwin.kill(pid, SIGTERM)

        DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + 0.75) { [weak self] in
            guard let self else { return }
            lock.lock()
            let mustKill = process?.isRunning == true && process?.processIdentifier == pid
            lock.unlock()
            if mustKill { Darwin.kill(pid, SIGKILL) }
        }
    }

    private static var safeEnvironment: [String: String] {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let source = ProcessInfo.processInfo.environment
        return [
            "HOME": home,
            "USER": NSUserName(),
            "TMPDIR": NSTemporaryDirectory(),
            "PATH": "\(home)/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
            "LANG": source["LANG"] ?? "en_US.UTF-8",
            "LC_ALL": source["LC_ALL"] ?? source["LANG"] ?? "en_US.UTF-8",
            "TERM": "dumb",
            "NO_COLOR": "1"
        ]
    }
}

@main struct ProcessRegressions {
 static func check(_ condition: Bool, _ name: String) throws {
  guard condition else { throw NSError(domain: name, code: 1) }
  print("PASS " + name)
 }
 static func main() async throws {
  let root = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("rivune-process-regressions-" + UUID().uuidString)
  try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
  defer { try? FileManager.default.removeItem(at: root) }
  func job(_ exe: String, _ args: [String], _ input: Data? = nil, limit: Int = 8192) -> TerminalProcessJob {
   TerminalProcessJob(provider: .codex, executable: URL(fileURLWithPath: exe), arguments: args, stdin: input, outputLimit: limit)
  }
  let hello=Data("A complete input with Unicode: café\n".utf8)
  let cat=try await job("/bin/cat", [], hello).value(timeout: .seconds(4))
  try check(cat.status == 0 && cat.stdout == hello && cat.stderr.isEmpty, "successful input and output unchanged")
  let empty=try await job("/bin/cat", []).value(timeout: .seconds(4))
  try check(empty.status == 0 && empty.stdout.isEmpty, "nil input closes pipe")
  let error=try await job("/bin/sh", ["-c", "printf diagnostic >&2; exit 7"]).value(timeout: .seconds(4))
  try check(error.status == 7 && String(decoding:error.stderr,as:UTF8.self)=="diagnostic", "exit and stderr preserved")
  do {
   _=try await job("/definitely-absent-rivune-fixture", []).value(timeout: .seconds(4))
   throw NSError(domain:"launch should fail",code:1)
  } catch { try check((error as NSError).domain != "launch should fail", "launch failure returns") }
  do {
   _=try await job("/bin/cat", [], Data(repeating: 65,count:2048),limit:1024).value(timeout: .seconds(4))
   throw NSError(domain:"limit should fail",code:1)
  } catch { try check(error as? TerminalEngineError == .outputTooLarge(.codex), "output limit preserved") }
  let timed=job("/bin/sleep", ["3"])
  do {
   _=try await timed.value(timeout: .milliseconds(100))
   throw NSError(domain:"timeout should fail",code:1)
  } catch { try check(error as? TerminalEngineError == .timedOut(.codex), "timeout waits for cleanup") }
  let stopped=job("/bin/sleep", ["3"])
  let task=Task { try await stopped.value(timeout: .seconds(4)) }
  try await Task.sleep(for: .milliseconds(100));task.cancel()
  do { _=try await task.value; throw NSError(domain:"cancel should fail",code:1) }
  catch { try check(error is CancellationError, "cancellation remains explicit") }
  let pidFile=root.appendingPathComponent("pid")
  let script="echo $$ > \"$1\"; exec 0<&-; exec /bin/sleep 3"
  var writeFailed=false
  do { _=try await job("/bin/sh", ["-c",script,"fixture",pidFile.path],Data(repeating:65,count:128*1024)).value(timeout:.seconds(4)) }
  catch { writeFailed=true }
  let pid=Int32(try String(contentsOf:pidFile,encoding:.utf8).trimmingCharacters(in:.whitespacesAndNewlines))!
  let alive=kill(pid,0)==0
  if alive { kill(pid,SIGTERM) }
  try check(writeFailed && !alive,"closed stdin survives default SIGPIPE and reaps owned process")
  print("8 process regression cases passed. Synthetic local commands only; no provider execution.")
 }
}
