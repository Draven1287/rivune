// Proposed transport contract, not imported by runtime/frontend.
type Id = string;
type Sha256 = string;
type Generation = string; // decimal u64 string across JS/Rust boundary
interface Origin {
  conversationId: Id; turnId: Id; answerId: Id; projectId: Id | null;
  responseSha256: Sha256;
}
interface ArtifactFile { path: string; sha256: Sha256; byteCount: number; }
interface ArtifactRevision {
  schemaVersion: 1; artifactId: Id; revisionSha256: Sha256; origin: Origin;
  summary: string; files: ArtifactFile[]; totalBytes: number;
  access: 'active' | 'archived-read-only';
}
interface MutationScope {
  operationId: Id; conversationId: Id; expectedWorkspaceGeneration: Generation;
}
interface ArtifactSelection { artifactId: Id; expectedRevisionSha256: Sha256; }
interface PreparedApply {
  operationId: Id; artifact: ArtifactSelection; ownerConversationId: Id;
  targetProjectId: Id; expectedProjectGeneration: Generation;
  grantId: Id; // opaque host-held current root grant, never a renderer path
  state: 'prepared'; capturedSnapshotSha256: Sha256;
  files: Array<{ path: string; beforeSha256: Sha256 | null; afterSha256: Sha256;
                 action: 'create' | 'replace'; beforeBytes: number; afterBytes: number }>;
  // Actual originals and staged replacement blobs are host-private and durable.
}
type OperationState = 'prepared' | 'applying' | 'applied' | 'reverting' |
  'reverted' | 'rolled_back' | 'conflict' | 'stale' | 'recovery_required';
interface OperationReceipt {
  operationId: Id; state: OperationState; artifact: ArtifactSelection;
  projectId: Id; ownerConversationId: Id; committedAt: string | null;
  workspaceGeneration: Generation;
  files: Array<{ path: string; beforeSha256: Sha256 | null; afterSha256: Sha256;
                 observedSha256: Sha256 | null; phase: 'untouched' | 'written' | 'restored' | 'uncertain' }>;
  persistence: PersistenceOutcome;
  recoveryId: Id | null; // private backup/journal handle, not a public URL
}
interface ArtifactError {
  code: 'invalid_manifest' | 'source_changed' | 'foreign_owner' | 'archived' |
    'stale_generation' | 'grant_required' | 'unsafe_path' | 'dirty_editor' |
    'disk_conflict' | 'too_large' | 'save_failed' | 'recovery_required';
  message: string; paths?: string[]; operationId?: Id;
  persistence?: PersistenceOutcome;
  localEditsRetained: boolean; // does not assert prior host state or rollback
}
type Result<T> = { ok: true; value: T } | { ok: false; error: ArtifactError };
interface CapturedDiffChunk {
  preparedOperationId: Id; capturedSnapshotSha256: Sha256; fileIndex: number; path: string;
  before: { absent: boolean; sha256: Sha256 | null; totalBytes: number; offset: number; base64: string; done: boolean };
  after: { sha256: Sha256; totalBytes: number; offset: number; base64: string; done: boolean };
}
interface PersistenceOutcome {
  mutationId: Id; payloadSha256: Sha256;
  state: 'rejected_precommit' | 'visible_uncertain' | 'durable' | 'recovery_required';
  visibleWorkspaceGeneration: Generation;
  candidateVisible: boolean; durabilityUnresolved: boolean;
}
interface ContinuationMutationRequest extends ArtifactSelection {
  mutationId: Id; payloadSha256: Sha256; conversationId: Id;
  expectedWorkspaceGeneration: Generation; expectedDraftGeneration: Generation;
}
interface ContinuationOutcome {
  persistence: PersistenceOutcome;
  mutationDraftGeneration: Generation | null;
  visibleDraftGeneration: Generation; visibleSelection: ArtifactSelection | null;
  dispatched: false;
}
interface ArtifactCommands {
  listArtifacts(request: { conversationId: Id }): Promise<Result<ArtifactRevision[]>>;
  readArtifactFile(request: ArtifactSelection & { path: string }): Promise<Result<{content: string; sha256: Sha256}>>;
  openArtifactPreview(request: ArtifactSelection): Promise<Result<{previewId: Id; kind: 'isolated-static'; writesProjectFiles: false}>>;
  prepareArtifactApply(request: MutationScope & ArtifactSelection & {targetProjectId: Id; grantId: Id}): Promise<Result<PreparedApply>>;
  readPreparedDiff(request: {preparedOperationId: Id; expectedCapturedSnapshotSha256: Sha256;
    fileIndex: number; beforeOffset: number; afterOffset: number}): Promise<Result<CapturedDiffChunk>>;
  applyPreparedArtifact(request: MutationScope & {preparedOperationId: Id}): Promise<Result<OperationReceipt>>;
  revertArtifactApply(request: MutationScope & {applyOperationId: Id}): Promise<Result<OperationReceipt>>;
  inspectArtifactOperation(request: {operationId: Id}): Promise<Result<OperationReceipt>>;
  selectArtifactForContinuation(request: ContinuationMutationRequest): Promise<Result<ContinuationOutcome>>;
  reconcileContinuationMutation(request: {mutationId: Id; payloadSha256: Sha256; conversationId: Id}): Promise<Result<ContinuationOutcome>>;
}
// Host validates caller ownership for reads as well as writes. UI flags/IDs alone
// are not authority. Original source hashes are rechecked at selection and Send.
