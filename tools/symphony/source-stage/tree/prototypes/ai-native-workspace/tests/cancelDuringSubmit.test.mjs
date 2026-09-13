import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostWorkspaceController, projectHostConversation } from '../src/host/workspaceController.ts';

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
    const run={id:request.id,conversationID:request.conversationID,status,updatedAt:'2026-09-09T00:00:00Z',admitted:{requestID:request.id,conversationID:request.conversationID,prompt:request.prompt,mode:'direct',provider:clone(provider),retryOf:null},answer:null,error:null};
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
  const controller=(pollMs=1_000_000)=>createHostWorkspaceController(bridge,journal,{id:()=>`id-${++ids}`,pollMs});
  return {snapshot,catalog,calls,journal,bridge,controller,addRun,get pending(){return pending;},set pending(value){pending=value;},emit(value){handler?.(value);}};
}
function runEvent(requestID,conversationID,sequence,overrides={}) {
  return {schemaVersion:1,eventID:`${requestID}:${sequence}`,requestID,conversationID,sequence,kind:'providerStarted',phase:'direct',state:'running',memberID:null,providerID:'codex',role:null,summary:'Provider started',textDelta:null,error:null,...overrides};
}
const count=(f,name)=>f.calls.filter(call=>call[0]===name).length;

function holdSubmit(f) {
  let request,resolve,reject,entered;
  const started=new Promise(done=>{entered=done;});
  f.bridge.submitRun=value=>{request=clone(value);f.calls.push(['submit',request]);entered();return new Promise((done,fail)=>{resolve=done;reject=fail;});};
  return {started,get request(){return request;},resolve:state=>resolve({state,requestID:request.id}),reject:()=>reject(Error('late transport error'))};
}
async function waitFor(predicate,message) {
  const end=Date.now()+1000;
  while(!predicate() && Date.now()<end)await new Promise(done=>setTimeout(done,5));
  assert(predicate(),message);
}

test('durable run can be cancelled before pending submit returns; late accepted response preserves cancellation',async t=>{
  const f=fixture();const held=holdSubmit(f);const c=f.controller();t.after(()=>c.dispose());await c.start();
  let completed=false;const sending=c.send('chat').then(()=>{completed=true;});await held.started;
  f.addRun(held.request);f.emit(runEvent(held.request.id,'chat',1));await flush();
  assert.equal(completed,false);assert.equal(c.getState().phase,'running');
  await c.cancel(held.request.id);
  assert.deepEqual(f.calls.find(call=>call[0]==='cancel'),['cancel',held.request.id]);assert.equal(completed,false);
  assert.equal(c.getState().snapshot.runs[0].status,'cancelled');
  held.resolve('accepted');await sending;
  assert.equal(c.getState().snapshot.runs[0].status,'cancelled');assert.equal(c.getState().pending,null);assert.equal(count(f,'submit'),1);
  c.dispose();const restarted=f.controller();t.after(()=>restarted.dispose());await restarted.start();
  assert.equal(restarted.getState().snapshot.runs[0].status,'cancelled');assert.equal(count(f,'submit'),1);assert.equal(count(f,'save'),1);
});

test('polling discovers admitted run without events while original submit is pending',async t=>{
  const f=fixture();const held=holdSubmit(f);const c=f.controller(5);t.after(()=>c.dispose());await c.start();
  const sending=c.send('chat');await held.started;f.addRun(held.request);
  await waitFor(()=>c.getState().snapshot.runs.some(run=>run.id===held.request.id),'pending submit must keep polling durable history');
  assert.equal(c.getState().phase,'running');await c.cancel(held.request.id);assert.equal(c.getState().snapshot.runs[0].status,'cancelled');
  held.resolve('accepted');await sending;assert.equal(count(f,'submit'),1);
});

test('preadmission and wrong-identity cancellation cannot invoke host; later durable admission remains cancellable',async t=>{
  const f=fixture();const held=holdSubmit(f);const c=f.controller();t.after(()=>c.dispose());await c.start();
  const sending=c.send('chat');await held.started;
  await assert.rejects(c.cancel(held.request.id));await assert.rejects(c.cancel('unknown'));
  assert.equal(count(f,'cancel'),0);assert.equal(c.getState().snapshot.runs.length,0);
  f.emit(runEvent('wrong','chat',1));await flush();assert.equal(c.getState().snapshot.runs.length,0);
  f.addRun(held.request);f.emit(runEvent(held.request.id,'chat',2));await flush();
  await c.cancel(held.request.id);assert.equal(count(f,'cancel'),1);assert.equal(c.getState().snapshot.runs[0].status,'cancelled');
  held.resolve('accepted');await sending;
});

test('cancellation rejection and transport failure never invent a terminal result and permit explicit retry',async t=>{
  for(const outcome of ['throw','rejected','wrong-identity']){
    const f=fixture();const held=holdSubmit(f);const successfulCancel=f.bridge.cancelRun;
    f.bridge.cancelRun=async requestID=>{f.calls.push(['failed-cancel',requestID]);if(outcome==='throw')throw Error('cancel transport');return {state:outcome==='rejected'?'rejected':'accepted',requestID:outcome==='wrong-identity'?'other':requestID};};
    const c=f.controller();t.after(()=>c.dispose());await c.start();const sending=c.send('chat');await held.started;
    f.addRun(held.request);f.emit(runEvent(held.request.id,'chat',1));await flush();
    await assert.rejects(c.cancel(held.request.id));
    assert.equal(count(f,'failed-cancel'),1);assert.equal(c.getState().snapshot.runs[0].status,'running');assert.equal(c.getState().snapshot.runs[0].answer,null);
    f.bridge.cancelRun=successfulCancel;await c.cancel(held.request.id);assert.equal(c.getState().snapshot.runs[0].status,'cancelled');
    held.resolve('accepted');await sending;assert.equal(count(f,'submit'),1);
  }
});

test('late rejected or thrown original submit cannot replace saved cancelled status or replay after restart',async t=>{
  for(const outcome of ['rejected','throw']){
    const f=fixture();const held=holdSubmit(f);const c=f.controller();t.after(()=>c.dispose());await c.start();const sending=c.send('chat');await held.started;
    f.addRun(held.request);f.emit(runEvent(held.request.id,'chat',1));await flush();await c.cancel(held.request.id);
    if(outcome==='throw')held.reject();else held.resolve('rejected');await sending;
    assert.equal(c.getState().snapshot.runs[0].status,'cancelled');
    assert.deepEqual(projectHostConversation(c.getState(),'chat').messages.map(message=>message.content),['Saved prompt']);
    c.dispose();const restarted=f.controller();t.after(()=>restarted.dispose());await restarted.start();
    assert.equal(restarted.getState().snapshot.runs[0].status,'cancelled');assert.equal(count(f,'submit'),1);assert.equal(count(f,'save'),1);
  }
});

test('one pending cancel blocks duplicate clicks without blocking original submit recovery',async t=>{
  const f=fixture();const held=holdSubmit(f);let resolveCancel;
  f.bridge.cancelRun=requestID=>{f.calls.push(['cancel',requestID]);return new Promise(done=>{resolveCancel=()=>{f.snapshot.runs[0].status='cancelled';done({state:'accepted',requestID});};});};
  const c=f.controller();t.after(()=>c.dispose());await c.start();const sending=c.send('chat');await held.started;
  f.addRun(held.request);f.emit(runEvent(held.request.id,'chat',1));await flush();const cancelling=c.cancel(held.request.id);
  await assert.rejects(c.cancel(held.request.id));assert.equal(count(f,'cancel'),1);assert.equal(c.getState().phase,'cancelling');
  resolveCancel();await cancelling;held.resolve('accepted');await sending;assert.equal(c.getState().snapshot.runs[0].status,'cancelled');
});

test('active run with a different unresolved identity and completed run cannot reach host cancellation',async t=>{
  const f=fixture();const held=holdSubmit(f);const c=f.controller();t.after(()=>c.dispose());await c.start();
  const sending=c.send('chat');await held.started;
  f.addRun({...held.request,id:'other-active'});
  f.addRun({...held.request,id:'completed-b'});
  f.snapshot.runs[1].status='completed';f.snapshot.runs[1].answer='Completed answer B';
  await c.refreshStatus();
  await assert.rejects(c.cancel('other-active'),/unresolved request/);
  await assert.rejects(c.cancel('completed-b'),/active saved run/);
  await assert.rejects(c.cancel('unknown'),/active saved run/);
  assert.equal(count(f,'cancel'),0);
  assert.equal(f.snapshot.runs[1].answer,'Completed answer B');
  assert.equal(f.snapshot.runs[1].status,'completed');
  held.resolve('rejected');await sending;
  assert.equal(count(f,'submit'),1);
});
