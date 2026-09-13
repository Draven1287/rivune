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
   const state={schemaVersion:1,activeConversationID:options.activeConversationID??'c1',selectedProviderID:options.noProvider?null:provider.id,providers:[provider],conversations:[{id:'c1',title:'Reading workshop',draft:''},{id:'c2',title:'Website ideas',draft:options.secondDraft??''}],legacyImports:[],runs:[]};
   if(options.failedRun)state.runs.push({id:'failed-source',conversationID:'c1',status:'failed',updatedAt:'2026-09-07',admitted:{requestID:'failed-source',conversationID:'c1',prompt:'original',mode:'direct',provider,approvedContext:{},retryOf:null},answer:null,error:'fixture failed'});
   const ctl=window.testHost={state,calls:[],failSave:!!options.failSave,failSnapshot:false,blockSave:false,saves:[],blockSnapshot:false,snapshots:[],blockSubmit:false,submits:[],blockRetry:false,retries:[],blockReconcile:false,reconciles:[],blockImportPreview:false,importPreviews:[],retryAck:options.retryAck??null,reconcileAck:null,failCreate:false,failCompleteShutdown:!!options.failCompleteShutdown,shutdownHandler:null,shutdownPromise:null};
   window.__RIVUNE_DESKTOP_HOST__={
    getSnapshot:async()=>{if(ctl.failSnapshot)throw Error('Fixture disconnected');const value=structuredClone(state);if(ctl.snapshotDelay)await new Promise(resolve=>setTimeout(resolve,ctl.snapshotDelay));if(ctl.blockSnapshot)await new Promise((resolve,reject)=>ctl.snapshots.push({resolve,reject}));return value},
    inspectLegacyImport:async fingerprint=>{ctl.calls.push(['inspect',fingerprint]);return {schemaVersion:1,fingerprint,sections:['projects','orphanDrafts','attachments','preferences','notices'].map(kind=>({kind,totalCount:1,truncated:false,items:[{id:kind+'1',label:'Saved '+kind,detailText:'Read-only synthetic content'}]}))}},
    discoverProviders:async()=>{ctl.calls.push(['discover']);return structuredClone(options.discoveredProviders??[])},
    openConversation:async id=>{ctl.calls.push(['open',id]);state.activeConversationID=id},
    createConversation:async c=>{if(ctl.failCreate)throw Error('fixture create failed');state.conversations.push({...c,draft:''})},
    configureProvider:async p=>{if(p.executablePath==='/bad')throw Error('Fixture invalid provider');state.selectedProviderID=p.id;ctl.calls.push(['configure',p])},
    saveDraft:async(id,draft)=>{ctl.calls.push(['save-start',id,draft]);if(ctl.failSave)throw Error('permission denied fixture');if(ctl.blockSave)await new Promise(resolve=>ctl.saves.push(resolve));state.conversations.find(c=>c.id===id).draft=draft;ctl.calls.push(['save-done',id,draft])},
    previewLegacyImport:async sources=>{ctl.calls.push(['import-preview',sources]);if(ctl.blockImportPreview)await new Promise(resolve=>ctl.importPreviews.push(resolve));return {fingerprint:'fixture-bound-import',reviewable:true,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:sources.length,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:sources.some(s=>s.kind==='preferences'),issues:[{source:'history',code:'legacy-exact-retry-unavailable',field:'/0/turns/0',blocking:false}]}},
    commitLegacyImport:async fingerprint=>{ctl.calls.push(['import-commit',fingerprint]);const receipt={fingerprint,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:1,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:false,safetyNoticeCount:1};state.legacyImports.push(receipt);state.conversations.push({id:'legacy:fixture:c3',title:'Imported work',draft:'preserved',readOnly:true});state.activeConversationID='legacy:fixture:c3';state.runs.push({id:'legacy-run:fixture',conversationID:'legacy:fixture:c3',status:'completed',updatedAt:'1',admitted:{requestID:'legacy-run:fixture',conversationID:'legacy:fixture:c3',prompt:'Legacy question',mode:'imported-read-only',provider:{id:'imported:legacy',kind:'imported',executablePath:'',model:null,timeoutMs:1000},approvedContext:{},retryOf:null},answer:'Legacy answer',error:null});return {fingerprint,conversationCount:1,state:'imported',receipt}},
    recoverLegacyImport:async fingerprint=>{ctl.calls.push(['import-recover',fingerprint]);return [{kind:'history',filename:'rivune-legacy-fixture-history.json',sha256:'fixture',bytes:[91,93]}]},
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
 const tick=async p=>{await p.evaluate(()=>window.__polls.forEach(f=>f()));await p.waitForTimeout(15)};

 try {
  const {page:p,ctx}=await setup();
  await p.evaluate(()=>{testHost.state.legacyImports=[{fingerprint:'a'.repeat(64),conversationCount:1,answerCount:3,activatedDraftCount:1,projectCount:1,archiveOnlyDraftCount:2,attachmentCount:1,sourceCount:4,preferencesPreserved:true}];testHost.state.conversations[0].readOnly=true;testHost.state.runs=[{id:'legacy-failed',conversationID:'c1',status:'failed',updatedAt:'1',admitted:{requestID:'legacy-failed',conversationID:'c1',prompt:'Original request',mode:'imported-read-only:combinedAnswer',provider:{kind:'imported',model:'Rivune'}},answer:'Preserved partial answer',error:'Original failed state preserved'}]});await tick(p);
  check('imported failed history hides Retry and disables composer',await p.locator('#retry-run').isHidden()&&await p.locator('#prompt').isDisabled());
  await p.evaluate(()=>document.querySelector('#retry-run').click());
  check('retry handler independently blocks imported work',await p.evaluate(()=>!testHost.calls.some(c=>c[0]==='retry')));
  await p.locator('#open-settings').click();await p.locator('.import-inspect').focus();await tick(p);
  check('poll retains real Inspect trigger focus',await p.evaluate(()=>document.activeElement.matches('.import-inspect')));
  await p.locator('.import-inspect').click();await p.waitForFunction(()=>document.querySelector('.rivune-archive-inspector [role=status]').textContent.includes('Archive ready'));
  check('real app button calls bound host inspect exactly once',await p.evaluate(()=>testHost.calls.filter(c=>c[0]==='inspect'&&c[1]==='a'.repeat(64)).length===1));
  check('real integration displays all five archive sections',await p.locator('.rivune-archive-inspector details').count()===5);
  await p.locator('.rivune-archive-inspector summary').first().click();
  check('project preview exposes bounded content',await p.locator('.rivune-archive-inspector pre').first().textContent()==='Read-only synthetic content');
  await p.keyboard.press('Escape');await p.waitForFunction(()=>document.activeElement.matches('.import-inspect'));
  check('Escape returns to stable real Inspect trigger',await p.evaluate(()=>document.querySelector('#settings-dialog').open&&document.activeElement.matches('.import-inspect')));
  check('no renderer errors',errors.length===0);
  const crypto=require('crypto');const hashes=Object.fromEntries(['app.mjs','core.mjs','desktop-host.mjs','archive-inspector.mjs','archive-inspector.css'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(web,n))).digest('hex')]));
  fs.writeFileSync(path.join(root,'ARCHIVE_INSPECTOR_INTEGRATION.json'),JSON.stringify({scope:'Canonical app hook/adapter/UI with existing synthetic browser host; actual native IPC/build not verified',hashes,results,errors},null,2)+'\n');console.log(JSON.stringify({checks:results.length,errors}));await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
