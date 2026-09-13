const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const base='http://127.0.0.1:4289/rivune/';
const executablePath='/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const out=__dirname;
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath});
  const observations={runtime:{playwright:require.resolve('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'),executablePath},viewports:{},reducedMotion:{}};
  for(const spec of [{name:'desktop-1280',width:1280,height:1000},{name:'mobile-390',width:390,height:844},{name:'mobile-320',width:320,height:568}]){
    const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},reducedMotion:'no-preference'});
    await context.route('**/*',route=>{const u=new URL(route.request().url()); if(u.hostname==='127.0.0.1') route.continue(); else route.abort();});
    const page=await context.newPage(); const consoleErrors=[];
    page.on('console',m=>{if(['error','warning'].includes(m.type())) consoleErrors.push({type:m.type(),text:m.text()});});
    page.on('pageerror',e=>consoleErrors.push({type:'pageerror',text:e.message}));
    await page.goto(base,{waitUntil:'networkidle'}); await page.evaluate(()=>document.fonts.ready);
    const initial=await page.evaluate(()=>{const hero=document.querySelector('.hero').getBoundingClientRect(), product=document.querySelector('#product').getBoundingClientRect(), image=document.querySelector('.product-frame img'), imageRect=image.getBoundingClientRect(), zoom=document.querySelector('.product-image-zoom').getBoundingClientRect(); return {innerWidth,innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,hero:{top:Math.round(hero.top),bottom:Math.round(hero.bottom),height:Math.round(hero.height)},product:{top:Math.round(product.top)},image:{complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,top:Math.round(imageRect.top)},zoom:{width:Math.round(zoom.width),height:Math.round(zoom.height),visible:!!(zoom.width&&zoom.height)},title:document.title,description:document.querySelector('meta[name=description]').content,faqCount:document.querySelectorAll('.faq-item').length,promptCount:document.querySelectorAll('.prompt-examples li').length,disabled:[...document.querySelectorAll('button:disabled')].map(b=>b.textContent.trim())};});
    assert.equal(initial.overflow,false); assert.deepEqual([initial.image.naturalWidth,initial.image.naturalHeight],[1152,768]); assert.equal(initial.faqCount,4); assert.equal(initial.promptCount,3); assert.equal(initial.disabled.length,2);
    await page.screenshot({path:path.join(out,`${spec.name}-viewport.png`)}); await page.screenshot({path:path.join(out,`${spec.name}-fullpage.png`),fullPage:true});
    const linkInventory=await page.locator('a').evaluateAll(as=>({local:[...new Set(as.map(a=>a.href).filter(h=>h.startsWith(location.origin+'/rivune/')).map(h=>new URL(h).pathname))],external:[...new Set(as.map(a=>a.href).filter(h=>!h.startsWith(location.origin+'/rivune/')))]}));
    const localLinks=linkInventory.local; assert.equal(linkInventory.external.includes('mailto:rivune.crave757@slmails.com'),true); assert.equal(linkInventory.external.filter(h=>h.startsWith('https://')).every(h=>new URL(h).hostname==='github.com'),true); assert.equal(linkInventory.external.every(h=>h==='mailto:rivune.crave757@slmails.com'||h.startsWith('https://github.com/')),true);
    const linkStatuses={}; for(const pathname of localLinks){const res=await context.request.get('http://127.0.0.1:4289'+pathname); linkStatuses[pathname]=res.status(); assert.equal(res.status(),200);}
    await page.locator('.skip').focus(); await page.keyboard.press('Enter'); const skip=await page.evaluate(()=>({hash:location.hash,activeId:document.activeElement.id})); assert.deepEqual(skip,{hash:'#main',activeId:'main'});
    await page.goto(base,{waitUntil:'networkidle'});
    let mobile=null;
    if(spec.width<=760){
      const summary=page.locator('.mobile-menu summary'); await summary.focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('.mobile-menu').getAttribute('open'),'');
      await page.keyboard.press('Tab'); const active=await page.evaluate(()=>document.activeElement.textContent.trim()); assert.equal(active,'The app'); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
      const afterMenu=await page.evaluate(()=>({hash:location.hash,open:document.querySelector('.mobile-menu').open,productTop:Math.round(document.querySelector('#product').getBoundingClientRect().top)})); assert.equal(afterMenu.hash,'#product'); assert.equal(afterMenu.open,false); assert.equal(afterMenu.productTop,0);
      await page.goto(base,{waitUntil:'networkidle'}); const faqAnswersVisible=await page.locator('.faq-item p').evaluateAll(ps=>ps.every(p=>!!(p.offsetWidth&&p.offsetHeight))); assert.equal(faqAnswersVisible,true);
      const zoomLink=page.locator('.product-image-zoom'); const [popup]=await Promise.all([context.waitForEvent('page'),zoomLink.click()]); await popup.waitForLoadState('load'); const popupImage=await popup.locator('img').evaluate(img=>({naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight})); assert.deepEqual(popupImage,{naturalWidth:1152,naturalHeight:768}); mobile={afterMenu,faqAnswersVisible,zoomPopup:{url:popup.url(),...popupImage}}; await popup.close();
    }
    observations.viewports[spec.name]={...initial,localLinks:linkStatuses,externalLinks:linkInventory.external,skip,mobile,consoleErrors}; assert.equal(consoleErrors.length,0); await context.close();
  }
  const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}); const reducedPage=await reduced.newPage(); await reducedPage.goto(base,{waitUntil:'networkidle'}); observations.reducedMotion=await reducedPage.evaluate(()=>({matches:matchMedia('(prefers-reduced-motion: reduce)').matches,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior})); assert.deepEqual(observations.reducedMotion,{matches:true,scrollBehavior:'auto'}); await reduced.close();
  fs.writeFileSync(path.join(out,'render-observations.json'),JSON.stringify(observations,null,2)+'\n'); await browser.close(); console.log('PASS',JSON.stringify(observations));
})().catch(e=>{console.error(e);process.exit(1)});
