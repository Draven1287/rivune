const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'static-review'),checks=[],errors=[],blocked=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name)};
(async()=>{
const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
try{
const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
await ctx.route('**/*',async route=>{
 const u=new URL(route.request().url());if(u.origin!=='https://rivune-static.test'){blocked.push(u.origin);return route.abort()}
 let name=decodeURIComponent(u.pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
 const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'};
 await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
});
const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'REVIEW_MANIFEST.json')));
for(const name of Object.keys(manifest.files).filter(n=>n.endsWith('index.html'))){
 await page.goto('https://rivune-static.test/rivune/'+name.replace('index.html',''));
 check('direct static route '+name,await page.locator('h1').count()===1);
 check('no unresolved templates '+name,!(await page.content()).includes('{{'));
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});check('no page overflow '+name+' '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
}
await page.goto('https://rivune-static.test/rivune/app/');
await page.locator('[data-view="new"]').click();await page.locator('#tour-draft').fill('<img src=x onerror=alert(1)> my draft');
await page.locator('#tour-composer button').click();
check('draft explicitly remains a preview',/nothing was sent to an AI/.test(await page.locator('#tour-status').innerText()));
await page.locator('[data-example="website"]').click();await page.locator('#tour-draft').fill('Book club draft');await page.locator('[data-view="new"]').click();
check('separate drafts restored without HTML execution',await page.locator('#tour-draft').inputValue()==='<img src=x onerror=alert(1)> my draft'&&await page.locator('img[src="x"]').count()===0);
await page.locator('[data-view="team"]').click();await page.locator('[data-lead="Claude"]').click();check('sample lead updates',await page.locator('[data-role="Claude"]').innerText()==='Lead');
await page.locator('#tour-settings').click();await page.locator('#tour-galaxy').click();check('appearance switch works',await page.locator('#tour-galaxy').getAttribute('aria-checked')==='false');
await page.keyboard.press('Escape');check('settings closes with focus returned',await page.evaluate(()=>!document.querySelector('#tour-dialog').open&&document.activeElement.id==='tour-settings'));
await page.reload();await page.locator('[data-view="new"]').click();check('reload clears memory-only draft',await page.locator('#tour-draft').inputValue()==='');
check('no external service requests',blocked.length===0);check('no uncaught browser errors',errors.length===0);
fs.writeFileSync(path.join(__dirname,'STATIC_BROWSER_REVIEW.json'),JSON.stringify({scope:'Frozen static files rendered through local browser route interception; no deployment, server, provider or account calls',checks,errors,blocked,sourceManifest:manifest.files},null,2)+'\n');
console.log(JSON.stringify({passed:checks.length,errors,blocked}));
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
