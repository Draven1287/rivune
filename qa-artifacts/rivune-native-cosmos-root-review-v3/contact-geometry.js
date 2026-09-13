const fs=require('fs');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
try {
 const p=await b.newPage({viewport:{width:320,height:568}});
 await p.goto('http://127.0.0.1:4298/rivune/contact/',{waitUntil:'domcontentloaded'});
 const result=await p.evaluate(()=>{
   const r=n=>{const v=n.getBoundingClientRect();return {left:v.left,right:v.right,top:v.top,bottom:v.bottom,width:v.width}};
   const card=document.querySelector('.contact-card'),style=getComputedStyle(card);
   return {card:r(card),contentRight:card.getBoundingClientRect().right-parseFloat(style.paddingRight)-parseFloat(style.borderRightWidth),email:r(document.querySelector('.contact-email')),actions:r(document.querySelector('.contact-actions')),skip:r(document.querySelector('.skip')),skipPosition:getComputedStyle(document.querySelector('.skip')).position,focused:document.activeElement.tagName};
 });
 await p.screenshot({path:__dirname+'/contact-320-initial.png',fullPage:true});
 fs.writeFileSync(__dirname+'/CONTACT_GEOMETRY.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await b.close()}
})().catch(e=>{console.error(String(e));process.exitCode=1});
