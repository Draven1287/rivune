import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostLifecycleAdapter,createHostLifecycleCoordinator} from '../src/host/lifecycle.ts';
const names=['beginShutdown','flushShutdownDraft','completeShutdown','abortShutdown','onShutdownRequested','onOpenSettings'];
const draft=()=>({conversationID:'c',draft:'preserved edit',clientRevision:7,expectedRichRevision:3,mutationID:'m',attachmentIDs:[],selection:null,team:null});
function fixture(){
 const calls=[];const handlers={};const cleanups=[];
 const bridge=Object.fromEntries(names.map(name=>[name,async function(value){assert.equal(this,bridge);calls.push([name,value]);if(name.startsWith('on')){handlers[name]=value;return ()=>cleanups.push(name);}if(name==='flushShutdownDraft')return {state:'durable',token:value.token,clientRevision:value.clientRevision,mutationID:value.mutationID,conversationID:value.conversationID,richDraftRevision:value.expectedRichRevision===null?null:value.expectedRichRevision+1,attachmentIDs:value.attachmentIDs,selection:value.selection,team:value.team};return null;}]));
 return {bridge,calls,handlers,cleanups};
}
function coordinator(f,callbacks={}){return createHostLifecycleCoordinator(createHostLifecycleAdapter(f.bridge),{prepareShutdown:async()=>[draft()],onOpenSettings(){},...callbacks});}
test('strict detection is inert and rejects every partial bridge and accessor',()=>{
 for(const value of [undefined,null,{},[]])assert.equal(createHostLifecycleAdapter(value),null);
 for(const name of names){const f=fixture();delete f.bridge[name];assert.equal(createHostLifecycleAdapter(f.bridge),null);assert.deepEqual(f.calls,[]);}
 const f=fixture();Object.defineProperty(f.bridge,'beginShutdown',{get(){throw Error('getter invoked');}});assert.equal(createHostLifecycleAdapter(f.bridge),null);
});
test('settings/shutdown subscriptions install once and cleanup once',async()=>{
 const f=fixture();let settings=0;const c=coordinator(f,{onOpenSettings(){settings++;}});assert.deepEqual(f.calls,[]);await Promise.all([c.start(),c.start()]);f.handlers.onOpenSettings();assert.equal(settings,1);assert.equal(f.calls.length,2);c.dispose();c.dispose();f.handlers.onOpenSettings();assert.equal(settings,1);assert.deepEqual(f.cleanups,names.slice(4).reverse());
});
test('shutdown snapshots drafts and verifies identity before completion',async()=>{
 const f=fixture();const input=draft();const saved=[];const c=coordinator(f,{prepareShutdown:async()=>[input],onDraftFlushed:(value,revision)=>saved.push([value,revision])});
 assert.equal(await c.requestShutdown('quit-token'),true);assert.deepEqual(f.calls.map(c=>c[0]),['beginShutdown','flushShutdownDraft','completeShutdown']);assert.deepEqual(f.calls[1][1],{...input,token:'quit-token'});assert.notEqual(f.calls[1][1],input);assert.equal(saved[0][1],4);assert.equal(c.getState().phase,'completed');assert.equal(await c.requestShutdown('quit-token'),false);
});
test('empty workspace still requires durable empty flush',async()=>{
 const f=fixture();const c=coordinator(f,{prepareShutdown:async()=>[]});assert.equal(await c.requestShutdown('empty-token'),true);const request=f.calls[1][1];assert.deepEqual(request,{conversationID:null,draft:'',clientRevision:0,expectedRichRevision:null,mutationID:'empty-token',attachmentIDs:[],selection:null,team:null,token:'empty-token'});
});
test('busy or unresolved controller blocks shutdown before beginning; explicit abort recovers',async()=>{
 const f=fixture();const c=coordinator(f,{prepareShutdown:async()=>{throw Error('pending uncertain run');}});assert.equal(await c.requestShutdown('q'),false);assert.equal(c.getState().phase,'blocked');assert.deepEqual(f.calls,[]);assert.equal(await c.requestShutdown('q'),false);assert.equal(await c.abort(),true);assert.deepEqual(f.calls,[['abortShutdown','q']]);assert.equal(c.getState().phase,'idle');
});
test('failed, uncertain and identity-mismatched saves never complete or retry',async()=>{
 for(const patch of [{state:'rejected'},{state:'uncertain'},{token:'other'},{mutationID:'other'},{conversationID:'other'},{clientRevision:6},{richDraftRevision:3},{attachmentIDs:['other']},{selection:{wrong:true}},{team:{wrong:true}}]){
  const f=fixture();const save=f.bridge.flushShutdownDraft;f.bridge.flushShutdownDraft=async function(value){return {...await save.call(this,value),...patch};};const c=coordinator(f);assert.equal(await c.requestShutdown('q'),false);assert.equal(c.getState().phase,'blocked');assert.equal(await c.requestShutdown('q'),false);assert.deepEqual(f.calls.map(c=>c[0]),['beginShutdown','flushShutdownDraft']);
 }
});
test('throws during begin/flush/complete retain token, never implicitly abort or resend',async()=>{
 for(const method of names.slice(0,3)){const f=fixture();f.bridge[method]=async value=>{f.calls.push([method,value]);throw Error('private host failure');};const c=coordinator(f);assert.equal(await c.requestShutdown('q'),false);assert.equal(c.getState().phase,'blocked');assert.equal(c.getState().token,'q');assert(!c.getState().message.includes('private'));assert.equal(f.calls.filter(c=>c[0]===method).length,1);assert.equal(await c.requestShutdown('q'),false);}
});
test('duplicate events during prepare cannot start another shutdown',async()=>{
 const f=fixture();let release;const c=coordinator(f,{prepareShutdown:()=>new Promise(resolve=>{release=resolve;})});const pending=c.requestShutdown('q');assert.equal(await c.requestShutdown('other'),false);assert.equal(await c.abort(),false);release([draft()]);assert.equal(await pending,true);assert.equal(f.calls.filter(c=>c[0]==='beginShutdown').length,1);
});
test('pending token can arrive during subscription installation',async()=>{
 const f=fixture();f.bridge.onShutdownRequested=async handler=>{await handler('pending');return ()=>f.cleanups.push('onShutdownRequested');};const c=coordinator(f);await c.start();assert.equal(c.getState().phase,'completed');c.dispose();assert.equal(f.cleanups.length,2);
});
test('failed second subscription releases first; disposal handles late listener',async()=>{
 const f=fixture();f.bridge.onShutdownRequested=async()=>null;const c=coordinator(f);await assert.rejects(c.start(),/subscription failed/);assert.deepEqual(f.cleanups,['onOpenSettings']);assert.equal(c.getState().phase,'blocked');
 const late=fixture();let release;late.bridge.onOpenSettings=()=>new Promise(resolve=>{release=resolve;});const d=coordinator(late);const starting=d.start();d.dispose();release(()=>late.cleanups.push('late'));await starting;assert.deepEqual(late.cleanups,['late']);assert.deepEqual(late.calls,[]);
});
test('dispose during preparation prevents shutdown mutations',async()=>{
 const f=fixture();let release;const c=coordinator(f,{prepareShutdown:()=>new Promise(resolve=>{release=resolve;})});const pending=c.requestShutdown('q');c.dispose();release([draft()]);assert.equal(await pending,false);assert.deepEqual(f.calls,[]);assert.equal(c.getState().phase,'disposed');
});
