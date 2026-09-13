const fs=require('fs');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const checks=[],errors=[];
 try {
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));
  for(const width of [1280,320])for(const route of ['app','how-it-works','download','faq','council-vs-swarm']){
   await page.setViewportSize({width,height:width===320?568:900});
   const response=await page.goto('http://127.0.0.1:4300/rivune/'+route+'/',{waitUntil:'networkidle'});
   const info=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,text:document.querySelector('main').innerText,brokenImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).length,installers:[...document.querySelectorAll('a[href]')].map(x=>x.href).filter(x=>/\.(dmg|msi|exe|appimage|deb)(?:$|\?)/i.test(x))}));
   if(response.status()!==200||info.overflow>1||info.brokenImages||info.installers.length)throw Error('Route check failed '+route+' '+width);
   checks.push({route,width,status:response.status(),...info});
   if(route==='app'||route==='how-it-works')await page.screenshot({path:__dirname+'/'+route+'-'+width+'.png',fullPage:true});
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(__dirname+'/BROWSER_REVIEW.json',JSON.stringify({passed:true,scope:'Changed factual-copy routes at desktop and narrow mobile; browser preview only, not native app proof',checks,errors},null,2));
  console.log(JSON.stringify({passed:true,states:checks.length,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(String(e));process.exitCode=1});
