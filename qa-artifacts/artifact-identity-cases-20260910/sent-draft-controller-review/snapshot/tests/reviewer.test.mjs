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

const until=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(r=>setTimeout(r,2));}assert.fail('condition did not arrive');};
for(const variant of ['distinct','ABA'])test(`edit during pre-submit save retains ${variant} generation`,async t=>{
 const f=fixture(), original=f.bridge.saveRichDraft;let entered=false,release;const gate=new Promise(r=>release=r);
 f.bridge.saveRichDraft=async q=>{entered=true;await gate;return original(q);};
 const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Sent');const sending=c.send('chat');await until(()=>entered);
 c.editDraft('chat','New');if(variant==='ABA')c.editDraft('chat','Sent');release();await sending;
 const retained=variant==='ABA'?'Sent':'New';assert.equal(c.getState().drafts.chat,retained);await c.refresh();assert.equal(c.getState().drafts.chat,retained);
 await c.saveDraft('chat');assert.equal(f.calls.filter(x=>x[0]==='save').at(-1)[1].expectedRevision,4);assert.equal(f.snapshot.conversations[0].draft,retained);
});
for(const variant of ['distinct','ABA'])test(`late save acknowledgement preserves ${variant} local edits through refresh`,async t=>{
 const f=fixture(),original=f.bridge.saveRichDraft;let entered=false,release;const gate=new Promise(r=>release=r);
 f.bridge.saveRichDraft=async q=>{const ack=await original(q);entered=true;await gate;return ack;};
 const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Saved');const saving=c.saveDraft('chat');await until(()=>entered);c.editDraft('chat','New');if(variant==='ABA')c.editDraft('chat','Saved');release();await saving;
 f.snapshot.conversations[0].draft='Remote';f.snapshot.conversations[0].richDraft.revision++;await c.refresh();assert.equal(c.getState().drafts.chat,variant==='ABA'?'Saved':'New');await assert.rejects(()=>c.saveDraft('chat'),/changed elsewhere/);
});
for(const condition of ['no-run','wrong-request','wrong-prompt','nonblank','unadvanced'])test(`sent text retained until exact admission: ${condition}`,async t=>{
 const f=fixture();let request;f.bridge.submitRun=async q=>{request=q;return{state:'uncertain',requestID:q.id};};
 const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Sent');await c.send('chat');
 const chat=f.snapshot.conversations[0];chat.draft='';chat.richDraft.revision=request.richDraftRevision+1;
 if(condition!=='no-run')f.addRun({...request,...(condition==='wrong-request'?{id:'other'}:{}),...(condition==='wrong-prompt'?{prompt:'Other'}:{})});
 if(condition==='nonblank')chat.draft='New host draft';if(condition==='unadvanced')chat.richDraft.revision=request.richDraftRevision;
 f.emit({});await flush();assert.equal(c.getState().drafts.chat,'Sent');
 f.snapshot.runs=[];f.addRun(request);chat.draft='';chat.richDraft.revision=request.richDraftRevision+1;f.emit({});await flush();assert.equal(c.getState().drafts.chat,'');await c.reconcile();assert.equal(c.getState().pending,null);
});
test('polling clears authoritative admission before outstanding submit reply without resubmission',async t=>{
 const f=fixture();let request,release;const gate=new Promise(r=>release=r);f.bridge.submitRun=async q=>{request=q;await gate;return{state:'accepted',requestID:q.id};};
 let ids=0;const c=createHostWorkspaceController(f.bridge,f.journal,{id:()=>`poll-${++ids}`,pollMs:5});t.after(()=>{release();c.dispose();});await c.start();c.editDraft('chat','Sent');const sending=c.send('chat');await until(()=>request);
 f.addRun(request);f.snapshot.conversations[0].draft='';f.snapshot.conversations[0].richDraft.revision++;await until(()=>c.getState().drafts.chat==='');assert(c.getState().pending);release();await sending;assert.equal(f.snapshot.runs.length,1);assert.equal(c.getState().pending,null);
});
test('same request on another conversation cannot clear original sent draft',async t=>{
 const f=fixture();f.snapshot.conversations.push({...clone(f.snapshot.conversations[0]),id:'other',draft:'Other'});let request;f.bridge.submitRun=async q=>{request=q;return{state:'uncertain',requestID:q.id};};const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Sent');await c.send('chat');f.addRun({...request,conversationID:'other'});f.snapshot.conversations[0].draft='';f.snapshot.conversations[0].richDraft.revision++;f.emit({});await flush();assert.equal(c.getState().drafts.chat,'Sent');assert.equal(c.getState().drafts.other,'Other');
});
test('mismatched save acknowledgement never submits or clears local text',async t=>{
 const f=fixture(),original=f.bridge.saveRichDraft;f.bridge.saveRichDraft=async q=>({...await original(q),mutationID:'stale-mutation'});const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Sent');await assert.rejects(()=>c.send('chat'),/not durably acknowledged/);assert.equal(c.getState().drafts.chat,'Sent');assert.equal(count(f,'submit'),0);assert.equal(count(f,'journal.write'),0);await c.refresh();assert.equal(c.getState().drafts.chat,'Sent');
});
