import assert from 'node:assert/strict';
import { validateArchiveInspection } from '../cross-platform-shell-20260907/candidate4-runtime-r2/web/archive-inspector.mjs';
const fingerprint='a'.repeat(64);
const dto=()=>({schemaVersion:1,fingerprint,sections:['projects','orphanDrafts','attachments','preferences','notices'].map(kind=>({kind,totalCount:0,truncated:false,items:[]}))});
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name)}
check('valid complete empty DTO',()=>assert.equal(validateArchiveInspection(dto(),fingerprint).sections.length,5));
check('wrong archive binding rejected',()=>assert.throws(()=>validateArchiveInspection(dto(),'b'.repeat(64))));
check('duplicate sections rejected',()=>{const v=dto();v.sections[1].kind='projects';assert.throws(()=>validateArchiveInspection(v,fingerprint))});
check('missing truncation disclosure rejected',()=>{const v=dto();v.sections[0].totalCount=2;assert.throws(()=>validateArchiveInspection(v,fingerprint))});
check('oversized UTF8 detail rejected',()=>{const v=dto();v.sections[0].items=[{id:'p',label:'P',detailText:'🌎'.repeat(1025)}];v.sections[0].totalCount=1;assert.throws(()=>validateArchiveInspection(v,fingerprint))});
check('duplicate item identities rejected',()=>{const v=dto();v.sections[0].items=Array(2).fill({id:'same',label:'P',detailText:'x'});v.sections[0].totalCount=2;assert.throws(()=>validateArchiveInspection(v,fingerprint))});
check('per-section item bound enforced',()=>{const v=dto();v.sections[0].items=Array.from({length:101},(_,i)=>({id:String(i),label:'P',detailText:''}));v.sections[0].totalCount=101;assert.throws(()=>validateArchiveInspection(v,fingerprint))});
check('serialized response bound accounts for escaped bytes',()=>{const v=dto();v.sections[0].items=Array.from({length:30},(_,i)=>({id:String(i),label:'P',detailText:'\n'.repeat(4096)}));v.sections[0].totalCount=30;assert.throws(()=>validateArchiveInspection(v,fingerprint))});
console.log(`${count} validation checks passed; no host or provider calls.`);
