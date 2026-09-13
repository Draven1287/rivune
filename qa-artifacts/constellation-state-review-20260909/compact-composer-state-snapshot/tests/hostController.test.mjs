import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostWorkspaceController, createSessionRecoveryJournal, projectHostConversation } from '../src/host/workspaceController.ts';

const clone = value => structuredClone(value);
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve)); };
function fixture() {
  const provider = {id:'codex',kind:'codex',executablePath:'/fixture/codex',model:null,timeoutMs:60000};
  const snapshot = {
    schemaVersion:1,activeConversationID:'chat',selectedProviderID:'codex',providers:[provider],projects:[],attachments:[],runs:[],
    conversations:[{id:'chat',title:'Host chat',readOnly:false,draft:'Saved prompt',richDraft:{schemaVersion:1,revision:2,attachmentIDs:[],selection:null,team:null}}],
  };
  const catalog = {schemaVersion:1,revision:'revision',providers:[{id:'codex',label:'Codex CLI',transport:'cli',adapterState:'supported',installation:'installed',authentication:'unknown',responseTest:'notTested',catalogState:'unknown',models:[],defaults:{modelID:null,effortID:null},supportsProviderDefault:true,errorCode:null}]};
  const calls=[]; let handler=null; let pending=null; let ids=0;
  const journal={read(){calls.push(['journal.read']);return clone(pending);},write(value){calls.push(['journal.write',clone(value)]);pending=clone(value);},clear(){calls.push(['journal.clear']);pending=null;}};
  function addRun(request, status='running') {
    const run={id:request.id,conversationID:request.conversationID,status,updatedAt:'2026-09-09T00:00:00Z',admitted:{requestID:request.id,conversationID:request.conversationID,prompt:request.prompt,mode:request.mode??'direct',provider:clone(snapshot.providers.find(p=>p.id===snapshot.conversations.find(c=>c.id===request.conversationID).richDraft.selection?.providerID)??snapshot.providers.find(p=>p.id===snapshot.selectedProviderID)??provider),retryOf:null,team:clone(snapshot.conversations.find(c=>c.id===request.conversationID).richDraft.team)},answer:null,error:null};
    snapshot.runs.push(run); return run;
  }
  const bridge={
    async getSnapshot(){calls.push(['snapshot']);return clone(snapshot);},
    async getModelCatalog(){calls.push(['catalog']);return clone(catalog);},
    async onRunEvent(callback){calls.push(['subscribe']);handler=callback;return()=>{calls.push(['unsubscribe']);handler=null;};},
    async saveRichDraft(request){
      calls.push(['save',clone(request)]);
      const conversation=snapshot.conversations.find(c=>c.id===request.conversationID);
      conversation.draft=request.draft;conversation.richDraft={schemaVersion:1,revision:request.expectedRevision+1,attachmentIDs:clone(request.attachmentIDs),selection:clone(request.selection),team:clone(request.team)};
      return {state:'durable',mutationID:request.mutationID,conversationID:request.conversationID,revision:conversation.richDraft.revision,attachmentIDs:clone(request.attachmentIDs),selection:clone(request.selection),team:clone(request.team)};
    },
    async submitRun(request){calls.push(['submit',clone(request)]);addRun(request);snapshot.conversations.find(c=>c.id===request.conversationID).draft='';return {state:'accepted',requestID:request.id};},
    async reconcileRun(requestID){calls.push(['reconcile',requestID]);return {state:snapshot.runs.some(run=>run.id===requestID)?'accepted':'uncertain',requestID};},
    async cancelRun(requestID){calls.push(['cancel',requestID]);snapshot.runs.find(run=>run.id===requestID).status='cancelled';return {state:'accepted',requestID};},
    async createConversation(){throw Error('not used');},async openConversation(){throw Error('not used');},
  };
  const controller=()=>createHostWorkspaceController(bridge,journal,{id:()=>`id-${++ids}`,pollMs:1_000_000});
  return {snapshot,catalog,calls,journal,bridge,controller,addRun,get pending(){return pending;},set pending(value){pending=value;},emit(value){handler?.(value);}};
}
function runEvent(requestID,conversationID,sequence,overrides={}) {
  return {schemaVersion:1,eventID:`${requestID}:${sequence}`,requestID,conversationID,sequence,kind:'providerStarted',phase:'direct',state:'running',memberID:null,providerID:'codex',role:null,summary:'Provider started',textDelta:null,error:null,...overrides};
}
const count=(f,name)=>f.calls.filter(call=>call[0]===name).length;

test('hydrates real host snapshot and subscribes once; dispose unsubscribes',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();await c.start();
  assert.equal(c.getState().phase,'ready');assert.equal(c.getState().snapshot.conversations[0].title,'Host chat');assert.equal(c.getState().drafts.chat,'Saved prompt');
  assert.equal(count(f,'subscribe'),1);assert.equal(count(f,'submit'),0);c.dispose();assert.equal(count(f,'unsubscribe'),1);
});
test('direct send saves exact CAS/inherited default and journals identity before one submission',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','User edited prompt');await c.send('chat');
  const save=f.calls.find(call=>call[0]==='save')[1],submit=f.calls.find(call=>call[0]==='submit')[1];
  assert.equal(save.expectedRevision,2);assert.equal(save.selection,null);assert.deepEqual(save.attachmentIDs,[]);assert.equal(save.team,null);
  assert.deepEqual(submit,{id:'id-2',conversationID:'chat',prompt:'User edited prompt',mode:'direct',richDraftRevision:3});
  assert(f.calls.findIndex(call=>call[0]==='save')<f.calls.findIndex(call=>call[0]==='journal.write'));
  assert(f.calls.findIndex(call=>call[0]==='journal.write')<f.calls.findIndex(call=>call[0]==='submit'));
  assert.equal(count(f,'submit'),1);assert.equal(c.getState().phase,'running');assert.equal(c.getState().pending,null);assert.equal(c.getState().drafts.chat,'');
});
test('rapid double click cannot admit a duplicate request',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();
  const first=c.send('chat');await assert.rejects(c.send('chat'),/unavailable/);await first;
  assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),1);
});
test('rejected submission retains draft and clears resolved pending identity',async t=>{
  const f=fixture();f.bridge.submitRun=async request=>{f.calls.push(['submit',clone(request)]);return {state:'rejected',requestID:request.id,error:'rejected'};};
  const c=f.controller();t.after(()=>c.dispose());await c.start();await c.send('chat');
  assert.equal(c.getState().pending,null);assert.equal(c.getState().drafts.chat,'Saved prompt');assert.match(c.getState().error,/rejected/);assert.equal(count(f,'submit'),1);
});
test('thrown or wrong-identity submission stays uncertain and refuses another send',async t=>{
  for(const outcome of ['throw','wrong']) {
    const f=fixture();f.bridge.submitRun=async request=>{f.calls.push(['submit',clone(request)]);if(outcome==='throw')throw Error('invoke failed');return {state:'accepted',requestID:'wrong'};};
    const c=f.controller();t.after(()=>c.dispose());await c.start();await c.send('chat');
    assert.equal(c.getState().phase,'uncertain');assert.equal(c.getState().pending.requestID,'id-2');assert.equal(f.pending.requestID,'id-2');
    await assert.rejects(c.send('chat'),/Reconcile/);assert.equal(count(f,'submit'),1);
  }
});
test('reconciliation confirms accepted saved run without resubmitting',async t=>{
  const f=fixture();f.bridge.submitRun=async request=>{f.calls.push(['submit',clone(request)]);throw Error('lost reply');};
  const c=f.controller();t.after(()=>c.dispose());await c.start();await c.send('chat');
  const request=f.calls.find(call=>call[0]==='submit')[1];f.addRun(request);await c.reconcile();
  assert.equal(count(f,'submit'),1);assert.equal(count(f,'reconcile'),1);assert.equal(c.getState().pending,null);assert.equal(f.pending,null);assert.equal(c.getState().phase,'running');
});
test('restart journal reconciles existing request without replaying prompt',async t=>{
  const f=fixture();f.pending={requestID:'recovered',conversationID:'chat'};f.addRun({id:'recovered',conversationID:'chat',prompt:'Previous prompt'});
  const c=f.controller();t.after(()=>c.dispose());await c.start();
  assert.deepEqual(f.calls.find(call=>call[0]==='reconcile'),['reconcile','recovered']);assert.equal(count(f,'submit'),0);assert.equal(count(f,'save'),0);assert.equal(f.pending,null);assert.equal(c.getState().phase,'running');
});
test('wrong request, wrong conversation, duplicate and older events cannot refresh or alter text',async t=>{
  const f=fixture();f.addRun({id:'run',conversationID:'chat',prompt:'Prompt'});const c=f.controller();t.after(()=>c.dispose());await c.start();
  let before=count(f,'snapshot');f.emit(runEvent('other','chat',1));f.emit(runEvent('run','other-chat',1));await flush();assert.equal(count(f,'snapshot'),before);
  f.emit(runEvent('run','chat',3,{textDelta:'Not a durable answer'}));await flush();assert.equal(count(f,'snapshot'),before+1);assert.equal(c.getState().snapshot.runs[0].answer,null);
  before=count(f,'snapshot');f.emit(runEvent('run','chat',3));f.emit(runEvent('run','chat',2));await flush();assert.equal(count(f,'snapshot'),before);
});
test('terminal event renders final answer from refreshed durable snapshot, never event text',async t=>{
  const f=fixture();const run=f.addRun({id:'run',conversationID:'chat',prompt:'Prompt'});const c=f.controller();t.after(()=>c.dispose());await c.start();
  run.status='completed';run.answer='Durable answer';f.emit(runEvent('run','chat',4,{kind:'finalCompleted',phase:'final',state:'completed',textDelta:'Different event text'}));await flush();
  assert.equal(c.getState().phase,'ready');assert.equal(c.getState().snapshot.runs[0].answer,'Durable answer');assert.equal(count(f,'submit'),0);
});
test('cancel uses exact active request and preserves completed results',async t=>{
  const f=fixture();const done=f.addRun({id:'done',conversationID:'chat',prompt:'Earlier'},'completed');done.answer='Keep completed answer';f.addRun({id:'active',conversationID:'chat',prompt:'Current'});
  const c=f.controller();t.after(()=>c.dispose());await c.start();await c.cancel('active');
  assert.deepEqual(f.calls.find(call=>call[0]==='cancel'),['cancel','active']);assert.equal(c.getState().snapshot.runs[1].status,'cancelled');assert.equal(c.getState().snapshot.runs[0].answer,'Keep completed answer');
  await assert.rejects(c.cancel('done'),/active saved run/);assert.equal(count(f,'cancel'),1);
});
test('save conflict or changed durable snapshot prevents admission and retains edited draft',async t=>{
  for(const mode of ['conflict','changed']) {
    const f=fixture();const save=f.bridge.saveRichDraft;
    f.bridge.saveRichDraft=async request=>{const receipt=await save(request);if(mode==='conflict')return {...receipt,state:'rejected'};f.snapshot.conversations[0].draft='Concurrent edit';return receipt;};
    const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','My edit');await assert.rejects(c.send('chat'),/draft|Draft/);
    assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);assert.equal(c.getState().drafts.chat,'My edit');
  }
});
test('journal write failure prevents admission',async t=>{
  const f=fixture();f.journal.write=()=>{throw Error('quota');};const c=f.controller();t.after(()=>c.dispose());await c.start();await assert.rejects(c.send('chat'),/Nothing was submitted/);assert.equal(count(f,'submit'),0);
});
test('unavailable bridge never reads journal or runs work',async t=>{
  const f=fixture();const c=createHostWorkspaceController(null,f.journal);t.after(()=>c.dispose());await c.start();assert.equal(c.getState().phase,'disconnected');assert.equal(f.calls.length,0);await assert.rejects(c.send('chat'),/unavailable/);
});
test('session recovery journal preserves only validated versioned identity',()=>{
  const values=new Map();const journal=createSessionRecoveryJournal({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
  assert.equal(journal.read(),null);journal.write({requestID:'run',conversationID:'chat'});assert.deepEqual(journal.read(),{requestID:'run',conversationID:'chat'});journal.clear();assert.equal(journal.read(),null);
  values.set('rivune-host-pending-v1','{broken');assert.throws(()=>journal.read());assert.equal(values.get('rivune-host-pending-v1'),'{broken');
});

test('projection preserves durable prior answers and ignores event deltas',async t=>{
  const f=fixture();const earlier=f.addRun({id:'earlier',conversationID:'chat',prompt:'Earlier prompt'},'completed');earlier.answer='Earlier durable answer';
  const current=f.addRun({id:'current',conversationID:'chat',prompt:'Current prompt'});
  const c=f.controller();t.after(()=>c.dispose());await c.start();
  f.emit(runEvent('current','chat',1,{kind:'answerDelta',textDelta:'Unpersisted event text'}));await flush();
  let projected=projectHostConversation(c.getState(),'chat');
  assert.deepEqual(projected.messages.map(message=>message.content),['Earlier prompt','Earlier durable answer','Current prompt']);
  current.status='completed';current.answer='Final saved answer';f.emit(runEvent('current','chat',2,{kind:'finalCompleted',phase:'final',state:'completed',textDelta:'Wrong delta'}));await flush();
  projected=projectHostConversation(c.getState(),'chat');
  assert.deepEqual(projected.messages.map(message=>message.content),['Earlier prompt','Earlier durable answer','Current prompt','Final saved answer']);
  assert.equal(projectHostConversation(c.getState(),'unknown'),null);
});
test('unreadable recovery journal blocks all later admission attempts',async t=>{
  const f=fixture();f.journal.read=()=>{throw Error('corrupt recovery record');};const c=f.controller();t.after(()=>c.dispose());await c.start();
  assert.equal(c.getState().phase,'error');await assert.rejects(c.refresh(),/unavailable/);await assert.rejects(c.send('chat'),/unavailable/);
  assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);
});
test('accepted acknowledgement without durable run remains unresolved until safe reconciliation',async t=>{
  const f=fixture();f.bridge.submitRun=async request=>{f.calls.push(['submit',clone(request)]);return {state:'accepted',requestID:request.id};};
  const c=f.controller();t.after(()=>c.dispose());await c.start();await c.send('chat');
  assert.equal(c.getState().phase,'uncertain');assert.notEqual(f.pending,null);await assert.rejects(c.send('chat'),/Reconcile/);
  f.bridge.reconcileRun=async requestID=>({state:'rejected',requestID});await c.reconcile();
  assert.equal(c.getState().pending,null);assert.equal(f.pending,null);assert.equal(count(f,'submit'),1);assert.equal(c.getState().drafts.chat,'Saved prompt');
});
test('uncertain draft save retries same mutation identity without submitting',async t=>{
  const f=fixture();const save=f.bridge.saveRichDraft;let first=true;let attempted;
  f.bridge.saveRichDraft=async request=>{if(first){first=false;attempted=clone(request);throw Error('lost draft reply');}assert.deepEqual(request,attempted);return save(request);};
  const c=f.controller();t.after(()=>c.dispose());await c.start();await assert.rejects(c.saveDraft('chat'),/uncertain/);await c.saveDraft('chat');
  assert.equal(c.getState().snapshot.conversations[0].richDraft.revision,3);assert.equal(count(f,'submit'),0);
});

test('shutdown preparation freezes editing and all admission actions until explicit resume',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Unsent local draft');
  const inputs=c.prepareShutdownDrafts();
  assert.deepEqual(inputs,[{conversationID:'chat',draft:'Unsent local draft',clientRevision:1,expectedRichRevision:2,mutationID:'id-1',attachmentIDs:[],selection:null,team:null}]);
  assert.throws(()=>c.editDraft('chat','Blocked edit'),/paused/);
  await assert.rejects(c.send('chat'),/unavailable/);await assert.rejects(c.saveDraft('chat'),/unavailable/);await assert.rejects(c.createConversation('Another'),/unavailable/);
  assert.equal(c.getState().drafts.chat,'Unsent local draft');assert.equal(count(f,'save'),0);assert.equal(count(f,'submit'),0);
  c.resumeAfterShutdown();c.editDraft('chat','Editable again');assert.equal(c.getState().drafts.chat,'Editable again');
});
test('unresolved submission prevents shutdown admission and survives abort without replay',async t=>{
  const f=fixture();f.bridge.submitRun=async request=>{f.calls.push(['submit',clone(request)]);throw Error('lost reply');};
  const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Do once');await c.send('chat');const pending=clone(c.getState().pending);
  assert.throws(()=>c.prepareShutdownDrafts(),/Resolve pending/);assert.throws(()=>c.editDraft('chat','Frozen'),/paused/);
  c.resumeAfterShutdown();assert.deepEqual(c.getState().pending,pending);assert.deepEqual(f.pending,pending);await assert.rejects(c.send('chat'),/Reconcile/);assert.equal(count(f,'submit'),1);
});
test('shutdown request during draft save blocks later submit after that save resolves',async t=>{
  const f=fixture();const save=f.bridge.saveRichDraft;let release,entered;
  const waiting=new Promise(resolve=>{entered=resolve;});
  f.bridge.saveRichDraft=request=>new Promise(resolve=>{release=async()=>resolve(await save(request));entered();});
  const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Save without admission');
  const sending=assert.rejects(c.send('chat'),/closing/);await waiting;
  assert.throws(()=>c.prepareShutdownDrafts(),/Resolve pending/);await release();await sending;
  assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);assert.equal(c.getState().drafts.chat,'Save without admission');
  c.resumeAfterShutdown();assert.deepEqual(c.prepareShutdownDrafts(),[]);
});
test('acknowledged shutdown draft plus abort preserves newer text and its dirty revision',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','First draft');
  const [input]=c.prepareShutdownDrafts();
  // Fixture host committed the exact flush, then closing was aborted.
  f.snapshot.conversations[0].draft=input.draft;f.snapshot.conversations[0].richDraft.revision=3;
  c.acknowledgeShutdownDraft(input,3);c.resumeAfterShutdown();c.editDraft('chat','Newer after abort');await c.refresh();
  assert.equal(c.getState().drafts.chat,'Newer after abort');
  // A late acknowledgement for the older client revision cannot clear newer edits.
  c.acknowledgeShutdownDraft(input,3);await c.refresh();assert.equal(c.getState().drafts.chat,'Newer after abort');
  const [newInput]=c.prepareShutdownDrafts();assert.equal(newInput.draft,'Newer after abort');assert.equal(newInput.clientRevision,2);assert.equal(newInput.expectedRichRevision,3);
  assert.equal(count(f,'save'),0);assert.equal(count(f,'submit'),0);
});
test('keepLocalDraft explicitly rebases reviewed conflict but never saves or sends',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Keep this local edit');
  f.snapshot.conversations[0].draft='Changed by another window';f.snapshot.conversations[0].richDraft.revision=3;await c.refresh();
  await assert.rejects(c.saveDraft('chat'),/conflict/);assert.equal(count(f,'save'),0);assert.equal(c.getState().drafts.chat,'Keep this local edit');
  await c.keepLocalDraft('chat',3);assert.equal(count(f,'save'),0);assert.equal(count(f,'submit'),0);assert.equal(c.getState().drafts.chat,'Keep this local edit');
  await c.saveDraft('chat');const request=f.calls.find(call=>call[0]==='save')[1];assert.equal(request.expectedRevision,3);assert.equal(request.draft,'Keep this local edit');assert.equal(count(f,'submit'),0);
});
test('keepLocalDraft refuses stale reviewed revision and retains local text',async t=>{
  const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','My local text');
  f.snapshot.conversations[0].draft='First external edit';f.snapshot.conversations[0].richDraft.revision=3;await c.refresh();
  f.snapshot.conversations[0].draft='Newer external edit';f.snapshot.conversations[0].richDraft.revision=4;
  await assert.rejects(c.keepLocalDraft('chat',3),/changed again/);await assert.rejects(c.saveDraft('chat'),/conflict/);
  assert.equal(c.getState().drafts.chat,'My local text');assert.equal(count(f,'save'),0);assert.equal(count(f,'submit'),0);
});
test('uncertain save cannot be rebased or admitted to shutdown; same save recovery retains newer text',async t=>{
  const f=fixture();const save=f.bridge.saveRichDraft;let attempted,fail=true;
  f.bridge.saveRichDraft=async request=>{if(fail){attempted=clone(request);throw Error('lost receipt');}assert.deepEqual(request,attempted);return save(request);};
  const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Original save');await assert.rejects(c.saveDraft('chat'),/uncertain/);c.editDraft('chat','Newer unsaved text');
  await assert.rejects(c.keepLocalDraft('chat',2),/earlier draft save/);assert.throws(()=>c.prepareShutdownDrafts(),/Resolve pending/);c.resumeAfterShutdown();
  fail=false;await c.retryDraftSave('chat');assert.equal(c.getState().drafts.chat,'Newer unsaved text');assert.equal(count(f,'submit'),0);
  const [input]=c.prepareShutdownDrafts();assert.equal(input.draft,'Newer unsaved text');assert.equal(input.expectedRichRevision,3);assert.equal(input.clientRevision,2);
});

function enableTeam(f) {
  f.snapshot.providers.push({...clone(f.snapshot.providers[0]),id:'claude',kind:'claude'});
  f.catalog.providers.push({...clone(f.catalog.providers[0]),id:'claude',label:'Claude CLI'});
  f.snapshot.runtimeCapabilities={schemaVersion:1,constellation:'available',minimumMembers:2,reasonCode:null};
}
test('team configuration saves exact lead and draft without submitting; reopen and send use saved revision',async t=>{
  const f=fixture();enableTeam(f);let c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Team prompt');
  await c.configureTeam('chat',['codex','claude'],'claude');
  const saved=f.snapshot.conversations[0];assert.equal(saved.richDraft.team.leadIndex,1);assert.equal(saved.richDraft.selection.providerID,'claude');assert.equal(saved.draft,'Team prompt');assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);
  c.dispose();c=f.controller();await c.start();assert.equal(c.getState().snapshot.conversations[0].richDraft.team.leadIndex,1);
  await c.send('chat');const request=f.calls.find(call=>call[0]==='submit')[1];assert.equal(request.mode,'constellation');assert.equal(request.richDraftRevision,4);assert.equal(request.prompt,'Team prompt');assert.equal(count(f,'submit'),1);
});
test('unavailable capability, duplicate providers and unknown lead never save or reserve a team',async t=>{
  for(const kind of ['absent','unavailable','duplicate','lead','auth']) {
    const f=fixture();enableTeam(f);if(kind==='absent')delete f.snapshot.runtimeCapabilities;if(kind==='unavailable')f.snapshot.runtimeCapabilities.constellation='unavailable';if(kind==='auth')f.catalog.providers[1].authentication='authNeeded';
    const c=f.controller();t.after(()=>c.dispose());await c.start();await assert.rejects(c.configureTeam('chat',kind==='duplicate'?['codex','codex']:['codex','claude'],kind==='lead'?'unknown':'codex'));
    assert.equal(count(f,'save'),0);assert.equal(count(f,'journal.write'),0);assert.equal(count(f,'submit'),0);
  }
});
test('catalog staleness and capability loss after durable team save block admission',async t=>{
  for(const kind of ['stale','revoked']){
    const f=fixture();enableTeam(f);const c=f.controller();t.after(()=>c.dispose());await c.start();await c.configureTeam('chat',['codex','claude'],'codex');
    if(kind==='stale')f.catalog.revision='changed';else {const original=f.bridge.saveRichDraft;f.bridge.saveRichDraft=async request=>{const receipt=await original(request);f.snapshot.runtimeCapabilities.constellation='unavailable';return receipt;};}
    await assert.rejects(c.send('chat'));assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);
  }
});
test('uncertain team save retries identical mutation and direct switch is explicit',async t=>{
  const f=fixture();enableTeam(f);const original=f.bridge.saveRichDraft;let first=true;f.bridge.saveRichDraft=async request=>{const receipt=await original(request);if(first){first=false;throw Error('lost receipt');}return receipt;};
  const c=f.controller();t.after(()=>c.dispose());await c.start();await assert.rejects(c.configureTeam('chat',['codex','claude'],'claude'));
  await assert.rejects(c.configureTeam('chat',null));assert.equal(count(f,'save'),1);
  await c.retryDraftSave('chat');assert.deepEqual(f.calls.filter(x=>x[0]==='save').map(x=>x[1])[0],f.calls.filter(x=>x[0]==='save').map(x=>x[1])[1]);
  await c.configureTeam('chat',null);assert.equal(f.snapshot.conversations[0].richDraft.team,null);await c.send('chat');assert.equal(f.calls.find(x=>x[0]==='submit')[1].mode,'direct');
});
test('partial Constellation answers survive failure, cancellation and restart without replay or synthesized final text',async t=>{
  for(const outcome of ['failed','cancelled']) {
    const f=fixture();enableTeam(f);let c=f.controller();t.after(()=>c.dispose());await c.start();await c.configureTeam('chat',['codex','claude'],'codex');await c.send('chat');
    const saved=f.snapshot.runs[0];assert.equal(saved.admitted.mode,'constellation');assert.equal(saved.admitted.team.members.length,2);
    saved.memberResults=[{schemaVersion:1,memberID:'member-1',providerID:'codex',role:'independentAnswer',text:'One durable member answer',truncated:false}];
    saved.activity={schemaVersion:1,baseSequence:5,entries:[runEvent(saved.id,'chat',5,{kind:'memberStarted',phase:'contribute',memberID:'member-2',providerID:'claude',role:'independentAnswer',summary:'Member was running'})]};
    await c.refreshStatus();
    if(outcome==='cancelled')await c.cancel(saved.id);else {saved.status='failed';saved.error='Second member failed';await c.refreshStatus();}
    assert.equal(saved.answer,null);assert.equal(count(f,'submit'),1);
    c.dispose();f.snapshot.runtimeCapabilities.constellation='unavailable';c=f.controller();await c.start();
    const run=c.getState().snapshot.runs[0];assert.equal(run.status,outcome);assert.equal(run.memberResults[0].text,'One durable member answer');assert.equal(run.answer,null);assert.equal(run.resolution,null);assert.equal(count(f,'submit'),1);assert.equal(count(f,'cancel'),outcome==='cancelled'?1:0);
    assert.deepEqual(projectHostConversation(c.getState(),'chat').messages.map(m=>m.content),['Saved prompt']);
  }
});

test('conversation binding saves exact choice and local draft without changing workspace default or sending',async t=>{const f=fixture();const p={...f.snapshot.providers[0],id:'second',executablePath:'/fixture/second'};f.snapshot.providers.push(p);f.catalog.providers.push({...f.catalog.providers[0],id:'second'});const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Keep unsaved text');await c.configureConversationProvider('chat',{provider:p,revision:2,catalogRevision:'revision'});assert.equal(f.snapshot.conversations[0].richDraft.selection.providerID,'second');assert.equal(c.getState().drafts.chat,'Keep unsaved text');assert.equal(f.snapshot.selectedProviderID,'codex');assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);});
test('conversation binding rejects stale route revision catalog and pending run before mutation',async t=>{for(const change of ['route','revision','catalog','run']){const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();const choice={provider:clone(f.snapshot.providers[0]),revision:2,catalogRevision:'revision'};if(change==='route')f.snapshot.providers[0].executablePath='/changed';if(change==='revision')f.snapshot.conversations[0].richDraft.revision++;if(change==='catalog')f.catalog.revision='new';if(change==='run')f.addRun({id:'running',conversationID:'chat',prompt:'Synthetic'},'running');await assert.rejects(c.configureConversationProvider('chat',choice));assert.equal(count(f,'save'),0);assert.equal(c.getState().drafts.chat,'Saved prompt');}});
test('conversation binding uncertain save preserves draft and prevents a replacement mutation',async t=>{const f=fixture();let saves=0;f.bridge.saveRichDraft=async()=>{saves++;throw Error('lost reply')};const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Keep me');const choice={provider:clone(f.snapshot.providers[0]),revision:2,catalogRevision:'revision'};await assert.rejects(c.configureConversationProvider('chat',choice));await assert.rejects(c.configureConversationProvider('chat',choice));assert.equal(saves,1);assert.equal(c.getState().drafts.chat,'Keep me');assert.equal(count(f,'submit'),0);});

test('following default preserves draft and later default changes remain inherited through send',async t=>{const f=fixture();f.snapshot.conversations[0].richDraft.selection={schemaVersion:1,providerID:'codex',modelID:null,effortID:null,catalogRevision:'revision'};const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Keep inheritance draft');await c.followWorkspaceDefault('chat',2,'codex');assert.equal(f.snapshot.conversations[0].richDraft.selection,null);assert.equal(c.getState().drafts.chat,'Keep inheritance draft');assert.equal(count(f,'submit'),0);const p={...f.snapshot.providers[0],id:'later',executablePath:'/fixture/later'};f.snapshot.providers.push(p);f.catalog.providers.push({...f.catalog.providers[0],id:'later'});f.snapshot.selectedProviderID='later';await c.refresh();await c.send('chat');assert.equal(f.snapshot.conversations[0].richDraft.selection,null);assert.equal(f.snapshot.runs[0].admitted.provider.id,'later');});
test('following default rejects stale revision default pending runs and uncertain replacement saves',async t=>{for(const condition of ['revision','default','pending','uncertain']){const f=fixture();const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Keep me');if(condition==='revision')f.snapshot.conversations[0].richDraft.revision++;if(condition==='default')f.snapshot.selectedProviderID=null;if(condition==='pending')f.addRun({id:'busy',conversationID:'chat',prompt:'Synthetic'},'running');if(condition==='uncertain')f.bridge.saveRichDraft=async()=>{f.calls.push(['save']);throw Error('lost')};await assert.rejects(c.followWorkspaceDefault('chat',2,'codex'));if(condition==='uncertain')await assert.rejects(c.followWorkspaceDefault('chat',2,'codex'));assert.equal(count(f,'save'),condition==='uncertain'?1:0);assert.equal(c.getState().drafts.chat,'Keep me');}});

test('following default preserves attachment IDs and refuses explicit models or teams',async t=>{const f=fixture();f.snapshot.attachments=[{attachmentID:'saved-attachment',conversationID:'chat',displayName:'Synthetic.txt',byteLength:1,sha256:'a'.repeat(64),sourceState:'valid'}];f.snapshot.conversations[0].richDraft.attachmentIDs=['saved-attachment'];const c=f.controller();t.after(()=>c.dispose());await c.start();await c.followWorkspaceDefault('chat',2,'codex');assert.deepEqual(f.calls.find(v=>v[0]==='save')[1].attachmentIDs,['saved-attachment']);for(const field of ['model','team']){const f=fixture();const selection={schemaVersion:1,providerID:'codex',modelID:field==='model'?'explicit':null,effortID:null,catalogRevision:'revision'};f.snapshot.conversations[0].richDraft.selection=selection;if(field==='team')f.snapshot.conversations[0].richDraft.team={schemaVersion:1,leadIndex:0,members:[selection,{...selection,providerID:'second'}]};const c=f.controller();t.after(()=>c.dispose());await c.start();await assert.rejects(c.followWorkspaceDefault('chat',2,'codex'));assert.equal(count(f,'save'),0);}});

test('compact composer atomically saves explicit follow-default and pin pairs without sending',async t=>{
 const {composerConfigurationKey,composerSummary}=await import('../src/host/composerConfiguration.ts');
 for(const pin of [null,'claude','codex']){
  const f=fixture();enableTeam(f);const c=f.controller();t.after(()=>c.dispose());await c.start();await c.configureTeam('chat',['codex','claude'],'claude');f.snapshot.attachments=[{attachmentID:'saved-attachment',conversationID:'chat',displayName:'Synthetic.txt',byteLength:1,sha256:'a'.repeat(64),sourceState:'valid'}];f.snapshot.conversations[0].richDraft.attachmentIDs=['saved-attachment'];await c.refresh();c.editDraft('chat','Exact unsent draft');
  const before=count(f,'save'),state=c.getState();const selection=pin?{schemaVersion:1,providerID:pin,modelID:null,effortID:null,catalogRevision:state.catalog.revision}:null;
  await c.configureExecution('chat',{expectedKey:composerConfigurationKey(state.snapshot,state.catalog,'chat'),selection,team:null});
  const payload=f.calls.filter(x=>x[0]==='save').at(-1)[1];assert.equal(count(f,'save'),before+1);assert.deepEqual(payload.selection,selection);assert.equal(payload.team,null);assert.equal(payload.draft,'Exact unsent draft');assert.equal(payload.expectedRevision,3);assert.deepEqual(payload.attachmentIDs,['saved-attachment']);assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);assert.equal(f.snapshot.selectedProviderID,'codex');assert.match(composerSummary(c.getState().snapshot,c.getState().catalog,'chat'),/^Single AI · /);
 }
});
test('compact composer rejects stale editor and invalid pairs before mutation',async t=>{
 const {composerConfigurationKey}=await import('../src/host/composerConfiguration.ts');
 for(const kind of ['revision','catalog','route','default','one','seven','duplicate','lead','mismatch','auth','response','model']){
  const f=fixture();enableTeam(f);const c=f.controller();t.after(()=>c.dispose());await c.start();const state=c.getState();const expectedKey=composerConfigurationKey(state.snapshot,state.catalog,'chat');
  const member=id=>({schemaVersion:1,providerID:id,modelID:null,effortID:null,catalogRevision:'revision'});
  let team={schemaVersion:1,leadIndex:1,members:[member('codex'),member('claude')]},selection=team.members[1];
  if(kind==='revision')f.snapshot.conversations[0].richDraft.revision++;
  if(kind==='catalog')f.catalog.revision='new';
  if(kind==='route')f.snapshot.providers[1].executablePath='/changed';
  if(kind==='default')f.snapshot.selectedProviderID='claude';
  if(kind==='one')team={...team,leadIndex:0,members:[member('claude')]};
  if(kind==='seven')team={...team,members:Array.from({length:7},()=>member('claude'))};
  if(kind==='duplicate')team.members=[member('claude'),member('claude')];
  if(kind==='lead')team.leadIndex=7;
  if(kind==='mismatch')selection=member('codex');
  if(kind==='auth')f.catalog.providers[1].authentication='authNeeded';
  if(kind==='response')f.catalog.providers[1].responseTest='failed';
  if(kind==='model')team.members[0].modelID='guessed-model';
  await assert.rejects(c.configureExecution('chat',{expectedKey,selection,team}));assert.equal(count(f,'save'),0);assert.equal(count(f,'submit'),0);
 }
});
test('compact composer uncertain save retains the exact atomic mutation for retry and freezes future send',async t=>{
 const {composerConfigurationKey}=await import('../src/host/composerConfiguration.ts');const {configuredTeam}=await import('../src/host/teamConfiguration.ts');
 const f=fixture();enableTeam(f);const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Atomic team prompt');const state=c.getState(),team=configuredTeam(state.snapshot,state.catalog,['codex','claude'],'claude');
 const original=f.bridge.saveRichDraft;let fail=true;f.bridge.saveRichDraft=async request=>{const receipt=await original(request);if(fail){fail=false;throw Error('Synthetic lost receipt');}return receipt;};
 await assert.rejects(c.configureExecution('chat',{expectedKey:composerConfigurationKey(state.snapshot,state.catalog,'chat'),selection:team.members[1],team}));assert.equal(c.getState().drafts.chat,'Atomic team prompt');assert.equal(count(f,'submit'),0);
 await c.retryDraftSave('chat');const saves=f.calls.filter(x=>x[0]==='save');assert.deepEqual(saves[0][1],saves[1][1]);
 await c.send('chat');assert.equal(count(f,'submit'),1);const run=f.snapshot.runs[0];assert.deepEqual(run.admitted.team,team);assert.equal(run.admitted.provider.id,'claude');assert.equal(run.admitted.mode,'constellation');assert.equal(f.calls.find(x=>x[0]==='submit')[1].richDraftRevision,4);
 await assert.rejects(c.configureExecution('chat',{expectedKey:composerConfigurationKey(c.getState().snapshot,c.getState().catalog,'chat'),selection:null,team:null}));
});
