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

function enableTeam(f) {
  f.snapshot.providers.push({...clone(f.snapshot.providers[0]),id:'claude',kind:'claude'});
  f.catalog.providers.push({...clone(f.catalog.providers[0]),id:'claude',label:'Claude CLI'});
  f.snapshot.runtimeCapabilities={schemaVersion:1,constellation:'available',minimumMembers:2,reasonCode:null};
}
export {fixture, count, enableTeam};
