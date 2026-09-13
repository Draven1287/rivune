const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=process.env.RIVUNE_RENDERER_EVIDENCE_DIR || fs.mkdtempSync(path.join(require('os').tmpdir(),'rivune-r2-renderer-'));
fs.mkdirSync(root,{recursive:true});
const web='/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web';
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const results=[],errors=[];const check=(name,result)=>{assert.ok(result,name);results.push({name,pass:true})};
 async function setup(options={}){
  const ctx=await browser.newContext({viewport:{width:1120,height:760},reducedMotion:'reduce'});
  await ctx.route('https://rivune-integrated.test/**',async route=>{const name=new URL(route.request().url()).pathname.slice(1)||'index.html',file=path.resolve(web,name);if(!file.startsWith(web+path.sep)||!fs.existsSync(file))return route.abort();const types={'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'};await route.fulfill({body:fs.readFileSync(file),headers:{'Content-Security-Policy':csp},contentType:types[path.extname(file)]||'text/plain'})});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(options=>{
   window.__polls=[];window.setInterval=cb=>{window.__polls.push(cb);return 1};
   const provider={id:'fixture:local',kind:'fixture',executablePath:'/fixture-only',model:null,timeoutMs:1000};
   const state={schemaVersion:1,activeConversationID:options.activeConversationID??'c1',selectedProviderID:options.noProvider?null:provider.id,providers:[provider],conversations:[{id:'c1',title:'Reading workshop',draft:''},{id:'c2',title:'Website ideas',draft:options.secondDraft??''}],legacyImports:[],runs:[]};
   if(options.failedRun)state.runs.push({id:'failed-source',conversationID:'c1',status:'failed',updatedAt:'2026-09-07',admitted:{requestID:'failed-source',conversationID:'c1',prompt:'original',mode:'direct',provider,approvedContext:{},retryOf:null},answer:null,error:'fixture failed'});
   const ctl=window.testHost={state,calls:[],failSave:!!options.failSave,failSnapshot:false,blockSave:false,saves:[],blockSnapshot:false,snapshots:[],blockSubmit:false,submits:[],blockRetry:false,retries:[],blockReconcile:false,reconciles:[],blockImportPreview:false,importPreviews:[],retryAck:options.retryAck??null,reconcileAck:null,failCreate:false,failCompleteShutdown:!!options.failCompleteShutdown,shutdownHandler:null,shutdownPromise:null};
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
  const security=[];p.on('console',msg=>{if(msg.type()==='error')security.push(msg.text())});
  await p.locator('#open-settings').click();
  await p.evaluate(async()=>{
   const {initializeArchiveInspector}=await import('./archive-inspector.mjs');
   window.archiveDTO=f=>({schemaVersion:1,fingerprint:f,sections:['projects','orphanDrafts','attachments','preferences','notices'].map((kind,i)=>({kind,items:i===0?[{id:'p',label:'<img src=x onerror=alert(1)>',detailText:'Stored instructions\n'+ '🌎'.repeat(50)}]:[],totalCount:i===0?2:0,truncated:i===0}))});
   window.archiveMode='ready';window.archiveCalls=[];
   window.inspector=initializeArchiveInspector({inspect:async f=>{archiveCalls.push(f);if(archiveMode==='error')throw Error('private error');if(archiveMode==='pending')return new Promise(resolve=>window.archiveResolve=resolve);return archiveDTO(f)}});
   await inspector.open('a'.repeat(64),document.querySelector('#restart-setup'));
  });
  const modal=p.locator('.rivune-archive-inspector');
  await p.waitForFunction(()=>getComputedStyle(document.querySelector('.rivune-archive-inspector')).maxHeight!=='none');
  check('self-hosted CSS works under exact Tauri CSP',await modal.evaluate(n=>getComputedStyle(n).backgroundColor==='rgb(16, 21, 29)'&&n.querySelector('link').href.endsWith('/archive-inspector.css')));
  check('all five inspectable sections render',await modal.locator('details').count()===5);
  await modal.locator('summary').first().click();
  check('untrusted label remains literal text',await modal.locator('h3').textContent()==='<img src=x onerror=alert(1)>'&&await modal.locator('img').count()===0);
  check('truncation explicitly disclosed',(await modal.locator('.archive-limit').textContent()).includes('Showing 1 of 2'));
  await modal.getByRole('button',{name:'Close archive inspection'}).click();
  await p.waitForFunction(()=>document.activeElement.id==='restart-setup');
  check('close restores triggering control inside parent Settings',await p.evaluate(()=>document.activeElement.id==='restart-setup'&&document.querySelector('#settings-dialog').open));
  await p.evaluate(()=>{archiveMode='pending';inspector.open('a'.repeat(64),document.querySelector('#restart-setup'));});
  await p.waitForFunction(()=>typeof archiveResolve==='function');
  await p.evaluate(()=>{window.oldArchiveResolve=archiveResolve;inspector.close();archiveMode='pending';inspector.open('b'.repeat(64),document.querySelector('#restart-setup'));});
  await p.waitForTimeout(30);
  await p.evaluate(()=>{archiveResolve(archiveDTO('b'.repeat(64)));oldArchiveResolve(archiveDTO('a'.repeat(64)))});
  await p.waitForFunction(()=>document.querySelector('.rivune-archive-inspector [role=status]').textContent.includes('Archive ready'));
  check('close immediate reopen survives old close event and stale reply',await modal.evaluate(n=>n.open)&&await modal.locator('details').count()===5);
  await modal.getByRole('button',{name:'Close archive inspection'}).focus();await p.keyboard.press('Shift+Tab');
  check('reverse Tab stays inside inspector',await p.evaluate(()=>document.activeElement.matches('.rivune-archive-inspector summary')));
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('.rivune-archive-inspector').open);
  check('Escape closes and returns focus to Settings',await p.evaluate(()=>document.activeElement.id==='restart-setup'));
  await p.evaluate(async()=>{archiveMode='error';await inspector.open('a'.repeat(64),document.querySelector('#restart-setup'))});
  check('async failure is recoverable without exposing private error',await modal.getByRole('button',{name:'Try again'}).isVisible()&&!(await modal.textContent()).includes('private error'));
  await p.evaluate(()=>archiveMode='ready');await modal.getByRole('button',{name:'Try again'}).click();
  await p.waitForFunction(()=>document.querySelector('.rivune-archive-inspector [role=status]').textContent.includes('Archive ready'));
  check('retry returns verified section content',await modal.locator('details').count()===5);
  for(const width of [390,760]){await p.setViewportSize({width,height:560});check('modal fits width '+width,await modal.evaluate(n=>n.getBoundingClientRect().left>=0&&n.getBoundingClientRect().right<=innerWidth&&n.scrollWidth<=n.clientWidth))}
  await p.screenshot({path:path.join(root,'archive-inspector-rendered.png')});
  check('closing settles a pending inspection without waiting for host',await p.evaluate(async()=>{archiveMode='pending';const task=inspector.open('a'.repeat(64));inspector.close();return Promise.race([task.then(()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),500))])}));
  await p.evaluate(()=>{archiveMode='pending';inspector.open('a'.repeat(64),document.querySelector('#restart-setup'))});
  await modal.getByRole('button',{name:'Try again'}).waitFor({state:'visible',timeout:12000});
  check('hung host times out with visible recovery',await modal.locator('[role=status]').textContent()==='We couldn’t inspect this archive. Your preserved originals were not changed. Try again or close this view.');
  await p.evaluate(()=>archiveResolve(archiveDTO('a'.repeat(64))));await p.waitForTimeout(20);
  check('late timed-out response cannot replace error view',await modal.locator('details').count()===0&&await modal.getByRole('button',{name:'Try again'}).isVisible());
  check('no renderer errors or CSP rejections',errors.length===0&&security.length===0);
  fs.writeFileSync(path.join(root,'ARCHIVE_INSPECTOR_BROWSER.json'),JSON.stringify({scope:'Actual new module and stylesheet under canonical Tauri CSP; existing synthetic host, no native/provider execution',csp,results,errors,security},null,2)+'\n');console.log(JSON.stringify({checks:results.length,errors,security}));
  await ctx.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
