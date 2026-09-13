const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync('qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/app.mjs','utf8');
const start=source.indexOf('async function clearSubmittedDraftIfUnchanged('),end=source.indexOf('\nfunction setStatus(',start);assert(start>=0&&end>start);
(async()=>{
const {parseRichDraftReceipt}=await import(path.resolve('qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/core.mjs'));
const results=[];
for(const scenario of ['changed-file','removed-file','exact','host-cas-rejected']) {
 const changed=['changed-file','removed-file'].includes(scenario),saves=[];
 const rich={revision:changed?11:10,attachmentIDs:scenario==='removed-file'?[]:[changed?'B':'A'],pending:null,conflictRevision:null};
 const context=vm.createContext({localDrafts:new Map([['c1','same']]),selectedConversationID:'c1',prompt:{value:'same'},snapshot:{conversations:[]},localDraftVersions:new Map(),draftRevision:1,draftSaveTimer:null,richState:()=>rich,clearTimeout,crypto,draftWrites:new Map(),dirtyDrafts:new Map(),shutdownFrozen:false,render:()=>{},draftSaveFailed:()=>{},parseRichDraftReceipt,
 host:{saveRichDraft:async r=>{saves.push(r);return {state:scenario==='host-cas-rejected'?'rejected':'durable',mutationID:r.mutationID,conversationID:r.conversationID,revision:11,attachmentIDs:scenario==='host-cas-rejected'?['B']:[]}}}});
 vm.runInContext(source.slice(start,end)+'\nglobalThis.clear=clearSubmittedDraftIfUnchanged;',context);
 await context.clear({conversationID:'c1',draft:'same',conversationRevision:0,richDraftRevision:10,attachmentIDs:['A']});
 if(scenario==='exact'){assert.equal(context.prompt.value,'');assert.equal(saves[0].expectedRevision,10);}
 else{assert.equal(context.prompt.value,'same');if(changed)assert.equal(saves.length,0);}
 results.push({scenario,pass:true,saveCalls:saves.length});
}
const receipt={scope:'Exact extracted production clear function plus actual receipt parser; stub host, no browser/Rust execution',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),results};
fs.writeFileSync(path.join(__dirname,'RESTART_ACK_FIXED_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));})();
