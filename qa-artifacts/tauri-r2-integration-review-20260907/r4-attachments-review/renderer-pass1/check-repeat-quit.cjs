const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=fs.readFileSync('qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/app.mjs','utf8');
const start=source.indexOf('host?.onShutdownRequested?.('),end=source.indexOf('\nfunction restoreDraft(',start);
assert(start>=0&&end>start);
let handler,hostFrozen=false,begins=0;const shell={inert:false};
const rich={pending:{mutationID:'pending'},conflictRevision:null};
const ctx=vm.createContext({host:{onShutdownRequested:f=>handler=f,beginShutdown:async()=>{begins++;hostFrozen=true},completeShutdown:async()=>assert.fail('must not complete'),flushShutdownDraft:async()=>{}},
 shutdownPreparing:false,shutdownFrozen:false,projectDrafts:new Map(),oversizedDraftBeforeShutdown:()=>null,document:{querySelector:()=>shell,querySelectorAll:()=>[]},setStatus:()=>{},render:()=>{},navigationPending:false,creatingConversation:false,projectMutationPending:false,attachmentBusy:false,rememberDraft:()=>{},draftSaveTimer:null,clearTimeout,
 draftWrites:new Map(),dirtyDrafts:new Map([['c1',{draft:'keep',revision:1}]]),richState:()=>rich,richDrafts:new Map([['c1',rich]]),snapshot:{conversations:[{id:'c1',title:'A',readOnly:false}]},selectedConversationID:'c1',prompt:{value:'keep'},localDraftVersions:new Map([['c1',1]]),
 saveDraft:async(id,draft,rev,token)=>{assert(token);rich.conflictRevision=2;throw Error('REVISION_CONFLICT')},setTimeout});
vm.runInContext(source.slice(start,end),ctx);
(async()=>{await handler('quit');assert(hostFrozen&&shell.inert&&ctx.shutdownFrozen);await handler('quit');assert(hostFrozen);assert.equal(shell.inert,false);assert.equal(ctx.shutdownFrozen,false);
const receipt={scope:'Exact extracted shutdown callback; stub host returns rejected rich flush; no browser/native execution',sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),hostBeginCalls:begins,hostStillFrozen:hostFrozen,rendererFrozenAfterSecondQuit:ctx.shutdownFrozen,shellInert:shell.inert};fs.writeFileSync(path.join(__dirname,'REPEAT_QUIT_RECEIPT.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));})();
