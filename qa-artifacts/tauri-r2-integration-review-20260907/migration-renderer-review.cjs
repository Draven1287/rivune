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
   const ctl=window.testHost={state,calls:[],failSave:!!options.failSave,failSnapshot:false,blockSave:false,saves:[],blockSnapshot:false,snapshots:[],blockSubmit:false,submits:[],blockRetry:false,retries:[],blockImportPreview:false,importPreviews:[],retryAck:options.retryAck??null,reconcileAck:null,failCreate:false};
   window.__RIVUNE_DESKTOP_HOST__={
    getSnapshot:async()=>{if(ctl.failSnapshot)throw Error('Fixture disconnected');const value=structuredClone(state);if(ctl.snapshotDelay)await new Promise(resolve=>setTimeout(resolve,ctl.snapshotDelay));if(ctl.blockSnapshot)await new Promise((resolve,reject)=>ctl.snapshots.push({resolve,reject}));return value},
    discoverProviders:async()=>{ctl.calls.push(['discover']);return structuredClone(options.discoveredProviders??[])},
    openConversation:async id=>{ctl.calls.push(['open',id]);state.activeConversationID=id},
    createConversation:async c=>{if(ctl.failCreate)throw Error('fixture create failed');state.conversations.push({...c,draft:''})},
    configureProvider:async p=>{if(p.executablePath==='/bad')throw Error('Fixture invalid provider');state.selectedProviderID=p.id;ctl.calls.push(['configure',p])},
    saveDraft:async(id,draft)=>{ctl.calls.push(['save-start',id,draft]);if(ctl.failSave)throw Error('permission denied fixture');if(ctl.blockSave)await new Promise(resolve=>ctl.saves.push(resolve));state.conversations.find(c=>c.id===id).draft=draft;ctl.calls.push(['save-done',id,draft])},
    previewLegacyImport:async sources=>{ctl.calls.push(['import-preview',sources]);if(ctl.blockImportPreview)await new Promise(resolve=>ctl.importPreviews.push(resolve));return {fingerprint:'fixture-bound-import',reviewable:true,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:sources.length,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:sources.some(s=>s.kind==='preferences'),issues:[{source:'history',code:'legacy-exact-retry-unavailable',field:'/0/turns/0',blocking:false}]}},
    commitLegacyImport:async fingerprint=>{ctl.calls.push(['import-commit',fingerprint]);const receipt={fingerprint,conversationCount:1,turnCount:1,projectCount:1,draftCount:1,sourceCount:1,answerCount:1,attachmentCount:0,activatedDraftCount:1,archiveOnlyDraftCount:0,preferencesPreserved:false,safetyNoticeCount:1};state.legacyImports.push(receipt);state.conversations.push({id:'legacy:fixture:c3',title:'Imported work',draft:'preserved',readOnly:true});state.activeConversationID='legacy:fixture:c3';state.runs.push({id:'legacy-run:fixture',conversationID:'legacy:fixture:c3',status:'completed',updatedAt:'1',admitted:{requestID:'legacy-run:fixture',conversationID:'legacy:fixture:c3',prompt:'Legacy question',mode:'imported-read-only',provider:{id:'imported:legacy',kind:'imported',executablePath:'',model:null,timeoutMs:1000},approvedContext:{},retryOf:null},answer:'Legacy answer',error:null});return {fingerprint,conversationCount:1,state:'imported',receipt}},
    recoverLegacyImport:async fingerprint=>{ctl.calls.push(['import-recover',fingerprint]);return [{kind:'history',filename:'rivune-legacy-fixture-history.json',sha256:'fixture',bytes:[91,93]}]},
    submitRun:async r=>{ctl.calls.push(['submit',r]);state.runs.push({id:r.id,conversationID:r.conversationID,status:'running',updatedAt:'2026-09-07',admitted:{requestID:r.id,conversationID:r.conversationID,prompt:r.prompt,mode:r.mode,provider,approvedContext:{},retryOf:null},answer:null,error:null});if(ctl.blockSubmit)await new Promise(resolve=>ctl.submits.push(resolve));return {state:'accepted',requestID:r.id}},
    reconcileRun:async id=>{ctl.calls.push(['reconcile',id]);return ctl.reconcileAck?{...ctl.reconcileAck,requestID:id}:{state:'accepted',requestID:id}},
    cancelRun:async id=>{state.runs.find(r=>r.id===id).status='cancelled';return {state:'accepted',requestID:id}},
    retryRun:async(a,b)=>{ctl.calls.push(['retry',a,b]);if(ctl.blockRetry)await new Promise(resolve=>ctl.retries.push(resolve));return ctl.retryAck??{state:'accepted',requestID:b}}
   };
  },options);
  await page.goto('https://rivune-integrated.test/',{waitUntil:'networkidle'});return {page,ctx};
 }
 const tick=async p=>{await p.evaluate(()=>window.__polls.forEach(f=>f()));await p.waitForTimeout(15)};

 try {
  const observations=[];
  for (const status of ['failed','cancelled','preserved']) {
   const {page:p,ctx}=await setup();
   await p.evaluate(status=>{
    const s=testHost.state;s.conversations[0].readOnly=true;
    s.runs=['chatGPTAnswer','claudeAnswer','combinedAnswer'].map((kind,i)=>({id:`legacy-${status}-${i}`,conversationID:'c1',status,updatedAt:'2026-09-07',admitted:{requestID:`legacy-${status}-${i}`,conversationID:'c1',prompt:'Original synthetic prompt',mode:`imported-read-only:${kind}`,provider:{id:`imported:legacy:${kind}`,kind:'imported',model:['ChatGPT','Claude','Rivune'][i]},retryOf:null},answer:`Preserved ${kind}`,error:`Legacy task state '${status==='preserved'?'unknown':status}' was preserved without execution.`}));
    s.legacyImports=[{fingerprint:'fixture-review',conversationCount:1,answerCount:3,activatedDraftCount:1,projectCount:1,archiveOnlyDraftCount:1,attachmentCount:1,sourceCount:4,preferencesPreserved:true}];
   },status);
   await tick(p);
   const before={status,promptDisabled:await p.locator('#prompt').isDisabled(),sendDisabled:await p.locator('#submit').isDisabled(),retryVisible:await p.locator('#retry-run').isVisible(),retryEnabled:await p.locator('#retry-run').isEnabled(),answers:await p.locator('.response-content').allTextContents(),stateLabels:await p.locator('.message-state').allTextContents(),errors:await p.locator('.message-error').allTextContents()};
   if(before.retryVisible&&before.retryEnabled){await p.locator('#retry-run').click();before.retryCalls=await p.evaluate(()=>testHost.calls.filter(c=>c[0]==='retry').length)}
   await p.locator('#open-settings').click();
   before.archiveControls=await p.locator('#imported-data button').allTextContents();
   before.archiveText=await p.locator('#imported-data').textContent();
   await p.locator('.import-recover').focus();await tick(p);before.archiveFocusAfterPoll=await p.evaluate(()=>document.activeElement?.className??'');
   observations.push(before);await ctx.close();
  }
  const hash=require('crypto');const hashes=Object.fromEntries(['app.mjs','core.mjs','transcript.mjs'].map(n=>[n,hash.createHash('sha256').update(fs.readFileSync(path.join(web,n))).digest('hex')]));
  const report={scope:'Canonical renderer with existing test-only synthetic host, no native/provider execution',hashes,observations,errors};
  fs.writeFileSync(path.join(root,'MIGRATION_RENDERER_REVIEW.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
