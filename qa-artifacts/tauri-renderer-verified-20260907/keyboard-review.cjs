const fs=require('fs'),path=require('path');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.route('http://rivune-renderer.test/**',async route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
   if(!['index.html','styles.css','app.mjs','core.mjs','desktop-host.mjs'].includes(name))return route.abort();
   await route.fulfill({status:200,body:fs.readFileSync(path.join(__dirname,'web',name)),contentType:name.endsWith('.mjs')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
  });
  await page.addInitScript(()=>{
   window.__polls=[];window.setInterval=callback=>{window.__polls.push(callback);return 1};
   window.__RIVUNE_DESKTOP_HOST__={getSnapshot:async()=>({schemaVersion:1,selectedProviderID:'fixture',conversations:[{id:'c1',title:'Fixture conversation',draft:''}],runs:[]}),openConversation:async()=>{},submitRun:async r=>({state:'accepted',requestID:r.id}),reconcileRun:async id=>({state:'accepted',requestID:id})};
  });
  await page.goto('http://rivune-renderer.test/',{waitUntil:'networkidle'});
  await page.locator('#conversations button').focus();
  const before=await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent}));
  await page.evaluate(async()=>{for(const tick of window.__polls)tick();await new Promise(r=>setTimeout(r,0))});
  const after=await page.evaluate(()=>({tag:document.activeElement.tagName,isConversation:document.activeElement.matches('#conversations button')}));
  const result={scope:'Rendered frozen Tauri frontend with a synthetic host; no desktop app/provider invocation',before,after,focusPreserved:after.isConversation,errors};
  fs.writeFileSync(path.join(__dirname,'KEYBOARD_REVIEW.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
