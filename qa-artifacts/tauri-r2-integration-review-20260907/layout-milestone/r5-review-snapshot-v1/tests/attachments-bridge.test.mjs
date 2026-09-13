import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSnapshot, parseRichDraftReceipt, createSubmissionGate } from '../web/core.mjs';

test('attachment bridge freezes camelCase command payloads without renderer paths or file bytes', async () => {
  const calls=[];
  globalThis.__TAURI__={core:{invoke:async(command,args)=>{calls.push({command,args});return {};}}};
  await import(`../web/desktop-host.mjs?r4=${Date.now()}`);
  const host=globalThis.__RIVUNE_DESKTOP_HOST__;
  await host.selectTextAttachments('c1');
  await host.approveTextAttachment('c1','selection','a'.repeat(64));
  await host.inspectTextAttachment('c1','a1','run1');
  await host.validateDraftAttachments('c1',2);
  await host.saveRichDraft({conversationID:'c1',mutationID:'m1',expectedRevision:1,draft:'hello',attachmentIDs:['a1'],selection:null,team:null});
  await host.flushShutdownDraft({token:'q1',conversationID:'c1',draft:'hello',clientRevision:4,expectedRichRevision:2,mutationID:'m2',attachmentIDs:['a1'],selection:null,team:null});
  assert.deepEqual(calls, [
    {command:'select_text_attachments',args:{conversationId:'c1'}},
    {command:'approve_text_attachment',args:{conversationId:'c1',selectionId:'selection',sha256:'a'.repeat(64)}},
    {command:'inspect_text_attachment',args:{conversationId:'c1',attachmentId:'a1',runId:'run1'}},
    {command:'validate_draft_attachments',args:{conversationId:'c1',revision:2}},
    {command:'save_rich_draft',args:{conversationId:'c1',mutationId:'m1',expectedRevision:1,draft:'hello',attachmentIds:['a1'],selection:null,team:null}},
    {command:'flush_shutdown_draft',args:{token:'q1',conversationId:'c1',draft:'hello',clientRevision:4,expectedRichRevision:2,mutationId:'m2',attachmentIds:['a1'],selection:null,team:null}}
  ]);
  assert.equal('saveDraft' in host,false);
  delete globalThis.__TAURI__;delete globalThis.__RIVUNE_DESKTOP_HOST__;
});

test('rich receipts require matching mutation, host revision and attachment order',()=>{
 const request={conversationID:'c1',mutationID:'m1',expectedRevision:3,attachmentIDs:['a','b']};
 const value={state:'durable',conversationID:'c1',mutationID:'m1',revision:4,attachmentIDs:['a','b']};
 assert.equal(parseRichDraftReceipt(value,request).state,'durable');
 for(const change of [{mutationID:'other'},{revision:3},{attachmentIDs:['b','a']},{conversationID:'c2'}])assert.throws(()=>parseRichDraftReceipt({...value,...change},request));
 assert.equal(parseRichDraftReceipt({...value,state:'uncertain'},request).state,'uncertain');
});

test('rich draft metadata stays bound to its conversation',()=>{
 const attachment={attachmentID:'a',conversationID:'c1',displayName:'brief.txt',byteLength:1,sha256:'a'.repeat(64),sourceState:'unchecked'};
 const state={schemaVersion:1,runs:[],conversations:[{id:'c1',title:'One',richDraft:{schemaVersion:1,revision:1,attachmentIDs:['a']}}],attachments:[attachment]};
 assert.equal(parseSnapshot(state),state);
 assert.throws(()=>parseSnapshot({...state,attachments:[{...attachment,conversationID:'c2'}]}));
 assert.throws(()=>parseSnapshot({...state,attachments:[]}));
 assert.throws(()=>parseSnapshot({...state,conversations:[{...state.conversations[0],richDraft:{schemaVersion:1,revision:1,attachmentIDs:['a','a']}}]}));
});

test('attached submission preserves saved prompt bytes and revision',async()=>{
 let admitted;
 const gate=createSubmissionGate({submitRun:async request=>{admitted=request;return {state:'accepted',requestID:request.id};}});
 await gate.submit({id:'run',conversationID:'c1',prompt:'  exact text\n',richDraftRevision:7});
 assert.equal(admitted.prompt,'  exact text\n');assert.equal(admitted.richDraftRevision,7);
});
