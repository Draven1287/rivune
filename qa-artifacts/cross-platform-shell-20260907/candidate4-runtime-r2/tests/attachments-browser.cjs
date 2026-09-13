const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.env.RIVUNE_RENDERER_EVIDENCE_DIR || fs.mkdtempSync(path.join(require('os').tmpdir(),'rivune-r2-renderer-'));
fs.mkdirSync(root,{recursive:true});
const web=path.resolve(__dirname,'../web');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const results=[],errors=[];const check=(name,result)=>{assert.ok(result,name);results.push({name,pass:true})};
 async function setup(options={}){
  const ctx=await browser.newContext({viewport:{width:1120,height:760},reducedMotion:'reduce'});
  await ctx.route('https://rivune-integrated.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html',file=path.resolve(web,name);if(!file.startsWith(web+path.sep)||!fs.existsSync(file))return route.abort();const types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'};await route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'text/plain'})});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(options=>{
   if(options.recovery)localStorage.setItem("rivune.pending-submission.v1",JSON.stringify(options.recovery));
   window.__polls=[];window.setInterval=cb=>{window.__polls.push(cb);return 1};
   const provider={id:'fixture:local',kind:'fixture',executablePath:'/fixture-only',model:null,timeoutMs:1000};
   const importFingerprint='a'.repeat(64);
   const state={attachments:[],schemaVersion:1,activeConversationID:options.activeConversationID??'c1',selectedProviderID:options.noProvider?null:provider.id,providers:[provider],conversations:[{id:'c1',title:'Reading workshop',draft:''},{id:'c2',title:'Website ideas',draft:options.secondDraft??''}],legacyImports:[],runs:[]};
   if(options.savedSnapshot)Object.assign(state,options.savedSnapshot);
   if(options.failedRun)state.runs.push({id:'failed-source',conversationID:'c1',status:'failed',updatedAt:'2026-09-07',admitted:{requestID:'failed-source',conversationID:'c1',prompt:'original',mode:'direct',provider,approvedContext:{},retryOf:null},answer:null,error:'fixture failed'});
   const ctl=window.testHost={state,calls:[],failSave:!!options.failSave,failSnapshot:false,blockSave:false,saves:[],blockSnapshot:false,snapshots:[],blockSubmit:false,submits:[],blockRetry:false,retries:[],blockReconcile:false,reconciles:[],blockImportPreview:false,importPreviews:[],retryAck:options.retryAck??null,reconcileAck:null,failCreate:false,failCompleteShutdown:!!options.failCompleteShutdown,shutdownHandler:null,shutdownPromise:null};
   window.__RIVUNE_DESKTOP_HOST__={
    selectTextAttachments:async conversationID=>{ctl.calls.push(['select-file',conversationID]);return {cancelled:false,previews:[{schemaVersion:1,selectionID:'s1',conversationID,displayName:'brief.txt',byteLength:5,sha256:'a'.repeat(64),text:'hello'}],issues:[]}},
    approveTextAttachment:async(conversationID,selectionID,sha256)=>{ctl.calls.push(['approve-file',conversationID,selectionID,sha256]);const a={schemaVersion:1,attachmentID:ctl.nextAttachmentID??'a1',conversationID,displayName:'brief.txt',byteLength:5,sha256,sourceState:'valid',status:'approved'};if(!state.attachments.some(x=>x.attachmentID===a.attachmentID))state.attachments.push(a);return a},
    inspectTextAttachment:async(conversationID,attachmentID)=>({...state.attachments.find(a=>a.attachmentID===attachmentID),text:'hello'}),
    validateDraftAttachments:async(conversationID,revision)=>({conversationID,revision,attachments:state.conversations.find(c=>c.id===conversationID).richDraft.attachmentIDs.map(attachmentID=>({attachmentID,sourceState:ctl.sourceChanged?'changed':'valid'}))}),
    getSnapshot:async()=>{if(ctl.failSnapshot)throw Error('Fixture disconnected');const value=structuredClone(state);if(ctl.snapshotDelay)await new Promise(resolve=>setTimeout(resolve,ctl.snapshotDelay));if(ctl.blockSnapshot)await new Promise((resolve,reject)=>ctl.snapshots.push({resolve,reject}));return value},
    discoverProviders:async()=>{ctl.calls.push(['discover']);return structuredClone(options.discoveredProviders??[])},
    openConversation:async id=>{ctl.calls.push(['open',id]);state.activeConversationID=id},
    createConversation:async c=>{if(ctl.failCreate)throw Error('fixture create failed');state.conversations.push({...c,draft:''})},
    configureProvider:async p=>{if(p.executablePath==='/bad')throw Error('Fixture invalid provider');state.selectedProviderID=p.id;ctl.calls.push(['configure',p])},
    saveRichDraft:async request=>{const {conversationID:id,draft}=request;if(options.rejectClear&&draft===''){state.conversations.find(c=>c.id===id).richDraft={schemaVersion:1,revision:request.expectedRevision+1,attachmentIDs:['b1']};return {state:'rejected',mutationID:request.mutationID,conversationID:id,revision:request.expectedRevision+1,attachmentIDs:['b1'],error:'REVISION_CONFLICT'}};if(ctl.conflictSave&&id==='c1')return {state:'rejected',mutationID:request.mutationID,conversationID:id,revision:request.expectedRevision+1,attachmentIDs:request.attachmentIDs,selection:request.selection,team:request.team,error:'REVISION_CONFLICT'};ctl.calls.push(['rich-save',structuredClone(request)]);ctl.calls.push(['save-start',id,draft]);if(ctl.failSave)throw Error('permission denied fixture');if(ctl.blockSave)await new Promise(resolve=>ctl.saves.push(resolve));state.conversations.find(c=>c.id===id).draft=draft;ctl.calls.push(['save-done',id,draft]);state.conversations.find(c=>c.id===id).richDraft={schemaVersion:1,revision:request.expectedRevision+1,attachmentIDs:request.attachmentIDs,selection:request.selection,team:request.team};return {state:ctl.uncertainSave?'uncertain':'durable',mutationID:request.mutationID,conversationID:id,revision:request.expectedRevision+1,attachmentIDs:request.attachmentIDs,selection:request.selection,team:request.team}},
    previewLegacyImport:async sources=>{ctl.calls.push(['import-preview',sources]);if(ctl.blockImportPreview)await new Promise(resolve=>ctl.importPreviews.push(resolve));return {fingerprint:importFingerprint,reviewable:true,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:sources.length,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:sources.some(s=>s.kind==='preferences'),issues:[{source:'history',code:'legacy-exact-retry-unavailable',field:'/0/turns/0',blocking:false}]}},
    commitLegacyImport:async fingerprint=>{ctl.calls.push(['import-commit',fingerprint]);const receipt={fingerprint,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:1,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:false,safetyNoticeCount:1};state.legacyImports.push(receipt);state.conversations.push({id:'legacy:fixture:c3',title:'Imported work',draft:'preserved',readOnly:true});state.activeConversationID='legacy:fixture:c3';state.runs.push({id:'legacy-run:fixture',conversationID:'legacy:fixture:c3',status:'completed',updatedAt:'1',admitted:{requestID:'legacy-run:fixture',conversationID:'legacy:fixture:c3',prompt:'Legacy question',mode:'imported-read-only',provider:{id:'imported:legacy',kind:'imported',executablePath:'',model:null,timeoutMs:1000},approvedContext:{},retryOf:null},answer:'Legacy answer',error:null});return {fingerprint,conversationCount:1,state:'imported',receipt}},
    recoverLegacyImport:async fingerprint=>{ctl.calls.push(['import-recover',fingerprint]);return [{kind:'history',filename:'rivune-legacy-fixture-history.json',sha256:'fixture',bytes:[91,93]}]},
    exportLegacyImport:async fingerprint=>{ctl.calls.push(['import-export',fingerprint]);return structuredClone(options.exportReceipt??{platform:'macOS',saved:[{filename:'rivune-legacy-fixture-history.json',sha256:'b'.repeat(64),bytes:2}],cancelled:false,error:null,uncertainFilename:null})},
    inspectLegacyImport:async fingerprint=>{ctl.calls.push(['import-inspect',fingerprint]);return {schemaVersion:1,fingerprint,sections:[{kind:'projects',items:[{id:'projects:1',label:'Saved project',detailText:'Availability: Archived only'}],totalCount:1,truncated:false},{kind:'orphanDrafts',items:[],totalCount:0,truncated:false},{kind:'attachments',items:[],totalCount:0,truncated:false},{kind:'preferences',items:[],totalCount:0,truncated:false},{kind:'notices',items:[],totalCount:0,truncated:false}]}},
    submitRun:async r=>{ctl.calls.push(['submit',r]);state.runs.push({id:r.id,conversationID:r.conversationID,status:'running',updatedAt:'2026-09-07',admitted:{requestID:r.id,conversationID:r.conversationID,prompt:r.prompt,mode:r.mode,provider,approvedContext:{},retryOf:null},answer:null,error:null});if(ctl.blockSubmit)await new Promise(resolve=>ctl.submits.push(resolve));return {state:ctl.submitState??'accepted',requestID:r.id}},
    reconcileRun:async id=>{ctl.calls.push(['reconcile',id]);if(ctl.blockReconcile)await new Promise(resolve=>ctl.reconciles.push(resolve));return ctl.reconcileAck?{...ctl.reconcileAck,requestID:id}:{state:'accepted',requestID:id}},
    cancelRun:async id=>{state.runs.find(r=>r.id===id).status='cancelled';return {state:'accepted',requestID:id}},
    retryRun:async(a,b)=>{ctl.calls.push(['retry',a,b]);if(ctl.blockRetry)await new Promise(resolve=>ctl.retries.push(resolve));return ctl.retryAck??{state:'accepted',requestID:b}}
    ,onShutdownRequested:handler=>{ctl.shutdownHandler=handler},
    beginShutdown:async token=>{ctl.hostFrozen=true;ctl.calls.push(['shutdown-begin',token]);if(ctl.failBegin)throw Error('lost begin ack')},
    flushShutdownDraft:async r=>{const {token,conversationID,draft,clientRevision}=r;ctl.calls.push(['shutdown-flush',token,conversationID,draft,clientRevision]);return {state:ctl.flushConflict?'rejected':ctl.uncertainShutdown?'uncertain':'durable',token,clientRevision,mutationID:r.mutationID,conversationID,richDraftRevision:conversationID===null?null:r.expectedRichRevision+1,attachmentIDs:r.attachmentIDs,selection:r.selection,team:r.team}},
    completeShutdown:async token=>{ctl.calls.push(['shutdown-complete',token]);if(ctl.failCompleteShutdown)throw Error('fixture final save failed')},
    abortShutdown:async token=>{ctl.calls.push(['shutdown-abort',token]);if(ctl.failAbort)throw Error('recovery still pending');ctl.hostFrozen=false}
   };
  },options);
  await page.goto('https://rivune-integrated.test/',{waitUntil:'networkidle'});return {page,ctx};
 }

 try {
 const {page:p}=await setup();
 await p.locator('#prompt').fill('My task');await p.waitForTimeout(240);
 await p.locator('#attach-text-file').click();
 check('selection only previews, never approves or dispatches',await p.locator('#attachment-dialog').isVisible()&&await p.evaluate(()=>!testHost.calls.some(c=>c[0]==='approve-file'||c[0]==='submit')));
 await p.screenshot({path:path.join(root,'attachment-preview-desktop.png')});
 await p.setViewportSize({width:760,height:560});
 check('preview fits minimum desktop width',await p.locator('#attachment-dialog').evaluate(e=>e.getBoundingClientRect().left>=0&&e.getBoundingClientRect().right<=innerWidth));
 await p.screenshot({path:path.join(root,'attachment-preview-compact.png')});await p.setViewportSize({width:1120,height:760});
 check('preview displays exact host text',await p.locator('#attachment-preview').textContent()==='hello');
 await p.locator('#close-attachment').click();check('cancel leaves draft unchanged',await p.locator('#prompt').inputValue()==='My task');
 await p.locator('#attach-text-file').click();await p.locator('#approve-attachment').click();await p.waitForTimeout(80);
 check('explicit approval saves text with ordered attachment IDs',await p.evaluate(()=>testHost.calls.filter(c=>c[0]==='rich-save').at(-1)[1].attachmentIDs.join()==='a1'&&testHost.calls.filter(c=>c[0]==='rich-save').at(-1)[1].draft==='My task'));
 const savedSnapshot=await p.evaluate(()=>structuredClone(testHost.state));
 const restored=await setup({savedSnapshot});
 check('restart fixture restores approved file and draft without selecting or dispatching',await restored.page.locator('#prompt').inputValue()==='My task'&&(await restored.page.locator('#attachment-chips').textContent()).includes('brief.txt')&&await restored.page.evaluate(()=>!testHost.calls.some(c=>c[0]==='select-file'||c[0]==='submit')));
 await restored.page.locator('#prompt').fill('  Exact saved prompt\n');await restored.page.waitForTimeout(240);await restored.page.locator('#submit').click();await restored.page.waitForTimeout(80);
 check('attached send uses acknowledged rich revision and exact saved text',await restored.page.evaluate(()=>{const r=testHost.calls.find(c=>c[0]==='submit')?.[1];return r?.prompt==='  Exact saved prompt\n'&&Number.isSafeInteger(r.richDraftRevision)}));
 check('accepted unchanged send clears file chips',await restored.page.locator('#attachment-chips button').count()===0);
 await restored.ctx.close();
 await p.locator('#conversations button').nth(1).click();check('attachment never leaks to another chat',await p.locator('#attachment-chips button').count()===0);
 await p.locator('#conversations button').first().click();check('attachment restored with original chat',await p.locator('#attachment-chips').textContent()==='brief.txt×');
 await p.evaluate(()=>testHost.sourceChanged=true);await p.locator('#submit').click();await p.waitForTimeout(60);
 check('changed source blocks dispatch and keeps attachment',await p.evaluate(()=>!testHost.calls.some(c=>c[0]==='submit'))&&(await p.locator('#attachment-chips').textContent()).includes('brief.txt'));
 await p.evaluate(()=>{testHost.sourceChanged=false;testHost.uncertainSave=true});await p.locator('#prompt').fill('Edited during uncertain save');await p.waitForTimeout(240);
 check('uncertain durable state disables send',await p.locator('#submit').isDisabled());
 const uncertainID=await p.evaluate(()=>testHost.calls.filter(c=>c[0]==='rich-save').at(-1)[1].mutationID);
 await p.locator('#prompt').fill('Newer text remains');await p.waitForTimeout(240);await p.evaluate(()=>testHost.uncertainSave=false);await p.locator('#retry-draft-save').click();await p.waitForTimeout(80);
 check('repeated uncertain resync preserves immutable identity before new text',await p.evaluate(id=>{const calls=testHost.calls.filter(c=>c[0]==='rich-save').map(c=>c[1]);const same=calls.filter(c=>c.mutationID===id);return same.length>=3&&same.every(c=>c.draft==='Edited during uncertain save')&&calls.at(-1).draft==='Newer text remains'&&calls.at(-1).attachmentIDs.join()==='a1'},uncertainID));
 await p.locator('#attachment-chips button').last().click();await p.waitForTimeout(80);
 check('remove persists an empty attachment list without losing text',await p.evaluate(()=>testHost.calls.filter(c=>c[0]==='rich-save').at(-1)[1].attachmentIDs.length===0)&&await p.locator('#prompt').inputValue()==='Newer text remains');
 await p.locator('#attach-text-file').click();await p.locator('#approve-attachment').click();await p.waitForTimeout(80);
 await p.evaluate(()=>{testHost.uncertainShutdown=true;testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('quit-rich'))});await p.evaluate(()=>testHost.shutdownPromise);
 check('uncertain rich shutdown cannot quit',await p.evaluate(()=>!testHost.calls.some(c=>c[0]==='shutdown-complete'))&&await p.locator('.shell').evaluate(e=>e.inert));
 await p.evaluate(()=>{testHost.uncertainShutdown=false;testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('quit-rich'))});await p.evaluate(()=>testHost.shutdownPromise);
 check('durable rich shutdown permits completion',await p.evaluate(()=>testHost.calls.some(c=>c[0]==='shutdown-complete')));
 for (const background of [false,true]) {
   const test=await setup();const q=test.page;
   await q.locator('#attach-text-file').click();await q.locator('#approve-attachment').click();await q.waitForTimeout(60);
   await q.evaluate(()=>testHost.conflictSave=true);await q.locator('#prompt').fill('Conflict text stays');await q.waitForTimeout(230);
   if(background)await q.locator('#conversations button').nth(1).click();
   await q.evaluate(()=>{testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('conflict-quit'))});await q.evaluate(()=>testHost.shutdownPromise);
   await q.evaluate(()=>{testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('conflict-quit'))});await q.evaluate(()=>testHost.shutdownPromise);
   check(`${background?'background':'selected'} conflict keeps recovery accessible before host shutdown`,await q.locator('.shell').evaluate(e=>!e.inert)&&await q.evaluate(()=>!testHost.calls.some(c=>c[0]==='shutdown-begin')));
   if(background)await q.locator('#conversations button').first().click();
   await q.evaluate(()=>testHost.conflictSave=false);await q.locator('#retry-draft-save').click();await q.waitForTimeout(70);
   check(`${background?'background':'selected'} conflict resolution retains text`,await q.locator('#prompt').inputValue()==='Conflict text stays');
   check(`${background?'background':'selected'} conflict resolution retains attachment IDs`,await q.evaluate(()=>testHost.state.conversations.find(c=>c.id==='c1').richDraft.attachmentIDs.join()==='a1'));
   await q.evaluate(()=>{testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('conflict-quit'))});await q.evaluate(()=>testHost.shutdownPromise);
   check(`${background?'background':'selected'} resolved draft shuts down durably`,await q.evaluate(()=>testHost.calls.some(c=>c[0]==='shutdown-complete')));
   await test.ctx.close();
 }
 for (const uncertainBegin of [false,true]) {
   const test=await setup();const q=test.page;
   await q.locator('#prompt').fill('Retain across failed quit');await q.waitForTimeout(230);
   await q.evaluate(uncertain=>{testHost.failBegin=uncertain;testHost.flushConflict=!uncertain;testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('persistent-token'))},uncertainBegin);await q.evaluate(()=>testHost.shutdownPromise);
   await q.evaluate(()=>{testHost.failBegin=false;testHost.flushConflict=true;testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('persistent-token'))});await q.evaluate(()=>testHost.shutdownPromise);
   check(`${uncertainBegin?'uncertain begin':'flush conflict'} repeated quit never unfreezes only renderer`,await q.locator('.shell').evaluate(e=>e.inert)&&await q.evaluate(()=>testHost.hostFrozen===true));
   await q.evaluate(()=>testHost.failAbort=true);await q.locator('#recover-shutdown').click();
   check(`${uncertainBegin?'uncertain begin':'flush conflict'} failed authoritative recovery stays frozen`,await q.locator('.shell').evaluate(e=>e.inert));
   await q.evaluate(()=>{testHost.failAbort=false;testHost.flushConflict=false});await q.locator('#recover-shutdown').click();
   check(`${uncertainBegin?'uncertain begin':'flush conflict'} acknowledged recovery reopens retained draft`,await q.locator('.shell').evaluate(e=>!e.inert)&&await q.locator('#prompt').inputValue()==='Retain across failed quit'&&await q.evaluate(()=>testHost.hostFrozen===false));
   if(await q.locator('#retry-draft-save').isVisible()){await q.locator('#retry-draft-save').click();await q.waitForTimeout(60)}
   await q.evaluate(()=>{testHost.shutdownPromise=Promise.resolve(testHost.shutdownHandler('new-token'))});await q.evaluate(()=>testHost.shutdownPromise);
   check(`${uncertainBegin?'uncertain begin':'flush conflict'} recovered draft eventually closes durably`,await q.evaluate(()=>testHost.calls.some(c=>c[0]==='shutdown-complete')));
   await test.ctx.close();
 }
 for (const variant of ['changed-file','removed-file','changed-text','changed-model','changed-team','exact']) {
   const id=variant==='changed-file'?'b1':'a1';
   const attachment={schemaVersion:1,attachmentID:id,conversationID:'c1',displayName:'saved.txt',byteLength:5,sha256:'a'.repeat(64),sourceState:'valid',status:'approved'};
   const attachmentIDs=variant==='removed-file'?[]:[id];
   const text=variant==='changed-text'?'New text':'Same text';
   const revision=['exact','changed-model','changed-team'].includes(variant)?10:11;
   const selection=['changed-model','changed-team'].includes(variant)?{schemaVersion:1,providerID:'one',modelID:null,effortID:null,catalogRevision:'v1'}:null;
   const team=variant==='changed-team'?{schemaVersion:1,leadIndex:0,members:[selection,{...selection,providerID:'two'}]}:null;
   const savedSnapshot={schemaVersion:1,providers:[],selectedProviderID:null,activeConversationID:'c1',projects:[],legacyImports:[],runs:[],attachments:[attachment],conversations:[{id:'c1',title:'Recovered',draft:text,richDraft:{schemaVersion:1,revision,attachmentIDs,selection,team}}]};
   const recovery={id:'old-request',conversationID:'c1',prompt:'Same text',draft:'Same text',mode:'direct',revision:1,conversationRevision:0,richDraftRevision:10,selection:null,team:null,attachmentIDs:['a1']};
   const restored=await setup({savedSnapshot,recovery});const q=restored.page;
   await q.locator('#reconcile').click();await q.waitForTimeout(60);
   check(`recovered acknowledgement ${variant==='exact'?'clears exact draft':'preserves '+variant}`,await q.locator('#prompt').inputValue()===(variant==='exact'?'':text)&&await q.evaluate(({exact,ids})=>JSON.stringify(testHost.state.conversations[0].richDraft.attachmentIDs)===JSON.stringify(exact?[]:ids),{exact:variant==='exact',ids:attachmentIDs}));
   check(`recovered ${variant} cleanup uses original CAS or no mutation`,await q.evaluate(exact=>{const writes=testHost.calls.filter(c=>c[0]==='rich-save');return exact?writes.length===1&&writes[0][1].expectedRevision===10:writes.length===0},variant==='exact'));
   await restored.ctx.close();
 }
 for (const changedFile of [false,true]) {
   const test=await setup();const q=test.page;
   await q.locator('#prompt').fill('Same text');await q.waitForTimeout(220);await q.locator('#attach-text-file').click();await q.locator('#approve-attachment').click();await q.waitForTimeout(60);
   await q.evaluate(()=>testHost.submitState='uncertain');await q.locator('#submit').click();await q.waitForTimeout(60);
   await q.locator('#attachment-chips button').last().click();await q.waitForTimeout(60);
   if(changedFile){await q.evaluate(()=>testHost.nextAttachmentID='b1');await q.locator('#attach-text-file').click();await q.locator('#approve-attachment').click();await q.waitForTimeout(60)}
   const before=await q.evaluate(()=>testHost.calls.filter(c=>c[0]==='rich-save').length);
   await q.locator('#reconcile').click();await q.waitForTimeout(60);
   check(`immediate old acknowledgement preserves ${changedFile?'changed':'removed'} file draft`,await q.locator('#prompt').inputValue()==='Same text'&&await q.evaluate(changed=>JSON.stringify(testHost.state.conversations[0].richDraft.attachmentIDs)===JSON.stringify(changed?['b1']:[]),changedFile));
   check(`immediate ${changedFile?'changed':'removed'} file acknowledgement does not save empty draft`,await q.evaluate(n=>testHost.calls.filter(c=>c[0]==='rich-save').length===n,before));
   await test.ctx.close();
 }
 {
   const savedSnapshot={schemaVersion:1,providers:[],selectedProviderID:null,activeConversationID:'c1',projects:[],legacyImports:[],runs:[],attachments:[{attachmentID:'a1',conversationID:'c1',displayName:'A',byteLength:5,sha256:'a'.repeat(64),sourceState:'valid'}],conversations:[{id:'c1',title:'CAS race',draft:'Same text',richDraft:{schemaVersion:1,revision:10,attachmentIDs:['a1']}}]};
   const recovery={id:'race-run',conversationID:'c1',prompt:'Same text',draft:'Same text',mode:'direct',conversationRevision:0,richDraftRevision:10,selection:null,team:null,attachmentIDs:['a1']};
   const test=await setup({savedSnapshot,recovery,rejectClear:true});const q=test.page;await q.locator('#reconcile').click();await q.waitForTimeout(60);
   check('host CAS rejection preserves newer stored selection and local text',await q.locator('#prompt').inputValue()==='Same text'&&await q.evaluate(()=>testHost.state.conversations[0].richDraft.attachmentIDs.join()==='b1'));
   await test.ctx.close();
 }
 check('no renderer errors',errors.length===0);
 fs.writeFileSync(path.join(root,'ATTACHMENT_CHECKS.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.length,root}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
