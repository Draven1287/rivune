const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const out='/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/pages-presentation-candidate-20260907-v2/independent-evidence';
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const context=await browser.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:1});
await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
const result={engine:'Chromium '+browser.version(),baseURL:'http://127.0.0.1:4269/rivune/',states:[],errors};
async function capture(name){
 await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
 result.states.push({name,url:page.url(),viewport:page.viewportSize(),...await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,focus:document.activeElement?.outerHTML,images:Array.from(document.images).map(x=>({src:x.getAttribute('src'),loaded:x.complete&&x.naturalWidth>0,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height})),buttons:Array.from(document.querySelectorAll('button')).map(x=>({text:x.textContent,disabled:x.disabled})),text:document.body.innerText}))});
}
await page.goto(result.baseURL);await capture('desktop-home');
await page.keyboard.press('Tab');result.skipFirstFocus=await page.locator(':focus').innerText();await page.keyboard.press('Enter');result.skipResult=await page.evaluate(()=>({hash:location.hash,focus:document.activeElement.id}));
await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'The app',exact:true}).click();await capture('desktop-product-anchor');
await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Get Rivune'}).click();await capture('desktop-download-anchor');
await page.setViewportSize({width:390,height:844});await page.goto(result.baseURL);await capture('mobile-home');
const summary=page.locator('summary');await summary.focus();await page.keyboard.press('Enter');result.mobileMenuOpen=await page.locator('.mobile-menu').getAttribute('open');await capture('mobile-menu');
await page.keyboard.press('Tab');result.mobileMenuFirstTab=await page.locator(':focus').innerText();
await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'The app',exact:true}).click();result.mobileAnchorMenuRemainsOpen=await page.locator('.mobile-menu').getAttribute('open');await capture('mobile-product-anchor');
await page.goto(result.baseURL+'council-vs-swarm/');await capture('mobile-team-guide');
await page.goto(result.baseURL+'privacy/');await capture('mobile-privacy');
await page.setViewportSize({width:320,height:568});await page.goto(result.baseURL);await capture('small-mobile-home');
fs.writeFileSync(out+'/render-observations.json',JSON.stringify(result,null,2)+'\n');
await browser.close();console.log(JSON.stringify({engine:result.engine,states:result.states.map(s=>({name:s.name,viewport:s.viewport,overflow:s.scrollWidth>s.clientWidth})),skipFirstFocus:result.skipFirstFocus,skipResult:result.skipResult,mobileMenuFirstTab:result.mobileMenuFirstTab,mobileMenuOpen:result.mobileMenuOpen,mobileAnchorMenuRemainsOpen:result.mobileAnchorMenuRemainsOpen,errors},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
