// Visual/interaction inspection of the isolated design artifact only.
// NODE_PATH=<bundled node_modules> node inspect.cjs
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const out=path.join(__dirname,'screenshots');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1512,height:982},deviceScaleFactor:1});
 const errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));
 const screens=['home','active','decision','project','connections','settings','approval','error','website','walkthrough','contract'];
 async function open(screen){await page.goto('http://127.0.0.1:8766/#'+screen);await page.locator('#stage > *').waitFor()}
 await open('project');
 await page.locator('.window').screenshot({path:path.join(__dirname,'assets/app-preview.png')});
 for(const screen of screens){
  await open(screen);
  await page.screenshot({path:path.join(out,screen+'-wide.png'),fullPage:true});
  results.push({screen,size:'1512x982',...(await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,missingImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),unnamedButtons:[...document.querySelectorAll('button')].filter(b=>!b.textContent.trim()&&!b.getAttribute('aria-label')).length}))) });
 }
 await page.setViewportSize({width:900,height:800});
 for(const screen of screens.slice(0,9)){
  await open(screen);
  await page.screenshot({path:path.join(out,screen+'-compact.png'),fullPage:true});
  results.push({screen,size:'900x800',...(await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,windowOverflow:!!document.querySelector('.window')&&document.querySelector('.window').scrollWidth>document.querySelector('.window').clientWidth}))) });
 }
 for(const screen of ['decision','connections','approval','project']){
  await open(screen);await page.locator('#textsize').click();
  await page.screenshot({path:path.join(out,screen+'-large-text.png'),fullPage:true});
  results.push({screen,size:'900x800 large text',horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.setViewportSize({width:640,height:800});
 for(const screen of ['home','decision','connections','settings','approval','project','website']){
  await open(screen);
  results.push({screen,size:'640x800',horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
 }
 await page.setViewportSize({width:1512,height:982});
 const interactions=[];
 async function check(name,fn){try{await fn();interactions.push({name,passed:true})}catch(e){interactions.push({name,passed:false,error:e.message})}}
 function assert(v,msg){if(!v)throw Error(msg)}
 await check('All four work views and Escape close',async()=>{await open('project');for(const tab of ['team','files','changes','preview']){await page.locator(`[data-tab="${tab}"]`).click();assert(await page.locator(`[data-tab="${tab}"]`).getAttribute('aria-selected')==='true',tab)}await page.keyboard.press('Escape');assert(await page.locator('.workpanel').count()===0,'panel remained open')});
 await check('Composer remains editable; Stop preserves incomplete state',async()=>{await open('active');await page.locator('textarea').fill('Keep the booking link clear.');await page.locator('[data-action="stop"]').click();assert(await page.locator('textarea').inputValue()==='Keep the booking link clear.','draft lost');assert(await page.locator('.statusline').textContent().then(t=>t.includes('Stopped')),'missing stop state')});
 await check('Attachments can be removed before sending',async()=>{await open('home');await page.locator('[data-action="attach"]').click();await page.locator('[data-action="attach-fixture"]').click();assert(await page.locator('.attachment').count()===1,'missing attachment');await page.locator('[data-action="remove-attachment"]').click();assert(await page.locator('.attachment').count()===0,'attachment remains')});
 await check('Team draft can exclude a current vendor',async()=>{await open('home');await page.locator('[data-action="team"]').click();await page.locator('[data-member="0"]').uncheck();await page.locator('[data-action="apply-team"]').click();assert(await page.locator('[data-action="team"]').textContent()==='Team · 2','team count unchanged')});
 await check('Stale catalog retains model; no/one/several account states',async()=>{await open('connections');await page.locator('[data-action="refresh"]').click();assert((await page.locator('.detailbox').textContent()).includes('saved catalog retained'),'stale state absent');assert((await page.locator('.modelrow').first().textContent()).includes('GPT-6 Astra'),'model lost');for(const [n,count]of [['0',0],['1',1],['3',3]]){await page.locator('#account-count').selectOption(n);assert(await page.locator('.connection-row').count()===count,'wrong account count')}});
 await check('Approval routes to simulation and explicit project scope',async()=>{await open('approval');await page.locator('[data-action="approve"]').click();await page.waitForURL('**/#active');await page.locator('[data-action="stop"]').waitFor();assert(await page.locator('[data-action="access"]').textContent().then(t=>t.includes('Edit & run')),'scope absent')});
 await check('Recovery preserves incomplete checkpoint',async()=>{await open('error');await page.locator('[data-action="checkpoint"]').click();assert((await page.locator('dialog').textContent()).includes('Not run'),'unfinished evidence absent');await page.keyboard.press('Escape')});
 await check('Review feedback persists in browser',async()=>{await open('contract');await page.locator('#feedback').fill('Inspection fixture — not user approval.');await page.locator('[data-action="save-feedback"]').click();await page.reload();assert(await page.locator('#feedback').inputValue()==='Inspection fixture — not user approval.','notes lost');await page.evaluate(()=>localStorage.removeItem('rivune-design-review-01'))});
 await check('Modal keyboard focus remains inside dialog',async()=>{await open('home');await page.locator('[data-action="access"]').click();for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('dialog')),'focus escaped dialog')}await page.keyboard.press('Escape')});
 await check('Panel changes retain transcript scroll',async()=>{await open('decision');await page.locator('.transcript').evaluate(e=>e.scrollTop=200);const before=await page.locator('.transcript').evaluate(e=>e.scrollTop);await page.locator('[data-action="toggle-panel"]').click();const after=await page.locator('.transcript').evaluate(e=>e.scrollTop);assert(Math.abs(before-after)<2,'scroll changed')});
 const report={date:new Date().toISOString(),scope:'Browser design prototype only; no production app, provider or website-job tests.',results,interactions,errors};
 fs.writeFileSync(path.join(__dirname,'inspection.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
 await browser.close();
 if(errors.length||interactions.some(x=>!x.passed)||results.some(x=>x.horizontalOverflow||x.windowOverflow||x.missingImages?.length||x.unnamedButtons))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
