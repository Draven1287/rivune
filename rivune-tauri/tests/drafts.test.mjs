import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDrafts, mergeDraft } from './compiled/drafts.js';

test('different windows can save different drafts without losing the other draft', () => {
 const first = mergeDraft('{}','chat-a','First draft',undefined);
 assert.equal(first.ok,true);
 const second = mergeDraft(first.raw,'chat-b','Second draft',undefined);
 assert.equal(second.ok,true);
 assert.deepEqual(parseDrafts(second.raw),{'chat-a':'First draft','chat-b':'Second draft'});
});

test('conflicting changes to one draft require recovery instead of last-writer overwrite', () => {
 assert.deepEqual(mergeDraft('{"chat":"External change"}','chat','Local change','Original'),{ok:false});
 assert.deepEqual(mergeDraft('{}','chat','Local change','Original'),{ok:false});
 assert.deepEqual(mergeDraft('{"chat":"External change"}','chat','','Original'),{ok:false});
 const matching = mergeDraft('{"chat":"Same change"}','chat','Same change','Original');
 assert.equal(matching.ok,true);
 assert.equal(matching.value,'Same change');
});

test('an untouched draft adopts an external edit or deletion', () => {
 const updated = mergeDraft('{"chat":"External change"}','chat','Original','Original');
 assert.equal(updated.ok,true);
 assert.equal(updated.value,'External change');
 const deleted = mergeDraft('{}','chat','Original','Original');
 assert.deepEqual(deleted,{ok:true,raw:'{}',value:''});
});

test('deleting one draft preserves other drafts and handles special object keys safely', () => {
 const deleted = mergeDraft('{"one":"Remove","two":"Keep"}','one','','Remove');
 assert.equal(deleted.ok,true);
 assert.deepEqual(parseDrafts(deleted.raw),{two:'Keep'});
 const special = mergeDraft('{"constructor":"Existing"}','__proto__','Safe own value',undefined);
 assert.equal(special.ok,true);
 const parsed = parseDrafts(special.raw);
 assert.equal(Object.hasOwn(parsed,'__proto__'),true);
 assert.equal(parsed.__proto__,'Safe own value');
 assert.equal(parsed.constructor,'Existing');
 assert.equal(Object.getPrototypeOf(parsed),Object.prototype);
});

test('invalid input is bounded and does not replace valid neighboring draft strings', () => {
 for (const raw of [null,'{','[]','null','42']) assert.deepEqual(parseDrafts(raw),{});
 assert.deepEqual(parseDrafts(JSON.stringify({valid:'Keep',invalid:5,tooLong:'x'.repeat(12001)})),{valid:'Keep'});
 const full = Object.fromEntries(Array.from({length:200},(_,i)=>[String(i),'Draft']));
 assert.equal(Object.keys(parseDrafts(JSON.stringify({...full,extra:'Overflow'}))).length,200);
 assert.deepEqual(mergeDraft(JSON.stringify(full),'new','Extra',undefined),{ok:false});
 assert.deepEqual(mergeDraft('{}','new','x'.repeat(12001),undefined),{ok:false});
 assert.equal(mergeDraft('{}','new','x'.repeat(12000),undefined).ok,true);
});
