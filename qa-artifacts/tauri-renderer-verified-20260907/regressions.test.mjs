import assert from 'node:assert/strict';
import {test} from 'node:test';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const source=process.env.RIVUNE_RENDERER_SOURCE || fileURLToPath(new URL('./web/',import.meta.url));
const realSetTimeout=globalThis.setTimeout,realClearTimeout=globalThis.clearTimeout,realSetInterval=globalThis.setInterval;
function element(){return {disabled:false,hidden:false,value:'',textContent:'',dataset:{},listeners:{},children:[],addEventListener(k,l){this.listeners[k]=l},replaceChildren(){this.children=[]},append(x){this.children.push(x)},setAttribute(k,v){this[k]=v}}}
const settle=()=>new Promise(setImmediate);
let serial=0;
async function setup(options={}){
 const elements=new Map(),timers=new Map(),pollers=[],pendingSaves=[];let timerID=0;
 globalThis.setInterval=(callback)=>{pollers.push(callback);return {unref(){}}};
 globalThis.setTimeout=(callback)=>{timers.set(++timerID,callback);return timerID};
 globalThis.clearTimeout=(id)=>timers.delete(id);
 globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 globalThis.document={querySelector(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element};
 const state={schemaVersion:1,selectedProviderID:'fixture',conversations:[{id:'c1',title:'First',draft:''},{id:'c2',title:'Second',draft:''}],runs:[]};
 const writes=[];
 globalThis.__RIVUNE_DESKTOP_HOST__={
  getSnapshot:async()=>structuredClone(state),
  openConversation:async(id)=>structuredClone(state.conversations.find(c=>c.id===id)),
  saveDraft:async(id,draft)=>{if(options.failSaves)throw Error("disk full fixture");if(options.blockSaves&&draft)await new Promise(resolve=>pendingSaves.push(resolve));writes.push({id,draft});state.conversations.find(c=>c.id===id).draft=draft},
  submitRun:async(request)=>{state.runs.push({id:request.id,conversationID:request.conversationID,status:'running',updatedAt:'2026-09-07T00:00:00Z',answer:null});return {state:'accepted',requestID:request.id}},
  reconcileRun:async(id)=>({state:'accepted',requestID:id}),
 };
 await import(pathToFileURL(resolve(source,'app.mjs')).href+'?audit='+serial++);await settle();
 return {get:id=>elements.get(id),state,writes,pendingSaves,async tick(){for(const callback of pollers)callback();await settle()},async flush(){const pending=[...timers.values()];timers.clear();for(const callback of pending)callback();await settle()}};
}
async function cleanup(){globalThis.setInterval=realSetInterval;globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout;delete globalThis.__RIVUNE_DESKTOP_HOST__;delete globalThis.document;delete globalThis.localStorage}

test('a successful send cannot be undone by its pending draft debounce',async()=>{
 try{
  const app=await setup();app.get('#prompt').value='Send this once';app.get('#prompt').listeners.input();
  await app.get('#prompt-form').listeners.submit({preventDefault(){}});
  assert.equal(app.get('#prompt').value,'');
  await app.flush();
  assert.equal(app.state.conversations[0].draft,'','the accepted draft must stay cleared in host storage');
 }finally{await cleanup()}
});

test('switching away and back restores the latest saved unsent draft',async()=>{
 try{
  const app=await setup();app.get('#prompt').value='Keep my new draft';app.get('#prompt').listeners.input();await app.flush();
  assert.equal(app.state.conversations[0].draft,'Keep my new draft');
  await app.get('#conversations').children[1].listeners.click();
  await app.get('#conversations').children[0].listeners.click();
  assert.equal(app.get('#prompt').value,'Keep my new draft','conversation navigation must use the latest draft, not the old snapshot closure');
 }finally{await cleanup()}
});


test('unchanged double-send during a slow draft save admits only one request',async()=>{
 try{
  const app=await setup({blockSaves:true});app.get('#prompt').value='One intended request';app.get('#prompt').listeners.input();
  const first=app.get('#prompt-form').listeners.submit({preventDefault(){}});
  const second=app.get('#prompt-form').listeners.submit({preventDefault(){}});
  await settle();app.pendingSaves[0]?.();await first;app.pendingSaves[1]?.();await second;
  assert.equal(app.state.runs.length,1,'save latency must not reopen admission for the same unchanged submit gesture');
 }finally{await cleanup()}
});

test('draft save failure is shown without an unhandled submit rejection',async()=>{
 try{
  const app=await setup({failSaves:true});app.get('#prompt').value='Keep this message';app.get('#prompt').listeners.input();
  await assert.doesNotReject(app.get('#prompt-form').listeners.submit({preventDefault(){}}));
  assert.equal(app.get('#prompt').value,'Keep this message');assert.equal(app.state.runs.length,0);
  assert.match(app.get('#connection-status').textContent,/disk full/);
 }finally{await cleanup()}
});

test('completed work appears after the host updates asynchronously',async()=>{
 try{
  const app=await setup();app.get('#prompt').value='Request';app.get('#prompt').listeners.input();
  await app.get('#prompt-form').listeners.submit({preventDefault(){}});
  app.state.runs[0].status='completed';app.state.runs[0].answer='Completed fixture answer';
  await app.tick();assert.equal(app.get('#answer').textContent,'Completed fixture answer');
 }finally{await cleanup()}
});
