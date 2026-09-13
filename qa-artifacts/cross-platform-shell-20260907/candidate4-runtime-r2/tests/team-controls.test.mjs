import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {teamRoutes} from '../web/team-controls.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const catalog=()=>({schemaVersion:1,revision:'r1',providers:Array.from({length:7},(_,i)=>({id:`p${i}`,label:`Provider ${i}`,transport:'cli',adapterState:'supported',installation:'installed',authentication:'unknown',responseTest:'notTested',catalogState:'unknown',models:[],defaults:{modelID:null,effortID:null},supportsProviderDefault:true,errorCode:null}))});
const selection=i=>({schemaVersion:1,providerID:`p${i}`,modelID:null,effortID:null,catalogRevision:'r1'});
const team=()=>({schemaVersion:1,leadIndex:0,members:[selection(0),selection(1)]});
const capability={schemaVersion:1,constellation:'unavailable',minimumMembers:2,reasonCode:'ENGINE_NOT_CONNECTED'};
test('routes use actual defaults capability without inventing models or authentication',()=>{
 const c=catalog();assert.equal(teamRoutes(c).length,7);
 c.providers[0].supportsProviderDefault=false;c.providers[1].catalogState='stale';c.providers[2].adapterState='unsupported';c.providers[3].installation='missing';c.providers[4].authentication='authNeeded';
 assert.deepEqual(teamRoutes(c).map(r=>r.selection.providerID),['p5','p6']);
});
test('model and reasoning options require catalog availability and explicit default support',()=>{
 const c=catalog();c.providers=c.providers.slice(0,1);const p=c.providers[0];p.supportsProviderDefault=false;p.catalogState='available';
 p.models=[{id:'m',label:'Model',availability:'available',effortState:'supported',efforts:[{id:'high',label:'High'}],supportsDefaultEffort:false}];
 assert.deepEqual(teamRoutes(c).map(r=>r.selection.effortID),['high']);p.models[0].supportsDefaultEffort=true;
 assert.deepEqual(teamRoutes(c).map(r=>r.selection.effortID),[null,'high']);p.models[0].availability='unknown';assert.equal(teamRoutes(c).length,0);
});
let browser;
before(async()=>{browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true})});
after(async()=>{await browser?.close()});
async function pageFor(t,currentTeam=null){
 const context=await browser.newContext();t.after(()=>context.close());
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.origin!=='https://team.test')return route.abort();
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><div id="team"></div>'});
  if(!['/team-controls.mjs','/core.mjs'].includes(url.pathname))return route.abort();
  return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(new URL('../web'+url.pathname,import.meta.url))});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));t.after(()=>assert.deepEqual(errors,[]));
 await page.goto('https://team.test/');
 await page.evaluate(async props=>{
  window.changes=[];window.rejectSave=false;window.holdSave=false;window.pendingResolve=null;
  const {mountTeamControls}=await import('/team-controls.mjs');
  window.chooser=mountTeamControls({container:document.querySelector('#team'),...props,contextKey:'c1',onChange:async choice=>{window.changes.push(choice);if(window.rejectSave)throw Error('fixture rejected');if(window.holdSave)await new Promise(resolve=>window.pendingResolve=resolve)}});
 },{catalog:catalog(),capability,currentTeam});return page;
}
test('component requires 2 members and explicit lead; duplicates disappear; lead removal requires new choice',async t=>{
 const p=await pageFor(t);const save=p.getByRole('button',{name:'Save team draft'}),add=p.getByRole('button',{name:'Add member'});
 await p.getByRole('button',{name:'Provider 0 · Provider default',exact:true}).click();await add.click();assert.equal(await save.isDisabled(),true);await p.getByRole('button',{name:'Provider 1 · Provider default',exact:true}).click();await add.click();assert.equal(await save.isDisabled(),true);
 assert.equal(await p.locator('.team-route-list button').count(),5);
 await p.getByRole('radio').nth(1).check();await save.click();await p.waitForFunction(()=>changes.length===1);
 assert.equal(await p.evaluate(()=>changes[0].team.leadIndex),1);
 assert.equal(await p.evaluate(()=>changes[0].selection.providerID),'p1');
 await p.getByRole('button',{name:'Remove Provider 1 · Provider default',exact:true}).click();await p.getByRole('button',{name:'Provider 1 · Provider default',exact:true}).click();await add.click();assert.equal(await save.isDisabled(),true);
 assert.match(await p.locator('#team').textContent(),/Team execution is not ready in this build\. You can save a team draft\./);
});
test('six member bound and accessible buttons prevent seventh route',async t=>{
 const p=await pageFor(t);for(let i=0;i<6;i++){await p.getByRole('button',{name:`Provider ${i} · Provider default`,exact:true}).click();await p.getByRole('button',{name:'Add member'}).click()}
 assert.equal(await p.getByRole('radio').count(),6);assert.equal(await p.getByRole('button',{name:'Add member'}).isDisabled(),true);
 await p.getByRole('radio').first().check();await p.getByRole('button',{name:'Save team draft'}).click();assert.equal(await p.evaluate(()=>changes[0].team.members.length),6);
});
test('stale/unavailable catalog retains chosen team and prevents new save',async t=>{
 const p=await pageFor(t,team());const c=catalog();c.revision='r2';c.providers.forEach(x=>x.catalogState='stale');
 await p.evaluate(props=>chooser.update(props),{catalog:c,currentTeam:team(),capability});
 assert.equal(await p.getByRole('radio').count(),2);assert.equal(await p.getByRole('radio').first().isChecked(),true);
 assert.equal(await p.getByRole('button',{name:'Save team draft'}).isDisabled(),true);assert.match(await p.locator('#team').textContent(),/retained/);
 assert.equal(await p.evaluate(()=>changes.length),0);
});
test('routine updates retain incomplete edits; context switch resets them',async t=>{
 const p=await pageFor(t);await p.getByRole('button',{name:'Provider 0 · Provider default',exact:true}).click();await p.getByRole('button',{name:'Add member'}).click();
 await p.getByRole('radio').first().focus();
 await p.evaluate(props=>chooser.update(props),{catalog:catalog(),currentTeam:null});assert.equal(await p.getByRole('radio').count(),1);
 assert.equal(await p.getByRole('radio').first().evaluate(n=>n===document.activeElement),true);
 await p.getByRole('button',{name:'Provider 5 · Provider default',exact:true}).click();
 await p.evaluate(props=>chooser.update(props),{catalog:catalog(),currentTeam:null});
 assert.equal(await p.getByRole('button',{name:'Provider 5 · Provider default',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await p.locator('select').count(),0);
 await p.keyboard.press('Home');assert.equal(await p.getByRole('button',{name:'Provider 1 · Provider default',exact:true}).evaluate(n=>n===document.activeElement),true);
 await p.evaluate(props=>chooser.update(props),{catalog:catalog(),currentTeam:null,contextKey:'c2'});assert.equal(await p.getByRole('radio').count(),0);
});
test('disabled input and pending save block changes; rejected save retains edits',async t=>{
 const p=await pageFor(t,team());await p.evaluate(()=>chooser.update({disabled:true}));
 assert.equal(await p.getByRole('button',{name:'Save team draft'}).isDisabled(),true);assert.equal(await p.getByRole('radio').first().isDisabled(),true);
 await p.evaluate(()=>{chooser.update({disabled:false});window.rejectSave=true});await p.getByRole('button',{name:'Save team draft'}).click();
 await p.getByText('Could not save this team draft. Your choices are retained; retry when ready.').waitFor();assert.equal(await p.getByRole('radio').count(),2);
 await p.evaluate(()=>{window.rejectSave=false;window.holdSave=true});await p.getByRole('button',{name:'Save team draft'}).click();
 assert.equal(await p.getByRole('button',{name:'Add member'}).isDisabled(),true);await p.evaluate(()=>window.pendingResolve());
});
test('destroy suppresses late save completion and removes component',async t=>{
 const p=await pageFor(t,team());await p.evaluate(()=>window.holdSave=true);await p.getByRole('button',{name:'Save team draft'}).click();
 await p.evaluate(()=>{chooser.destroy();window.pendingResolve()});assert.equal(await p.locator('#team').textContent(),'');
});
