import { useId, useLayoutEffect, useRef, useState } from 'react';
import type { HostArtifactSummary } from './contracts';
import { createSavedResultCopy } from './savedResultCopy';
import { tuple, type InspectionState } from './inspectionSession';
import './ResultsPane.css';

/** Values MUST be derived from the matching frozen run, never current composer state. */
export interface FrozenRunLabel { mode:'single'|'constellation'; completed:boolean }
export interface ResultsPaneProps {
 records: readonly HostArtifactSummary[];
 state: InspectionState;
 runLabels: Readonly<Record<string,FrozenRunLabel>>;
 onSelect:(record:HostArtifactSummary)=>void;
 onRetry:()=>void;
 onBack:()=>void;
 /** Owner clears session and restores header opener (chat heading fallback). */
 onClose:()=>void;
 notice?:string;
}
function origin(a:HostArtifactSummary,run?:FrozenRunLabel){
 if(a.origin.kind==='memberAnswer')return `Member contribution · ${a.origin.memberID}`;
 if(!run)return 'Saved result'; // Integration requires matching frozen run labels.
 return run.mode==='constellation' ? (run.completed?'Lead synthesis':'Partial lead synthesis') : (run.completed?'Saved answer':'Saved partial answer');
}
function provider(a:HostArtifactSummary){return a.origin.providerID===null?'Provider not recorded':`Provider ID: ${a.origin.providerID}`;}
export function ResultsPane({records,state,runLabels,onSelect,onRetry,onBack,onClose,notice}:ResultsPaneProps){
 const title=useId(),heading=useRef<HTMLHeadingElement>(null),rows=useRef(new Map<string,HTMLButtonElement>());
 const backTarget=useRef<string|null>(null),previous=useRef<string|null>(null);
 const selected=state.phase==='list'?null:state.selected;
 const key=selected?tuple(selected):'list';
 useLayoutEffect(()=>{
  if(previous.current===key)return;
  if(key==='list'&&backTarget.current){(rows.current.get(backTarget.current)??heading.current)?.focus();backTarget.current=null;}
  else heading.current?.focus();
  previous.current=key;
 },[key]);
 const older=new Set(records.flatMap(a=>a.supersedesArtifactID?[a.supersedesArtifactID]:[]));
 function description(a:HostArtifactSummary){return [origin(a,runLabels[a.requestID]),provider(a),`saved ${a.createdAt}`,older.has(a.artifactID)?'Earlier saved version':'',a.supersedesArtifactID?'Newer saved version':'',a.origin.kind==='memberAnswer'&&runLabels[a.requestID]&&!runLabels[a.requestID].completed?'Run incomplete':''].filter(Boolean).join(', ');}
 return <aside id="host-results" className="host-results" aria-labelledby={title} onKeyDown={e=>{
  if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();e.stopPropagation();onClose();}
 }}>
  <header className="host-results-header">
   {selected&&<button type="button" onClick={()=>{backTarget.current=selected.artifactID;onBack();}}>Back to results</button>}
   <h2 ref={heading} tabIndex={-1} id={title}>{selected?selected.displayName:'Results'}</h2>
   <button type="button" onClick={onClose}>Close results</button>
  </header>
  {notice&&<p role="status">{notice}</p>}
  {selected?<>
   <p>{description(selected)}</p>
   <details><summary>Details</summary><dl>
    <dt>Saved at</dt><dd>{selected.createdAt}</dd><dt>Run ID</dt><dd>{selected.requestID}</dd>
    <dt>Artifact ID</dt><dd>{selected.artifactID}</dd><dt>SHA-256</dt><dd>{selected.contentSHA256}</dd>
    <dt>Size (UTF-8 bytes)</dt><dd>{selected.byteLength}</dd>
    {selected.origin.providerID!==null&&<><dt>Provider ID</dt><dd>{selected.origin.providerID}</dd></>}
   </dl></details>
   {state.phase==='loading'&&<p role="status">Opening saved result…</p>}
   {state.phase==='error'&&<div><p role="alert">Could not open this saved result. Try again.</p><button type="button" onClick={()=>{heading.current?.focus();onRetry();}}>Retry inspection</button><p>This retries opening the saved text. It does not send another AI request.</p></div>}
   {state.phase==='ready'&&<ExactText key={key} text={state.result.text}/>}
  </>:records.length===0?<div><p>No saved results yet.</p><p>Results will appear here after Rivune saves an answer or contribution.</p></div>:<>
   <p>Choose a saved result to inspect.</p>
   <ul>{[...records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.artifactID.localeCompare(b.artifactID)).map(a=><li key={a.artifactID}>
    <button type="button" ref={node=>{if(node)rows.current.set(a.artifactID,node);else rows.current.delete(a.artifactID);}} aria-label={`${a.displayName}, ${description(a)}, ${a.artifactID}`} onClick={()=>onSelect(a)}><strong>{a.displayName}</strong><span>{description(a)}</span></button>
   </li>)}</ul>
  </>}
 </aside>;
}
function ExactText({text}:{text:string}){
 const field=useRef<HTMLTextAreaElement>(null),session=useRef(createSavedResultCopy());
 const [copying,setCopying]=useState(false),[status,setStatus]=useState('');
 useLayoutEffect(()=>{const current=session.current;current.open(text);return()=>current.close();},[text]);
 async function copy(){await session.current.copy(async value=>{if(!navigator.clipboard?.writeText)throw Error('Unavailable');await navigator.clipboard.writeText(value);},next=>{
  setCopying(next==='copying');setStatus(next==='copied'?'Copied saved text.':next==='failed'?'Clipboard access failed. Select the text below and copy it manually.':'');
  if(next==='failed'){field.current?.focus();field.current?.select();}
 });}
 return <div className="host-results-text"><textarea ref={field} aria-label="Saved result text" value={text} readOnly spellCheck={false} wrap="off"/>
  <div className="host-results-actions"><button type="button" disabled={copying} onClick={()=>void copy()}>{copying?'Copying…':'Copy saved text'}</button><button type="button" onClick={()=>{field.current?.focus();field.current?.select();}}>Select all text</button></div><p role="status">{status}</p>
 </div>;
}
