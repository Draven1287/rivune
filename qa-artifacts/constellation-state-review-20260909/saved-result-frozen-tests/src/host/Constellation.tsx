import { SavedResult } from './SavedResult';
import { useEffect, useState } from 'react';
import type { ModelCatalog } from '../hooks/workspaceAdapter';
import type { HostRun, HostSnapshot, HostTeamSelection } from './contracts';
import { constellationUnavailable, teamRoutes } from './teamConfiguration';

export function ConstellationConfiguration({ snapshot, catalog, team, disabled, onApply, onReviewConnections }: { snapshot: HostSnapshot | null; catalog: ModelCatalog | null; team: HostTeamSelection | null; disabled: boolean; onApply: (ids: string[] | null, lead: string) => void; onReviewConnections: () => void }) {
  const [ids, setIDs] = useState(team?.members.map(m => m.providerID) ?? []);
  const [lead, setLead] = useState(team?.members[team.leadIndex]?.providerID ?? '');
  const savedKey = JSON.stringify(team);
  const [baseKey, setBaseKey] = useState(savedKey);
  const [dirty, setDirty] = useState(false);
  const loadSaved = () => { setIDs(team?.members.map(m => m.providerID) ?? []); setLead(team?.members[team.leadIndex]?.providerID ?? ''); setBaseKey(savedKey); setDirty(false); };
  useEffect(() => {
    if (baseKey === savedKey) return;
    const matches = team && JSON.stringify(ids) === JSON.stringify(team.members.map(m => m.providerID)) && lead === team.members[team.leadIndex].providerID && team.members.every(m => m.modelID === null && m.effortID === null);
    if (!dirty || matches) loadSaved();
  }, [savedKey, baseKey, dirty, ids, lead]);
  const conflict = baseKey !== savedKey;
  const routes = teamRoutes(snapshot, catalog), unavailable = constellationUnavailable(snapshot, catalog);
  const missing = ids.filter(id => !routes.some(p => p.id === id));
  const selectionIssue = ids.length < 2 ? 'Select at least two participants, including the lead.' : ids.length > 6 ? 'Select no more than six participants.' : !ids.includes(lead) ? 'Choose a lead from the selected participants.' : missing.length ? 'Remove unavailable providers before saving this team.' : null;
  return <details className="host-team-settings"><summary>{team ? `Constellation · ${team.members.length} participants` : 'Direct chat · team options'}</summary>
    <p>Choose a lead to combine the members’ independent answers. Model and reasoning overrides are unavailable through these connections; each uses its provider-managed defaults.</p>
    <p>The first selected connection is suggested as lead; you can change it. Swarm is not available in this version.</p>
    {unavailable && <div><p role="status">Constellation is unavailable. Review your AI connections.</p><button onClick={onReviewConnections}>Review connections</button><details><summary>Connection details</summary><p>{unavailable}</p></details></div>}
    {conflict && <div role="status"><p>The saved team changed. Review it before saving your choices.</p><button disabled={disabled} onClick={loadSaved}>Load saved team</button><button disabled={disabled} onClick={() => setBaseKey(savedKey)}>Keep my team choices</button></div>}
    <p>Choose 2–6 participants. {ids.length} selected.</p>
    {selectionIssue && <p role="status">{selectionIssue}</p>}
    <fieldset disabled={disabled || !!unavailable}><legend>Team providers</legend>{routes.map(p => <label key={p.id}><input type="checkbox" checked={ids.includes(p.id)} onChange={e => { const checked = e.currentTarget.checked; setDirty(true); setIDs(current => checked ? [...current, p.id] : current.filter(id => id !== p.id)); setLead(current => checked ? current || p.id : current === p.id ? '' : current); }}/><span>{p.label} <small>{p.id} · authentication {p.authentication}</small></span></label>)}
    {missing.map(id => <label key={id}><input type="checkbox" checked onChange={() => { setDirty(true); setIDs(current => current.filter(value => value !== id)); setLead(current => current === id ? '' : current); }}/><span>{id} · unavailable (uncheck to remove)</span></label>)}
    <label>Lead<select aria-label="Constellation lead" value={lead} onChange={e => { setDirty(true); setLead(e.target.value); }}><option value="">Choose lead</option>{ids.map(id => <option key={id} value={id}>{routes.find(p => p.id === id)?.label ?? id} ({id})</option>)}</select></label>
    <button disabled={!!selectionIssue || conflict} onClick={() => onApply(ids, lead)}>Save team configuration</button></fieldset>
    {team && <button disabled={disabled || conflict} onClick={() => { setDirty(false); onApply(null, ''); }}>Use direct chat</button>}
    <p>Saving also preserves the current draft. It does not send a request. Connection availability does not confirm authentication or a successful response.</p>
  </details>;
}

export function ConstellationRun({ run }: { run: HostRun }) {
  if (run.admitted.mode !== 'constellation') return null;
  const team = run.admitted.team;
  const participantLabel = (memberID: string) => {
    const index = team?.members.findIndex((_, i) => `member-${i + 1}` === memberID) ?? -1;
    return index < 0 ? `${memberID} · saved identity unavailable` : `${index === team!.leadIndex ? 'Lead' : 'Member'} · ${team!.members[index].providerID}`;
  };
  const modelLabel = (index: number) => {
    const m = team?.members[index];
    return !m ? 'Saved model identity unavailable' : m.modelID === null ? 'Provider-managed default · resolved model unknown' : `Saved model: ${m.modelID}${m.effortID === null ? '' : ` · effort: ${m.effortID}`}`;
  };
  const terminal = !['queued', 'running'].includes(run.status);
  return <details className="host-team-run"><summary>{run.resolution ? 'Lead synthesis · evidence' : `Constellation · ${run.status}`}</summary>
    {!team ? <p>Saved team details are unavailable.</p> : <ul>{team.members.map((m, i) => {
      const memberID = `member-${i + 1}`;
      const latest = run.activity?.filter(e => e.memberID === memberID).at(-1);
      return <li key={memberID}><strong>{i === team.leadIndex ? 'Lead' : 'Member'} · {m.providerID}</strong><span>{modelLabel(i)}</span><span>{latest ? `${terminal ? 'Last recorded progress: ' : ''}${latest.phase} · ${latest.state}` : 'No saved progress update'}</span>{latest?.error && <p>Saved member issue: {latest.error}</p>}</li>;
    })}</ul>}
    {run.activity?.length ? <p>{terminal ? 'Last recorded update: ' : ''}{run.activity.at(-1)!.summary}</p> : <p>Detailed progress is not available in the saved host record.</p>}
    {run.memberResults.map(result => <details key={result.memberID}><summary>{participantLabel(result.memberID)} · independent answer</summary><p>{modelLabel(team?.members.findIndex((_, i) => `member-${i + 1}` === result.memberID) ?? -1)}</p><p className="host-member-answer">{result.text}</p><SavedResult text={result.text} label={`${participantLabel(result.memberID)} contribution${result.truncated ? ' (shortened by host)' : ''}`}/>{result.truncated && <small>The host shortened this saved member answer.</small>}</details>)}
    {run.answer === null && ['failed', 'cancelled'].includes(run.status) && <p>No final answer was saved. Any saved member answers remain available above.</p>}
    {run.resolution && <p>{run.resolution.summary} Independent member answers were combined by the lead; no separate peer review was run.</p>}
  </details>;
}
