import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,count,enableTeam} from './reviewerFixture.mjs';
import {composerConfigurationKey as key,composerSummary} from '../src/host/composerConfiguration.ts';
import {configuredTeam} from '../src/host/teamConfiguration.ts';
async function setup(t,outcome){
 const f=fixture();enableTeam(f);f.snapshot.attachments=[{attachmentID:'attachment',conversationID:'chat',displayName:'Synthetic.txt',byteLength:1,sha256:'a'.repeat(64),sourceState:'valid'}];f.snapshot.conversations[0].richDraft.attachmentIDs=['attachment'];const c=f.controller();t.after(()=>c.dispose());await c.start();c.editDraft('chat','Original draft');
 const s=c.getState(),team=configuredTeam(s.snapshot,s.catalog,['codex','claude'],'claude');const chosen={expectedKey:key(s.snapshot,s.catalog,'chat'),selection:team.members[1],team};
 const display=()=>c.getState().configurationConfirmations.chat?.confirmedSummary??composerSummary(c.getState().snapshot,c.getState().catalog,'chat');const before=display();
 const originalSave=f.bridge.saveRichDraft,originalRead=f.bridge.getSnapshot;let receipt,first,failRead=false;
 f.bridge.getSnapshot=async()=>{if(failRead){failRead=false;throw Error('Refresh failed');}return originalRead();};
 f.bridge.saveRichDraft=async request=>{if(receipt){assert.deepEqual(request,first);f.calls.push(['save',structuredClone(request)]);return structuredClone(receipt);}first=structuredClone(request);receipt=await originalSave(request);if(outcome==='lost')throw Error('Lost reply');if(outcome==='malformed')return {...receipt,team:null};failRead=true;return receipt;};
 await assert.rejects(c.configureExecution('chat',chosen));assert.equal(display(),before);assert.equal(c.getState().configurationConfirmations.chat.acknowledged,outcome==='refresh');return {f,c,display,before,team};
}
for(const outcome of ['lost','malformed','refresh'])test(`closure ${outcome}: held summary exact recovery no send and preserved new edits/attachments`,async t=>{
 const {f,c,display,before,team}=await setup(t,outcome);c.editDraft('chat','Newer local edit');
 if(outcome!=='refresh'){await c.refresh();assert.deepEqual(c.getState().snapshot.conversations[0].richDraft.team,team);assert.equal(display(),before);}
 if(outcome!=='refresh')await assert.rejects(c.send('chat'));assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);
 await c.retryDraftSave('chat');assert.equal(c.getState().configurationConfirmations.chat,undefined);assert.match(display(),/^Constellation/);assert.equal(c.getState().drafts.chat,'Newer local edit');assert.deepEqual(f.snapshot.conversations[0].richDraft.attachmentIDs,['attachment']);assert.equal(f.snapshot.conversations[0].draft,'Original draft');assert.equal(count(f,'save'),outcome==='refresh'?1:2);assert.equal(count(f,'submit'),0);
});
test('acknowledged refresh failure can recover by ordinary refresh with no replay',async t=>{const {f,c}=await setup(t,'refresh');await c.refresh();assert.equal(c.getState().configurationConfirmations.chat,undefined);assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);});
test('DEFECT characterization: later saved revision cannot be recovered through existing review controls',async t=>{
 const {f,c}=await setup(t,'refresh');f.snapshot.conversations[0].richDraft.revision++;f.snapshot.conversations[0].draft='Externally saved next revision';await c.refresh();assert(c.getState().configurationConfirmations.chat?.acknowledged);await assert.rejects(c.retryDraftSave('chat'));await c.keepLocalDraft('chat',4);await assert.rejects(c.retryDraftSave('chat'));await assert.rejects(c.saveDraft('chat'));await assert.rejects(c.send('chat'));assert.equal(count(f,'save'),1);assert.equal(count(f,'submit'),0);assert(c.getState().configurationConfirmations.chat);assert.equal(c.getState().drafts.chat,'Original draft');
});
