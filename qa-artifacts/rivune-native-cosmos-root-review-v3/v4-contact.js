const fs=require('fs');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const checks=[];
 try {
  const page=await browser.newPage();
  for(const width of [320,390]) {
   await page.setViewportSize({width,height:568});
   await page.goto('http://127.0.0.1:4299/rivune/contact/',{waitUntil:'domcontentloaded'});
   const measure=await page.evaluate(()=>{
    const card=document.querySelector('.contact-card'),css=getComputedStyle(card),rect=card.getBoundingClientRect();
    const contentLeft=rect.left+parseFloat(css.paddingLeft)+parseFloat(css.borderLeftWidth),contentRight=rect.right-parseFloat(css.paddingRight)-parseFloat(css.borderRightWidth);
    const children=['.contact-email','.contact-actions'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {selector:s,left:r.left,right:r.right,contained:r.left>=contentLeft-1&&r.right<=contentRight+1}});
    return {contentLeft,contentRight,children,email:document.querySelector('.contact-email').textContent,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   if(measure.children.some(x=>!x.contained)||measure.overflow>1||measure.email!=='rivune.crave757@slmails.com')throw Error('Contact containment/address failed '+width);
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text}}}));
   await page.locator('[data-copy-email]').focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('[data-copy-status]').textContent==='Email copied.');
   const copy=await page.evaluate(()=>({value:window.__copied,focused:document.activeElement.hasAttribute('data-copy-email')}));
   if(copy.value!==measure.email||!copy.focused)throw Error('Copy/focus failed '+width);
   checks.push({width,...measure,copy});
   await page.screenshot({path:__dirname+'/v4-contact-'+width+'.png',fullPage:true});
  }
  fs.writeFileSync(__dirname+'/V4_CONTACT_CHECK.json',JSON.stringify({passed:true,checks,scope:'Focused contact sizing and simulated clipboard success; no actual clipboard or email write'},null,2));console.log(JSON.stringify(checks));
 }finally{await browser.close()}
})().catch(e=>{console.error(String(e));process.exitCode=1});
