// Reach About and Contact from the main navigation without sending an email.
const fs=require('fs'),path=require('path'),http=require('http');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: audit_contact.cjs DIST OUTPUT');
const dist=path.resolve(input),out=path.resolve(output);fs.mkdirSync(out,{recursive:true});
const report={states:[],failures:[]};let browser;
const server=http.createServer((req,res)=>{const route=new URL(req.url,'http://localhost').pathname;if(!route.startsWith('/rivune/'))return res.writeHead(404).end();let file=path.resolve(dist,route.slice(8));if(file!==dist&&!file.startsWith(dist+path.sep))return res.writeHead(403).end();if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r)});const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/rivune/';
 browser=await chromium.launch({headless:true,executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
 const ctx=await browser.newContext({reducedMotion:'reduce'});await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await ctx.newPage();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:width===390?844:900});await page.goto(base);
  const menu=page.locator('header .mobile-menu summary');if(await menu.isVisible()){await menu.focus();await page.keyboard.press('Enter')}
  await page.locator('header a[href="/rivune/about/"]:visible').first().focus();await Promise.all([page.waitForURL(base+'about/'),page.keyboard.press('Enter')]);
  const state=await page.evaluate(()=>({width:innerWidth,height:innerHeight,heading:document.querySelector('h1')?.textContent,scrollY,contacts:[...document.querySelectorAll('main a[href^="mailto:"]')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href'),top:a.getBoundingClientRect().top,bottom:a.getBoundingClientRect().bottom})),footer:[...document.querySelectorAll('footer a')].map(a=>({label:a.textContent.trim(),href:a.getAttribute('href')}))}));
  state.contactInFirstViewport=state.contacts.some(a=>a.top>=0&&a.bottom<=state.height);report.states.push(state);
  if(!state.contactInFirstViewport)report.failures.push(`${width}: contact requires scrolling after About navigation`);
  if(!state.footer.some(a=>a.href==='/rivune/about/'))report.failures.push(`${width}: footer lacks About link`);
  if(!state.footer.some(a=>/contact|email/i.test(a.label)))report.failures.push(`${width}: footer lacks Contact link`);
  if(!state.contacts.every(a=>a.href==='mailto:rivune.crave757@slmails.com'))report.failures.push(`${width}: unexpected email address`);
  await page.screenshot({path:path.join(out,`${width}-about.png`)});
 }
 report.pass=!report.failures.length;fs.writeFileSync(path.join(out,'contact-observations.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();server.close()});
