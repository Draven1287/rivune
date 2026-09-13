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
   window.__polls=[];window.setInterval=cb=>{window.__polls.push(cb);return 1};
   const provider={id:'fixture:local',kind:'fixture',executablePath:'/fixture-only',model:null,timeoutMs:1000};
   const importFingerprint='a'.repeat(64);
   const state={projects:[{schemaVersion:1,id:'p1',name:'Lantern',instructions:'Be concise'}],schemaVersion:1,activeConversationID:options.activeConversationID??'c1',selectedProviderID:options.noProvider?null:provider.id,providers:[provider],conversations:[{id:'c1',title:'Reading workshop',draft:''},{id:'c2',title:'Website ideas',draft:options.secondDraft??''}],legacyImports:[],runs:[]};
   if(options.failedRun)state.runs.push({id:'failed-source',conversationID:'c1',status:'failed',updatedAt:'2026-09-07',admitted:{requestID:'failed-source',conversationID:'c1',prompt:'original',mode:'direct',provider,approvedContext:{},retryOf:null},answer:null,error:'fixture failed'});
   const ctl=window.testHost={state,calls:[],failSave:!!options.failSave,failSnapshot:false,blockSave:false,saves:[],blockSnapshot:false,snapshots:[],blockSubmit:false,submits:[],blockRetry:false,retries:[],blockReconcile:false,reconciles:[],blockImportPreview:false,importPreviews:[],retryAck:options.retryAck??null,reconcileAck:null,failCreate:false,failCompleteShutdown:!!options.failCompleteShutdown,shutdownHandler:null,shutdownPromise:null};
   window.__RIVUNE_DESKTOP_HOST__={
    createProject:async p=>{if(ctl.failBeforeCreate)throw Error('not saved');ctl.calls.push(['create-project',p.id]);if(state.projects.some(x=>x.id===p.id))throw Error('exists');state.projects.push(p);if(ctl.loseReadback)ctl.failSnapshot=true;if(ctl.loseAck)throw Error('lost acknowledgement')},
    updateProject:async p=>{if(ctl.failProject)throw Error('disk full');state.projects[state.projects.findIndex(x=>x.id===p.id)]=p},
    selectProject:async id=>{state.activeProjectID=id},
    moveConversationToProject:async(id,projectID)=>{state.conversations.find(c=>c.id===id).projectID=projectID},
    searchWorkspace:async(query,limit)=>({query,truncated:false,matches:[...state.projects.map(p=>({kind:'project',id:p.id,title:p.name})),...state.conversations.map(c=>({kind:'conversation',id:c.id,title:c.title}))].filter(m=>m.title.toLowerCase().includes(query.toLowerCase())).slice(0,limit)}),
    getSnapshot:async()=>{if(ctl.failSnapshot)throw Error('Fixture disconnected');const value=structuredClone(state);if(ctl.snapshotDelay)await new Promise(resolve=>setTimeout(resolve,ctl.snapshotDelay));if(ctl.blockSnapshot)await new Promise((resolve,reject)=>ctl.snapshots.push({resolve,reject}));return value},
    discoverProviders:async()=>{ctl.calls.push(['discover']);return structuredClone(options.discoveredProviders??[])},
    openConversation:async id=>{ctl.calls.push(['open',id]);state.activeConversationID=id},
    createConversation:async c=>{if(ctl.failCreate)throw Error('fixture create failed');state.conversations.push({...c,draft:'',projectID:state.activeProjectID})},
    configureProvider:async p=>{if(p.executablePath==='/bad')throw Error('Fixture invalid provider');state.selectedProviderID=p.id;ctl.calls.push(['configure',p])},
    saveDraft:async(id,draft)=>{ctl.calls.push(['save-start',id,draft]);if(ctl.failSave)throw Error('permission denied fixture');if(ctl.blockSave)await new Promise(resolve=>ctl.saves.push(resolve));state.conversations.find(c=>c.id===id).draft=draft;ctl.calls.push(['save-done',id,draft])},
    previewLegacyImport:async sources=>{ctl.calls.push(['import-preview',sources]);if(ctl.blockImportPreview)await new Promise(resolve=>ctl.importPreviews.push(resolve));return {fingerprint:importFingerprint,reviewable:true,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:sources.length,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:sources.some(s=>s.kind==='preferences'),issues:[{source:'history',code:'legacy-exact-retry-unavailable',field:'/0/turns/0',blocking:false}]}},
    commitLegacyImport:async fingerprint=>{ctl.calls.push(['import-commit',fingerprint]);const receipt={fingerprint,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:1,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:false,safetyNoticeCount:1};state.legacyImports.push(receipt);state.conversations.push({id:'legacy:fixture:c3',title:'Imported work',draft:'preserved',readOnly:true});state.activeConversationID='legacy:fixture:c3';state.runs.push({id:'legacy-run:fixture',conversationID:'legacy:fixture:c3',status:'completed',updatedAt:'1',admitted:{requestID:'legacy-run:fixture',conversationID:'legacy:fixture:c3',prompt:'Legacy question',mode:'imported-read-only',provider:{id:'imported:legacy',kind:'imported',executablePath:'',model:null,timeoutMs:1000},approvedContext:{},retryOf:null},answer:'Legacy answer',error:null});return {fingerprint,conversationCount:1,state:'imported',receipt}},
    recoverLegacyImport:async fingerprint=>{ctl.calls.push(['import-recover',fingerprint]);return [{kind:'history',filename:'rivune-legacy-fixture-history.json',sha256:'fixture',bytes:[91,93]}]},
    exportLegacyImport:async fingerprint=>{ctl.calls.push(['import-export',fingerprint]);return structuredClone(options.exportReceipt??{platform:'macOS',saved:[{filename:'rivune-legacy-fixture-history.json',sha256:'b'.repeat(64),bytes:2}],cancelled:false,error:null,uncertainFilename:null})},
    inspectLegacyImport:async fingerprint=>{ctl.calls.push(['import-inspect',fingerprint]);return {schemaVersion:1,fingerprint,sections:[{kind:'projects',items:[{id:'projects:1',label:'Saved project',detailText:'Availability: Archived only'}],totalCount:1,truncated:false},{kind:'orphanDrafts',items:[],totalCount:0,truncated:false},{kind:'attachments',items:[],totalCount:0,truncated:false},{kind:'preferences',items:[],totalCount:0,truncated:false},{kind:'notices',items:[],totalCount:0,truncated:false}]}},
    submitRun:async r=>{ctl.calls.push(['submit',r]);state.runs.push({id:r.id,conversationID:r.conversationID,status:'running',updatedAt:'2026-09-07',admitted:{requestID:r.id,conversationID:r.conversationID,prompt:r.prompt,mode:r.mode,provider,approvedContext:{},retryOf:null},answer:null,error:null});if(ctl.blockSubmit)await new Promise(resolve=>ctl.submits.push(resolve));return {state:'accepted',requestID:r.id}},
    reconcileRun:async id=>{ctl.calls.push(['reconcile',id]);if(ctl.blockReconcile)await new Promise(resolve=>ctl.reconciles.push(resolve));return ctl.reconcileAck?{...ctl.reconcileAck,requestID:id}:{state:'accepted',requestID:id}},
    cancelRun:async id=>{state.runs.find(r=>r.id===id).status='cancelled';return {state:'accepted',requestID:id}},
    retryRun:async(a,b)=>{ctl.calls.push(['retry',a,b]);if(ctl.blockRetry)await new Promise(resolve=>ctl.retries.push(resolve));return ctl.retryAck??{state:'accepted',requestID:b}}
    ,onShutdownRequested:handler=>{ctl.shutdownHandler=handler},
    beginShutdown:async token=>{ctl.calls.push(['shutdown-begin',token])},
    flushShutdownDraft:async(token,conversationID,draft,revision)=>{ctl.calls.push(['shutdown-flush',token,conversationID,draft,revision]);return {token,revision}},
    completeShutdown:async token=>{ctl.calls.push(['shutdown-complete',token]);if(ctl.failCompleteShutdown)throw Error('fixture final save failed')},
    abortShutdown:async token=>{ctl.calls.push(['shutdown-abort',token])}
   };
  },options);
  await page.goto('https://rivune-integrated.test/',{waitUntil:'networkidle'});return {page,ctx};
 }

 try {
 const {page:p}=await setup();
 await p.locator('#prompt').fill('Keep this chat draft');
 await p.locator('[data-project-key="select:p1"]').focus();await p.keyboard.press('Enter');
 await p.waitForTimeout(80);
 check('project filter preserves current chat draft',await p.locator('#prompt').inputValue()==='Keep this chat draft');
 check('filter does not claim current chat project',await p.locator('#project-context').isHidden());
 check('project keyboard focus retained',await p.locator('[data-project-key="select:p1"]').evaluate(e=>document.activeElement===e));
 await p.locator('[data-project-key="edit:p1"]').click();
 await p.locator('#project-name').fill('Lantern revised');
 await p.evaluate(()=>testHost.failProject=true);await p.locator('#save-project').click();
 await p.waitForTimeout(60);
 check('save failure retains editable name',await p.locator('#project-name').inputValue()==='Lantern revised'&&await p.locator('#project-name').isEnabled());
 await p.locator('#close-project').click();await p.locator('[data-project-key="edit:p1"]').click();
 check('closing editor retains dirty edits',await p.locator('#project-name').inputValue()==='Lantern revised');
 await p.evaluate(()=>testHost.failProject=false);await p.locator('#save-project').click();await p.waitForTimeout(60);
 check('editor save restores live opener',await p.locator('[data-project-key="edit:p1"]').evaluate(e=>document.activeElement===e));
 await p.locator('#new-project').click();await p.locator('#project-name').fill('Lost ACK');await p.evaluate(()=>testHost.loseAck=true);await p.locator('#save-project').click();await p.waitForTimeout(80);
 check('persisted creation reconciles lost ack',await p.locator('#project-dialog').isHidden()&&await p.evaluate(()=>testHost.state.projects.filter(p=>p.name==='Lost ACK').length===1));
 await p.locator('#new-project').click();await p.locator('#project-name').fill('Original saved');await p.evaluate(()=>testHost.loseReadback=true);await p.locator('#save-project').click();await p.waitForTimeout(60);
 await p.locator('#project-name').fill('Newer edit');await p.evaluate(()=>{testHost.failSnapshot=false;testHost.loseReadback=false});await p.locator('#save-project').click();await p.waitForTimeout(60);
 check('uncertain create rebinds newer edits to saved project',(await p.locator('#project-editor-status').textContent()).includes('original project was saved'));
 await p.locator('#save-project').click();await p.waitForTimeout(60);
 check('newer edits update the reconciled project',await p.locator('#project-dialog').isHidden()&&await p.evaluate(()=>testHost.state.projects.filter(p=>p.name==='Newer edit').length===1&&!testHost.state.projects.some(p=>p.name==='Original saved')));
 await p.locator('#new-project').click();await p.locator('#project-name').fill('Immutable original');await p.evaluate(()=>testHost.failBeforeCreate=true);await p.locator('#save-project').click();await p.waitForTimeout(60);
 await p.locator('#project-name').fill('Second attempt');await p.evaluate(()=>{testHost.failBeforeCreate=false;testHost.loseReadback=true});await p.locator('#save-project').click();await p.waitForTimeout(60);
 await p.locator('#project-name').fill('Third revision');await p.evaluate(()=>{testHost.failSnapshot=false;testHost.loseReadback=false});await p.locator('#save-project').click();await p.waitForTimeout(60);
 check('retry preserves original creation payload',await p.evaluate(()=>testHost.state.projects.some(p=>p.name==='Immutable original')&&!testHost.state.projects.some(p=>p.name==='Second attempt')));
 await p.locator('#save-project').click();await p.waitForTimeout(60);
 check('multiple revised retries recover to explicit update',await p.locator('#project-dialog').isHidden()&&await p.evaluate(()=>testHost.state.projects.filter(p=>p.name==='Third revision').length===1));
 await p.locator('#workspace-search').fill('Lantern');await p.waitForTimeout(250);
 check('title search returns matching project',(await p.locator('#search-results').textContent()).includes('Lantern revised'));
 await p.locator('#workspace-search').fill('');check('clear search hides results',await p.locator('#search-results').isHidden());
 await p.locator('#new-conversation').click();await p.waitForTimeout(80);
 check('new chat inherits chosen project',await p.evaluate(()=>testHost.state.conversations.at(-1).projectID==='p1'));
 await p.locator('#organize-conversation').click();await p.locator('#move-project-options button').first().click();await p.waitForTimeout(80);
 check('move removes project membership',await p.evaluate(()=>testHost.state.conversations.at(-1).projectID===null));
 await p.screenshot({path:path.join(root,'projects.png')});
 check('no page errors',errors.length===0);
 fs.writeFileSync(path.join(root,'PROJECT_CHECKS.json'),JSON.stringify({results,errors},null,2));console.log(JSON.stringify({checks:results.length,root}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
