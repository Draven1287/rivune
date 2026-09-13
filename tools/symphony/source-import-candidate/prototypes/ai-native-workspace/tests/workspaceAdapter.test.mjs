import test from 'node:test';
import assert from 'node:assert/strict';
import { createSetupAdapter } from '../src/hooks/workspaceAdapter.ts';

function fixture() {
  const config = { id: 'codex-configured', kind: 'codex', executablePath: '/example/bin/codex', model: null, timeoutMs: 60000 };
  const discovery = [{ id: 'codex:discovered:123', kind: 'codex', displayName: 'Codex', executablePath: '/example/bin/codex', installed: true, authentication: 'unknown', tested: false }];
  const catalog = { schemaVersion: 1, revision: 'fixture-revision', providers: [{ id: config.id, label: 'Codex CLI', transport: 'cli', adapterState: 'supported', installation: 'installed', authentication: 'unknown', responseTest: 'notTested', catalogState: 'unknown', models: [], defaults: {modelID:null, effortID:null}, supportsProviderDefault: true, errorCode: null }] };
  const snapshot = { schemaVersion: 1, providers: [config], selectedProviderID: config.id, conversations: [] };
  return { discovery, catalog, snapshot, bridge: { discoverProviders: async()=>discovery, getModelCatalog: async()=>catalog, getSnapshot: async()=>snapshot } };
}

test('absent or partial bridge is unavailable and calls nothing', async () => {
  let calls = 0;
  for (const bridge of [undefined, {}, { discoverProviders: ()=>{calls++;} }]) {
    const adapter = createSetupAdapter(bridge);
    assert.equal(adapter.available, false);
    assert.equal((await adapter.readSetup()).status, 'unavailable');
  }
  assert.equal(calls, 0);
});
test('installed and configured do not imply authenticated or ready', async () => {
  const f = fixture(); const result = await createSetupAdapter(f.bridge).readSetup();
  assert.equal(result.status, 'available'); assert.equal(result.providers.length, 1);
  assert.deepEqual(result.providers[0], { id:'codex-configured',label:'Codex CLI',installed:true,configured:true,authentication:'unknown',responseTest:'notTested',readiness:'unknown',selected:true });
  assert.equal(result.constellation, 'unavailable');
});
test('ready means host-reported supported installed authenticated and passed together', async () => {
  const f = fixture(); const provider = f.catalog.providers[0];
  provider.authentication = 'authenticated'; provider.responseTest = 'passed';
  assert.equal((await createSetupAdapter(f.bridge).readSetup()).providers[0].readiness, 'hostReportedReady');
  for (const [key, value] of [['adapterState','unsupported'],['installation','missing'],['authentication','authNeeded'],['responseTest','failed']]) {
    const before = provider[key]; provider[key] = value;
    assert.equal((await createSetupAdapter(f.bridge).readSetup()).providers[0].readiness, 'notReady'); provider[key] = before;
  }
});
test('discovery tested flag never becomes a passed response or readiness', async () => {
  const f = fixture(); f.snapshot.providers = []; f.snapshot.selectedProviderID = null; f.catalog.providers = [];
  f.discovery[0].tested = true; f.discovery[0].authentication = 'authenticated';
  const result = await createSetupAdapter(f.bridge).readSetup();
  assert.equal(result.providers[0].configured, false); assert.equal(result.providers[0].responseTest,'notTested'); assert.equal(result.providers[0].readiness,'unknown');
});
test('identity conflicts and ambiguous paths cannot merge discovery readiness', async () => {
  const f = fixture(); f.catalog.providers[0].authentication = 'authenticated'; f.catalog.providers[0].responseTest = 'passed';
  f.discovery[0].id = f.snapshot.providers[0].id; f.discovery[0].executablePath = '/different/bin/codex';
  let result = await createSetupAdapter(f.bridge).readSetup();
  assert.equal(result.providers.length,2); assert.equal(result.providers[0].readiness,'notReady'); assert.equal(result.providers[1].configured,false);
  f.discovery[0].id = 'separate-discovery'; f.discovery[0].executablePath = f.snapshot.providers[0].executablePath;
  f.snapshot.providers.push({...f.snapshot.providers[0],id:'second-route'});
  result = await createSetupAdapter(f.bridge).readSetup();
  assert.equal(result.providers.length,3); assert.equal(result.providers[2].configured,false);
});
test('catalog-only and same-label different IDs do not imply configured readiness', async () => {
  const f = fixture(); f.catalog.providers[0].id = 'different-config'; f.catalog.providers[0].authentication = 'authenticated'; f.catalog.providers[0].responseTest = 'passed';
  const result = await createSetupAdapter(f.bridge).readSetup();
  assert.equal(result.providers[0].authentication,'unknown'); assert.equal(result.providers[1].configured,false); assert.equal(result.providers[1].readiness,'unknown');
});
test('rejects malformed enums, extra keys, duplicate identities and invalid defaults', async () => {
  const mutations = [
    f=>{f.catalog.schemaVersion=2;}, f=>{f.catalog.providers[0].authentication='ready';},
    f=>{f.catalog.providers[0].secretPath='not metadata';}, f=>{f.catalog.providers.push({...f.catalog.providers[0]});},
    f=>{f.catalog.providers[0].defaults.modelID='missing-model';}, f=>{f.discovery[0].installed='yes';},
    f=>{f.snapshot.selectedProviderID='unknown';}, f=>{f.catalog.providers[0].label='é'.repeat(129);},
    f=>{f.catalog.providers[0].models=[{id:'model',label:'Model',availability:'available',effortState:'unsupported',efforts:[{id:'high',label:'High'}],supportsDefaultEffort:false}];},
  ];
  for (const mutate of mutations) {
    const f=fixture(); mutate(f); const result=await createSetupAdapter(f.bridge).readSetup();
    assert.equal(result.status,'error'); assert.deepEqual(result.providers,[]);
  }
});
test('actual model/default effort schema is preserved', async () => {
  const f=fixture(); const provider=f.catalog.providers[0];
  provider.models=[{id:'model',label:'Model',availability:'available',effortState:'supported',efforts:[{id:'high',label:'High'}],supportsDefaultEffort:true}];
  provider.defaults={modelID:'model',effortID:'high'};
  const result=await createSetupAdapter(f.bridge).readSetup(); assert.equal(result.status,'available'); assert.deepEqual(result.catalog,f.catalog);
});
test('sync and async host errors are sanitized, and failure never returns prior rows', async () => {
  const f=fixture(); const adapter=createSetupAdapter(f.bridge);
  assert.equal((await adapter.readSetup()).status,'available');
  for (const fail of [()=>{throw Error('/Users/private/token=secret');},async()=>{throw Error('/Users/private/token=secret');}]) {
    f.bridge.getSnapshot=fail; const result=await adapter.readSetup();
    assert.equal(result.status,'error'); assert.deepEqual(result.providers,[]); assert(!JSON.stringify(result).includes('secret')); assert(!JSON.stringify(result).includes('/Users'));
  }
});
test('bounded timeout returns no stale rows; late rejected promises remain handled', async () => {
  const f=fixture(); let rejectLate;
  f.bridge.getSnapshot=()=>new Promise((_,reject)=>{rejectLate=reject;});
  const result=await createSetupAdapter(f.bridge,5).readSetup();
  assert.equal(result.status,'error'); assert.match(result.message,/timed out/); assert.deepEqual(result.providers,[]);
  rejectLate(Error('late secret')); await new Promise(resolve=>setTimeout(resolve,5));
});

test('discovery sign-in-required uses discovery wire enum, never catalog enum', async () => {
 const f=fixture(); f.snapshot.providers=[]; f.snapshot.selectedProviderID=null; f.catalog.providers=[];
 f.discovery[0].authentication='not-authenticated';
 const result=await createSetupAdapter(f.bridge).readSetup();
 assert.equal(result.status,'available'); assert.equal(result.providers[0].authentication,'authNeeded');
 assert.notEqual(result.providers[0].readiness,'hostReportedReady');
 f.discovery[0].authentication='authNeeded'; assert.equal((await createSetupAdapter(f.bridge).readSetup()).status,'error');
});

test('matched discovery authentication denial overrides positive catalog readiness', async () => {
 for (const exactID of [false,true]) {
  const f=fixture(); if(exactID) f.discovery[0].id=f.snapshot.providers[0].id;
  f.discovery[0].authentication='not-authenticated'; f.catalog.providers[0].authentication='authenticated'; f.catalog.providers[0].responseTest='passed';
  const result=await createSetupAdapter(f.bridge).readSetup();
  assert.equal(result.status,'available'); assert.equal(result.providers[0].authentication,'authNeeded'); assert.equal(result.providers[0].readiness,'notReady');
 }
});
