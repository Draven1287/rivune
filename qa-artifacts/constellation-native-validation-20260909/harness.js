// Build-only synthetic fixture driver. Never copied into production frontend.
const b = globalThis.__RIVUNE_DESKTOP_HOST__;
const trace = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function check(value, message) { if (!value) throw new Error(message); }
async function runFixture() {
  const initial = await b.getSnapshot();
  if (initial.runs.length || initial.conversations.some(c => c.id === 'qa-evidence')) return;
  try {
    for (const id of ['qa:team-first', 'qa:team-second']) await b.configureProvider({id,kind:'codex',executablePath:FIXTURE_PATH,model:null,timeoutMs:600000},true);
    const catalog = await b.getModelCatalog();
    const members = ['qa:team-first', 'qa:team-second'].map(providerID => ({schemaVersion:1,providerID,modelID:null,effortID:null,catalogRevision:catalog.revision}));
    const team = {schemaVersion:1,leadIndex:1,members};
    const saved = await b.saveRichDraft({conversationID:'welcome',mutationID:'qa-team-draft',expectedRevision:0,draft:'Synthetic Council partial cancellation validation',attachmentIDs:[],selection:members[1],team});
    check(saved.state === 'durable', 'Team save not durable');
    trace.push({phase:'saved',team,revision:saved.revision});
    const id = 'qa-team-partial-cancel';
    await b.reserveSubmissionRecovery({requestID:id,conversationID:'welcome'});
    const submitting = b.submitReservedRun({id,conversationID:'welcome',prompt:'Synthetic Council partial cancellation validation',mode:'constellation',richDraftRevision:saved.revision});
    let partial;
    for (let n=0;n<200;n++) {
      const snapshot = await b.getSnapshot();const run = snapshot.runs.find(r=>r.id===id);
      if (run?.memberResults?.length === 1 && run.status === 'running') {partial=run;break;}
      if (run && !['queued','running'].includes(run.status)) throw new Error('Run terminated before partial observation: '+JSON.stringify(run));
      await pause(100);
    }
    check(partial, 'No bounded partial contribution observed');
    check(partial.admitted.team?.schemaVersion===1 && partial.admitted.team.leadIndex===team.leadIndex && partial.admitted.team.members.length===members.length && members.every((m,n)=>Object.entries(m).every(([k,v])=>partial.admitted.team.members[n][k]===v)), 'Admitted team drifted');
    check(partial.admitted.provider.id==='qa:team-second','Admitted lead drifted');
    trace.push({phase:'partial',run:partial});
    const cancelled = await b.cancelRun(id);trace.push({phase:'cancel',receipt:cancelled});
    const submitted = await submitting;trace.push({phase:'submitSettled',receipt:submitted});
    const snapshot = await b.getSnapshot();const terminal = snapshot.runs.find(r=>r.id===id);
    check(terminal?.status==='cancelled','Terminal run not cancelled');
    check(terminal.answer===null && terminal.memberResults?.length===1,'Partial answer/final projection incorrect');
    trace.push({phase:'terminal',run:terminal});
    const recovery = await b.getSubmissionRecovery();
    if(recovery?.requestID===id) await b.clearSubmissionRecovery({requestID:id,conversationID:'welcome'});
    trace.push({phase:'passed'});
  } catch(error) { trace.push({phase:'failed',error:String(error)}); }
  await b.createConversation({id:'qa-evidence',title:'Synthetic QA evidence'});
  await b.saveRichDraft({conversationID:'qa-evidence',mutationID:'qa-evidence-draft',expectedRevision:0,draft:JSON.stringify(trace),attachmentIDs:[],selection:null,team:null});
  await b.openConversation('welcome');
}
void runFixture();
