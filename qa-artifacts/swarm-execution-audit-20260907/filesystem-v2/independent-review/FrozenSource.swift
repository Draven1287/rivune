import CryptoKit
import Foundation

public enum SwarmFilesystemError: String, Error, Codable, Sendable {
    case invalidRequest
    case unsafeRoot
    case traversalRejected
    case symlinkRejected
    case ownershipConflict
    case baseConflict
    case targetChanged
    case stagingFailed
    case applyFailed
    case recoveryRequired
    case alreadyApplied
}

public struct SwarmFilesystemOwnedFile: Sendable {
    public let path: String
    /// Nil means the normalized path must not exist in the captured target namespace.
    public let expectedBaseSHA256: String?
    public let proposedBytes: Data

    public init(path: String, expectedBaseSHA256: String?, proposedBytes: Data) {
        self.path = path
        self.expectedBaseSHA256 = expectedBaseSHA256
        self.proposedBytes = proposedBytes
    }
}

public enum SwarmFilesystemEntryKind: String, Codable, Sendable {
    case file
    case directory
}

public struct SwarmFilesystemSnapshotEntry: Codable, Equatable, Sendable {
    public let path: String
    public let normalizedPath: String
    public let kind: SwarmFilesystemEntryKind
    public let sha256: String?
    public let byteCount: Int?
}

public struct SwarmFilesystemSnapshot: Codable, Equatable, Sendable {
    public let entries: [SwarmFilesystemSnapshotEntry]
    public let digestSHA256: String
}

public enum SwarmFilesystemJournalState: String, Codable, Sendable {
    case prepared
    case applying
    case conflict
    case rolledBack
    case recoveryRequired
    case complete
}

public struct SwarmFilesystemStagingReceipt: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let runID: UUID
    public let stagingDirectory: String
    public let snapshotSHA256: String
    public let proposedFiles: [SwarmFilesystemFileReceipt]
    public let journalState: SwarmFilesystemJournalState
    public let recoveryConflicts: [SwarmFilesystemRecoveryConflict]
}

public struct SwarmFilesystemFileReceipt: Codable, Equatable, Sendable {
    public let path: String
    public let expectedBaseSHA256: String?
    public let proposedSHA256: String
    public let byteCount: Int
}

public struct SwarmFilesystemRecoveryConflict: Codable, Equatable, Sendable {
    public let path: String
    public let reason: String
    public let observedKind: String
    public let observedSHA256: String?
}

public enum SwarmFilesystemApplyStep: Equatable, Sendable {
    case beforeFile(index: Int, path: String)
    case afterFile(index: Int, path: String)
}

public protocol SwarmFilesystemFaultInjecting: Sendable {
    func check(_ step: SwarmFilesystemApplyStep) throws
}

public struct SwarmFilesystemNoFaults: SwarmFilesystemFaultInjecting {
    public init() {}
    public func check(_ step: SwarmFilesystemApplyStep) throws {}
}

/// Stages one already-approved Swarm change set and applies it to one explicit project root.
///
/// The adapter provides per-file atomic replacement plus best-effort rollback. It does not and
/// cannot promise a transaction that is atomic across multiple filesystem paths.
public actor SwarmFilesystemApplySession {
    private let runID: UUID
    private let projectRoot: URL
    private let stagingParent: URL
    private let files: [SwarmFilesystemOwnedFile]
    private let faultInjector: any SwarmFilesystemFaultInjecting
    private let fileManager = FileManager.default

    private var snapshot: SwarmFilesystemSnapshot?
    private var originalBytes: [String: Data] = [:]
    private var stagingRoot: URL?
    private var journalState: SwarmFilesystemJournalState?
    private var recoveryConflicts: [SwarmFilesystemRecoveryConflict] = []
    private var hasApplied = false

    public init(
        runID: UUID,
        projectRoot: URL,
        stagingParent: URL,
        files: [SwarmFilesystemOwnedFile],
        faultInjector: any SwarmFilesystemFaultInjecting = SwarmFilesystemNoFaults()
    ) throws {
        guard !files.isEmpty, files.count <= 32,
              files.reduce(0, { $0 + $1.proposedBytes.count }) <= 4_194_304 else {
            throw SwarmFilesystemError.invalidRequest
        }
        let standardizedProject = projectRoot.standardizedFileURL
        let standardizedStaging = stagingParent.standardizedFileURL
        try Self.validateRoots(projectRoot: standardizedProject, stagingParent: standardizedStaging)
        self.runID = runID
        // FileManager enumerates /var through its canonical /private/var spelling even though
        // resolvingSymlinksInPath() preserves /var. Freeze the resource canonical path instead.
        self.projectRoot = try Self.canonicalURL(standardizedProject)
        self.stagingParent = try Self.canonicalURL(standardizedStaging)
        self.files = files
        self.faultInjector = faultInjector
        try Self.validateRoots(projectRoot: self.projectRoot, stagingParent: self.stagingParent)
        try Self.validateFiles(files)
    }

    public func stage() throws -> SwarmFilesystemStagingReceipt {
        guard snapshot == nil else { throw SwarmFilesystemError.invalidRequest }
        let captured = try captureRelevantSnapshot(recordOriginals: true)
        try validateBaseState(captured)

        let root = stagingParent.appendingPathComponent("rivune-swarm-\(runID.uuidString)", isDirectory: true)
        guard !fileManager.fileExists(atPath: root.path) else { throw SwarmFilesystemError.stagingFailed }
        do {
            try fileManager.createDirectory(at: root, withIntermediateDirectories: false)
            try assertNoSymlink(at: root)
            try fileManager.createDirectory(at: root.appendingPathComponent("proposed"), withIntermediateDirectories: false)
            try fileManager.createDirectory(at: root.appendingPathComponent("backups"), withIntermediateDirectories: false)

            for file in files.sorted(by: { $0.path < $1.path }) {
                let proposed = root.appendingPathComponent("proposed").appendingPathComponent(file.path)
                try createSafeParents(for: proposed, boundedBy: root.appendingPathComponent("proposed"))
                try file.proposedBytes.write(to: proposed, options: .atomic)
                if let bytes = originalBytes[file.path] {
                    let backup = root.appendingPathComponent("backups").appendingPathComponent(file.path)
                    try createSafeParents(for: backup, boundedBy: root.appendingPathComponent("backups"))
                    try bytes.write(to: backup, options: .atomic)
                }
            }
            snapshot = captured
            stagingRoot = root
            journalState = .prepared
            try writeJournal(state: .prepared, applied: [], createdDirectories: [])
            return receipt(state: .prepared)
        } catch let error as SwarmFilesystemError {
            throw error
        } catch {
            throw SwarmFilesystemError.stagingFailed
        }
    }

    public func apply() throws -> SwarmFilesystemStagingReceipt {
        guard !hasApplied else { throw SwarmFilesystemError.alreadyApplied }
        guard let captured = snapshot, stagingRoot != nil else { throw SwarmFilesystemError.invalidRequest }

        do {
            let current = try captureRelevantSnapshot(recordOriginals: false)
            guard current == captured else {
                journalState = .conflict
                try writeJournal(state: .conflict, applied: [], createdDirectories: [])
                throw SwarmFilesystemError.targetChanged
            }
        } catch let error as SwarmFilesystemError {
            if journalState != .conflict {
                journalState = .conflict
                try? writeJournal(state: .conflict, applied: [], createdDirectories: [])
            }
            throw error
        } catch {
            journalState = .conflict
            try? writeJournal(state: .conflict, applied: [], createdDirectories: [])
            throw SwarmFilesystemError.targetChanged
        }

        var applied: [String] = []
        var createdDirectories: [String] = []
        do {
            journalState = .applying
            try writeJournal(state: .applying, applied: applied, createdDirectories: createdDirectories)
            for (index, file) in files.sorted(by: { $0.path < $1.path }).enumerated() {
                try faultInjector.check(.beforeFile(index: index, path: file.path))
                let destination = projectRoot.appendingPathComponent(file.path)
                try createProjectParents(for: destination, createdDirectories: &createdDirectories)
                try assertSafeTarget(destination, relativePath: file.path)
                try file.proposedBytes.write(to: destination, options: .atomic)
                applied.append(file.path)
                try writeJournal(state: .applying, applied: applied, createdDirectories: createdDirectories)
                try faultInjector.check(.afterFile(index: index, path: file.path))
            }
            hasApplied = true
            journalState = .complete
            try writeJournal(state: .complete, applied: applied, createdDirectories: createdDirectories)
            return receipt(state: .complete)
        } catch {
            let conflicts = rollback(applied: applied, createdDirectories: createdDirectories)
            recoveryConflicts = conflicts
            journalState = conflicts.isEmpty ? .rolledBack : .recoveryRequired
            try? writeJournal(state: journalState!, applied: applied, createdDirectories: createdDirectories,
                              recoveryConflicts: conflicts)
            if !conflicts.isEmpty { throw SwarmFilesystemError.recoveryRequired }
            if let typed = error as? SwarmFilesystemError,
               [.symlinkRejected, .traversalRejected, .targetChanged].contains(typed) {
                throw typed
            }
            throw SwarmFilesystemError.applyFailed
        }
    }

    public func currentReceipt() -> SwarmFilesystemStagingReceipt? {
        guard let journalState else { return nil }
        return receipt(state: journalState)
    }

    private func captureRelevantSnapshot(recordOriginals: Bool) throws -> SwarmFilesystemSnapshot {
        try assertNoSymlink(at: projectRoot)
        let keys: [URLResourceKey] = [.isRegularFileKey, .isDirectoryKey, .isSymbolicLinkKey]
        var enumerationError: Error?
        guard let enumerator = fileManager.enumerator(
            at: projectRoot,
            includingPropertiesForKeys: keys,
            options: [],
            errorHandler: { _, error in
                enumerationError = error
                return false
            }
        ) else { throw SwarmFilesystemError.unsafeRoot }

        let ownedKeys = files.map { Self.normalizedPath($0.path) }
        var entries: [SwarmFilesystemSnapshotEntry] = []
        var bytesTotal = 0
        var seen: Set<String> = []
        for case let url as URL in enumerator {
            guard url.path.hasPrefix(projectRoot.path + "/") else { throw SwarmFilesystemError.unsafeRoot }
            let relative = String(url.path.dropFirst(projectRoot.path.count + 1))
            let key = Self.normalizedPath(relative)
            guard ownedKeys.contains(where: { owned in
                key == owned || key.hasPrefix(owned + "/") || owned.hasPrefix(key + "/")
            }) else { continue }
            let values = try url.resourceValues(forKeys: Set(keys))
            if values.isSymbolicLink == true { throw SwarmFilesystemError.symlinkRejected }
            guard seen.insert(key).inserted else { throw SwarmFilesystemError.ownershipConflict }
            if values.isDirectory == true {
                entries.append(.init(path: relative, normalizedPath: key, kind: .directory, sha256: nil, byteCount: nil))
            } else if values.isRegularFile == true {
                let data = try Data(contentsOf: url, options: [.mappedIfSafe])
                bytesTotal += data.count
                guard bytesTotal <= 8_388_608 else { throw SwarmFilesystemError.invalidRequest }
                entries.append(.init(path: relative, normalizedPath: key, kind: .file,
                                     sha256: Self.sha256(data), byteCount: data.count))
                if recordOriginals, ownedKeys.contains(key),
                   let owned = files.first(where: { Self.normalizedPath($0.path) == key }) {
                    originalBytes[owned.path] = data
                }
            } else {
                throw SwarmFilesystemError.unsafeRoot
            }
            guard entries.count <= 2_048 else { throw SwarmFilesystemError.invalidRequest }
        }
        if enumerationError != nil { throw SwarmFilesystemError.unsafeRoot }
        entries.sort { $0.normalizedPath == $1.normalizedPath ? $0.path < $1.path : $0.normalizedPath < $1.normalizedPath }
        let digest = Self.sha256(try Self.canonicalEncoder.encode(entries))
        return .init(entries: entries, digestSHA256: digest)
    }

    private func validateBaseState(_ snapshot: SwarmFilesystemSnapshot) throws {
        let byKey = Dictionary(uniqueKeysWithValues: snapshot.entries.map { ($0.normalizedPath, $0) })
        for file in files {
            let key = Self.normalizedPath(file.path)
            let descendants = snapshot.entries.contains { $0.normalizedPath.hasPrefix(key + "/") }
            let fileAncestor = snapshot.entries.contains {
                key.hasPrefix($0.normalizedPath + "/") && $0.kind == .file
            }
            guard !descendants, !fileAncestor else { throw SwarmFilesystemError.ownershipConflict }
            let exact = byKey[key]
            guard exact?.path == file.path || exact == nil else { throw SwarmFilesystemError.ownershipConflict }
            guard exact?.kind != .directory else { throw SwarmFilesystemError.ownershipConflict }
            guard exact?.sha256 == file.expectedBaseSHA256 else { throw SwarmFilesystemError.baseConflict }
        }
    }

    private func createProjectParents(for destination: URL, createdDirectories: inout [String]) throws {
        let parent = destination.deletingLastPathComponent()
        let relative = String(parent.path.dropFirst(projectRoot.path.count)).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if relative.isEmpty { return }
        var current = projectRoot
        for component in relative.split(separator: "/").map(String.init) {
            current.appendPathComponent(component, isDirectory: true)
            var isDirectory: ObjCBool = false
            if fileManager.fileExists(atPath: current.path, isDirectory: &isDirectory) {
                try assertNoSymlink(at: current)
                guard isDirectory.boolValue else { throw SwarmFilesystemError.ownershipConflict }
            } else {
                try fileManager.createDirectory(at: current, withIntermediateDirectories: false)
                createdDirectories.append(String(current.path.dropFirst(projectRoot.path.count + 1)))
            }
        }
    }

    private func assertSafeTarget(_ url: URL, relativePath: String) throws {
        let expected = projectRoot.appendingPathComponent(relativePath)
        guard url.path.hasPrefix(projectRoot.path + "/"), url.path == expected.path
        else { throw SwarmFilesystemError.traversalRejected }
        if fileManager.fileExists(atPath: url.path) { try assertNoSymlink(at: url) }
    }

    private func createSafeParents(for destination: URL, boundedBy root: URL) throws {
        let parent = destination.deletingLastPathComponent()
        guard parent.path == root.path || parent.path.hasPrefix(root.path + "/") else {
            throw SwarmFilesystemError.traversalRejected
        }
        try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
        var cursor = parent
        while cursor.path.count >= root.path.count {
            try assertNoSymlink(at: cursor)
            if cursor.path == root.path { break }
            cursor.deleteLastPathComponent()
        }
    }

    private func assertNoSymlink(at url: URL) throws {
        let attributes = try fileManager.attributesOfItem(atPath: url.path)
        if attributes[.type] as? FileAttributeType == .typeSymbolicLink {
            throw SwarmFilesystemError.symlinkRejected
        }
    }

    private func rollback(applied: [String], createdDirectories: [String]) -> [SwarmFilesystemRecoveryConflict] {
        var conflicts: [SwarmFilesystemRecoveryConflict] = []
        for path in applied.reversed() {
            let destination = projectRoot.appendingPathComponent(path)
            let proposedHash = files.first(where: { $0.path == path }).map { Self.sha256($0.proposedBytes) }
            do {
                let observed = try inspectTarget(path)
                switch observed {
                case .file(let currentHash) where currentHash == proposedHash:
                    if let bytes = originalBytes[path] {
                        try bytes.write(to: destination, options: .atomic)
                    } else {
                        // Kind and exact proposed hash were checked above; this removes one file,
                        // never an uninspected directory or symlink.
                        try fileManager.removeItem(at: destination)
                    }
                case .absent where originalBytes[path] == nil:
                    break
                default:
                    conflicts.append(observed.conflict(path: path, reason: "target no longer matches the applied proposal"))
                }
            } catch {
                conflicts.append(.init(path: path, reason: "target could not be safely inspected or restored",
                                       observedKind: "inspection-error", observedSHA256: nil))
            }
        }

        for path in createdDirectories.reversed() {
            let directory = projectRoot.appendingPathComponent(path)
            do {
                let observed = try inspectTarget(path)
                switch observed {
                case .absent:
                    break
                case .directory:
                    guard try fileManager.contentsOfDirectory(atPath: directory.path).isEmpty else {
                        conflicts.append(observed.conflict(path: path, reason: "created directory now contains unowned content"))
                        continue
                    }
                    try fileManager.removeItem(at: directory)
                default:
                    conflicts.append(observed.conflict(path: path, reason: "created directory was replaced"))
                }
            } catch {
                conflicts.append(.init(path: path, reason: "created directory could not be safely inspected or removed",
                                       observedKind: "inspection-error", observedSHA256: nil))
            }
        }
        return conflicts.sorted { $0.path < $1.path }
    }

    private func inspectTarget(_ relativePath: String) throws -> ObservedTarget {
        let components = relativePath.split(separator: "/").map(String.init)
        var cursor = projectRoot
        for component in components.dropLast() {
            cursor.appendPathComponent(component, isDirectory: true)
            var isDirectory: ObjCBool = false
            guard fileManager.fileExists(atPath: cursor.path, isDirectory: &isDirectory) else { return .absent }
            let attributes = try fileManager.attributesOfItem(atPath: cursor.path)
            if attributes[.type] as? FileAttributeType == .typeSymbolicLink { return .symlink }
            guard isDirectory.boolValue else { return .other }
        }

        let target = projectRoot.appendingPathComponent(relativePath)
        var isDirectory: ObjCBool = false
        guard fileManager.fileExists(atPath: target.path, isDirectory: &isDirectory) else {
            let attributes = try? fileManager.attributesOfItem(atPath: target.path)
            if attributes?[.type] as? FileAttributeType == .typeSymbolicLink { return .symlink }
            return .absent
        }
        let attributes = try fileManager.attributesOfItem(atPath: target.path)
        if attributes[.type] as? FileAttributeType == .typeSymbolicLink { return .symlink }
        if isDirectory.boolValue { return .directory }
        guard attributes[.type] as? FileAttributeType == .typeRegular else { return .other }
        return .file(Self.sha256(try Data(contentsOf: target, options: [.mappedIfSafe])))
    }

    private func writeJournal(state: SwarmFilesystemJournalState, applied: [String], createdDirectories: [String],
                              recoveryConflicts: [SwarmFilesystemRecoveryConflict] = []) throws {
        guard let root = stagingRoot else { throw SwarmFilesystemError.stagingFailed }
        let journal = Journal(schemaVersion: 1, runID: runID, projectRoot: projectRoot.path,
                              snapshotSHA256: snapshot?.digestSHA256 ?? "", state: state,
                              appliedPaths: applied, createdDirectories: createdDirectories,
                              files: fileReceipts(), recoveryConflicts: recoveryConflicts)
        try Self.canonicalEncoder.encode(journal).write(to: root.appendingPathComponent("journal.json"), options: .atomic)
    }

    private func receipt(state: SwarmFilesystemJournalState) -> SwarmFilesystemStagingReceipt {
        .init(schemaVersion: 1, runID: runID, stagingDirectory: stagingRoot?.path ?? "",
              snapshotSHA256: snapshot?.digestSHA256 ?? "", proposedFiles: fileReceipts(), journalState: state,
              recoveryConflicts: recoveryConflicts)
    }

    private func fileReceipts() -> [SwarmFilesystemFileReceipt] {
        files.map {
            .init(path: $0.path, expectedBaseSHA256: $0.expectedBaseSHA256,
                  proposedSHA256: Self.sha256($0.proposedBytes), byteCount: $0.proposedBytes.count)
        }.sorted { $0.path < $1.path }
    }

    private static func validateRoots(projectRoot: URL, stagingParent: URL) throws {
        var projectIsDirectory: ObjCBool = false
        var stagingIsDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: projectRoot.path, isDirectory: &projectIsDirectory), projectIsDirectory.boolValue,
              FileManager.default.fileExists(atPath: stagingParent.path, isDirectory: &stagingIsDirectory), stagingIsDirectory.boolValue,
              projectRoot.path != stagingParent.path,
              !projectRoot.path.hasPrefix(stagingParent.path + "/"),
              !stagingParent.path.hasPrefix(projectRoot.path + "/") else {
            throw SwarmFilesystemError.unsafeRoot
        }
        for root in [projectRoot, stagingParent] {
            let attributes = try FileManager.default.attributesOfItem(atPath: root.path)
            guard attributes[.type] as? FileAttributeType != .typeSymbolicLink else {
                throw SwarmFilesystemError.symlinkRejected
            }
        }
    }

    private static func canonicalURL(_ url: URL) throws -> URL {
        let values = try url.resourceValues(forKeys: [.canonicalPathKey])
        guard let path = values.canonicalPath, path.hasPrefix("/") else {
            throw SwarmFilesystemError.unsafeRoot
        }
        // Do not call standardizedFileURL here: Foundation rewrites /private/var back to /var,
        // while FileManager's enumerator returns /private/var children.
        return URL(fileURLWithPath: path, isDirectory: true)
    }

    private static func validateFiles(_ files: [SwarmFilesystemOwnedFile]) throws {
        var keys: [String] = []
        for file in files {
            try validateRelativePath(file.path)
            if let digest = file.expectedBaseSHA256 { try validateDigest(digest) }
            let key = normalizedPath(file.path)
            guard !keys.contains(where: { $0 == key || $0.hasPrefix(key + "/") || key.hasPrefix($0 + "/") }) else {
                throw SwarmFilesystemError.ownershipConflict
            }
            keys.append(key)
        }
    }

    private static func validateRelativePath(_ path: String) throws {
        let parts = path.split(separator: "/", omittingEmptySubsequences: false)
        guard !path.isEmpty, path.utf8.count <= 512, !path.contains("\\"), !path.contains(":"),
              !path.unicodeScalars.contains(where: CharacterSet.controlCharacters.contains),
              parts.allSatisfy({ !$0.isEmpty && $0 != "." && $0 != ".." && !$0.hasPrefix(".") && !$0.hasSuffix(" ") && !$0.hasSuffix(".") })
        else { throw SwarmFilesystemError.traversalRejected }
    }

    private static func validateDigest(_ value: String) throws {
        guard value.count == 64, value.allSatisfy({ $0.isNumber || ("a"..."f").contains(String($0)) }) else {
            throw SwarmFilesystemError.invalidRequest
        }
    }

    private static func normalizedPath(_ path: String) -> String {
        path.precomposedStringWithCanonicalMapping.lowercased()
    }

    private static var canonicalEncoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return encoder
    }

    public nonisolated static func sha256(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}

private struct Journal: Codable {
    let schemaVersion: Int
    let runID: UUID
    let projectRoot: String
    let snapshotSHA256: String
    let state: SwarmFilesystemJournalState
    let appliedPaths: [String]
    let createdDirectories: [String]
    let files: [SwarmFilesystemFileReceipt]
    let recoveryConflicts: [SwarmFilesystemRecoveryConflict]
}

private enum ObservedTarget {
    case absent
    case file(String)
    case directory
    case symlink
    case other

    func conflict(path: String, reason: String) -> SwarmFilesystemRecoveryConflict {
        switch self {
        case .absent:
            return .init(path: path, reason: reason, observedKind: "absent", observedSHA256: nil)
        case .file(let digest):
            return .init(path: path, reason: reason, observedKind: "file", observedSHA256: digest)
        case .directory:
            return .init(path: path, reason: reason, observedKind: "directory", observedSHA256: nil)
        case .symlink:
            return .init(path: path, reason: reason, observedKind: "symlink", observedSHA256: nil)
        case .other:
            return .init(path: path, reason: reason, observedKind: "other", observedSHA256: nil)
        }
    }
}
