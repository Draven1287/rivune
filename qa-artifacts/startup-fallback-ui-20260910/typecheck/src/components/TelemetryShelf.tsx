import { useEffect, useRef, useState } from 'react';
import type { Agent, Artifact, DemoExecutionStep, Telemetry, TerminalSession } from '../types';

export function TelemetryShelf({ terminals, agents, telemetry, steps, artifacts, onOpenArtifact }: { terminals: TerminalSession[]; agents: Agent[]; telemetry: Telemetry; steps: DemoExecutionStep[]; artifacts: Artifact[]; onOpenArtifact: (id: string) => void }) {
  const [open, setOpen] = useState(() => { try { return localStorage.getItem('rivune-demo-shelf') === 'open'; } catch { return false; } });
  const [tab, setTab] = useState<'terminal' | 'activity' | 'metrics'>('activity');
  const [selectedStepId, setSelectedStepId] = useState(steps[0]?.id || '');
  const selectedStep = steps.find(step => step.id === selectedStepId) || steps[0];
  const selectedArtifact = artifacts.find(artifact => artifact.id === selectedStep?.artifactId);
  function toggle() { const next = !open; setOpen(next); try { localStorage.setItem('rivune-demo-shelf', next ? 'open' : 'closed'); } catch { /* Optional persistence. */ } }
  const [shortWindow, setShortWindow] = useState(() => window.matchMedia('(max-height: 650px)').matches);
  const drawer = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(max-height: 650px)');
    const update = () => setShortWindow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (shortWindow && open && drawer.current && !drawer.current.open) drawer.current.showModal();
    if ((!shortWindow || !open) && drawer.current?.open) drawer.current.close();
  }, [shortWindow, open]);
  function closeDrawer() { setOpen(false); try { localStorage.setItem('rivune-demo-shelf', 'closed'); } catch { /* Optional persistence. */ } }
  const contents = <div id="telemetry-content" className="shelf-content"><div className="shelf-tabs" role="tablist" aria-label="Telemetry views">{(['activity', 'terminal', 'metrics'] as const).map(value => <button key={value} id={`shelf-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="shelf-panel" tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => {
      const tabs = ['activity', 'terminal', 'metrics'] as const;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.indexOf(value);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
      setTab(tabs[next]); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>{value === 'activity' ? 'Team activity' : value === 'terminal' ? 'Terminal' : 'Usage & performance'}</button>)}</div><div className="shelf-panel" id="shelf-panel" role="tabpanel" aria-labelledby={`shelf-tab-${tab}`} tabIndex={0}>
      {tab === 'activity' && <div className="timeline-view">
        <ol className="execution-timeline" aria-label="Demo execution timeline">{steps.map((step, index) => <li key={step.id}><button aria-pressed={selectedStep?.id === step.id} aria-controls="step-inspector" onClick={() => setSelectedStepId(step.id)} onKeyDown={event => {
          if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
          event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + steps.length) % steps.length;
          setSelectedStepId(steps[next].id); event.currentTarget.closest('ol')?.querySelectorAll<HTMLButtonElement>('li>button')[next]?.focus();
        }}><span className="step-number">0{index + 1}</span><span><strong>{step.label}</strong><span className="step-meta">{agents.find(agent => agent.id === step.agentId)?.name || step.agentId} · {step.status}</span></span><span className={`step-state state-${step.status}`} aria-hidden="true"/></button></li>)}</ol>
        {selectedStep && <section id="step-inspector" className="step-inspector" aria-label={`${selectedStep.label} details`}><div className="step-io"><div><span>INPUT</span><p>{selectedStep.inputSummary}</p></div><span className="flow-arrow" aria-hidden="true">→</span><div><span>OUTPUT</span><p>{selectedStep.outputSummary || 'No output yet.'}</p></div></div><div className="step-dependencies"><span>Depends on</span>{selectedStep.dependsOn.length ? selectedStep.dependsOn.map(id => <button key={id} onClick={() => setSelectedStepId(id)}>{steps.find(step => step.id === id)?.label || id}</button>) : <span>No earlier step</span>}{selectedArtifact?.fileId && <button className="artifact-jump" onClick={() => { if (shortWindow) closeDrawer(); onOpenArtifact(selectedArtifact.id); }}>Open {selectedArtifact.title} ↗</button>}</div></section>}
        <p className="telemetry-disclaimer">Demo steps and dependencies · observable activity, not private model reasoning.</p>
      </div>}
      {tab === 'terminal' && <div className="terminal-grid">{terminals.map(terminal => <section key={terminal.id}><h3>{terminal.title} <span>Read-only demo</span></h3><pre>{terminal.lines.join('\n')}</pre></section>)}</div>}
      {tab === 'metrics' && <div className="metrics-grid"><div><span>Tokens / second</span><strong>Unavailable</strong></div><div><span>Token usage</span><strong>Unavailable</strong></div><div><span>Estimated cost</span><strong>Unavailable</strong></div><p>No provider is connected. Numeric metrics require measured provider events. Current data source: {telemetry.source}.</p></div>}
    </div></div>;
  return <section className={`telemetry-shelf ${open ? 'is-open' : ''}`} aria-label="Workspace telemetry">
    <div className="shelf-toolbar"><button className="shelf-toggle" aria-expanded={open} aria-controls="telemetry-content" onClick={toggle}><span aria-hidden="true">{open ? '⌄' : '⌃'}</span> Activity & terminal</button><span className="shelf-summary"><span className="status-dot"/>{agents.length} demo agents<span className="divider">/</span>Usage unavailable</span><span className="quiet-badge">Local demo</span></div>
    
    {!shortWindow && open && contents}
    {shortWindow && <dialog ref={drawer} className="activity-drawer" aria-labelledby="activity-drawer-title" onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(control => control.getClientRects().length && control.tabIndex >= 0);
      const first = controls[0], last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }} onCancel={event => { event.preventDefault(); closeDrawer(); }}><header><div><span className="eyebrow">LOCAL DEMO</span><h2 id="activity-drawer-title">Activity & inspection</h2></div><button onClick={closeDrawer} aria-label="Close activity inspector">✕</button></header>{contents}</dialog>}
  </section>;
}
