// Independent browser acceptance for Rivune's dedicated-page website.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [distArg,outArg]=process.argv.slice(2);
if(!distArg||!outArg)throw new Error('Usage: node audit_routes.cjs DIST OUTPUT');
const dist=path.resolve(distArg),out=path.resolve(outArg);fs.mkdirSync(out,{recursive:true});
const report={pages:[],navigation:[],menus:[],workspace:[],accessibility:[],progressiveEnhancement:[],failures:[],console:[],externalRequests:[]};
const required=['','app/','how-it-works/','faq/','about/','download/','privacy/','council-vs-swarm/'];
const core=required.slice(0,6);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml'};
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(!pathname.startsWith('/rivune/')){res.writeHead(404).end();return;}
 let file=path.resolve(dist,pathname.slice(8));
 if(file!==dist&&!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
let browser;
function check(condition,message){if(!condition)report.failures.push(message);}
(async()=>{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/rivune/';
 browser=await chromium.launch({headless:true,executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.continue();report.externalRequests.push(r.request().url());return r.abort();});
 const page=await context.newPage();page.on('pageerror',e=>report.console.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))report.console.push(m.text());});
 const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
 check(!fs.existsSync(path.join(dist,'assets/native-workspace.png')),'Rejected screenshot asset is in public output');
 for(const route of core)check(sitemap.includes('https://draven1287.github.io/rivune/'+route),`Sitemap missing ${route||'home'}`);
 for(const width of [1280,390,320,768]){
  await page.setViewportSize({width,height:width===320?568:width===390?844:1000});
  for(const route of required){
   const response=await page.goto(base+route);check(response?.status()===200,`${width} ${route}: direct load HTTP ${response?.status()}`);
   const reload=await page.reload();check(reload?.status()===200,`${width} ${route}: refresh HTTP ${reload?.status()}`);
   const state=await page.evaluate(()=>({url:location.href,title:document.title,canonical:document.querySelector('link[rel="canonical"]')?.href,heading:document.querySelector('h1')?.textContent,width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,headerLinks:[...document.querySelectorAll('header a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href'),current:a.getAttribute('aria-current')})),images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),email:[...document.querySelectorAll('a[href^="mailto:"]')].map(a=>a.getAttribute('href'))}));
   report.pages.push({width,route,...state});
   check(state.scrollWidth<=state.width,`${width} ${route}: horizontal overflow`);
   check(!!state.heading,`${width} ${route}: missing h1`);
   check(state.images.every(i=>i.loaded),`${width} ${route}: missing image`);
   check(state.images.every(i=>!i.src?.includes('native-workspace')),`${width} ${route}: rejected screenshot rendered`);
   check(!await page.getByText('View larger image',{exact:false}).count(),`${width} ${route}: rejected image zoom link remains`);
   check(state.headerLinks.every(a=>!a.href?.includes('#')),`${width} ${route}: header requires fragment scrolling`);
   check(state.email.every(h=>h==='mailto:rivune.crave757@slmails.com'),`${width} ${route}: unexpected contact address`);
   if(core.includes(route)){
    check(state.canonical==='https://draven1287.github.io/rivune/'+route,`${width} ${route}: wrong canonical`);
    check(state.headerLinks.some(a=>a.href==='/rivune/'+route&&a.current==='page'),`${width} ${route}: no current-page header link`);
   }
   if(width===1280||width===390)await page.screenshot({path:path.join(out,`${width}-${route.replace('/','')||'home'}.png`)});
  }
  // Use the actual navigation, then verify browser history restores full routes.
  await page.goto(base);
  const menu=page.locator('header .mobile-menu summary');if(await menu.isVisible()){await menu.focus();await page.keyboard.press('Enter');}
  const link=page.locator('header a[href="/rivune/app/"]:visible').first();await link.focus();await Promise.all([page.waitForURL(base+'app/'),page.keyboard.press('Enter')]);
  check(new URL(page.url()).pathname==='/rivune/app/',`${width}: keyboard nav did not load App`);
  const menuClosed=await page.locator('header details[open]').count()===0;check(menuClosed,`${width}: menu stayed open after navigation`);
  await page.goBack();check(new URL(page.url()).pathname==='/rivune/',`${width}: Back failed`);
  await page.goForward();check(new URL(page.url()).pathname==='/rivune/app/',`${width}: Forward failed`);
  report.navigation.push({width,menuClosed,historyURL:page.url()});
  await page.goto(base);
  await page.keyboard.press('Tab');
  const firstFocus=await page.locator(':focus').getAttribute('href');
  check(firstFocus==='#main',`${width}: skip link is not first keyboard target`);
  await page.keyboard.press('Enter');
  const skipFocusedMain=await page.evaluate(()=>document.activeElement===document.querySelector('main'));
  check(skipFocusedMain,`${width}: skip link did not focus main`);
  const reducedMotion=await page.evaluate(()=>({requested:matchMedia('(prefers-reduced-motion: reduce)').matches,scroll:getComputedStyle(document.documentElement).scrollBehavior}));
  check(reducedMotion.requested&&reducedMotion.scroll!=='smooth',`${width}: reduced-motion scrolling not honored`);
  await page.goto(base+'faq/');
  const faq=page.locator('main details').first();
  if(await faq.count()){
   const summary=faq.locator('summary');await summary.focus();await page.keyboard.press('Enter');
   check(await faq.getAttribute('open')!==null,`${width}: FAQ did not open with Enter`);
   await page.keyboard.press('Space');
   check(await faq.getAttribute('open')===null,`${width}: FAQ did not close with Space`);
  }
  report.accessibility.push({width,firstFocus,skipFocusedMain,reducedMotion,faqDisclosureCount:await page.locator('main details').count()});
  // More/Menu must work by keyboard and close without trapping focus.
  await page.goto(base);
  const menuDetails=page.locator('header .nav-more:visible,header .mobile-menu:visible').first();
  const menuSummary=menuDetails.locator('summary');await menuSummary.focus();await page.keyboard.press('Enter');
  const menuState=await menuDetails.evaluate(d=>({name:d.querySelector('summary').textContent,open:d.open,links:[...d.querySelectorAll('a')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})),bounds:(()=>{const r=d.querySelector('nav,div').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth}})()}));
  check(menuState.open,`${width}: navigation disclosure did not open`);
  check(menuState.bounds.left>=0&&menuState.bounds.right<=menuState.bounds.width,`${width}: navigation dropdown clipped`);
  for(const text of ['FAQ','Contact Aarav','Source','Privacy','Support'])check(menuState.links.some(a=>a.text===text),`${width}: navigation menu missing ${text}`);
  await menuDetails.locator('a').first().focus();await page.keyboard.press('Escape');
  const escaped=await menuDetails.getAttribute('open')===null&&await menuSummary.evaluate(s=>document.activeElement===s);
  check(escaped,`${width}: Escape failed to close and restore focus`);
  await page.keyboard.press('Enter');await page.mouse.click(1,page.viewportSize().height-1);check(await menuDetails.getAttribute('open')===null,`${width}: outside pointer did not dismiss menu`);
  if(menuState.name==='More'){
   const last=await page.locator('header .nav-links > :last-child').getAttribute('href');check(last==='/rivune/download/',`${width}: Download is not final desktop item`);
  }
  await menuSummary.focus();await page.keyboard.press('Enter');await menuDetails.locator('a[href="/rivune/faq/"]').focus();await Promise.all([page.waitForURL(base+'faq/'),page.keyboard.press('Enter')]);
  check(await page.locator('header details[open]').count()===0,`${width}: menu remained open after FAQ navigation`);
  report.menus.push({width,...menuState,escaped});
  await page.goto(base+'app/');
  const workspace=page.locator('.workspace-preview');check(await workspace.count()>0,`${width}: missing HTML workspace preview`);
  check((await workspace.innerText()).includes('no AI request is sent'),`${width}: missing illustrative-content disclosure`);
  const disclosures=workspace.locator('details');check(await disclosures.count()>=2,`${width}: workspace has no interactive example controls`);
  for(let i=0;i<await disclosures.count();i++){
   const d=disclosures.nth(i);await d.locator('summary').focus();await page.keyboard.press('Enter');check(await d.getAttribute('open')!==null,`${width}: workspace disclosure ${i} did not open`);await page.keyboard.press('Space');check(await d.getAttribute('open')===null,`${width}: workspace disclosure ${i} did not close`);
  }
  report.workspace.push({width,disclosures:await disclosures.count()});
 }
 // Essential routes and content must survive a failed or disabled script load.
 const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 await noJS.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const staticPage=await noJS.newPage();await staticPage.goto(base);
 const staticMenu=staticPage.locator('header .mobile-menu summary');await staticMenu.click();
 await staticPage.locator('header a[href="/rivune/app/"]:visible').first().click();
 check(new URL(staticPage.url()).pathname==='/rivune/app/','JavaScript-disabled navigation failed');
 for(const route of core){
  const response=await staticPage.goto(base+route);
  const heading=await staticPage.locator('h1').textContent();
  const meaningful=(await staticPage.locator('main').innerText()).trim().length>80;
  check(response?.status()===200&&meaningful&&!!heading,`JavaScript-disabled ${route||'home'} unavailable`);
  report.progressiveEnhancement.push({route,status:response?.status(),heading,meaningful});
 }
 await noJS.close();
 check(report.console.length===0,'Console/page errors occurred');check(report.externalRequests.length===0,'External resources were requested');
 report.pass=report.failures.length===0;
 if(!report.pass)process.exitCode=1;
 fs.writeFileSync(path.join(out,'route-observations.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({pass:report.pass,pages:report.pages.length,failures:report.failures},null,2));
})().catch(e=>{report.pass=false;report.error=String(e);fs.writeFileSync(path.join(out,'route-observations.json'),JSON.stringify(report,null,2)+'\n');console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
