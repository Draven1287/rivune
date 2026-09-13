import { useEffect, useRef, useState } from 'react';
import './HostSettings.css';
import { SavedResult } from './SavedResult';
import rivuneMark from '../assets/rivune-icon-128.png';
import { createTauriWorkspaceAdapter } from './tauriAdapter';
import { createHostWorkspaceController, projectHostConversation, type HostControllerState } from './workspaceController';
import { createDurableRecoveryJournal } from './durableRecovery';
import { createHostLifecycleAdapter, createHostLifecycleCoordinator } from './lifecycle';
import { ConversationConnection } from './ConversationConnection';
import { ProviderSetup } from './ProviderSetup';
import { connectionGuidance, connectionStateLabels } from './connectionGuidance';
import { ConstellationConfiguration, ConstellationRun } from './Constellation';

type Controller = ReturnType<typeof createHostWorkspaceController>;
type Lifecycle = ReturnType<typeof createHostLifecycleCoordinator>;
const initial: HostControllerState = { phase: 'hydrating', snapshot: null, catalog: null, pending: null, retry: null, retryNotice: null, error: null, drafts: {} };

/** Desktop renderer has no demo hooks, fixtures, fallback answers or browser draft keys. */
export function HostWorkspace({ bridge }: { bridge: unknown }) {
  const [startup, setStartup] = useState<'checking' | 'ready' | 'recovery' | 'unavailable'>('checking');
  const [exitError, setExitError] = useState(false);
  const statusMethod = bridge && typeof bridge === 'object' ? Object.getOwnPropertyDescriptor(bridge, 'getStartupStatus')?.value : undefined;
  const exitMethod = bridge && typeof bridge === 'object' ? Object.getOwnPropertyDescriptor(bridge, 'exitRecoveryWorkspace')?.value : undefined;
  useEffect(() => {
    let live = true;
    setStartup('checking');
    // Older bridge fixtures still undergo the full adapter validation below.
    if (statusMethod === undefined) { setStartup('ready'); return; }
    void (async () => {
      try {
        if (typeof statusMethod !== 'function') throw new Error('Invalid startup bridge');
        const status = await statusMethod.call(bridge);
        if (!status || typeof status.recoveryRequired !== 'boolean') throw new Error('Invalid startup response');
        if (live) setStartup(status.recoveryRequired ? 'recovery' : 'ready');
      } catch { if (live) setStartup('unavailable'); }
    })();
    return () => { live = false; };
  }, [bridge, statusMethod]);
  if (startup === 'ready') return <ConnectedHostWorkspace bridge={bridge}/>;
  return <main className="host-recovery" aria-labelledby="recovery-title">
    <img src={rivuneMark} alt="" width="40" height="40"/>
    <h1 id="recovery-title">{startup === 'checking' ? 'Opening your workspace…' : startup === 'recovery' ? 'Your saved workspace needs recovery' : 'Workspace connection unavailable'}</h1>
    {startup === 'recovery' && <><p>Rivune could not read the saved workspace. Your original files have been kept for recovery.</p><p>Close Rivune and restore a verified backup before reopening. This screen cannot edit your workspace or run AI tasks.</p><button disabled={typeof exitMethod !== 'function'} onClick={() => { setExitError(false); void Promise.resolve().then(() => exitMethod.call(bridge)).catch(() => setExitError(true)); }}>Close Rivune</button></>}
    {startup === 'unavailable' && <p>The desktop connection could not confirm startup. Close and reopen Rivune to try again.</p>}
    {exitError && <p role="alert">Closing could not be confirmed. Use Quit from the Rivune menu.</p>}
  </main>;
}

function ConnectedHostWorkspace({ bridge }: { bridge: unknown }) {
  const [state, setState] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [shutdown, setShutdown] = useState('idle');
  const [settings, setSettings] = useState(false);
  const [context, setContext] = useState(false);
  const [review, setReview] = useState(false);
  const [working, setWorking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const controller = useRef<Controller | null>(null);
  const lifecycle = useRef<Lifecycle | null>(null);
  const message = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const settingsOpener = useRef<HTMLElement | null>(null);
  function showSettings(opener: HTMLElement | null = message.current) { settingsOpener.current = opener; setSettings(true); }
  useEffect(() => {
    let live = true;
    const adapter = createTauriWorkspaceAdapter(bridge, { reservedSubmission: true });
    const lifeAdapter = createHostLifecycleAdapter(bridge);
    const journal = createDurableRecoveryJournal(bridge);
    if (!adapter || !lifeAdapter || !journal) {
      setState({ ...initial, phase: 'disconnected' });
      setNotice('Desktop connection is incomplete. Reopen the desktop workspace to restore its connection.');
      return;
    }
    const c = createHostWorkspaceController(adapter, journal);
    controller.current = c;
    const unsubscribe = c.subscribe(() => { if (live) setState(c.getState()); });
    const l = createHostLifecycleCoordinator(lifeAdapter, {
      prepareShutdown: async () => c.prepareShutdownDrafts(),
      onDraftFlushed: (input, revision) => c.acknowledgeShutdownDraft(input, revision),
      onOpenSettings: () => { if (live) { setContext(false); showSettings(); } },
      onStateChange: value => { if (live) { setShutdown(value.phase); if (value.phase !== 'idle') setSettings(false); else c.resumeAfterShutdown(); } },
    });
    lifecycle.current = l;
    void (async () => {
      try { await l.start(); if (live) await c.start(); }
      catch { if (live) { setState({ ...initial, phase: 'disconnected' }); setNotice('Desktop lifecycle could not connect. Reopen this workspace before editing.'); } }
    })();
    return () => { live = false; unsubscribe(); l.dispose(); c.dispose(); controller.current = null; lifecycle.current = null; };
  }, [bridge]);
  useEffect(() => {
    if (settings && !dialog.current?.open) dialog.current?.showModal();
    else if (!settings && dialog.current?.open) {
      dialog.current.close();
      requestAnimationFrame(() => { const target = settingsOpener.current; if (target?.isConnected && target.getClientRects().length) target.focus(); else message.current?.focus(); });
    }
  }, [settings]);
  const selected = state.snapshot?.activeConversationID;
  const conversation = selected ? projectHostConversation(state, selected) : null;
  const frozen = shutdown !== 'idle';
  const unavailable = !state.snapshot || state.phase === 'disconnected' || frozen;
  const locked = unavailable || working || !!state.retry || ['hydrating', 'saving', 'submitting'].includes(state.phase);
  const activeRuns = state.snapshot?.runs.filter(run => run.status === 'queued' || run.status === 'running') ?? [];
  const pendingActive = state.pending && activeRuns.some(run => run.id === state.pending!.requestID && run.conversationID === state.pending!.conversationID);
  const provider = state.catalog?.providers.find(p => p.id === (state.snapshot?.conversations.find(c => c.id === selected)?.richDraft.selection?.providerID ?? state.snapshot?.selectedProviderID));
  async function run(action: (c: Controller) => Promise<unknown>, focus = false) {
    if (!controller.current || frozen) return;
    setWorking(true); setNotice(null);
    try { await action(controller.current); if (focus) { setContext(false); requestAnimationFrame(() => message.current?.focus()); } }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Workspace action could not finish. Your edits remain here.'); }
    finally { setWorking(false); }
  }
  async function cancel(requestID: string) {
    if (!controller.current || frozen || cancelling) return;
    setCancelling(true); setNotice(null);
    try { await controller.current.cancel(requestID); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Cancellation was not confirmed.'); }
    finally { setCancelling(false); }
  }
  async function refreshStatus() {
    if (!controller.current || frozen) return;
    try { await controller.current.refreshStatus(); }
    catch { setNotice('Saved status could not be refreshed. Your request remains tracked.'); }
  }
  return <div className="app-shell chat-first theme-orbit host-workspace">
    <header className="app-header"><a className="brand" href="#host-chat"><img className="brand-mark" src={rivuneMark} alt=""/><span>Rivune</span></a><span className="preview-label">Desktop workspace · provider readiness unverified</span></header>
    <nav className="mobile-panel-tabs" aria-label="Workspace panes"><button aria-pressed={context} onClick={() => setContext(true)}>Conversations</button><button aria-pressed={!context} onClick={() => setContext(false)}>Chat</button></nav>
    <div className="host-layout">
      <aside className={`host-sidebar ${context ? 'is-visible' : ''}`} aria-label="Conversations">
        <button disabled={locked || !!state.pending} onClick={() => void run(c => c.createConversation('New conversation'), true)}>New conversation</button>
        <nav>{state.snapshot?.conversations.map(c => <button key={c.id} aria-current={selected === c.id ? 'page' : undefined} disabled={locked || !!state.pending} onClick={() => { setReview(false); void run(controller => controller.openConversation(c.id), true); }}>{c.title}</button>)}</nav>
        <button className="host-settings" disabled={frozen} onClick={event => showSettings(event.currentTarget)}>Settings</button>
      </aside>
      <main id="host-chat" className={`host-chat ${context ? 'is-hidden' : ''}`}>
        <header className="host-chat-header"><h1>{conversation?.title ?? 'Your workspace'}</h1><button disabled={unavailable} onClick={() => void refreshStatus()}>Refresh</button></header>
        {(notice || state.error) && <div className="storage-notice" role="alert">{notice || state.error}</div>}
        {frozen && <div className="storage-notice" role="alert"><p>{shutdown === 'blocked' ? 'Rivune stayed open because closing could not be confirmed. Your drafts remain here.' : 'Saving drafts and closing the workspace…'}</p>{shutdown === 'blocked' && <button onClick={() => { void lifecycle.current?.abort().then(ok => { if (ok) void controller.current?.refresh().catch(() => setNotice('Workspace reopened. Refresh to check saved drafts.')); }); }}>Stay in workspace</button>}</div>}
        {state.pending && <div className="storage-notice" role="status"><p>{pendingActive ? 'The host is working on your saved request. You can cancel it below.' : working ? 'Waiting for the host to confirm this request. Another send is blocked.' : 'The outcome of this request is unresolved. Check the same request before sending again.'}</p>{!working && <button disabled={frozen || cancelling} onClick={() => void run(c => c.reconcile())}>Reconcile request</button>}</div>}
        <section className="host-transcript" aria-label="Conversation" aria-live="polite">
          {!conversation && <p>{state.phase === 'hydrating' ? 'Opening saved workspace…' : state.phase === 'disconnected' ? 'Desktop host unavailable.' : 'Create or choose a conversation to begin.'}</p>}
          {state.snapshot?.runs.filter(r => r.conversationID === selected).map(r => <div key={r.id} className="host-run-group">
            <article><strong>You</strong><p>{r.admitted.prompt}</p></article>
            {r.answer !== null && <article><strong>{r.admitted.mode === 'constellation' && r.admitted.team ? `Rivune · Lead (${r.admitted.team.members[r.admitted.team.leadIndex].providerID})` : 'Rivune'}</strong><p>{r.answer}</p><SavedResult text={r.answer} label={r.status === 'completed' ? 'saved answer' : 'saved partial answer'}/></article>}
            <div className="host-run"><span>{r.status === 'running' ? 'Working' : r.status === 'queued' ? 'Queued' : r.status}</span>{r.error && r.status === 'failed' && <p>Run failed. The saved result and draft remain available.</p>}{['queued', 'running'].includes(r.status) && <button disabled={unavailable || cancelling || state.phase === 'cancelling'} onClick={() => void cancel(r.id)}>Cancel</button>}</div>
            <ConstellationRun run={r}/>
            {r.admitted.mode === 'constellation' && <div className="host-retry" role="group" aria-label="Constellation recovery" tabIndex={-1}>
              {state.retryNotice?.requestID === r.id && <p role="status">{state.retryNotice.message}</p>}
              {state.retry?.requestID === r.id ? <><p role="status">{state.retry.message}</p>{state.retry.phase === 'uncertain' && <button disabled={unavailable || working || cancelling} onClick={() => void run(c => c.reconcileRetry())}>Check retry status</button>}</> : r.status === 'failed' && r.failedInvocationID && r.failedAttemptID && <>
                <p>Retry the saved failed step. Completed answers stay available.</p>
                {controller.current?.supportsInvocationRetry ? <button disabled={unavailable || working || cancelling || conversation?.readOnly || !!state.pending || !!state.retry || !!activeRuns.length} onClick={event => { const region = event.currentTarget.closest<HTMLElement>('.host-retry'); void run(c => c.retryInvocation({ requestID: r.id, invocationID: r.failedInvocationID!, failedAttemptID: r.failedAttemptID! })); region?.focus(); }}>Retry failed step</button> : <p>This host does not expose failed-step retry.</p>}
              </>}
              {r.status === 'failed' && (state.retry?.requestID === r.id || r.failedInvocationID && r.failedAttemptID) && <button disabled={unavailable || cancelling || state.phase === 'cancelling'} onClick={() => void cancel(r.id)}>Cancel recovery</button>}
            </div>}
          </div>)}
        </section>
        {conversation && <section className="host-composer" aria-label="Write a message">
          <ConstellationConfiguration key={conversation.id} snapshot={state.snapshot} catalog={state.catalog} team={state.snapshot?.conversations.find(c => c.id === conversation.id)?.richDraft.team ?? null} disabled={locked || !!state.pending || !!activeRuns.length || conversation.readOnly} onApply={(ids, lead) => void run(c => c.configureTeam(conversation.id, ids, lead))} onReviewConnections={() => showSettings()}/>
          {state.snapshot&&<ConversationConnection key={conversation.id} snapshot={state.snapshot} catalog={state.catalog} conversationID={conversation.id} disabled={locked||!!state.pending||!!activeRuns.length||conversation.readOnly} onFollow={async (revision,defaultID)=>{if(!controller.current)throw Error('Unavailable');await controller.current.followWorkspaceDefault(conversation.id,revision,defaultID);}} onApply={async choice=>{if(!controller.current)throw Error('Unavailable');await controller.current.configureConversationProvider(conversation.id,choice);}}/>}
          <label htmlFor="host-message">Message</label><textarea id="host-message" ref={message} aria-label="Message" value={conversation.draft} readOnly={conversation.readOnly || frozen || unavailable} onChange={event => { try { controller.current?.editDraft(conversation.id, event.target.value); } catch { setNotice('This draft exceeds the supported size. Your previous text is retained.'); } }} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !locked && !state.pending && !activeRuns.length) { event.preventDefault(); void run(c => c.send(conversation.id)); } }}/>
          <div className="host-composer-actions"><span>{provider?.label ?? 'No provider selected'} · provider default</span><button disabled={locked || !!state.pending || conversation.readOnly} onClick={() => void run(c => c.saveDraft(conversation.id))}>Save draft</button><button disabled={locked || !!state.pending || !!activeRuns.length || conversation.readOnly || !conversation.draft.trim()} onClick={() => void run(c => c.send(conversation.id))}>Send</button></div>
          {(state.error || notice) && !state.pending && !frozen && <div className="host-draft-recovery"><button disabled={working} onClick={() => void run(c => c.retryDraftSave(conversation.id))}>Retry draft save</button><button disabled={working} onClick={() => { setReview(true); void run(c => c.refresh()); }}>Review draft conflict</button></div>}
          {review && <div className="host-conflict"><h2>Review saved draft</h2><p>Your text remains in the composer. The host currently has:</p><pre>{state.snapshot?.conversations.find(c => c.id === selected)?.draft || '(empty draft)'}</pre><button disabled={locked || !!state.pending} onClick={() => void run(async c => { await c.keepLocalDraft(conversation.id, state.snapshot?.conversations.find(item => item.id === conversation.id)?.richDraft.revision); setReview(false); })}>Keep my draft</button><p>Keeping your draft prepares it for an explicit save; it does not send a message.</p></div>}
        </section>}
      </main>
    </div>
    <dialog ref={dialog} className="settings-dialog" aria-labelledby="host-settings-title" onCancel={event => { event.preventDefault(); setSettings(false); }}><header><h2 id="host-settings-title">Settings</h2><button className="host-settings-close" aria-label="Close settings" onClick={() => setSettings(false)}><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button></header><section><h3>AI connections</h3><p>Models use the provider’s managed default. Installation alone does not confirm authentication or a successful response.</p>{state.catalog?.providers.map(p => <div key={p.id}><h4>{p.label}</h4><dl><dt>Installation</dt><dd>{connectionStateLabels[p.installation]}</dd><dt>Sign-in</dt><dd>{connectionStateLabels[p.authentication]}</dd><dt>Response test</dt><dd>{connectionStateLabels[p.responseTest]}</dd></dl><p><strong>Next step: </strong>{connectionGuidance(p)}</p></div>)}{!state.catalog?.providers.length && <p>No provider configuration is available. {typeof Object.getOwnPropertyDescriptor(bridge as object, 'configureSelectedProvider')?.value === 'function' && typeof Object.getOwnPropertyDescriptor(bridge as object, 'discoverProviders')?.value === 'function' ? 'Use Add a connection below to inspect installed routes and explicitly save one.' : 'This host does not expose connection configuration in this panel.'}</p>}</section><ProviderSetup bridge={bridge} disabled={locked || !!state.pending || !!activeRuns.length} onConfirmed={async () => { await controller.current?.refresh(); }}/><section><h3>Saved work</h3><p>Host history supplies this conversation. Save drafts before leaving; unresolved requests must be reconciled before another send.</p></section></dialog>
  </div>;
}
