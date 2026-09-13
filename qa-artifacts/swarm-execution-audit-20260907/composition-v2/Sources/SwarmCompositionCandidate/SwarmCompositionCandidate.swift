import Foundation
import SwarmExecutionCandidate
import SwarmFilesystemAdapter

public enum SwarmCompositionState: String, Codable, Sendable {
    case running
    case busy
    case applying
    case cancelled
    case failed
    case staged
    case complete
    case recoveryRequired
}

public struct SwarmCompositionReceipt: Codable, Sendable {
    public let schemaVersion: Int
    public let runID: UUID
    public let state: SwarmCompositionState
    public let execution: SwarmIntegrationReceipt?
    public let filesystem: SwarmFilesystemStagingReceipt?
    public let finalArtifacts: [SwarmFilesystemFileReceipt]
    public let userFacingStatus: String
}

public enum SwarmCompositionError: String, Error, Sendable {
    case invalidBinding
    case invalidState
}

private actor CapturingVerifier: SwarmCandidateVerifying {
    private let wrapped: any SwarmCandidateVerifying
    private var captured: SwarmIntegratedCandidate?

    init(wrapped: any SwarmCandidateVerifying) { self.wrapped = wrapped }

    func verify(_ candidate: SwarmIntegratedCandidate, checks: [SwarmCheckSpec]) async throws -> [SwarmCheckObservation] {
        let observations = try await wrapped.verify(candidate, checks: checks)
        captured = candidate
        return observations
    }

    func candidate() -> SwarmIntegratedCandidate? { captured }
}

/// Composes the accepted in-memory execution kernel with the accepted filesystem adapter.
/// It does not select Council/Swarm strategy, call providers itself, or enable Swarm in Rivune.
public actor SwarmCompositionSession {
    private enum Phase: Sendable {
        case idle
        case executing(contextSHA256: String)
        case staged
        case applying
        case terminal
    }
    private let plan: SwarmExecutionPlan
    private let worker: any SwarmWorkerExecuting
    private let verifier: any SwarmCandidateVerifying
    private let projectRoot: URL
    private let stagingParent: URL
    private let targetSnapshot: [String: Data]
    private let filesystemFaults: any SwarmFilesystemFaultInjecting

    private var filesystemSession: SwarmFilesystemApplySession?
    private var latest: SwarmCompositionReceipt?
    private var phase: Phase = .idle

    public init(plan: SwarmExecutionPlan, worker: any SwarmWorkerExecuting,
                verifier: any SwarmCandidateVerifying, projectRoot: URL, stagingParent: URL,
                targetSnapshot: [String: Data],
                filesystemFaults: any SwarmFilesystemFaultInjecting = SwarmFilesystemNoFaults()) {
        self.plan = plan
        self.worker = worker
        self.verifier = verifier
        self.projectRoot = projectRoot
        self.stagingParent = stagingParent
        self.targetSnapshot = targetSnapshot
        self.filesystemFaults = filesystemFaults
    }

    public func execute(approvedContext: String) async -> SwarmCompositionReceipt {
        let contextSHA256 = SwarmFilesystemApplySession.sha256(Data(approvedContext.utf8))
        switch phase {
        case .idle:
            phase = .executing(contextSHA256: contextSHA256)
            latest = .init(schemaVersion: 1, runID: plan.runID, state: .running,
                           execution: nil, filesystem: nil, finalArtifacts: [],
                           userFacingStatus: "Run in progress")
        case .executing(let admitted) where admitted == contextSHA256:
            return latest!
        case .executing:
            return .init(schemaVersion: 1, runID: plan.runID, state: .busy,
                         execution: nil, filesystem: nil, finalArtifacts: [],
                         userFacingStatus: "A run with different approved context is already in progress")
        case .staged, .applying, .terminal:
            return latest!
        }
        let capture = CapturingVerifier(wrapped: verifier)
        let executionSession: SwarmExecutionSession
        do {
            executionSession = try SwarmExecutionSession(plan: plan, worker: worker, verifier: capture)
        } catch {
            phase = .terminal
            return record(failure(status: "Execution plan was rejected"))
        }

        let execution: SwarmIntegrationReceipt
        do {
            execution = try await executionSession.run(approvedContext: approvedContext, targetSnapshot: targetSnapshot)
        } catch {
            phase = .terminal
            return record(failure(status: "Execution could not start"))
        }
        if execution.state == .cancelled {
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .cancelled,
                                execution: execution, filesystem: nil, finalArtifacts: [],
                                userFacingStatus: "Run cancelled; nothing was staged"))
        }
        guard !Task.isCancelled else {
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .cancelled,
                                execution: execution, filesystem: nil, finalArtifacts: [],
                                userFacingStatus: "Run cancelled; nothing was staged"))
        }
        guard execution.state == .complete, execution.verifyIntegrity(),
              let candidate = await capture.candidate(),
              Self.bindingIsValid(plan: plan, execution: execution, candidate: candidate,
                                  targetSnapshot: targetSnapshot) else {
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .failed,
                                execution: execution, filesystem: nil, finalArtifacts: [],
                                userFacingStatus: "Run did not produce an approved, bound result"))
        }

        let manifests = Dictionary(uniqueKeysWithValues: execution.integratedFiles.map { ($0.path, $0) })
        let owned = candidate.files.keys.sorted().map { path in
            SwarmFilesystemOwnedFile(path: path, expectedBaseSHA256: manifests[path]!.baseSHA256,
                                     proposedBytes: candidate.files[path]!)
        }
        guard !Task.isCancelled else {
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .cancelled,
                                execution: execution, filesystem: nil, finalArtifacts: [],
                                userFacingStatus: "Run cancelled; nothing was staged"))
        }
        do {
            let session = try SwarmFilesystemApplySession(runID: execution.runID, projectRoot: projectRoot,
                stagingParent: stagingParent, files: owned, faultInjector: filesystemFaults)
            let staged = try await session.stage()
            filesystemSession = session
            phase = .staged
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .staged,
                                execution: execution, filesystem: staged,
                                finalArtifacts: staged.proposedFiles,
                                userFacingStatus: "Result staged for review; no files applied"))
        } catch {
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .failed,
                                execution: execution, filesystem: nil, finalArtifacts: [],
                                userFacingStatus: "Project changed or staging was rejected"))
        }
    }

    public func apply() async throws -> SwarmCompositionReceipt {
        if Task.isCancelled {
            return .init(schemaVersion: 1, runID: plan.runID, state: .cancelled,
                         execution: latest?.execution, filesystem: latest?.filesystem,
                         finalArtifacts: latest?.finalArtifacts ?? [],
                         userFacingStatus: "Apply cancelled before any files were changed")
        }
        switch phase {
        case .applying:
            return latest!
        case .staged:
            break
        default:
            throw SwarmCompositionError.invalidState
        }
        guard let session = filesystemSession else { throw SwarmCompositionError.invalidState }
        phase = .applying
        latest = .init(schemaVersion: 1, runID: plan.runID, state: .applying,
                       execution: latest?.execution, filesystem: latest?.filesystem,
                       finalArtifacts: latest?.finalArtifacts ?? [],
                       userFacingStatus: "Applying approved files")
        do {
            let applied = try await session.apply()
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .complete,
                                execution: latest?.execution, filesystem: applied,
                                finalArtifacts: applied.proposedFiles,
                                userFacingStatus: "Approved files applied"))
        } catch SwarmFilesystemError.recoveryRequired {
            let recovery = await session.currentReceipt()
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: .recoveryRequired,
                                execution: latest?.execution, filesystem: recovery,
                                finalArtifacts: recovery?.proposedFiles ?? [],
                                userFacingStatus: "Recovery required; automatic retry is blocked"))
        } catch {
            let current = await session.currentReceipt()
            let state: SwarmCompositionState = current?.journalState == .recoveryRequired ? .recoveryRequired : .failed
            phase = .terminal
            return record(.init(schemaVersion: 1, runID: plan.runID, state: state,
                                execution: latest?.execution, filesystem: current,
                                finalArtifacts: current?.proposedFiles ?? [],
                                userFacingStatus: state == .recoveryRequired
                                    ? "Recovery required; automatic retry is blocked"
                                    : "Apply failed; no success was recorded"))
        }
    }

    public func receipt() -> SwarmCompositionReceipt? { latest }

    static func bindingIsValid(plan: SwarmExecutionPlan, execution: SwarmIntegrationReceipt,
                               candidate: SwarmIntegratedCandidate, targetSnapshot: [String: Data]) -> Bool {
        guard execution.schemaVersion == 2, execution.state == .complete, execution.verifyIntegrity(),
              execution.runID == plan.runID, candidate.runID == plan.runID,
              execution.integratedFiles.count == candidate.files.count else { return false }
        let planOwned = plan.tasks.flatMap(\.ownedPaths)
        guard planOwned.count == execution.integratedFiles.count else { return false }
        let ownedByPath = Dictionary(uniqueKeysWithValues: planOwned.map { ($0.path, $0.expectedBaseSHA256) })
        var snapshotByKey: [String: Data] = [:]
        for (path, bytes) in targetSnapshot {
            let key = path.precomposedStringWithCanonicalMapping.lowercased()
            guard snapshotByKey[key] == nil else { return false }
            snapshotByKey[key] = bytes
        }
        for manifest in execution.integratedFiles {
            guard let bytes = candidate.files[manifest.path], ownedByPath.keys.contains(manifest.path),
                  bytes.count == manifest.byteCount,
                  SwarmFilesystemApplySession.sha256(bytes) == manifest.proposedSHA256,
                  ownedByPath[manifest.path]! == manifest.baseSHA256 else { return false }
            let key = manifest.path.precomposedStringWithCanonicalMapping.lowercased()
            let actualBase = snapshotByKey[key].map(SwarmFilesystemApplySession.sha256)
            guard actualBase == manifest.baseSHA256 else { return false }
        }
        return Set(candidate.files.keys) == Set(ownedByPath.keys)
    }

    private func failure(status: String) -> SwarmCompositionReceipt {
        .init(schemaVersion: 1, runID: plan.runID, state: .failed, execution: nil,
              filesystem: nil, finalArtifacts: [], userFacingStatus: status)
    }

    @discardableResult private func record(_ receipt: SwarmCompositionReceipt) -> SwarmCompositionReceipt {
        latest = receipt
        return receipt
    }
}
