/** Typed, validated public-host projections. These are not demo view models. */
export interface HostProviderConfig { id: string; kind: 'codex' | 'claude' | 'fixture' | 'imported'; executablePath: string; model: string | null; timeoutMs: number }
export interface HostModelSelection { schemaVersion: 1; providerID: string; modelID: string | null; effortID: string | null; catalogRevision: string }
export interface HostTeamSelection { schemaVersion: 1; leadIndex: number; members: HostModelSelection[] }
export interface HostRichDraft { schemaVersion: 1; revision: number; attachmentIDs: string[]; selection: HostModelSelection | null; team: HostTeamSelection | null }
export interface HostConversation { id: string; title: string; readOnly: boolean; draft: string; richDraft: HostRichDraft; projectID: string | null }
export type HostRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'preserved';
export interface HostRun {
  failedInvocationID: string | null; failedAttemptID: string | null;
  id: string; conversationID: string; status: HostRunStatus; updatedAt: string;
  admitted: { requestID: string; conversationID: string; prompt: string; mode: string; provider: HostProviderConfig; retryOf: string | null; team: HostTeamSelection | null };
  answer: string | null; error: string | null;
  activity: HostRunEvent[] | null;
  memberResults: { memberID: string; providerID: string | null; role: 'independentAnswer'; text: string; truncated: boolean }[];
  resolution: { kind: 'leadSynthesis'; reviewed: boolean; reviewerMemberID: string; providerID: string | null; summary: string } | null;
}
export interface HostRuntimeCapabilities { schemaVersion: 1; constellation: 'available' | 'unavailable'; minimumMembers: 2; reasonCode: string | null }
export interface HostSnapshot {
  artifacts: HostArtifactSummary[];
  schemaVersion: 1; conversations: HostConversation[]; runs: HostRun[]; providers: HostProviderConfig[];
  activeConversationID: string | null; selectedProviderID: string | null; runtimeCapabilities: HostRuntimeCapabilities | null;
}
export interface HostAcknowledgement { state: 'accepted' | 'rejected' | 'uncertain'; requestID: string; error?: string }
export interface HostRunEvent {
  schemaVersion: 1; eventID: string; requestID: string; conversationID: string; sequence: number;
  kind: 'admitted' | 'providerStarted' | 'answerDelta' | 'memberStarted' | 'memberCompleted' | 'leadReviewStarted' | 'finalCompleted' | 'failed' | 'cancelled' | 'recoveryRequired';
  phase: 'admission' | 'direct' | 'decide' | 'contribute' | 'integrate' | 'review' | 'final' | 'recovery';
  state: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'uncertain';
  memberID: string | null; providerID: string | null; role: string | null; summary: string; textDelta: string | null; error: string | null;
}

const incompatible = (): never => { throw new Error('Rivune host returned incompatible workspace data. Refresh to try again.'); };
function object(value: unknown, keys?: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return incompatible();
  if (keys && Object.keys(value).some((key) => !keys.includes(key))) return incompatible();
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 128, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value) || new TextEncoder().encode(value).length > max) return incompatible();
  return value;
}
function nullableString(value: unknown, max = 128, empty = false): string | null { return value === null ? null : string(value, max, empty); }
function integer(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) return incompatible();
  return value;
}
function bool(value: unknown): boolean { return typeof value === 'boolean' ? value : incompatible(); }
function enumValue<const T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) return incompatible();
  return value as T[number];
}
function array(value: unknown, max: number): unknown[] { return Array.isArray(value) && value.length <= max ? value : incompatible(); }
function unique<T>(items: T[], identify: (item: T) => string): T[] {
  if (new Set(items.map(identify)).size !== items.length) return incompatible();
  return items;
}
function version(value: unknown) { if (value !== 1) incompatible(); }
function parseProvider(value: unknown): HostProviderConfig {
  const v = object(value);
  return { id: string(v.id), kind: enumValue(v.kind, ['codex', 'claude', 'fixture', 'imported']), executablePath: string(v.executablePath, 4096, true), model: nullableString(v.model), timeoutMs: integer(v.timeoutMs) };
}
function parseSelection(value: unknown): HostModelSelection | null {
  if (value === null) return null;
  const v = object(value, ['schemaVersion', 'providerID', 'modelID', 'effortID', 'catalogRevision']); version(v.schemaVersion);
  const modelID = nullableString(v.modelID); const effortID = nullableString(v.effortID);
  if (modelID === null && effortID !== null) incompatible();
  return { schemaVersion: 1, providerID: string(v.providerID), modelID, effortID, catalogRevision: string(v.catalogRevision) };
}
function parseTeam(value: unknown): HostTeamSelection | null {
  if (value === null) return null;
  const v = object(value, ['schemaVersion', 'leadIndex', 'members']); version(v.schemaVersion);
  const members = array(v.members, 6).map((item) => parseSelection(item) ?? incompatible());
  const leadIndex = integer(v.leadIndex);
  if (members.length < 2 || leadIndex >= members.length) incompatible();
  unique(members, (item) => JSON.stringify([item.providerID, item.modelID, item.effortID]));
  return { schemaVersion: 1, leadIndex, members };
}
function parseRichDraft(value: unknown): HostRichDraft {
  const v = object(value); version(v.schemaVersion);
  const attachmentIDs = unique(array(v.attachmentIDs, 4).map((id) => string(id)), (id) => id);
  const selection = parseSelection(v.selection); const team = parseTeam(v.team);
  const route = (item: HostModelSelection | null) => item === null ? null : [item.providerID, item.modelID, item.effortID];
  if (team && JSON.stringify(route(selection)) !== JSON.stringify(route(team.members[team.leadIndex]))) incompatible();
  return { schemaVersion: 1, revision: integer(v.revision), attachmentIDs, selection, team };
}
function parseConversation(value: unknown): HostConversation {
  const v = object(value);
  return { id: string(v.id), title: string(v.title, 4096, true), readOnly: bool(v.readOnly), draft: string(v.draft, 1_048_576, true), richDraft: parseRichDraft(v.richDraft), projectID: v.projectID === undefined ? null : nullableString(v.projectID) };
}
function parseRun(value: unknown): HostRun {
  const v = object(value); const admitted = object(v.admitted);
  const id = string(v.id); const conversationID = string(v.conversationID);
  if (admitted.requestID !== id || admitted.conversationID !== conversationID) incompatible();
  const team = admitted.team === undefined ? null : parseTeam(admitted.team);
  function member(memberID: string, providerID: string | null) {
    const boundTeam = team ?? incompatible();
    const index = boundTeam.members.findIndex((_, i) => `member-${i + 1}` === memberID);
    if (index < 0 || (providerID !== null && boundTeam.members[index].providerID !== providerID)) incompatible();
  }
  let activity: HostRunEvent[] | null = null;
  if (v.activity !== undefined && v.activity !== null) {
    const a = object(v.activity, ['schemaVersion', 'baseSequence', 'entries']); version(a.schemaVersion);
    const base = integer(a.baseSequence, 1);
    activity = array(a.entries, 256).map((raw, i) => {
      const e = parseHostRunEvent(raw) ?? incompatible();
      if (e.requestID !== id || e.conversationID !== conversationID || e.sequence !== base + i) incompatible();
      if (e.memberID !== null) member(e.memberID, e.providerID);
      return e;
    });
  }
  let total = 0;
  const memberResults = unique(array(v.memberResults ?? [], 6).map(raw => {
    const r = object(raw, ['schemaVersion', 'memberID', 'providerID', 'role', 'text', 'truncated']); version(r.schemaVersion);
    const memberID = string(r.memberID), providerID = nullableString(r.providerID);
    member(memberID, providerID);
    const text = string(r.text, 24 * 1024, true); total += new TextEncoder().encode(text).length;
    if (total > 96 * 1024) incompatible();
    return { memberID, providerID, role: enumValue(r.role, ['independentAnswer']), text, truncated: bool(r.truncated) };
  }), r => r.memberID);
  let resolution: HostRun['resolution'] = null;
  if (v.resolution !== undefined && v.resolution !== null) {
    const r = object(v.resolution, ['schemaVersion', 'kind', 'reviewed', 'reviewerMemberID', 'providerID', 'summary']); version(r.schemaVersion);
    const reviewerMemberID = string(r.reviewerMemberID), providerID = nullableString(r.providerID); member(reviewerMemberID, providerID);
    if (reviewerMemberID !== `member-${team!.leadIndex + 1}`) incompatible();
    resolution = { kind: enumValue(r.kind, ['leadSynthesis']), reviewed: bool(r.reviewed), reviewerMemberID, providerID, summary: string(r.summary, 1024, true) };
  }
  const failedInvocationID = nullableString(v.failedInvocationID ?? null), failedAttemptID = nullableString(v.failedAttemptID ?? null);
  if (failedInvocationID !== null && (!failedInvocationID.trim() || !failedAttemptID?.trim())) incompatible();
  if ((failedInvocationID === null) !== (failedAttemptID === null) || (failedInvocationID !== null && (admitted.mode !== 'constellation' || !team))) incompatible();
  return {
    id, conversationID, status: enumValue(v.status, ['queued', 'running', 'completed', 'failed', 'cancelled', 'preserved']), updatedAt: string(v.updatedAt, 128),
    admitted: { requestID: id, conversationID, prompt: string(admitted.prompt, 1_048_576, true), mode: string(admitted.mode), provider: parseProvider(admitted.provider), retryOf: nullableString(admitted.retryOf), team },
    answer: nullableString(v.answer, 4_194_304, true), error: nullableString(v.error, 65_536, true),
    activity, memberResults, resolution,
    failedInvocationID, failedAttemptID,
  };
}
function parseCapabilities(value: unknown): HostRuntimeCapabilities | null {
  if (value === undefined || value === null) return null;
  const v = object(value, ['schemaVersion', 'constellation', 'minimumMembers', 'reasonCode']); version(v.schemaVersion);
  if (v.minimumMembers !== 2) incompatible();
  return { schemaVersion: 1, constellation: enumValue(v.constellation, ['available', 'unavailable']), minimumMembers: 2, reasonCode: nullableString(v.reasonCode) };
}

export function parseHostSnapshot(value: unknown): HostSnapshot {
  const v = object(value); version(v.schemaVersion);
  const conversations = unique(array(v.conversations, 10_000).map(parseConversation), (item) => item.id);
  const runs = unique(array(v.runs, 50_000).map(parseRun), (item) => item.id);
  const providers = unique(array(v.providers, 128).map(parseProvider), (item) => item.id);
  const conversationIDs = new Set(conversations.map((item) => item.id));
  const providerIDs = new Set(providers.map((item) => item.id));
  const activeConversationID = nullableString(v.activeConversationID);
  const selectedProviderID = nullableString(v.selectedProviderID);
  if ((activeConversationID !== null && !conversationIDs.has(activeConversationID)) || (selectedProviderID !== null && !providerIDs.has(selectedProviderID))) incompatible();
  for (const run of runs) if (!conversationIDs.has(run.conversationID)) incompatible();
  // Historical admitted provider identities may no longer be configured. Do not
  // bind them to a current route merely because names or executable paths match.
  const projects = unique(array(v.projects ?? [], 10_000).map((item) => {
    const project = object(item); version(project.schemaVersion);
    string(project.name, 4096); string(project.instructions, 1_048_576, true);
    return { id: string(project.id) };
  }), (item) => item.id);
  const projectIDs = new Set(projects.map((item) => item.id));
  const activeProjectID = v.activeProjectID === undefined ? null : nullableString(v.activeProjectID);
  if (activeProjectID !== null && !projectIDs.has(activeProjectID)) incompatible();
  const attachments = unique(array(v.attachments ?? [], 40_000).map((item) => {
    const attachment = object(item);
    string(attachment.displayName, 256); const byteLength = integer(attachment.byteLength, 1);
    if (byteLength > 65_536 || !/^[a-f0-9]{64}$/.test(string(attachment.sha256))) incompatible();
    enumValue(attachment.sourceState, ['unchecked', 'valid', 'changed', 'missing', 'permissionRequired']);
    return { id: string(attachment.attachmentID), conversationID: string(attachment.conversationID) };
  }), (item) => item.id);
  const attachmentMap = new Map(attachments.map((item) => [item.id, item.conversationID]));
  for (const attachment of attachments) if (!conversationIDs.has(attachment.conversationID)) incompatible();
  for (const conversation of conversations) {
    if (conversation.projectID !== null && !projectIDs.has(conversation.projectID)) incompatible();
    if (conversation.richDraft.attachmentIDs.some((id) => attachmentMap.get(id) !== conversation.id)) incompatible();
  }
  return { schemaVersion: 1, artifacts: parseArtifactSummaries(v.artifacts,runs), conversations, runs, providers, activeConversationID, selectedProviderID, runtimeCapabilities: parseCapabilities(v.runtimeCapabilities) };
}

export function parseHostAcknowledgement(value: unknown, requestID: string): HostAcknowledgement {
  try {
    const v = object(value, ['state', 'requestID', 'error']);
    if (string(v.requestID) !== requestID) incompatible();
    const state = enumValue(v.state, ['accepted', 'rejected', 'uncertain']);
    return { state, requestID, ...(v.error === undefined ? {} : { error: string(v.error, 65_536, true) }) };
  } catch { return { state: 'uncertain', requestID }; }
}

/** Structural validation only; controller must check run identity and sequence. */
export function parseHostRunEvent(value: unknown): HostRunEvent | null {
  try {
    const v = object(value, ['schemaVersion', 'eventID', 'requestID', 'conversationID', 'sequence', 'kind', 'phase', 'state', 'memberID', 'providerID', 'role', 'summary', 'textDelta', 'error']);
    version(v.schemaVersion);
    const requestID = string(v.requestID); const sequence = integer(v.sequence, 1);
    const eventID = string(v.eventID, 256);
    if (eventID !== `${requestID}:${sequence}`) incompatible();
    return {
      schemaVersion: 1, eventID, requestID, sequence, conversationID: string(v.conversationID),
      kind: enumValue(v.kind, ['admitted', 'providerStarted', 'answerDelta', 'memberStarted', 'memberCompleted', 'leadReviewStarted', 'finalCompleted', 'failed', 'cancelled', 'recoveryRequired']),
      phase: enumValue(v.phase, ['admission', 'direct', 'decide', 'contribute', 'integrate', 'review', 'final', 'recovery']),
      state: enumValue(v.state, ['queued', 'running', 'completed', 'failed', 'cancelled', 'uncertain']),
      memberID: nullableString(v.memberID), providerID: nullableString(v.providerID), role: nullableString(v.role), summary: string(v.summary, 512), textDelta: nullableString(v.textDelta, 16_384), error: nullableString(v.error, 1024),
    };
  } catch { return null; }
}

export interface HostArtifactRequest { artifactID: string; conversationID: string; requestID: string; expectedSHA256: string }
export interface HostArtifactSummary {
  schemaVersion: 1; artifactID: string; conversationID: string; requestID: string;
  origin: { kind: 'finalAnswer' | 'memberAnswer'; memberID: string | null; providerID: string | null };
  displayName: string; previewKind: 'plainText'; languageHint: null; byteLength: number; contentSHA256: string;
  availability: 'available'; createdAt: string; supersedesArtifactID: string | null;
}
export interface HostArtifactInspection extends Omit<HostArtifactRequest, 'expectedSHA256'> { schemaVersion: 1; previewKind: 'plainText'; languageHint: null; byteLength: number; contentSHA256: string; availability: 'available'; text: string }
const artifactID = (v: unknown): string => { const s = string(v); if (!/^[A-Za-z0-9_:.-]+$/.test(s)) incompatible(); return s; };
const artifactHash = (v: unknown): string => { const s = string(v); if (!/^[a-f0-9]{64}$/.test(s)) incompatible(); return s; };
export function parseArtifactRequest(value: unknown): HostArtifactRequest {
  const v=object(value,['artifactID','conversationID','requestID','expectedSHA256']);
  if (Object.getPrototypeOf(v)!==Object.prototype && Object.getPrototypeOf(v)!==null) incompatible();
  if (Object.getOwnPropertyNames(v).length!==4 || Object.getOwnPropertySymbols(v).length || Object.values(Object.getOwnPropertyDescriptors(v)).some(d=>!('value' in d))) incompatible();
  return {artifactID:artifactID(v.artifactID),conversationID:artifactID(v.conversationID),requestID:artifactID(v.requestID),expectedSHA256:artifactHash(v.expectedSHA256)};
}
function parseArtifactSummary(value: unknown): HostArtifactSummary {
  const v=object(value,['schemaVersion','artifactID','conversationID','requestID','origin','displayName','previewKind','languageHint','byteLength','contentSHA256','availability','createdAt','supersedesArtifactID']);version(v.schemaVersion);
  const origin=object(v.origin,['kind','memberID','providerID']);
  const kind=enumValue(origin.kind,['finalAnswer','memberAnswer']);
  const memberID=origin.memberID===null?null:artifactID(origin.memberID);
  if ((kind==='finalAnswer') !== (memberID===null) || v.languageHint!==null) incompatible();
  const byteLength=integer(v.byteLength);if(byteLength>2*1024*1024) incompatible();
  return {schemaVersion:1,artifactID:artifactID(v.artifactID),conversationID:artifactID(v.conversationID),requestID:artifactID(v.requestID),origin:{kind,memberID,providerID:origin.providerID===null?null:artifactID(origin.providerID)},displayName:string(v.displayName,256),previewKind:enumValue(v.previewKind,['plainText']),languageHint:null,byteLength,contentSHA256:artifactHash(v.contentSHA256),availability:enumValue(v.availability,['available']),createdAt:string(v.createdAt),supersedesArtifactID:v.supersedesArtifactID===null?null:artifactID(v.supersedesArtifactID)};
}
function parseArtifactSummaries(value:unknown,runs:HostRun[]):HostArtifactSummary[] {
  const artifacts=unique(array(value??[],400_000).map(parseArtifactSummary),a=>a.artifactID);
  const seen=new Map<string,HostArtifactSummary>();
  for(const a of artifacts){
    const run=runs.find(r=>r.id===a.requestID && r.conversationID===a.conversationID) ?? incompatible();
    let expectedProvider=run.admitted.provider.id;
    if(a.origin.kind==='memberAnswer'){
      const member=a.origin.memberID!;if(!/^member-[1-6]$/.test(member)) incompatible();
      const selected=run.admitted.team?.members[Number(member.slice(7))-1] ?? incompatible();expectedProvider=selected.providerID;
    }
    if(a.origin.providerID!==expectedProvider || a.displayName!==(a.origin.kind==='finalAnswer'?'Final answer':`${a.origin.memberID} answer`)) incompatible();
    if(a.supersedesArtifactID!==null){const old=seen.get(a.supersedesArtifactID);if(!old || old.requestID!==a.requestID || old.conversationID!==a.conversationID || old.origin.kind!==a.origin.kind || old.origin.memberID!==a.origin.memberID || old.origin.providerID!==a.origin.providerID) incompatible();}
    seen.set(a.artifactID,a);
  }return artifacts;
}
export async function parseArtifactInspection(value:unknown,request:HostArtifactRequest):Promise<HostArtifactInspection>{
  const q=parseArtifactRequest(request);
  const v=object(value,['schemaVersion','artifactID','conversationID','requestID','previewKind','languageHint','byteLength','contentSHA256','availability','text']);version(v.schemaVersion);
  if(v.artifactID!==q.artifactID || v.conversationID!==q.conversationID || v.requestID!==q.requestID || v.contentSHA256!==q.expectedSHA256 || v.languageHint!==null) incompatible();
  const text=string(v.text,2*1024*1024,true);const bytes=new TextEncoder().encode(text);
  // TextEncoder repairs lone surrogates. Reject any lossy conversion, preserving BOM.
  if(new TextDecoder('utf-8', {ignoreBOM:true}).decode(bytes)!==text) incompatible();
  if(integer(v.byteLength)!==bytes.length) incompatible();
  const hashed=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(hashed!==q.expectedSHA256) incompatible();
  return {artifactID:q.artifactID,conversationID:q.conversationID,requestID:q.requestID,schemaVersion:1,previewKind:enumValue(v.previewKind,['plainText']),languageHint:null,byteLength:bytes.length,contentSHA256:hashed,availability:enumValue(v.availability,['available']),text};
}
