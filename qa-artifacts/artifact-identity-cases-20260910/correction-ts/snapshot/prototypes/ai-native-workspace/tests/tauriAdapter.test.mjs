import test from 'node:test';
import assert from 'node:assert/strict';
import {createTauriWorkspaceAdapter} from '../src/host/tauriAdapter.ts';
const names=['getSnapshot','getModelCatalog','createConversation','openConversation','saveRichDraft','submitRun','reconcileRun','cancelRun','onRunEvent'];
const selection={schemaVersion:1,providerID:'route',modelID:null,effortID:null,catalogRevision:'catalog'};
const draft=()=>({conversationID:'c',mutationID:'m',expectedRevision:0,draft:' exact prompt ',attachmentIDs:[],selection:{...selection},team:null});
const run=()=>({id:'r',conversationID:'c',prompt:' exact prompt ',mode:'direct',richDraftRevision:1});
function fixture(){const calls=[];const cleanup=()=>calls.push(['cleanup']);const payload={unparsed:true};const bridge=Object.fromEntries(names.map(name=>[name,function(...args){assert.equal(this,bridge);calls.push([name,...args]);return name==='onRunEvent'?cleanup:payload;}]));return {bridge,calls,cleanup,payload};}
test('absent and partial bridges fail closed; construction invokes no methods or getters',()=>{
 for(const value of [undefined,null,{},[],()=>{}])assert.equal(createTauriWorkspaceAdapter(value),null);
 for(const name of names){const f=fixture();delete f.bridge[name];assert.equal(createTauriWorkspaceAdapter(f.bridge),null);assert.deepEqual(f.calls,[]);}
 const f=fixture();Object.defineProperty(f.bridge,'getSnapshot',{get(){throw Error('getter called');}});assert.equal(createTauriWorkspaceAdapter(f.bridge),null);
});
test('exact arguments, receiver and unknown payload identity survive wrapper',async()=>{
 const f=fixture();const adapter=createTauriWorkspaceAdapter(f.bridge);assert.deepEqual(f.calls,[]);assert(Object.isFrozen(adapter));
 for(const [name,args] of [['getSnapshot',[]],['getModelCatalog',[]],['createConversation',[{id:'c',title:'Conversation'}]],['openConversation',['c']],['saveRichDraft',[draft()]],['submitRun',[run()]],['reconcileRun',['r']],['cancelRun',['r']]]){assert.equal(await adapter[name](...args),f.payload);const call=f.calls.at(-1);assert.equal(call[0],name);assert.equal(call.length,args.length+1);args.forEach((arg,i)=>assert.equal(call[i+1],arg));}assert.equal(f.calls.length,8);
});
test('sync failure, rejected and pending mutation outcomes are not hidden or retried',async()=>{
 for(const behavior of [()=>{throw Error('host failure');},()=>Promise.reject(Error('host failure'))]){const f=fixture();let count=0;f.bridge.submitRun=()=>{count++;return behavior();};await assert.rejects(createTauriWorkspaceAdapter(f.bridge).submitRun(run()),/host failure/);assert.equal(count,1);}
 const f=fixture();let resolve,count=0,settled=false;f.bridge.saveRichDraft=()=>{count++;return new Promise(done=>{resolve=done;});};const pending=createTauriWorkspaceAdapter(f.bridge).saveRichDraft(draft()).then(value=>{settled=true;return value;});await new Promise(done=>setTimeout(done,20));assert.equal(settled,false);assert.equal(count,1);resolve('receipt');assert.equal(await pending,'receipt');
});
test('subscription passes handler and cleanup exactly and rejects malformed cleanup',async()=>{
 const f=fixture();const adapter=createTauriWorkspaceAdapter(f.bridge);const handler=()=>{};const cleanup=await adapter.onRunEvent(handler);assert.equal(cleanup,f.cleanup);assert.equal(f.calls[0][1],handler);assert.equal(f.calls.length,1);cleanup();assert.deepEqual(f.calls.at(-1),['cleanup']);
 for(const value of [null,{},'cleanup']){f.bridge.onRunEvent=()=>value;await assert.rejects(createTauriWorkspaceAdapter(f.bridge).onRunEvent(handler),/cleanup/);}await assert.rejects(adapter.onRunEvent(null),/Invalid/);
});
test('invalid command inputs are rejected before any host call',async()=>{
 const f=fixture();const adapter=createTauriWorkspaceAdapter(f.bridge);
 const cases=[['openConversation',''],['cancelRun',null],['reconcileRun','é'.repeat(65)],['createConversation',{id:'c',title:' '}],['createConversation',{id:'c',title:'t',extra:1}],['submitRun',{...run(),mode:'swarm'}],['submitRun',{...run(),richDraftRevision:NaN}],['submitRun',{...run(),prompt:' '}],['submitRun',{...run(),prompt:'é'.repeat(65537)}],['saveRichDraft',{...draft(),expectedRevision:-1}],['saveRichDraft',{...draft(),attachmentIDs:['a','a']}],['saveRichDraft',{...draft(),attachmentIDs:Array(5).fill('a')}],['saveRichDraft',{...draft(),selection:{...selection,effortID:'high'}}],['saveRichDraft',{...draft(),team:{schemaVersion:1,leadIndex:0,members:[selection,selection]}}]];
 for(const [name,value] of cases)await assert.rejects(adapter[name](value),/Invalid/);assert.deepEqual(f.calls,[]);
});
test('empty draft and valid team can be saved; lead mismatch fails',async()=>{
 const f=fixture();const adapter=createTauriWorkspaceAdapter(f.bridge);const value={...draft(),draft:'',team:{schemaVersion:1,leadIndex:0,members:[selection,{...selection,providerID:'second-route'}]}};await adapter.saveRichDraft(value);assert.equal(f.calls[0][1],value);await assert.rejects(adapter.saveRichDraft({...value,selection:{...selection,providerID:'wrong-lead'}}),/Invalid/);
});
test('constellation submission preserves exact reserved command and revision without strategy invention',async()=>{
 const f=fixture();f.bridge.submitReservedRun=function(value){assert.equal(this,f.bridge);f.calls.push(['reserved',value]);return f.payload;};
 const adapter=createTauriWorkspaceAdapter(f.bridge,{reservedSubmission:true});const request={...run(),mode:'constellation'};
 assert.equal(await adapter.submitRun(request),f.payload);assert.deepEqual(f.calls,[['reserved',request]]);
});

test('saved artifact bridge validates before invoking and rejects mismatched responses',async()=>{
 const {createHash}=await import('node:crypto');const f=fixture();const text='exact 🪐';const sha=createHash('sha256').update(text).digest('hex');let calls=0;f.bridge.inspectArtifact=function(q){calls++;assert.equal(this,f.bridge);return {schemaVersion:1,artifactID:q.artifactID,conversationID:q.conversationID,requestID:q.requestID,contentSHA256:sha,byteLength:Buffer.byteLength(text),previewKind:'plainText',languageHint:null,availability:'available',text};};const a=createTauriWorkspaceAdapter(f.bridge);const q={artifactID:'a',conversationID:'c',requestID:'r',expectedSHA256:sha};assert.equal((await a.inspectArtifact(q)).text,text);await assert.rejects(()=>a.inspectArtifact({...q,path:'/private'}));assert.equal(calls,1);await assert.rejects(()=>a.inspectArtifact({...q,expectedSHA256:'0'.repeat(64)}));assert.equal(calls,2);
});

test('saved artifact bridge cannot replace expected identity by mutating its request across await',async()=>{
 const {createHash}=await import('node:crypto');const f=fixture();const text='other artifact';const sha=createHash('sha256').update(text).digest('hex');
 const original={artifactID:'a',conversationID:'chat-a',requestID:'run-a',expectedSHA256:'0'.repeat(64)};let release;
 f.bridge.inspectArtifact=async q=>{await new Promise(resolve=>release=resolve);Object.assign(q,{artifactID:'b',conversationID:'chat-b',requestID:'run-b',expectedSHA256:sha});return {schemaVersion:1,artifactID:q.artifactID,conversationID:q.conversationID,requestID:q.requestID,contentSHA256:sha,previewKind:'plainText',languageHint:null,byteLength:Buffer.byteLength(text),availability:'available',text};};
 const pending=createTauriWorkspaceAdapter(f.bridge).inspectArtifact(original);release();await assert.rejects(()=>pending);assert.deepEqual(original,{artifactID:'a',conversationID:'chat-a',requestID:'run-a',expectedSHA256:'0'.repeat(64)});
});
