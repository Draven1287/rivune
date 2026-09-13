import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,count,enableTeam} from './reviewerFixture.mjs';
import {composerConfigurationKey as key,composerSummary,composerProviderLabel} from '../src/host/composerConfiguration.ts';
import {configuredTeam} from '../src/host/teamConfiguration.ts';
const setup=async t=>{const f=fixture();enableTeam(f);const c=f.controller();t.after(()=>c.dispose());await c.start();return {f,c};};
const intent=c=>{const s=c.getState(),team=configuredTeam(s.snapshot,s.catalog,['codex','claude'],'claude');return {expectedKey:key(s.snapshot,s.catalog,'chat'),selection:team.members[1],team};};
test('detached intended pair survives caller mutation and preserves edit during awaited refresh',async t=>{
 const {f,c}=await setup(t);let release;const original=f.bridge.getSnapshot;f.bridge.getSnapshot=async()=>{await new Promise(r=>release=r);return original();};
 const chosen=intent(c),expected=structuredClone(chosen);const pending=c.configureExecution('chat',chosen);chosen.expectedKey='changed';chosen.team.members[1].providerID='codex';c.editDraft('chat','Edit while refreshing');release();f.bridge.getSnapshot=original;await pending;
 const saved=f.calls.find(x=>x[0]==='save')[1];assert.deepEqual(saved.team,expected.team);assert.deepEqual(saved.selection,expected.selection);assert.equal(saved.draft,'Edit while refreshing');assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);
});
test('capability or revision drift during awaited refresh rejects before save',async t=>{
 for(const kind of ['capability','revision']){const {f,c}=await setup(t);const chosen=intent(c);const original=f.bridge.getSnapshot;let release;f.bridge.getSnapshot=async()=>{await new Promise(r=>release=r);return original();};const pending=c.configureExecution('chat',chosen);if(kind==='capability')delete f.snapshot.runtimeCapabilities;else f.snapshot.conversations[0].richDraft.revision++;release();await assert.rejects(pending);assert.equal(count(f,'save'),0);}
});
test('malformed acknowledgement blocks replacement mutation',async t=>{
 for(const field of ['mutationID','revision','team']){const {f,c}=await setup(t);const original=f.bridge.saveRichDraft;f.bridge.saveRichDraft=async request=>{const result=await original(request);return {...result,[field]:field==='team'?null:field==='revision'?500:'wrong'};};await assert.rejects(c.configureExecution('chat',intent(c)));await assert.rejects(c.configureExecution('chat',intent(c)));assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);}
});
test('active run unresolved submission retry and shutdown fence configuration',async t=>{
 for(const condition of ['active','submission','retry','shutdown']){const {f,c}=await setup(t);const chosen=intent(c);if(condition==='active')f.addRun({id:'busy',conversationID:'chat',prompt:'Synthetic'},'running');
 if(condition==='submission'){f.bridge.submitRun=async()=>{throw Error('lost reply');};await c.send('chat');assert(c.getState().pending);}
 if(condition==='retry'){const run=f.addRun({id:'failed',conversationID:'chat',prompt:'Synthetic',mode:'constellation'},'failed');run.admitted.team=chosen.team;run.failedInvocationID='invocation';run.failedAttemptID='attempt';f.bridge.retryConstellationInvocation=async()=>({requestID:'failed',state:'uncertain'});await c.retryInvocation({requestID:'failed',invocationID:'invocation',failedAttemptID:'attempt'});assert(c.getState().retry);}
 if(condition==='shutdown')c.prepareShutdownDrafts();const before=count(f,'save');await assert.rejects(c.configureExecution('chat',chosen));assert.equal(count(f,'save'),before);}
});
test('configuration preserves admitted historical output and duplicate display identity',async t=>{
 const {f,c}=await setup(t);const run=f.addRun({id:'old',conversationID:'chat',prompt:'Old prompt',mode:'constellation'},'failed');run.admitted.team=intent(c).team;run.memberResults=[{schemaVersion:1,memberID:'member-1',providerID:'codex',role:'independentAnswer',text:'Retained old output',truncated:false}];await c.refresh();const prior=structuredClone(c.getState().snapshot.runs);await c.configureExecution('chat',intent(c));assert.deepEqual(c.getState().snapshot.runs,prior);assert.equal(count(f,'submit'),0);f.catalog.providers[0].label='Same';f.catalog.providers[1].label=' same ';assert.equal(composerProviderLabel(f.catalog,'codex'),'Same (codex)');assert.equal(composerProviderLabel(f.catalog,'removed'),'removed');
});
test('DEFECT characterization: refresh promotes unacknowledged applied config into resting summary',async t=>{
 const {f,c}=await setup(t);c.editDraft('chat','Retain me');const before=composerSummary(c.getState().snapshot,c.getState().catalog,'chat');const original=f.bridge.saveRichDraft;f.bridge.saveRichDraft=async request=>{await original(request);throw Error('Host applied but reply lost');};await assert.rejects(c.configureExecution('chat',intent(c)));assert.equal(composerSummary(c.getState().snapshot,c.getState().catalog,'chat'),before);
 await c.refresh();assert.match(composerSummary(c.getState().snapshot,c.getState().catalog,'chat'),/^Constellation/);assert.equal(count(f,'save'),1);assert.equal(c.getState().drafts.chat,'Retain me');await assert.rejects(c.configureExecution('chat',{expectedKey:key(c.getState().snapshot,c.getState().catalog,'chat'),selection:null,team:null}));assert.equal(count(f,'save'),1);
});
