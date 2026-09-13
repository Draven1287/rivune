import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelCatalog, providerSelectionCapabilities } from '../src/hooks/workspaceAdapter.ts';
import { configuredTeam, validateSavedTeam } from '../src/host/teamConfiguration.ts';
function fixture() {
  const capabilities = { schemaVersion: 1, modelOverride: 'unsupported', effortOverride: 'unsupported', reasonCode: 'ADAPTER_DISCOVERY_UNAVAILABLE' };
  const providers = ['first','second'].map(id => ({ id, label:id, transport:'cli', adapterState:'supported', installation:'installed', authentication:'unknown', responseTest:'notTested', catalogState:'unknown', models:[], defaults:{modelID:null,effortID:null}, supportsProviderDefault:true, selectionCapabilities:{...capabilities}, errorCode:null }));
  return { catalog:{schemaVersion:1,revision:'current',providers}, snapshot:{providers:providers.map(p=>({id:p.id,kind:'codex'})),runtimeCapabilities:{schemaVersion:1,constellation:'available',minimumMembers:2,reasonCode:null}} };
}
test('typed capabilities report unknown discovery without inventing options',()=>{
 const {catalog}=fixture(); const parsed=parseModelCatalog(catalog);
 assert.equal(providerSelectionCapabilities(parsed.providers[0]).reasonCode,'ADAPTER_DISCOVERY_UNAVAILABLE');
 assert.deepEqual(parsed.providers[0].models,[]);
});
test('legacy v1 catalog without capability field stays readable and defaults-only',()=>{
 const {catalog,snapshot}=fixture();for(const p of catalog.providers)delete p.selectionCapabilities;
 const parsed=parseModelCatalog(catalog);assert.equal(providerSelectionCapabilities(parsed.providers[0]).reasonCode,'CAPABILITY_NOT_REPORTED');
 const team=configuredTeam(snapshot,parsed,['first','second'],'second');assert.equal(team.leadIndex,1);assert.equal(team.members[0].modelID,null);validateSavedTeam(snapshot,parsed,team);
});
test('unknown capability versions, fields, support claims and malformed values fail closed',()=>{
 for(const mutate of [c=>{c.schemaVersion=2},c=>{c.modelOverride='supported'},c=>{c.effortOverride='unknown'},c=>{c.reasonCode='ENTITLED'},c=>{c.models=['invented']},c=>{delete c.modelOverride}]) {
  const {catalog}=fixture();mutate(catalog.providers[0].selectionCapabilities);assert.throws(()=>parseModelCatalog(catalog));
 }
 const {catalog}=fixture();catalog.providers[0].selectionCapabilities=null;assert.throws(()=>parseModelCatalog(catalog));
});
test('old saved team retains lead and bytes until explicit current-default review',()=>{
 const {catalog,snapshot}=fixture();const saved=configuredTeam(snapshot,catalog,['first','second'],'second');for(const m of saved.members)m.catalogRevision='legacy';const before=JSON.stringify(saved);
 assert.throws(()=>validateSavedTeam(snapshot,catalog,saved),/needs review/);assert.equal(JSON.stringify(saved),before);
 const reviewed=configuredTeam(snapshot,catalog,saved.members.map(m=>m.providerID),saved.members[saved.leadIndex].providerID);assert.equal(reviewed.leadIndex,1);assert.deepEqual(reviewed.members.map(m=>m.catalogRevision),['current','current']);validateSavedTeam(snapshot,catalog,reviewed);
});
test('unsupported saved overrides and removed providers cannot silently fall back',()=>{
 const {catalog,snapshot}=fixture();for(const field of ['modelID','effortID']){const team=configuredTeam(snapshot,catalog,['first','second'],'second');team.members[0][field]='unsupported-value';const before=JSON.stringify(team);assert.throws(()=>validateSavedTeam(snapshot,catalog,team),/needs review/);assert.equal(JSON.stringify(team),before);}
 const team=configuredTeam(snapshot,catalog,['first','second'],'second');catalog.providers.pop();assert.throws(()=>validateSavedTeam(snapshot,catalog,team));
});
