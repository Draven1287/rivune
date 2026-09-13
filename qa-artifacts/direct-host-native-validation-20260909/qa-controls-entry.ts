
import { createHostWorkspaceController } from '../../prototypes/ai-native-workspace/src/host/workspaceController.ts';
import { createTauriWorkspaceAdapter } from '../../prototypes/ai-native-workspace/src/host/tauriAdapter.ts';
import { createDurableRecoveryJournal } from '../../prototypes/ai-native-workspace/src/host/durableRecovery.ts';
const original = globalThis.__RIVUNE_DESKTOP_HOST__;
const calls = [];
const tracked = new Set(['reserveSubmissionRecovery','submitReservedRun','reconcileRun','cancelRun','clearSubmissionRecovery','beginShutdown','flushShutdownDraft','completeShutdown','abortShutdown','saveRichDraft']);
const bridge = Object.fromEntries(Object.entries(original).map(([name, fn]) => [name, typeof fn !== 'function' || !tracked.has(name) ? fn : async (...args) => {
  calls.push({name,phase:'start',args}); render(calls);
  try { const result=await fn(...args); calls.push({name,phase:'result',result}); render(calls); return result; }
  catch(error){calls.push({name,phase:'error',error:String(error)});render(calls);throw error;}
}]));
globalThis.__RIVUNE_DESKTOP_HOST__ = Object.freeze(bridge);
const panel = document.createElement('details');panel.id='qa-native';panel.open=true;
panel.innerHTML='<summary>ISOLATED NATIVE QA · synthetic executable only</summary><div></div><textarea aria-label="QA evidence" readonly></textarea>';
document.body.append(panel);const output=panel.querySelector('textarea');
function render(value){output.value=JSON.stringify(value,null,2);}
function button(name, fn){const el=document.createElement('button');el.textContent=name;el.onclick=async()=>{try{render(await fn());}catch(e){render({error:String(e)});}};panel.querySelector('div').append(el);}
button('QA configure synthetic', async()=>{await bridge.configureProvider({id:'qa:synthetic-only',kind:'codex',executablePath:"/private/tmp/rivune-recovery-qa-hja6fhqu/codex",model:null,timeoutMs:65000},true);return {configured:"/private/tmp/rivune-recovery-qa-hja6fhqu/codex"};});
button('QA inspect state', async()=>({snapshot:await bridge.getSnapshot(),recovery:await bridge.getSubmissionRecovery()}));
button('QA inspect calls', async()=>calls);
button('QA reserve orphan', async()=>{const s=await bridge.getSnapshot();return await bridge.reserveSubmissionRecovery({requestID:'qa-orphan-'+crypto.randomUUID(),conversationID:s.activeConversationID});});
button('QA terminal retain', async()=>{const s=await bridge.getSnapshot(),c=s.conversations.find(c=>c.id===s.activeConversationID),cat=await bridge.getModelCatalog(); const r=await bridge.saveRichDraft({conversationID:c.id,mutationID:crypto.randomUUID(),expectedRevision:c.richDraft.revision,draft:'QA_TERMINAL_RETAIN',attachmentIDs:[],selection:{schemaVersion:1,providerID:s.selectedProviderID,modelID:null,effortID:null,catalogRevision:cat.revision},team:null});const id=crypto.randomUUID();await bridge.reserveSubmissionRecovery({requestID:id,conversationID:c.id});const result=await bridge.submitReservedRun({id,conversationID:c.id,prompt:'QA_TERMINAL_RETAIN',mode:'direct',richDraftRevision:r.revision});return {result,recovery:await bridge.getSubmissionRecovery()};});
button('QA external draft edit', async()=>{const s=await bridge.getSnapshot(),c=s.conversations.find(c=>c.id===s.activeConversationID);return await bridge.saveRichDraft({conversationID:c.id,mutationID:crypto.randomUUID(),expectedRevision:c.richDraft.revision,draft:'Synthetic external edit for conflict test',attachmentIDs:c.richDraft.attachmentIDs,selection:c.richDraft.selection,team:c.richDraft.team});});
button('QA invalid and duplicate cancel', async()=>{const c=createHostWorkspaceController(createTauriWorkspaceAdapter(bridge,{reservedSubmission:true}),createDurableRecoveryJournal(bridge));await c.start();try{const s=c.getState().snapshot;const active=s.runs.find(r=>r.status==='running'),done=s.runs.find(r=>r.status==='completed');const bad=await Promise.allSettled([c.cancel('qa-unknown'),...(done?[c.cancel(done.id)]:[])]);const result=active?await Promise.allSettled([c.cancel(active.id),c.cancel(active.id)]):[];return {invalid:bad.map(r=>r.status),active:active?.id,result:result.map(r=>r.status),calls};}finally{c.dispose();}});
