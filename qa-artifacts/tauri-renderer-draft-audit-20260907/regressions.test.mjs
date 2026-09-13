import assert from 'node:assert/strict';
import {test} from 'node:test';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const source=process.env.RIVUNE_RENDERER_SOURCE || fileURLToPath(new URL('./web/',import.meta.url));
const realSetTimeout=globalThis.setTimeout,realClearTimeout=globalThis.clearTimeout;
function element(){return {disabled:false,hidden:false,value:'',textContent:'',dataset:{},listeners:{},children:[],addEventListener(k,l){this.listeners[k]=l},replaceChildren(){this.children=[]},append(x){this.children.push(x)},setAttribute(k,v){this[k]=v}}}
const settle=()=>new Promise(setImmediate);
let serial=0;
async function setup(){
 const elements=new Map(),timers=new Map();let timerID=0;
 globalThis.setTimeout=(callback)=>{timers.set(++timerID,callback);return timerID};
 globalThis.clearTimeout=(id)=>timers.delete(id);
 globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
 globalThis.document={querySelector(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element};
 const state={schemaVersion:1,selectedProviderID:'fixture',conversations:[{id:'c1',title:'First',draft:''},{id:'c2',title:'Second',draft:''}],runs:[]};
 const writes=[];
 globalThis.__RIVUNE_DESKTOP_HOST__={
  getSnapshot:async()=>structuredClone(state),
  openConversation:async(id)=>structuredClone(state.conversations.find(c=>c.id===id)),
  saveDraft:async(id,draft)=>{writes.push({id,draft});state.conversations.find(c=>c.id===id).draft=draft},
  submitRun:async(request)=>{state.runs.push({id:request.id,conversationID:request.conversationID,status:'running',updatedAt:'2026-09-07T00:00:00Z',answer:null});return {state:'accepted',requestID:request.id}},
  reconcileRun:async(id)=>({state:'accepted',requestID:id}),
 };
 await import(pathToFileURL(resolve(source,'app.mjs')).href+'?audit='+serial++);await settle();
 return {get:id=>elements.get(id),state,writes,async flush(){const pending=[...timers.values()];timers.clear();for(const callback of pending)callback();await settle()}};
}
async function cleanup(){globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClearTimeout;delete globalThis.__RIVUNE_DESKTOP_HOST__;delete globalThis.document;delete globalThis.localStorage}

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
