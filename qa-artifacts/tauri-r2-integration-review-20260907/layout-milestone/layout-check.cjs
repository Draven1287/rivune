const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.env.RIVUNE_RENDERER_EVIDENCE_DIR || fs.mkdtempSync(path.join(require('os').tmpdir(),'rivune-r2-renderer-'));
fs.mkdirSync(root,{recursive:true});
const web='/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web';
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
    saveRichDraft:async request=>{const {conversationID:id,draft}=request;if(options.rejectClear&&draft===''){state.conversations.find(c=>c.id===id).richDraft={schemaVersion:1,revision:request.expectedRevision+1,attachmentIDs:['b1']};return {state:'rejected',mutationID:request.mutationID,conversationID:id,revision:request.expectedRevision+1,attachmentIDs:['b1'],error:'REVISION_CONFLICT'}};if(ctl.conflictSave&&id==='c1')return {state:'rejected',mutationID:request.mutationID,conversationID:id,revision:request.expectedRevision+1,attachmentIDs:request.attachmentIDs,error:'REVISION_CONFLICT'};ctl.calls.push(['rich-save',structuredClone(request)]);ctl.calls.push(['save-start',id,draft]);if(ctl.failSave)throw Error('permission denied fixture');if(ctl.blockSave)await new Promise(resolve=>ctl.saves.push(resolve));state.conversations.find(c=>c.id===id).draft=draft;ctl.calls.push(['save-done',id,draft]);state.conversations.find(c=>c.id===id).richDraft={schemaVersion:1,revision:request.expectedRevision+1,attachmentIDs:request.attachmentIDs};return {state:ctl.uncertainSave?'uncertain':'durable',mutationID:request.mutationID,conversationID:id,revision:request.expectedRevision+1,attachmentIDs:request.attachmentIDs}},
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
    flushShutdownDraft:async r=>{const {token,conversationID,draft,clientRevision}=r;ctl.calls.push(['shutdown-flush',token,conversationID,draft,clientRevision]);return {state:ctl.flushConflict?'rejected':ctl.uncertainShutdown?'uncertain':'durable',token,clientRevision,mutationID:r.mutationID,conversationID,richDraftRevision:conversationID===null?null:r.expectedRichRevision+1,attachmentIDs:r.attachmentIDs}},
    completeShutdown:async token=>{ctl.calls.push(['shutdown-complete',token]);if(ctl.failCompleteShutdown)throw Error('fixture final save failed')},
    abortShutdown:async token=>{ctl.calls.push(['shutdown-abort',token]);if(ctl.failAbort)throw Error('recovery still pending');ctl.hostFrozen=false}
   };
  },options);
  await page.goto('https://rivune-integrated.test/',{waitUntil:'networkidle'});return {page,ctx};
 }

 try {
 const {page:p}=await setup();
 check('idle status has no filler',await p.locator('#run-status').isHidden());
 check('configured welcome does not ask to connect',!(await p.locator('#welcome-description').textContent()).includes('Connect your AI'));
 const unconfigured=await setup({noProvider:true});
 check('unconfigured welcome gives connection direction',(await unconfigured.page.locator('#welcome-description').textContent()).includes('Connect your AI'));
 await unconfigured.ctx.close();
 const uncertain=await setup();await uncertain.page.evaluate(()=>testHost.submitState='uncertain');await uncertain.page.locator('#prompt').fill('Keep my question');await uncertain.page.waitForTimeout(240);await uncertain.page.locator('#submit').click();await uncertain.page.waitForTimeout(100);
 check('uncertain request has plain action',await uncertain.page.locator('#reconcile').textContent()==='Check request status');
 check('request identity is available in collapsed details',await uncertain.page.locator('#request-diagnostics').isVisible()&&await uncertain.page.locator('#request-diagnostics').evaluate(e=>!e.open)&&(await uncertain.page.locator('#request-diagnostic-id').textContent()).startsWith('Request ID: '));
 await uncertain.ctx.close();
 await p.evaluate(()=>{document.body.dataset.background='galaxy';testHost.state.runs.push({id:'layout-fixture',conversationID:'c1',status:'completed',updatedAt:'2026-09-08',admitted:{requestID:'layout-fixture',conversationID:'c1',prompt:'Help me plan a welcoming reading workshop.',mode:'direct',provider:testHost.state.providers[0],approvedContext:{},retryOf:null},answer:'## A welcoming first session\nStart with a short story everyone can read together. Leave time for each person to share one observation.\n\n### A simple plan\n- Welcome and introductions: 10 minutes.\n- Read together: 15 minutes.\n- Discuss and choose the next book: 20 minutes.\n\nKeep participation optional and share the next date before everyone leaves.',error:null});window.__polls.forEach(f=>f())});
 await p.waitForTimeout(120);
 for(const size of [{width:1120,height:760},{width:760,height:560}]){
 await p.setViewportSize(size);
 check(`no horizontal overflow ${size.width}`,await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(`composer and account visible ${size.width}`,await p.evaluate(()=>['prompt-form','open-settings'].every(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})));
 await p.screenshot({path:require('path').join(root,`layout-${size.width}.png`)});
 await p.locator('#open-settings').focus();await p.keyboard.press('Enter');
 check(`keyboard opens settings ${size.width}`,await p.locator('#settings-dialog').isVisible());
 await p.keyboard.press('Escape');
 check(`settings restores focus ${size.width}`,await p.locator('#open-settings').evaluate(e=>e===document.activeElement));
 await p.locator('#attach-text-file').focus();await p.keyboard.press('Enter');await p.locator('#attachment-dialog').waitFor({state:'visible'});
 check(`keyboard opens file preview ${size.width}`,await p.locator('#attachment-dialog').isVisible());
 await p.locator('#close-attachment').click();
 }
 fs.writeFileSync(require('path').join(root,'LAYOUT_CHECKS.json'),JSON.stringify({scope:'Synthetic host, actual canonical renderer; no native/provider proof',results,errors},null,2));
 console.log(JSON.stringify({root,passed:results.length,errors}));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
