import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostWorkspaceController } from '../src/host/workspaceController.ts';
import { createTauriWorkspaceAdapter } from '../src/host/tauriAdapter.ts';
import { parseHostSnapshot } from '../src/host/contracts.ts';
const clone=value=>structuredClone(value), tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const providers=['one','two'].map(id=>({id,kind:'codex',executablePath:'/fake/codex',model:null,timeoutMs:1000}));
 const members=providers.map(p=>({schemaVersion:1,providerID:p.id,modelID:null,effortID:null,catalogRevision:'rev'})),team={schemaVersion:1,leadIndex:0,members};
 const run={id:'run',conversationID:'chat',status:'failed',updatedAt:'today',answer:null,error:'Saved member failure',failedInvocationID:'opaque-invocation',failedAttemptID:'opaque-attempt-1',admitted:{requestID:'run',conversationID:'chat',prompt:'Original prompt',mode:'constellation',provider:providers[0],retryOf:null,team},memberResults:[{schemaVersion:1,memberID:'member-1',providerID:'one',role:'independentAnswer',text:'Saved answer',truncated:false}]};
 const snapshot={schemaVersion:1,activeConversationID:'chat',selectedProviderID:'one',providers,conversations:[{id:'chat',title:'Chat',readOnly:false,draft:'Unsent work',richDraft:{schemaVersion:1,revision:1,selection:members[0],team,attachmentIDs:[]}}],runs:[run]};
 const catalog={schemaVersion:1,revision:'rev',providers:providers.map(p=>({id:p.id,label:p.id,transport:'cli',adapterState:'supported',installation:'installed',authentication:'unknown',responseTest:'notTested',catalogState:'unknown',models:[],defaults:{modelID:null,effortID:null},supportsProviderDefault:true,errorCode:null}))};
 const calls=[];let behavior=async()=>{run.status='completed';run.answer='Final answer';run.failedInvocationID=null;run.failedAttemptID=null;return {requestID:'run',state:'accepted'};};
 const bridge={getSnapshot:async()=>clone(snapshot),getModelCatalog:async()=>clone(catalog),onRunEvent:async()=>()=>{},createConversation:async()=>assert.fail('create'),openConversation:async()=>assert.fail('open'),saveRichDraft:async()=>assert.fail('save'),submitRun:async()=>assert.fail('prompt replay'),reconcileRun:async requestID=>{calls.push(['reconcile',requestID]);return {requestID,state:'accepted'};},cancelRun:async requestID=>{calls.push(['cancel',requestID]);run.status='cancelled';run.failedInvocationID=null;run.failedAttemptID=null;return {requestID,state:'accepted'};},retryConstellationInvocation:async request=>{calls.push(['retry',clone(request)]);return behavior(request);}};
 const journal={read:()=>null,write:()=>assert.fail('reservation'),clear:()=>assert.fail('reservation clear')};
 const controller=createHostWorkspaceController(createTauriWorkspaceAdapter(bridge),journal,{pollMs:60000});
 return {controller,bridge,run,snapshot,calls,setBehavior(fn){behavior=fn;},request:()=>({requestID:'run',invocationID:'opaque-invocation',failedAttemptID:'opaque-attempt-1'})};
}
test('Exact retry retains partial answer and never saves or resubmits prompt',async()=>{
 const f=fixture();await f.controller.start();try{await f.controller.retryInvocation(f.request());assert.deepEqual(f.calls,[['retry',f.request()]]);assert.equal(f.controller.getState().snapshot.runs[0].memberResults[0].text,'Saved answer');assert.equal(f.controller.getState().retry,null);assert.equal(f.snapshot.conversations[0].draft,'Unsent work');}finally{f.controller.dispose();}
});
test('Stale identity and missing optional capability cannot dispatch retry',async()=>{
 const f=fixture();await f.controller.start();try{f.run.failedAttemptID='new';await assert.rejects(f.controller.retryInvocation(f.request()),/saved failure changed/);assert.equal(f.calls.length,0);}finally{f.controller.dispose();}
 delete f.bridge.retryConstellationInvocation;assert.equal(createTauriWorkspaceAdapter(f.bridge).retryConstellationInvocation,undefined);
});
test('Duplicate pending retry blocked; exact cancellation works during held reply',async()=>{
 const f=fixture();let release;f.setBehavior(()=>{f.run.status='running';return new Promise(resolve=>release=resolve);});await f.controller.start();try{const pending=f.controller.retryInvocation(f.request());await tick();await assert.rejects(f.controller.retryInvocation(f.request()),/unavailable/);await f.controller.refreshStatus();await f.controller.cancel('run');release({requestID:'run',state:'uncertain'});await pending;assert.equal(f.controller.getState().retry,null);assert.equal(f.controller.getState().snapshot.runs[0].status,'cancelled');assert.equal(f.calls.filter(c=>c[0]==='retry').length,1);assert.equal(f.controller.getState().snapshot.runs[0].memberResults.length,1);}finally{f.controller.dispose();}
});
test('Thrown uncertain malformed and unchanged accepted replies retain retry fence through reconciliation',async()=>{
 for(const behavior of [async()=>{throw Error('lost');},async()=>({requestID:'run',state:'uncertain'}),async()=>({requestID:'wrong',state:'accepted'}),async()=>({requestID:'run',state:'accepted'})]){
 const f=fixture();f.setBehavior(behavior);await f.controller.start();try{await f.controller.retryInvocation(f.request());assert.equal(f.controller.getState().retry.phase,'uncertain');await assert.rejects(f.controller.retryInvocation(f.request()),/unresolved retry/);await f.controller.reconcileRetry();assert.equal(f.controller.getState().retry.phase,'uncertain');await f.controller.cancel('run');assert.equal(f.controller.getState().retry,null);assert.equal(f.calls.filter(c=>c[0]==='retry').length,1);assert.equal(f.controller.getState().snapshot.runs[0].memberResults.length,1);}finally{f.controller.dispose();}}
});
test('Rejected response is explicit; authoritative changed attempt resolves without dispatch',async()=>{
 const f=fixture();f.setBehavior(async()=>({requestID:'run',state:'rejected'}));await f.controller.start();try{await f.controller.retryInvocation(f.request());assert.match(f.controller.getState().retryNotice.message,/rejected/);assert.equal(f.controller.getState().retry,null);}finally{f.controller.dispose();}
 const g=fixture();g.setBehavior(async()=>{throw Error('lost');});await g.controller.start();try{await g.controller.retryInvocation(g.request());g.run.failedAttemptID='new';await g.controller.reconcileRetry();assert.equal(g.controller.getState().retry,null);assert.equal(g.calls.filter(c=>c[0]==='retry').length,1);}finally{g.controller.dispose();}
});
test('Paired failed identifiers and exact adapter payload are validated',async()=>{
 const f=fixture();assert.equal(parseHostSnapshot(f.snapshot).runs[0].failedAttemptID,'opaque-attempt-1');delete f.run.failedAttemptID;assert.throws(()=>parseHostSnapshot(f.snapshot));f.run.failedAttemptID='opaque-attempt-1';f.run.admitted.mode='direct';assert.throws(()=>parseHostSnapshot(f.snapshot));
 const g=fixture(),adapter=createTauriWorkspaceAdapter(g.bridge);await assert.rejects(adapter.retryConstellationInvocation({...g.request(),prompt:'new'}),/Invalid/);assert.equal(g.calls.length,0);await adapter.retryConstellationInvocation(g.request());assert.deepEqual(g.calls[0],['retry',g.request()]);
});
test('Nonfailed missing and read-only targets reject stale UI identities',async()=>{
 for(const change of [f=>f.run.status='running',f=>f.run.status='completed',f=>f.run.status='cancelled',f=>f.snapshot.runs=[],f=>f.snapshot.conversations[0].readOnly=true]){
  const f=fixture();await f.controller.start();try{change(f);await assert.rejects(f.controller.retryInvocation(f.request()));assert.equal(f.calls.length,0);}finally{f.controller.dispose();}
 }
});
test('Remount after lost retry response never automatically retries or claims attempt recovery',async()=>{
 const f=fixture();f.setBehavior(async()=>{f.run.status='running';throw Error('lost');});await f.controller.start();await f.controller.retryInvocation(f.request());f.controller.dispose();
 const next=createHostWorkspaceController(createTauriWorkspaceAdapter(f.bridge),{read:()=>null,write:()=>assert.fail('reserve'),clear:()=>assert.fail('clear')},{pollMs:60000});
 try{await next.start();assert.equal(f.calls.filter(c=>c[0]==='retry').length,1);assert.equal(next.getState().snapshot.runs[0].status,'running');assert.equal(next.getState().snapshot.runs[0].memberResults[0].text,'Saved answer');assert.equal(next.getState().retry,null);}finally{next.dispose();}
});
test('Empty whitespace and oversized retry identifiers fail closed',()=>{
 for(const key of ['failedInvocationID','failedAttemptID']) for(const value of ['', '   ', 'x'.repeat(129)]){
  const f=fixture();f.run[key]=value;assert.throws(()=>parseHostSnapshot(f.snapshot));
 }
});
test('Late uncertain reconciliation cannot resurrect an explicitly cancelled retry',async()=>{
 const f=fixture();f.controller.dispose();let release;
 f.bridge.reconcileRun=()=>new Promise(resolve=>{release=resolve;});f.setBehavior(async()=>{throw Error('lost');});
 const c=createHostWorkspaceController(createTauriWorkspaceAdapter(f.bridge),{read:()=>null,write:()=>assert.fail('reserve'),clear:()=>assert.fail('clear')},{pollMs:60000});
 await c.start();try{await c.retryInvocation(f.request());const checking=c.reconcileRetry();await tick();await c.cancel('run');release({requestID:'run',state:'uncertain'});await checking;assert.equal(c.getState().retry,null);assert.equal(c.getState().snapshot.runs[0].status,'cancelled');}finally{c.dispose();}
});
