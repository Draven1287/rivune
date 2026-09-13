import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHostSnapshot, parseHostAcknowledgement, parseHostRunEvent } from '../src/host/contracts.ts';

const provider = () => ({ id:'configured-codex',kind:'codex',executablePath:'/fixture/codex',model:null,timeoutMs:60000 });
const selection = () => ({schemaVersion:1,providerID:'configured-codex',modelID:null,effortID:null,catalogRevision:'fixture-revision'});
function fixture() {
  return {
    schemaVersion:1, activeConversationID:'chat', selectedProviderID:'configured-codex', providers:[provider()],
    conversations:[{id:'chat',title:'Host conversation',readOnly:false,draft:'Saved text',richDraft:{schemaVersion:1,revision:3,attachmentIDs:[],selection:selection(),team:null},approvedContext:{}}],
    runs:[{id:'request',conversationID:'chat',status:'completed',updatedAt:'2026-09-09T00:00:00Z',admitted:{requestID:'request',conversationID:'chat',prompt:'Real prompt',mode:'direct',provider:provider(),retryOf:null,approvedContext:{documents:''}},answer:'Durable host answer',error:null}],
    projects:[],attachments:[],runtimeCapabilities:{schemaVersion:1,constellation:'unavailable',minimumMembers:2,reasonCode:'NEEDS_TWO_READY_ROUTES'},futurePublicField:{ignored:true},
  };
}
function event() {
  return {schemaVersion:1,eventID:'request:2',requestID:'request',conversationID:'chat',sequence:2,kind:'providerStarted',phase:'direct',state:'running',memberID:null,providerID:'configured-codex',role:null,summary:'Provider started',textDelta:null,error:null};
}

test('public snapshot projects exact host identities, rich revision and durable run answer', () => {
  const result=parseHostSnapshot(fixture());
  assert.equal(result.conversations[0].richDraft.revision,3); assert.equal(result.runs[0].admitted.prompt,'Real prompt');
  assert.equal(result.runs[0].answer,'Durable host answer'); assert.equal(result.runs[0].status,'completed');
  assert.equal(result.runs[0].admitted.mode,'direct'); assert(!('mode' in result.runs[0]));
  assert(!('approvedContext' in result.runs[0].admitted)); assert(!('futurePublicField' in result));
});
test('all actual durable run states remain distinct, including preserved imported history', () => {
  for (const status of ['queued','running','completed','failed','cancelled','preserved']) {
    const f=fixture(); f.runs[0].status=status; f.runs[0].admitted.provider={id:'old-import',kind:'imported',executablePath:'',model:null,timeoutMs:0};
    assert.equal(parseHostSnapshot(f).runs[0].status,status);
  }
});
test('rejects malformed required fields, unsafe revisions, duplicate identities and wrong cross references', () => {
  const mutations=[
    f=>{f.schemaVersion=2;}, f=>{delete f.conversations[0].draft;}, f=>{f.conversations[0].readOnly='false';},
    f=>{f.conversations[0].richDraft.revision=Number.MAX_SAFE_INTEGER+1;}, f=>{f.conversations.push({...f.conversations[0]});},
    f=>{f.runs.push({...f.runs[0]});}, f=>{f.providers.push({...f.providers[0]});}, f=>{f.runs[0].status='succeeded';},
    f=>{f.runs[0].admitted.requestID='other';}, f=>{f.runs[0].admitted.conversationID='other';},
    f=>{f.runs[0].conversationID='missing';f.runs[0].admitted.conversationID='missing';},
    f=>{f.activeConversationID='missing';}, f=>{f.selectedProviderID='missing';}, f=>{f.conversations[0].projectID='missing';},
    f=>{f.conversations[0].richDraft.selection.effortID='high';}, f=>{f.runtimeCapabilities.constellation='ready';},
  ];
  for (const change of mutations) {const f=fixture();change(f);assert.throws(()=>parseHostSnapshot(f),/incompatible/);}
});
test('attachment references require metadata owned by the same conversation', () => {
  const f=fixture(); f.conversations[0].richDraft.attachmentIDs=['attachment'];
  assert.throws(()=>parseHostSnapshot(f));
  f.attachments=[{attachmentID:'attachment',conversationID:'chat',displayName:'notes.txt',byteLength:10,sha256:'a'.repeat(64),sourceState:'valid'}];
  assert.deepEqual(parseHostSnapshot(f).conversations[0].richDraft.attachmentIDs,['attachment']);
  f.attachments[0].conversationID='different';assert.throws(()=>parseHostSnapshot(f));
});
test('team state is preserved for safe direct-mode gating and lead routes must match', () => {
  const f=fixture();const rich=f.conversations[0].richDraft;
  rich.team={schemaVersion:1,leadIndex:0,members:[selection(),{...selection(),providerID:'other-route'}]};
  assert.equal(parseHostSnapshot(f).conversations[0].richDraft.team.members.length,2);
  rich.team.leadIndex=1;assert.throws(()=>parseHostSnapshot(f));
});
test('acknowledgements are identity bound and invalid or newer payloads remain uncertain', () => {
  for(const state of ['accepted','rejected','uncertain']) assert.deepEqual(parseHostAcknowledgement({requestID:'request',state},'request'),{requestID:'request',state});
  for(const value of [null,{requestID:'wrong',state:'accepted'},{requestID:'request',state:'done'},{requestID:'request',state:'accepted',error:42},{requestID:'request',state:'accepted',newMeaning:true}]) {
    assert.deepEqual(parseHostAcknowledgement(value,'request'),{state:'uncertain',requestID:'request'});
  }
});
test('events preserve exact typed phases and ordered identity without inventing deltas', () => {
  assert.deepEqual(parseHostRunEvent(event()),event());
  for(const change of [v=>{v.eventID='wrong';},v=>{v.sequence=0;},v=>{v.state='done';},v=>{v.phase='thinking';},v=>{v.schemaVersion=2;},v=>{v.summary='é'.repeat(257);},v=>{v.extra='unsupported';},v=>{delete v.textDelta;}]) {
    const v=event();change(v);assert.equal(parseHostRunEvent(v),null);
  }
});

test('saved artifact metadata enforces exact provenance and excludes private fields',async()=>{
  const f=fixture();f.artifacts=[{schemaVersion:1,artifactID:'artifact',conversationID:'chat',requestID:'request',origin:{kind:'finalAnswer',memberID:null,providerID:'configured-codex'},displayName:'Final answer',previewKind:'plainText',languageHint:null,byteLength:5,contentSHA256:'a'.repeat(64),availability:'available',createdAt:'today',supersedesArtifactID:null}];assert.equal(parseHostSnapshot(f).artifacts.length,1);
  for(const change of [a=>a.text='leak',a=>a.origin.invocationID='private',a=>a.conversationID='wrong',a=>a.requestID='wrong',a=>a.origin.providerID='other',a=>a.supersedesArtifactID=a.artifactID,a=>a.schemaVersion=2,a=>a.storage={},a=>a.previewKind='html']){const bad=structuredClone(f);change(bad.artifacts[0]);assert.throws(()=>parseHostSnapshot(bad));}
});
test('saved artifact inspection validates exact Unicode hash and rejects malformed data',async()=>{
  const {parseArtifactRequest,parseArtifactInspection}=await import('../src/host/contracts.ts');const {createHash}=await import('node:crypto');const text='\n🪐 e\u0301\r\n<script>no()</script>';const contentSHA256=createHash('sha256').update(text).digest('hex');
  const q={artifactID:'artifact',conversationID:'chat',requestID:'request',expectedSHA256:contentSHA256};const v={schemaVersion:1,artifactID:'artifact',conversationID:'chat',requestID:'request',contentSHA256,previewKind:'plainText',languageHint:null,byteLength:Buffer.byteLength(text),availability:'available',text};assert.equal((await parseArtifactInspection(v,q)).text,text);
  for(const change of [v=>v.text+='!',v=>v.conversationID='other',v=>v.requestID='other',v=>v.artifactID='other',v=>v.path='/private',v=>v.schemaVersion=2,v=>v.byteLength=0,v=>v.text='x'.repeat(2097153)]){const bad=structuredClone(v);change(bad);await assert.rejects(()=>parseArtifactInspection(bad,q));}
  assert.throws(()=>parseArtifactRequest({...q,path:'/tmp'}));assert.throws(()=>parseArtifactRequest({...q,artifactID:'../file'}));let accessed=false;const getter={...q};Object.defineProperty(getter,'artifactID',{get(){accessed=true;return 'artifact';},enumerable:true});assert.throws(()=>parseArtifactRequest(getter));assert.equal(accessed,false);
});

test('saved artifact inspection rejects lone surrogates without repairing text and retains valid Unicode',async()=>{
 const {parseArtifactInspection}=await import('../src/host/contracts.ts');const {createHash}=await import('node:crypto');
 const inspect=text=>{const bytes=new TextEncoder().encode(text);const sha=createHash('sha256').update(bytes).digest('hex');return parseArtifactInspection({schemaVersion:1,artifactID:'a',conversationID:'c',requestID:'r',contentSHA256:sha,previewKind:'plainText',languageHint:null,byteLength:bytes.length,availability:'available',text},{artifactID:'a',conversationID:'c',requestID:'r',expectedSHA256:sha});};
 for(const text of ['\uD800','\uDC00','x\uD800y','\uD800\uD800','\uDC00\uD800']) await assert.rejects(()=>inspect(text));
 for(const text of ['\uD83E\uDE90','e\u0301','\uFFFD','\uFEFFexact','\n🪐\r\n']) assert.equal((await inspect(text)).text,text);
});
