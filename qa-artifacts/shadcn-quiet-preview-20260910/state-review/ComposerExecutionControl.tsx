import {Button} from '../components/ui/button';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '../components/ui/dropdown-menu';
import {ChevronDown} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ModelCatalog } from '../hooks/workspaceAdapter';
import type { HostSnapshot } from './contracts';
import { configuredTeam, constellationUnavailable, teamRoutes } from './teamConfiguration';
import { composerConfigurationKey, composerSummary, composerProviderLabel, type ComposerConfiguration } from './composerConfiguration';
import './ComposerExecutionControl.css';

export function ComposerExecutionControl({ snapshot, catalog, conversationID, confirmation, disabled, onApply, onReviewConnections, compact=false }: {
  compact?:boolean;
  confirmation?: {confirmedSummary:string;acknowledged:boolean};
  snapshot: HostSnapshot; catalog: ModelCatalog | null; conversationID: string; disabled: boolean;
  onApply: (configuration: ComposerConfiguration) => Promise<void>; onReviewConnections: () => void;
}) {
  const restingSummary=confirmation?.confirmedSummary??composerSummary(snapshot,catalog,conversationID);
  const saved = snapshot.conversations.find(c => c.id === conversationID)!.richDraft;
  const savedKey = composerConfigurationKey(snapshot, catalog, conversationID);
  const [baseKey, setBaseKey] = useState(savedKey);
  const [open, setOpen] = useState(false), [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(saved.team ? 'team' : 'single');
  const [route, setRoute] = useState(saved.team ? '' : saved.selection?.providerID ?? '');
  const [ids, setIDs] = useState(saved.team?.members.map(m => m.providerID) ?? []);
  const [lead, setLead] = useState(saved.team?.members[saved.team.leadIndex]?.providerID ?? '');
  const [notice, setNotice] = useState('');
  const summary = useRef<HTMLElement>(null);
  const previousConfirmation = useRef(confirmation);
  const name = (id: string | null) => composerProviderLabel(catalog, id);
  function loadSaved() {
    setMode(saved.team ? 'team' : 'single'); setRoute(saved.team ? '' : saved.selection?.providerID ?? '');
    setIDs(saved.team?.members.map(m => m.providerID) ?? []); setLead(saved.team?.members[saved.team.leadIndex]?.providerID ?? '');
    setBaseKey(savedKey); setDirty(false); setNotice('');
  }
  useEffect(() => { if (!confirmation && !dirty && baseKey !== savedKey) loadSaved(); }, [savedKey, baseKey, dirty, confirmation]);
  useEffect(() => {
    if(previousConfirmation.current && !confirmation && !saving) loadSaved();
    previousConfirmation.current=confirmation;
  }, [confirmation, saving]);
  function close() { if (saving) return; if(!confirmation)loadSaved(); setOpen(false); (compact?compactTrigger.current:summary.current)?.focus(); }
  const conflict = baseKey !== savedKey;
  const routes = teamRoutes(snapshot, catalog), unavailable = constellationUnavailable(snapshot, catalog);
  const missing = ids.filter(id => !routes.some(p => p.id === id));
  let issue = '';
  let team: ComposerConfiguration['team'] = null;
  if (mode === 'team') {
    try { team = configuredTeam(snapshot, catalog, ids, lead); }
    catch (error) { issue = error instanceof Error ? error.message : 'Review the team.'; }
  } else if (!routes.some(p => p.id === (route || snapshot.selectedProviderID))) issue = 'Choose an available Single AI connection.';
  async function apply() {
    if (disabled || saving || conflict || issue || !catalog) return;
    const selection = team ? team.members[team.leadIndex] : route ? {schemaVersion:1 as const, providerID:route, modelID:null, effortID:null, catalogRevision:catalog.revision} : null;
    setSaving(true); setNotice('');
    try { await onApply({expectedKey:baseKey, selection, team}); setDirty(false); setOpen(false); (compact?compactTrigger.current:summary.current)?.focus(); }
    catch { setNotice('Configuration was not confirmed. Your draft and choices are retained. Review the workspace notice before saving again.'); }
    finally { setSaving(false); }
  }
  const compactTrigger=useRef<HTMLButtonElement>(null);
  const editor=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!compact||!open)return;const frame=requestAnimationFrame(()=>editor.current?.querySelector<HTMLSelectElement>('select')?.focus());return()=>cancelAnimationFrame(frame);},[compact,open]);
  function openEditor(){if(!confirmation)loadSaved();setOpen(true);}
  return <>{compact&&<div className="quiet-execution-toolbar"><DropdownMenu><DropdownMenuTrigger asChild><Button ref={compactTrigger} variant="ghost" size="sm" disabled={disabled} aria-label="Choose execution mode">{saved.team?'Constellation':'Direct'}<ChevronDown aria-hidden="true"/></Button></DropdownMenuTrigger><DropdownMenuContent className="quiet-menu" align="start" onCloseAutoFocus={event=>{if(open)event.preventDefault();}}><DropdownMenuItem onSelect={openEditor}>Configure mode and participants</DropdownMenuItem><DropdownMenuItem onSelect={onReviewConnections}>Review connections</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button variant="ghost" size="sm" disabled={disabled} onClick={openEditor} title={restingSummary}>{name(saved.selection?.providerID??snapshot.selectedProviderID)}<ChevronDown aria-hidden="true"/></Button></div>}<details className="composer-execution" open={open} onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(); } }}>
    <summary hidden={compact} ref={summary} title={restingSummary} onClick={event => { event.preventDefault(); if (open) close(); else { if(!confirmation)loadSaved(); setOpen(true); } }}>{restingSummary}</summary>
    <div ref={editor} className="composer-execution-editor" aria-label="Execution configuration">
      <p>Provider default · exact model not reported</p>
      <p>{confirmation ? 'Configuration not confirmed' : dirty ? 'Not saved' : 'Saved configuration'} · Changes apply to future sends.</p>
      {conflict && <div role="status"><p>Saved configuration or connections changed. Review before saving.</p><button type="button" disabled={disabled || saving} onClick={loadSaved}>Load saved configuration</button><button type="button" disabled={disabled || saving} onClick={() => setBaseKey(savedKey)}>Keep my choices</button></div>}
      <fieldset disabled={disabled || saving}><legend>Execution mode</legend>
        <label>Mode<select aria-label="Execution mode" value={mode} onChange={e => { setMode(e.target.value); setDirty(true); }}><option value="single">Single AI</option><option value="team">Constellation</option></select></label>
        {mode === 'single' ? <>
          <label>Single AI connection<select aria-label="Single AI connection" value={route} onChange={e => { setRoute(e.target.value); setDirty(true); }}>
            <option value="">Workspace default: {name(snapshot.selectedProviderID)}</option>
            {route && !routes.some(p => p.id === route) && <option value={route}>{route} · unavailable</option>}
            {routes.map(p => <option key={p.id} value={p.id}>Pin to: {name(p.id)}</option>)}
          </select></label>
          <p>{route ? 'Pinned to this conversation' : 'Workspace default'} · {name(route || snapshot.selectedProviderID)}</p>
        </> : <>
          <p>Choose 2–6 available connections and a lead to combine their independent answers. {ids.length} selected.</p>
          {unavailable && <p role="status">Constellation is unavailable. Review connections. {unavailable}</p>}
          {routes.map(p => <label key={p.id}><input type="checkbox" aria-label={`Member: ${p.label} (${p.id})`} checked={ids.includes(p.id)} onChange={e => { const checked = e.currentTarget.checked; setDirty(true); setIDs(current => checked ? [...current, p.id] : current.filter(id => id !== p.id)); if (!checked && lead === p.id) setLead(''); }}/><span>{p.label} <small>{p.id}</small></span></label>)}
          {missing.map(id => <label key={id}><input type="checkbox" checked onChange={() => { setDirty(true); setIDs(current => current.filter(value => value !== id)); if (lead === id) setLead(''); }}/><span>{id} · unavailable (uncheck to remove)</span></label>)}
          <label>Lead<select aria-label="Constellation lead" value={lead} onChange={e => { setLead(e.target.value); setDirty(true); }}><option value="">Choose lead</option>{ids.map(id => <option key={id} value={id}>{catalog?.providers.find(p => p.id === id)?.label ?? id} ({id})</option>)}</select></label>
        </>}
      </fieldset>
      {issue && <p role="status">{issue}</p>}
      <p>Availability does not confirm sign-in or a successful response. Saving preserves your draft and sends nothing.</p>
      <div className="composer-execution-actions"><button type="button" disabled={saving} onClick={() => { close(); onReviewConnections(); }}>Review connections</button><button type="button" disabled={disabled || saving || conflict || !!issue || !catalog} onClick={() => void apply()}>{saving ? 'Saving configuration…' : 'Save configuration'}</button><button type="button" disabled={saving} onClick={close}>Cancel configuration</button></div>
      {notice && <p role="status">{notice}</p>}
    </div>
  </details>{confirmation && <p role="status">Configuration not confirmed. Showing the last confirmed configuration. {confirmation.acknowledged ? 'Acknowledgement received; refresh to confirm saved state.' : 'Retry the original draft save to confirm its outcome.'}</p>}</>;
}
