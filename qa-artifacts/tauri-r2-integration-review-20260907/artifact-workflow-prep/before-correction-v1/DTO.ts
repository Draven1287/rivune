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
  state: 'prepared';
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
  recoveryId: Id | null; // private backup/journal handle, not a public URL
}
interface ArtifactError {
  code: 'invalid_manifest' | 'source_changed' | 'foreign_owner' | 'archived' |
    'stale_generation' | 'grant_required' | 'unsafe_path' | 'dirty_editor' |
    'disk_conflict' | 'too_large' | 'save_failed' | 'recovery_required';
  message: string; paths?: string[]; operationId?: Id;
  draftPreserved: boolean; // host-observed outcome, not unconditional promise
}
type Result<T> = { ok: true; value: T } | { ok: false; error: ArtifactError };
interface ArtifactCommands {
  listArtifacts(request: { conversationId: Id }): Promise<Result<ArtifactRevision[]>>;
  readArtifactFile(request: ArtifactSelection & { path: string }): Promise<Result<{content: string; sha256: Sha256}>>;
  openArtifactPreview(request: ArtifactSelection): Promise<Result<{previewId: Id; kind: 'isolated-static'; writesProjectFiles: false}>>;
  prepareArtifactApply(request: MutationScope & ArtifactSelection & {targetProjectId: Id; grantId: Id}): Promise<Result<PreparedApply>>;
  applyPreparedArtifact(request: MutationScope & {preparedOperationId: Id}): Promise<Result<OperationReceipt>>;
  revertArtifactApply(request: MutationScope & {applyOperationId: Id}): Promise<Result<OperationReceipt>>;
  inspectArtifactOperation(request: {operationId: Id}): Promise<Result<OperationReceipt>>;
  selectArtifactForContinuation(request: MutationScope & ArtifactSelection & {expectedDraftGeneration: Generation}):
    Promise<Result<{draftGeneration: Generation; selection: ArtifactSelection; dispatched: false}>>;
}
// Host validates caller ownership for reads as well as writes. UI flags/IDs alone
// are not authority. Original source hashes are rechecked at selection and Send.
