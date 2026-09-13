const fs = require('fs');
const path = require('path');
const http = require('http');
const {chromium} = require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [distArg, outArg] = process.argv.slice(2);
if (!distArg || !outArg) throw new Error('Usage: node render_candidate.cjs DIST OUTPUT');
const dist = path.resolve(distArg), out = path.resolve(outArg);
fs.mkdirSync(out, {recursive: true});
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml'};
const results = {errors:[], externalRequests:[], responses:[], states:[]};
const server = http.createServer((req,res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (!pathname.startsWith('/rivune/')) {res.writeHead(404).end();return;}
  let target = path.resolve(dist, pathname.slice('/rivune/'.length));
  if (target !== dist && !target.startsWith(dist + path.sep)) {res.writeHead(403).end();return;}
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target=path.join(target,'index.html');
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)] || 'application/octet-stream'});
  fs.createReadStream(target).pipe(res);
});
let browser;
(async()=>{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}/rivune/`;
  browser=await chromium.launch({headless:true,executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
  results.engine=browser.version();
  const context=await browser.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.route('**/*',route=>{
    if (new URL(route.request().url()).origin===new URL(base).origin) return route.continue();
    results.externalRequests.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('console',m=>{if(['warning','error'].includes(m.type()))results.errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)results.responses.push({url:r.url(),status:r.status()});});
  async function capture(name,fullPage=false){
    await page.screenshot({path:path.join(out,name+'.png'),fullPage});
    results.states.push({name,url:page.url(),viewport:page.viewportSize(),...await page.evaluate(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior,images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0,rect:{top:i.getBoundingClientRect().top,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}}))}))});
  }
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);await capture('desktop-first-screen');await capture('desktop-full',true);
  await page.keyboard.press('Tab');results.firstFocus=await page.locator(':focus').innerText();await page.keyboard.press('Enter');results.skipFocus=await page.locator(':focus').getAttribute('id');
  for(const size of [{width:390,height:844},{width:320,height:568}]){
    await page.setViewportSize(size);await page.goto(base);await capture('mobile-'+size.width+'-first-screen');await capture('mobile-'+size.width+'-full',true);
    const menu=page.locator('.mobile-menu summary');await menu.focus();await page.keyboard.press('Enter');
    await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'The app',exact:true}).press('Enter');
    results.states.push({name:'mobile-menu-'+size.width,closed:await page.locator('.mobile-menu').getAttribute('open')===null,hash:await page.evaluate(()=>location.hash)});
    await capture('mobile-'+size.width+'-product');
    const zoom=page.getByRole('link',{name:'View larger image'});await zoom.focus();
    results.imageLink=await zoom.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,outline:getComputedStyle(el).outlineStyle}));
    const popupPromise=context.waitForEvent('page');await page.keyboard.press('Enter');const popup=await popupPromise;await popup.waitForLoadState();
    results.states.push({name:'image-popup-'+size.width,url:popup.url(),...await popup.evaluate(()=>({openerNull:window.opener===null,width:document.images[0]?.naturalWidth,height:document.images[0]?.naturalHeight}))});await popup.close();
    const faq=page.getByText('Can I download the Mac app now?',{exact:true});await faq.focus();await page.keyboard.press('Enter');
    results.states.push({name:'faq-'+size.width,open:await faq.evaluate(el=>el.parentElement.open)});await capture('mobile-'+size.width+'-faq');
    const contact=page.locator('.developer-link').first();
    await contact.scrollIntoViewIfNeeded();
    results.states.push({name:'developer-contact-'+size.width,text:await contact.innerText(),href:await contact.getAttribute('href')});
    await capture('mobile-'+size.width+'-developer');
    for(const route of ['privacy/','council-vs-swarm/']){await page.goto(base+route);await capture('mobile-'+size.width+'-'+route.replace('/',''));}
  }
  results.pass=results.errors.length===0&&results.externalRequests.length===0&&results.responses.length===0
    &&results.firstFocus==='Skip to content'&&results.skipFocus==='main'
    &&results.states.every(s=>(s.scrollWidth===undefined||s.scrollWidth<=s.width)
      &&(s.closed===undefined||(s.closed&&s.hash==='#product'))
      &&(s.openerNull===undefined||(s.openerNull&&s.width===1152&&s.height===768))
      &&(s.open===undefined||s.open)
      &&(!s.images||s.images.every(i=>i.loaded)));
  fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify({pass:results.pass,states:results.states.length,errors:results.errors,externalRequests:results.externalRequests,firstFocus:results.firstFocus,skipFocus:results.skipFocus},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
