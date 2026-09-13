const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const web=path.resolve(__dirname,'../cross-platform-shell-20260907/candidate4-runtime-r2/web');
const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
(async()=>{
const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
const checks=[],errors=[],violations=[];const check=(n,b)=>{assert.ok(b,n);checks.push(n)};
try{
const ctx=await browser.newContext({viewport:{width:1120,height:800},reducedMotion:'reduce'});
await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!=='https://rivune-colors.test')return r.abort();const f=path.resolve(web,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(web+path.sep)||!fs.existsSync(f))return r.abort();await r.fulfill({body:fs.readFileSync(f),contentType:({'.mjs':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(f)]||'text/plain',headers:{'Content-Security-Policy':csp}})});
const p=await ctx.newPage();p.on('pageerror',e=>errors.push(String(e)));
await p.addInitScript(()=>{window.cspErrors=[];document.addEventListener('securitypolicyviolation',e=>cspErrors.push(e.violatedDirective))});
await p.goto('https://rivune-colors.test/');
await p.evaluate(async()=>{window.colors=await import('./appearance-controls.mjs');window.testStore={value:null,failRead:false,failWrite:false,getItem(){if(this.failRead)throw Error('private read error');return this.value},setItem(k,v){if(this.failWrite)throw Error('private write error');this.value=v}};window.mountColors=()=>window.control=colors.initializeAppearanceControls({container:document.querySelector('#settings-panel-appearance .settings-section'),storage:testStore});mountColors();document.querySelector('#settings-dialog').showModal();document.querySelector('[data-settings-tab="appearance"]').click()});
await p.locator('.graphite-controls').waitFor();await p.locator('[data-theme="plain"]').click();
const background=p.getByRole('textbox',{name:'Background hex color'}),accent=p.getByRole('textbox',{name:'Accent hex color'});
check('module mounted once',await p.evaluate(()=>{const a=mountColors();return a===control&&document.querySelectorAll('.graphite-controls').length===1}));
check('default CSS applies in Graphite',await p.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(8, 12, 18)'));
await p.getByRole('button',{name:'Midnight background',exact:true}).click();await p.getByRole('button',{name:'Mint accent',exact:true}).click();await p.getByRole('button',{name:'Save colors',exact:true}).click();
check('selected colors persist',await p.evaluate(()=>testStore.value===JSON.stringify({schemaVersion:1,background:'#0b1220',accent:'#afe2cb'})));
check('actual workspace and send accent updated',await p.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(11, 18, 32)'&&getComputedStyle(document.querySelector('.ambient')).backgroundColor==='rgb(11, 18, 32)'&&getComputedStyle(document.querySelector('.send')).backgroundColor==='rgb(175, 226, 203)'));
check('saved selected-state accessible',await p.getByRole('button',{name:'Mint accent',exact:true}).getAttribute('aria-pressed')==='true');
await background.fill('#ffffff');check('unreadable background blocked',await p.getByRole('button',{name:'Save colors',exact:true}).isDisabled()&&await background.getAttribute('aria-invalid')==='true');
check('invalid edit does not change active color',await p.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(11, 18, 32)'));
await background.fill('#080c12');await accent.fill('#000000');check('dark accent blocked',await p.getByRole('button',{name:'Save colors',exact:true}).isDisabled());
await accent.fill('#C1E1FF');await p.getByRole('button',{name:'Save colors',exact:true}).click();check('valid uppercase hex normalized',await p.evaluate(()=>JSON.parse(testStore.value).accent==='#c1e1ff'));
await p.locator('[data-theme="galaxy"]').click();check('Graphite variables removed in Galaxy',await p.evaluate(()=>!document.body.style.getPropertyValue('--rivune-graphite-background')&&!document.body.style.getPropertyValue('--rivune-graphite-accent')));
check('Galaxy artwork preserved',await p.evaluate(()=>getComputedStyle(document.querySelector('.ambient'),'::before').backgroundImage.includes('rivune-workspace-milky-way')&&getComputedStyle(document.querySelector('.ambient'),'::before').opacity==='1'));
await p.locator('[data-theme="orbit"]').click();check('Orbit remains selected without Graphite vars',await p.evaluate(()=>document.body.dataset.background==='orbit'&&!document.body.style.getPropertyValue('--rivune-graphite-background')));
await p.locator('[data-theme="plain"]').click();await p.evaluate(()=>testStore.failWrite=true);
await p.getByRole('button',{name:'Lavender accent',exact:true}).click();await p.getByRole('button',{name:'Save colors',exact:true}).click();
check('failed save clearly says window only',/only in this window/.test(await p.locator('.graphite-save-status').innerText()));
check('failed save applies locally but preserves old stored value',await p.evaluate(()=>document.body.style.getPropertyValue('--rivune-graphite-accent')==='#d4c3f5'&&JSON.parse(testStore.value).accent==='#c1e1ff'));
await p.evaluate(()=>{testStore.failWrite=false;control.destroy();mountColors()});check('remount restores prior durable value',await accent.inputValue()==='#c1e1ff');
await p.getByRole('button',{name:'Reset colors',exact:true}).click();check('reset saved defaults',await p.evaluate(()=>testStore.value===JSON.stringify({schemaVersion:1,...colors.GRAPHITE_DEFAULTS})));
for(const raw of ['{broken',JSON.stringify({schemaVersion:1,background:'#fff',accent:'#c1e1ff'}),JSON.stringify({schemaVersion:2,background:'#080c12',accent:'#c1e1ff'}),JSON.stringify({schemaVersion:1,background:'#080c12',accent:'url(https://bad.test)'}),'x'.repeat(257)]){
 await p.evaluate(raw=>{control.destroy();testStore.value=raw;mountColors()},raw);
 check('invalid saved value safely defaults '+checks.length,await background.inputValue()==='#080c12'&&/could not be loaded/.test(await p.locator('.graphite-save-status').innerText()));
}
await p.evaluate(()=>{control.destroy();testStore.failRead=true;mountColors()});check('storage read failure remains editable',await background.isEditable()&&/could not be loaded/.test(await p.locator('.graphite-save-status').innerText()));
await p.getByRole('button',{name:'Charcoal background',exact:true}).focus();await p.keyboard.press('Space');check('keyboard preset activation',await background.inputValue()==='#17191d');
check('all allowed presets have readable labels and accents',await p.evaluate(()=>['#080c12','#0b1220','#17191d'].every(background=>['#c1e1ff','#afe2cb','#d4c3f5'].every(accent=>colors.validateGraphite({background,accent})&&colors.contrast(background,'#8796a6')>=4.5))));
for(const width of [390,760,1120]){await p.setViewportSize({width,height:800});await p.locator('.graphite-controls').scrollIntoViewIfNeeded();check('controls fit Appearance panel '+width,await p.locator('.graphite-controls').evaluate(n=>n.scrollWidth<=n.clientWidth&&n.getBoundingClientRect().right<=innerWidth))}
await p.screenshot({path:path.join(__dirname,'appearance-controls-rendered.png')});
violations.push(...await p.evaluate(()=>cspErrors));check('actual CSP retained with no violations',violations.length===0);check('no uncaught browser errors',errors.length===0);
fs.writeFileSync(path.join(__dirname,'APPEARANCE_CONTROLS_BROWSER.json'),JSON.stringify({scope:'New production module mounted into actual canonical Appearance DOM and stylesheet in Chromium under Tauri CSP; no native host/provider execution',checks,errors,violations,csp},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors,violations}));
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
