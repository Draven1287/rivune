import test from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from './compiled/services/storage/index.js';
test('storage boundary preserves exact legacy keys and values', () => {
 const data=new Map(); const storage=createStorage(()=>({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}));
 storage.setItem('rivune.workspace.v1','{"currentId":"old"}');
 assert.equal(storage.getItem('rivune.workspace.v1'),'{"currentId":"old"}');
 storage.removeItem('rivune.workspace.v1'); assert.equal(storage.getItem('rivune.workspace.v1'),null);
});
test('storage access and quota failures reach existing recovery handlers', () => {
 const storage=createStorage(()=>{throw new Error('denied');});
 assert.throws(()=>storage.getItem('rivune.drafts'),/denied/);
 assert.throws(()=>storage.setItem('rivune.drafts','x'),/denied/);
 assert.throws(()=>storage.removeItem('rivune.drafts'),/denied/);
});
