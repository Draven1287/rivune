import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHostSnapshot } from '../src/host/contracts.ts';

function fixture() {
  const members=['one','two'].map(providerID=>({schemaVersion:1,providerID,modelID:null,effortID:null,catalogRevision:'rev'}));
  const provider={id:'one',kind:'codex',executablePath:'/fake',model:null,timeoutMs:1000};
  const team={schemaVersion:1,leadIndex:0,members};
  return {schemaVersion:1,activeConversationID:'chat',selectedProviderID:'one',providers:[provider],conversations:[{id:'chat',title:'Chat',readOnly:false,draft:'',richDraft:{schemaVersion:1,revision:1,selection:members[0],team,attachmentIDs:[]}}],runs:[{
    id:'r',conversationID:'chat',status:'completed',updatedAt:'today',answer:'Canonical final answer',error:null,
    admitted:{requestID:'r',conversationID:'chat',prompt:'Prompt',mode:'constellation',provider,retryOf:null,team},
    activity:{schemaVersion:1,baseSequence:4,entries:[{schemaVersion:1,eventID:'r:4',requestID:'r',conversationID:'chat',sequence:4,kind:'memberCompleted',phase:'contribute',state:'completed',memberID:'member-2',providerID:'two',role:'independentAnswer',summary:'Saved member completion',textDelta:'Not a final answer',error:null}]},
    memberResults:[{schemaVersion:1,memberID:'member-2',providerID:'two',role:'independentAnswer',text:'Saved contribution',truncated:false}],
    resolution:{schemaVersion:1,kind:'leadSynthesis',reviewed:false,reviewerMemberID:'member-1',providerID:'one',summary:'Lead synthesized the answers'},
  }]};
}
test('saved team roles, truncated activity window and accepted contributions project without replacing final answer',()=>{
  const run=parseHostSnapshot(fixture()).runs[0];assert.equal(run.admitted.team.members[1].providerID,'two');assert.equal(run.activity[0].sequence,4);assert.equal(run.memberResults[0].text,'Saved contribution');assert.equal(run.answer,'Canonical final answer');assert.equal(run.resolution.reviewed,false);
});
test('cross-bound, duplicate, out-of-order or private member projections fail closed',()=>{
  const mutations=[f=>{f.runs[0].memberResults[0].providerID='one';},f=>{f.runs[0].memberResults.push({...f.runs[0].memberResults[0]});},f=>{f.runs[0].memberResults[0].role='decide';},f=>{f.runs[0].memberResults[0].privateReceipt='hidden';},f=>{f.runs[0].activity.entries[0].conversationID='other';},f=>{f.runs[0].activity.entries[0].sequence=5;f.runs[0].activity.entries[0].eventID='r:5';},f=>{f.runs[0].resolution.reviewerMemberID='member-2';f.runs[0].resolution.providerID='two';},f=>{f.runs[0].memberResults[0].text='x'.repeat(24*1024+1);}];
  for(const mutate of mutations){const f=fixture();mutate(f);assert.throws(()=>parseHostSnapshot(f));}
});
test('older host can omit detailed projection while retaining the canonical saved answer',()=>{
  const f=fixture();delete f.runs[0].activity;delete f.runs[0].memberResults;delete f.runs[0].resolution;const run=parseHostSnapshot(f).runs[0];assert.equal(run.activity,null);assert.deepEqual(run.memberResults,[]);assert.equal(run.answer,'Canonical final answer');
});
