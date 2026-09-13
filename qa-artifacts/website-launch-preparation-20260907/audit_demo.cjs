// Independent behavioral checks of the prewritten demo and platform selection.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [distArg,outArg]=process.argv.slice(2);if(!distArg||!outArg)throw Error('Usage: audit_demo.cjs DIST OUTPUT');
const dist=path.resolve(distArg),out=path.resolve(outArg);fs.mkdirSync(out,{recursive:true});
const report={demo:[],platforms:[],failures:[],requests:[],errors:[],styles:[]};let browser;
const release=JSON.parse(fs.readFileSync(path.join(dist,'build-manifest.json'),'utf8'));report.release={status:release.releaseStatus,simulation:release.simulation};
const server=http.createServer((req,res)=>{let p=new URL(req.url,'http://localhost').pathname;if(!p.startsWith('/rivune/'))return res.writeHead(404).end();let f=path.resolve(dist,p.slice(8));if(!f.startsWith(dist+path.sep)&&f!==dist)return res.writeHead(403).end();if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const check=(v,m)=>{if(!v)report.failures.push(m)};
(async()=>{
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/rivune/';
 browser=await chromium.launch({headless:true,executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const ctx=await browser.newContext({reducedMotion:'reduce'});
 await ctx.route('**/*',r=>{report.requests.push({url:r.request().url(),method:r.request().method()});return new URL(r.request().url()).origin===origin?r.continue():r.abort()});
 const page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:width===390?844:900});await page.goto(base);
  check(await page.locator('.demo-disclosure').isVisible(),`${width}: missing visible prewritten disclosure`);
  const seen=new Set();
  for(const example of ['project','proposal','approaches']){
   await page.locator(`[data-demo-example="${example}"]`).focus();await page.keyboard.press('Enter');
   check(await page.locator('[data-demo-stage="perspectives"]').getAttribute('aria-pressed')==='true',`${width} ${example}: example did not reset stage`);
   for(const stage of ['perspectives','review','final']){
    await page.locator(`[data-demo-stage="${stage}"]`).focus();await page.keyboard.press('Space');
    await page.waitForFunction(()=>document.activeElement?.classList.contains('demo-panel'),null,{timeout:2000});
    const state=await page.evaluate(()=>({label:document.querySelector('[data-demo-label]').textContent,title:document.querySelector('[data-demo-title]').textContent,body:document.querySelector('[data-demo-body]').textContent,selectedExamples:[...document.querySelectorAll('[data-demo-example][aria-pressed=true]')].map(x=>x.dataset.demoExample),selectedStages:[...document.querySelectorAll('[data-demo-stage][aria-pressed=true]')].map(x=>x.dataset.demoStage),focusedPanel:document.activeElement?.classList.contains('demo-panel'),overflow:document.documentElement.scrollWidth>innerWidth}));
    check(state.selectedExamples.join()===example&&state.selectedStages.join()===stage,`${width} ${example}/${stage}: incorrect selected state`);check(state.focusedPanel,`${width} ${example}/${stage}: result not focused`);check(!state.overflow,`${width} ${example}/${stage}: overflow`);seen.add(state.body);report.demo.push({width,example,stage,...state});
   }
  }
  check(seen.size===9,`${width}: repeated demo output instead of nine distinct states`);
  await page.locator('[data-demo-reset]').click();check(await page.locator('[data-demo-example="project"]').getAttribute('aria-pressed')==='true'&&await page.locator('[data-demo-stage="perspectives"]').getAttribute('aria-pressed')==='true',`${width}: Reset failed`);
  report.styles.push(await page.locator('[data-demo-example]').first().evaluate(x=>({width:innerWidth,font:getComputedStyle(x).font,fontFamily:getComputedStyle(x).fontFamily,bodyFont:getComputedStyle(document.body).fontFamily,shorthandAccepted:CSS.supports('font','600 12px/1.25 inherit')})));
  await page.screenshot({path:path.join(out,`${width}-demo.png`)});
  await page.goto(base+'download/');
  for(const platform of ['windows','linux','mac']){
   await page.locator(`[data-platform="${platform}"]`).focus();await page.keyboard.press('Enter');
   const state=await page.evaluate(()=>({selected:[...document.querySelectorAll('[data-platform][aria-pressed=true]')].map(x=>x.dataset.platform),title:document.querySelector('[data-platform-title]').textContent,body:document.querySelector('[data-platform-body]').textContent,focus:document.activeElement?.hasAttribute('data-platform-panel'),downloadLinks:[...document.querySelectorAll('a[data-installer]')].filter(x=>x.getBoundingClientRect().height).map(x=>x.href),overflow:document.documentElement.scrollWidth>innerWidth}));
   check(state.selected.join()===platform,`${width} ${platform}: incorrect selection`);check(!state.overflow,`${width} ${platform}: overflow`);
   if(platform!=='mac')check(state.downloadLinks.length===0,`${width} ${platform}: another platform installer remains actionable`);
   if(platform==='mac'&&release.releaseStatus==='ready')check(!/coming soon/i.test(state.title),`${width}: ready Mac artifact still says coming soon`);
   report.platforms.push({width,platform,...state});
   if(platform==='windows')await page.screenshot({path:path.join(out,`${width}-windows.png`)});
  }
 }
 check(report.errors.length===0,'JavaScript errors');check(report.requests.every(r=>new URL(r.url).origin===origin&&r.method==='GET'),'Unexpected external or non-GET request');
 report.pass=report.failures.length===0;fs.writeFileSync(path.join(out,'demo-observations.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:report.pass,states:report.demo.length,platforms:report.platforms.length,failures:report.failures,styles:report.styles},null,2));if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close()});
