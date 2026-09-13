const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const checks=[],errors=[];
 const check=(name,result)=>{assert.ok(result,name);checks.push({name,pass:true})};
 try{
  const context=await browser.newContext({viewport:{width:1120,height:760},reducedMotion:'reduce'});
  await context.route('https://rivune-renderer.test/**',async route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
   const file=path.resolve(__dirname,'web',name);
   if(!file.startsWith(path.join(__dirname,'web')+path.sep)||!fs.existsSync(file))return route.abort();
   const ext=path.extname(file),types={'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'};
   await route.fulfill({status:200,body:fs.readFileSync(file),contentType:types[ext]||'text/plain'});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{
   window.__polls=[];window.setInterval=callback=>{window.__polls.push(callback);return 1};
   const state=window.__fixture={schemaVersion:1,selectedProviderID:null,conversations:[{id:'c1',title:'Plan a reading workshop',draft:''},{id:'c2',title:'Ideas for a simpler website',draft:''},{id:'c3',title:'Research notes',draft:''}],runs:[]};window.__calls=[];
   window.__RIVUNE_DESKTOP_HOST__={
    getSnapshot:async()=>structuredClone(state),openConversation:async()=>{},
    createConversation:async c=>{state.conversations.push({...c,draft:''});window.__calls.push(['create',c])},
    saveDraft:async(id,draft)=>{state.conversations.find(c=>c.id===id).draft=draft},
    configureProvider:async p=>{window.__calls.push(['configure',p]);state.selectedProviderID=p.id},
    submitRun:async r=>{window.__calls.push(['submit',r]);state.runs.push({id:r.id,conversationID:r.conversationID,status:'completed',answer:'Synthetic review fixture — not a live AI response.\n\nStart with a short reading workshop.\n\n1. Choose one story and one question.\n2. Invite each participant to share a perspective.\n3. Leave time to write down the next step.\n\nKeep the first session simple, then adjust using participant feedback.',updatedAt:'2026-09-07T00:00:00Z'});return {state:'accepted',requestID:r.id}},
    reconcileRun:async id=>({state:'accepted',requestID:id}),cancelRun:async id=>({state:'accepted',requestID:id}),retryRun:async(a,b)=>({state:'accepted',requestID:b})
   };
  });
  await page.goto('https://rivune-renderer.test/',{waitUntil:'networkidle'});
  await page.screenshot({path:path.join(__dirname,'evidence/desktop-empty.png')});
  await page.locator('#prompt').fill('Keep my draft through settings');
  await page.locator('#open-settings').click();
  check('settings is modal inside current document',await page.locator('#settings-dialog').evaluate(e=>e.matches(':modal')));
  await page.screenshot({path:path.join(__dirname,'evidence/desktop-settings-top.png')});
  check('settings initially focuses close control',await page.evaluate(()=>document.activeElement.id==='close-settings'));
  for(let n=0;n<18;n++){await page.keyboard.press('Tab');check(`modal tab containment ${n+1}`,await page.evaluate(()=>document.activeElement.closest('#settings-dialog')!==null))}
  await page.locator('[data-provider="codex"]').focus();await page.keyboard.press('ArrowRight');
  check('provider arrows update value and focus',await page.evaluate(()=>document.querySelector('#provider-kind').value==='claude'&&document.activeElement.dataset.provider==='claude'));
  await page.locator('#provider-path').fill('/fixture/bin/claude');
  await page.locator('#provider-model').fill('fixture-model');
  await page.locator('#connect-provider').click();
  check('settings uses existing configure handler',await page.evaluate(()=>window.__calls.some(([n,p])=>n==='configure'&&p.kind==='claude'&&p.executablePath==='/fixture/bin/claude'&&p.model==='fixture-model')));
  await page.screenshot({path:path.join(__dirname,'evidence/desktop-settings.png')});
  await page.locator('#galaxy-background').uncheck();
  check('appearance toggle applies locally',await page.evaluate(()=>document.body.dataset.background==='plain'));
  await page.keyboard.press('Escape');
  check('escape closes and restores opener focus',await page.evaluate(()=>!document.querySelector('#settings-dialog').open&&document.activeElement.id==='open-settings'));
  check('settings preserves unsent message',await page.locator('#prompt').inputValue()==='Keep my draft through settings');
  await page.locator('#submit').click();
  await page.locator('#answer').waitFor({state:'visible'});
  check('actual submit handler called exactly once',await page.evaluate(()=>window.__calls.filter(([n])=>n==='submit').length===1));
  check('welcome yields to returned answer',await page.locator('#welcome').isHidden());
  check('accepted draft is cleared',await page.locator('#prompt').inputValue()==='');
  await page.locator('#open-settings').click();await page.locator('#galaxy-background').check();await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(__dirname,'evidence/desktop-answer-fixture.png')});
  await page.locator('#conversations button').first().focus();
  await page.evaluate(async()=>{for(const tick of window.__polls)tick();await new Promise(r=>setTimeout(r,0))});
  check('poll preserves conversation keyboard focus',await page.evaluate(()=>document.activeElement.matches('#conversations button')));
  await page.locator('#prompt').focus();await page.keyboard.press('Control+,');check('settings keyboard shortcut',await page.locator('#settings-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
  check('shortcut restores composer focus',await page.evaluate(()=>document.activeElement.id==='prompt'));
  check('reduced motion removes transitions',await page.locator('#submit').evaluate(e=>getComputedStyle(e).transitionDuration==='0s'));
  for(const [width,height] of [[760,560],[390,844],[320,568]]){
   await page.setViewportSize({width,height});
   check(`conversation navigation remains reachable ${width}`,await page.locator('#conversations button').first().isVisible());
   check(`no horizontal page overflow ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(__dirname,`evidence/workspace-${width}.png`)});
   await page.locator('#open-settings').click();
   check(`settings stays in viewport ${width}`,await page.locator('#settings-dialog').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));
   await page.locator('#galaxy-background').uncheck();await page.keyboard.press('Escape');
  }
  await page.reload();check('appearance survives reload',await page.evaluate(()=>document.body.dataset.background==='plain'));
  await page.locator('#new-conversation').click();check('new conversation still reaches host',await page.evaluate(()=>window.__calls.some(([n])=>n==='create')));
  const bare=await context.newPage();bare.on('pageerror',e=>errors.push(String(e)));await bare.goto('https://rivune-renderer.test/',{waitUntil:'networkidle'});
  check('no host disables send and composer',await bare.locator('#submit').isDisabled()&&await bare.locator('#prompt').isDisabled());
  check('no host states connection accurately',(await bare.locator('#connection-status').textContent()).includes('not connected'));
  check('no script errors',errors.length===0);
  const result={scope:'Synthetic browser-host fixture only. No Tauri app launch, CLI invocation or user data.',checks,errors};fs.writeFileSync(path.join(__dirname,'evidence/RENDER_REVIEW.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
