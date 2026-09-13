import assert from 'node:assert/strict';
import { createProviderDiscovery, discoveryStatus } from '../cross-platform-shell-20260907/candidate4-runtime-r2/web/onboarding.mjs';
let checks = 0;
async function check(name, test) { await test(); checks++; console.log(`PASS ${name}`); }
const row = (authentication = 'unknown') => ({id:'codex:canonical-hash',kind:'codex',displayName:'Codex',executablePath:'/fixture/codex',installed:true,authentication,tested:false});
await check('missing method is unavailable without fabricated detection', async () => {
 const d=createProviderDiscovery({}); assert.equal(d.available,false); assert.deepEqual(await d.scan(),{state:'unavailable',providers:[]});
});
await check('empty host list is a completed check with no detected providers', async () => {
 assert.deepEqual(await createProviderDiscovery({discoverProviders:async()=>[]}).scan(),{state:'ready',providers:[]});
});
for (const [auth,label] of [['authenticated','Signed in'],['not-authenticated','Sign-in required'],['unknown','Sign-in not checked']]) {
 await check(`truthful ${auth} state with response still untested`,async()=>{
  const result=await createProviderDiscovery({discoverProviders:async()=>[row(auth)]}).scan();
  assert.equal(result.providers[0].authentication,auth);assert.equal(result.providers[0].tested,false);
  assert.equal(discoveryStatus(result.providers[0]),`Installed · ${label} · Response not tested`);
 });
}
await check('concurrent setup views share one discovery call',async()=>{
 let calls=0,finish;const d=createProviderDiscovery({discoverProviders:()=>{calls++;return new Promise(resolve=>finish=resolve)}});
 const first=d.scan(),second=d.scan();finish([row()]);await Promise.all([first,second]);assert.equal(calls,1);
 await d.scan();assert.equal(calls,1);
});
await check('duplicate identities are rejected rather than rendered as choices',async()=>{
 await assert.rejects(createProviderDiscovery({discoverProviders:async()=>[row(),row()]}).scan(),/Invalid discovery result/);
});
await check('missing, malformed and oversized results fail closed',async()=>{
 for(const value of [null,{},[{...row(),authentication:'ready'}],[{...row(),installed:'yes'}],Array.from({length:33},(_,i)=>({...row(),id:`id-${i}`}))]) {
  await assert.rejects(createProviderDiscovery({discoverProviders:async()=>value}).scan(),/Invalid discovery result/);
 }
});
await check('failed refresh clears cached results and can recover on explicit retry',async()=>{
 let calls=0;const d=createProviderDiscovery({discoverProviders:async()=>{calls++;if(calls===2)throw new Error('timeout');return[row()]}});
 await d.scan();await assert.rejects(d.scan({refresh:true}),/timeout/);await d.scan();assert.equal(calls,3);
});
await check('not installed never offers an authentication or response claim',async()=>{
 const result=await createProviderDiscovery({discoverProviders:async()=>[{...row(),installed:false,executablePath:''}]}).scan();
 assert.equal(discoveryStatus(result.providers[0]),'Not installed');
});
await check('hung discovery times out and late results cannot populate its cache',async()=>{
 let calls=0,late;const d=createProviderDiscovery({discoverProviders:()=>{calls++;return calls===1?new Promise(resolve=>late=resolve):Promise.resolve([])}},5);
 await assert.rejects(d.scan(),/timed out/);late([row()]);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(await d.scan(),{state:'ready',providers:[]});assert.equal(calls,2);
});
console.log(`${checks} discovery controller checks passed; fixtures only, no CLI or account access.`);
