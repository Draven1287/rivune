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
    retryConstellationInvocation:async request=>{ctl.calls.push(["member-retry",request]);if(!options.uncertainMember)state.runs.find(r=>r.id===request.requestID).status="running";return {state:options.uncertainMember?"uncertain":"accepted",requestID:request.requestID}},getModelCatalog:async()=>structuredClone(options.catalog),refreshModelCatalog:async()=>structuredClone(options.catalog),getSnapshot:async()=>{if(ctl.failSnapshot)throw Error('Fixture disconnected');const value=structuredClone(state);if(ctl.snapshotDelay)await new Promise(resolve=>setTimeout(resolve,ctl.snapshotDelay));if(ctl.blockSnapshot)await new Promise((resolve,reject)=>ctl.snapshots.push({resolve,reject}));return value},
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
 const actual=JSON.parse(fs.readFileSync('/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/tauri-r2-integration-review-20260907/r5-model-catalog/CONSTELLATION_PUBLIC_FIXTURES_20260908.json'));
 const provider={id:'fixture:lead',kind:'fixture',executablePath:'/fixture-only',model:null,timeoutMs:1000};
 const makeSnapshot=source=>({schemaVersion:1,activeConversationID:'welcome',selectedProviderID:provider.id,providers:[provider],conversations:[{id:'welcome',title:'Team task',draft:'Keep my follow-up',richDraft:{schemaVersion:1,revision:0,attachmentIDs:[],selection:null,team:null}}],runs:[{...source,updatedAt:'fixture',error:null,admitted:{requestID:source.id,conversationID:'welcome',prompt:'Review this together',mode:'constellation',provider,approvedContext:{},retryOf:null,team:actual.admittedTeam}}],runtimeCapabilities:actual.runtimeCapabilities});
 const complete=await setup({savedSnapshot:makeSnapshot(actual.completedRun)});const p=complete.page;
 check('host combined answer is primary',(await p.locator('#transcript').textContent()).includes(actual.completedRun.answer.trim()));
 check('completed activity is initially collapsed',await p.locator('#run-activity').isVisible()&&await p.locator('#run-activity').evaluate(e=>!e.open));
 await p.locator('#run-activity summary').click();check('actual host member milestones are inspectable',await p.locator('#activity-entries li').count()===actual.completedRun.activity.entries.length);
 await p.screenshot({path:path.join(root,'constellation-complete.png')});
 const failure=await setup({savedSnapshot:makeSnapshot(actual.failedRun)});const q=failure.page;
 check('failed constellation has only invocation retry',await q.locator('#retry-member').isVisible()&&await q.locator('#retry-run').isHidden());
 await q.locator('#retry-member').click();await q.waitForTimeout(100);
 check('retry uses exactly the opaque host invocation identity',await q.evaluate(expected=>JSON.stringify(testHost.calls.find(x=>x[0]==='member-retry')[1])===JSON.stringify(expected),{requestID:actual.failedRun.id,invocationID:actual.failedRun.failedInvocationID,failedAttemptID:actual.failedRun.failedAttemptID}));
 check('running task replaces send with stop',await q.locator('#submit').isHidden()&&await q.locator('#cancel').isVisible());
 const uncertain=await setup({savedSnapshot:makeSnapshot(actual.failedRun),uncertainMember:true});const u=uncertain.page;
 await u.locator('#retry-member').click();await u.waitForTimeout(100);
 check('uncertain retry blocks repetition and new send',await u.locator('#retry-member').isDisabled()&&await u.locator('#submit').isDisabled());
 await u.locator('#cancel').click();await u.waitForTimeout(100);
 check('recovery can cancel without retrying member',await u.evaluate(()=>testHost.calls.filter(x=>x[0]==='member-retry').length===1&&testHost.state.runs[0].status==='cancelled'));
 check('recovery keeps followup draft',await u.locator('#prompt').inputValue()==='Keep my follow-up');
 const readySnapshot=makeSnapshot(actual.completedRun);readySnapshot.runs=[];readySnapshot.conversations[0].richDraft.selection=actual.admittedTeam.members[0];readySnapshot.conversations[0].richDraft.team=actual.admittedTeam;
 const ready=await setup({savedSnapshot:readySnapshot});await ready.page.locator('#submit').click();await ready.page.waitForTimeout(100);
 check('available team sends one revision-bound constellation request',await ready.page.evaluate(()=>{const calls=testHost.calls.filter(x=>x[0]==='submit');return calls.length===1&&calls[0][1].mode==='constellation'&&Number.isSafeInteger(calls[0][1].richDraftRevision)}));
 const missingAttempt=structuredClone(actual.failedRun);delete missingAttempt.failedAttemptID;
 const missing=await setup({savedSnapshot:makeSnapshot(missingAttempt)});
 check('missing failed attempt never enables guessed retry or send',await missing.page.locator('#retry-member').isHidden()&&await missing.page.locator('#submit').isDisabled()&&await missing.page.locator('#cancel').isVisible());
 check('actual host member projection starts collapsed',await p.locator('#member-contributions').isVisible()&&await p.locator('#member-contributions').evaluate(e=>!e.open));
 await p.locator('#member-contributions summary').focus();await p.keyboard.press('Enter');
 check('all actual independent answers are inspectable',await p.locator('#contribution-cards .contribution-card').count()===actual.completedRun.memberResults.length+1&&await p.locator('#contribution-cards').evaluate((e,rows)=>rows.every(row=>e.textContent.includes(row.text)),actual.completedRun.memberResults));
 check('actual factual lead synthesis appears without fabricated review',(await p.locator('#contribution-cards').textContent()).includes(actual.completedRun.resolution.summary));
 check('actual disclosure leaves canonical final and followup intact',(await p.locator('#transcript').textContent()).includes(actual.completedRun.answer.trim())&&await p.locator('#prompt').inputValue()==='Keep my follow-up');
 await p.screenshot({path:path.join(root,'actual-member-disclosure.png')});
 await p.keyboard.press('Enter');
 check('keyboard can close actual disclosure',await p.locator('#member-contributions').evaluate(e=>!e.open));
 await p.evaluate(()=>{for(const row of testHost.state.runs[0].memberResults)row.providerID='fixture:shared';testHost.state.runs[0].resolution.providerID='fixture:shared';window.__polls.forEach(f=>f())});await p.waitForTimeout(100);
 await p.locator('#member-contributions summary').click();
 check('synthetic same-provider members retain distinct visible attribution',await p.locator('#contribution-cards .contribution-meta').evaluateAll(nodes=>{const labels=nodes.map(n=>n.textContent);return labels.includes('Member member-1 · fixture:shared')&&labels.includes('Member member-2 · fixture:shared')&&labels.includes('Lead member-1 · fixture:shared')}));
 fs.writeFileSync(path.join(root,'ACTUAL_DISCLOSURE_CHECKS.json'),JSON.stringify({results,errors,scope:'exact updated host projection fixture9b138466 with synthetic transport; no live provider'},null,2));console.log(JSON.stringify({checks:results.length,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
