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
    async submitRun(request){calls.push(['submit',clone(request)]);addRun(request);snapshot.conversations.find(c=>c.id===request.conversationID).draft='';snapshot.conversations.find(c=>c.id===request.conversationID).richDraft.revision++;return {state:'accepted',requestID:request.id};},
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

// Uses the existing hostController.test.mjs fixture; actual controller, synthetic bridge.
const startupGate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const startupNoWrites=f=>assert.deepEqual(f.calls.filter(c=>['save','submit','configure','journal.write','journal.clear','reconcile'].includes(c[0])),[]);
for(const pending of [false,true])test(`startup failure: rejected initial snapshot retains recovery identity (${pending})`,async t=>{
 const f=fixture();if(pending)f.pending={requestID:'retained-request',conversationID:'chat'};const before=clone(f.pending);
 f.bridge.getSnapshot=async()=>{f.calls.push(['snapshot']);throw Error('private profile failure');};f.bridge.configureSelectedProvider=async()=>{f.calls.push(['configure']);throw Error('Forbidden');};
 const c=f.controller();t.after(()=>c.dispose());await c.start();assert.equal(c.getState().snapshot,null);assert.equal(c.getState().phase,pending?'uncertain':'error');assert(!c.getState().error.includes('private profile'));assert.deepEqual(f.pending,before);assert.deepEqual(c.getState().drafts,{});
 await assert.rejects(()=>c.send('chat'));await assert.rejects(()=>c.saveDraft('chat'));startupNoWrites(f);assert.deepEqual(f.pending,before);
});
for(const outcome of ['resolve','reject'])test(`startup failure: disposed hydration ${outcome} cannot replace fresh controller`,async t=>{
 const old=fixture(),g=startupGate();old.bridge.getSnapshot=()=>{old.calls.push(['snapshot']);return g.promise;};let entered=0;const c=old.controller();c.subscribe(()=>entered++);const starting=c.start();await flush();assert.equal(count(old,'snapshot'),1);c.dispose();const frozen=clone(c.getState()),notifications=entered;
 const fresh=fixture();fresh.snapshot.conversations[0].draft='Fresh controller draft';const replacement=fresh.controller();t.after(()=>replacement.dispose());await replacement.start();const replacementBefore=clone(replacement.getState());
 if(outcome==='resolve')g.resolve(clone(old.snapshot));else g.reject(Error('Old rejection'));await starting;await flush();assert.deepEqual(c.getState(),frozen);assert.equal(entered,notifications);assert.deepEqual(replacement.getState(),replacementBefore);assert.equal(count(old,'unsubscribe'),1);startupNoWrites(old);startupNoWrites(fresh);
});
test('startup failure: disposal during subscription releases late listener without fetching snapshot',async()=>{
 const f=fixture(),g=startupGate();let removed=0;f.bridge.onRunEvent=()=>{f.calls.push(['subscribe']);return g.promise;};const c=f.controller();const starting=c.start();await flush();c.dispose();g.resolve(()=>removed++);await starting;assert.equal(removed,1);assert.equal(count(f,'snapshot'),0);startupNoWrites(f);
});
