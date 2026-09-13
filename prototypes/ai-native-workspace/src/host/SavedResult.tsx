import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import './SavedResult.css';
import { createSavedResultCopy } from './savedResultCopy';

/** Inspection captures one saved answer, never the latest run or an executable preview. */
export function SavedResult({text,label}:{text:string;label:string}) {
 const dialog=useRef<HTMLDialogElement>(null),field=useRef<HTMLTextAreaElement>(null),opener=useRef<HTMLButtonElement>(null);
 const [snapshotLabel,setSnapshotLabel]=useState(label);
 const [snapshot,setSnapshot]=useState(''),[status,setStatus]=useState(''),[copying,setCopying]=useState(false);
 const session=useRef(createSavedResultCopy()),title=useId();
 useEffect(()=>()=>session.current.close(),[]);
 function trapTab(event:KeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;
  const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button, textarea, input, select, a[href], [tabindex]')].filter(el=>el.tabIndex>=0&&!el.matches(':disabled')&&el.getClientRects().length>0);
  const first=controls[0],last=controls.at(-1);if(!first||!last)return;
  const active=document.activeElement;
  if(!controls.includes(active as HTMLElement)||(event.shiftKey&&active===first)||(!event.shiftKey&&active===last)){
   event.preventDefault();(event.shiftKey?last:first).focus();
  }
 }
 function close(){session.current.close();setCopying(false);dialog.current?.close();opener.current?.focus();}
 async function copy(){await session.current.copy(async value=>{if(!navigator.clipboard?.writeText)throw Error('Unavailable');await navigator.clipboard.writeText(value);},state=>{
  setCopying(state==='copying');setStatus(state==='copied'?'Copied saved text.':state==='failed'?'Clipboard access failed. Select the text below and copy it manually.':'');
  if(state==='failed'){field.current?.focus();field.current?.select();}
 });}
 return <><button ref={opener} type="button" onClick={()=>{session.current.open(text);setSnapshotLabel(label);setSnapshot(text);setStatus('');setCopying(false);dialog.current?.showModal();}}>Inspect {label}</button>
  <dialog className="saved-result-dialog" ref={dialog} aria-labelledby={title} onKeyDown={trapTab} onCancel={e=>{e.preventDefault();close();}}>
   <header><h2 id={title}>{snapshotLabel}</h2><button type="button" aria-label="Close saved result" onClick={close}>Close</button></header>
   <p>Saved text captured when you opened this result. Content is displayed as text and is not executed.</p>
   <textarea ref={field} aria-label="Saved result text" value={snapshot} readOnly spellCheck={false}/>
   <footer><button type="button" disabled={copying} onClick={()=>void copy()}>{copying?'Copying…':'Copy saved text'}</button><button type="button" onClick={()=>{field.current?.focus();field.current?.select();}}>Select all text</button></footer>
   <p role="status">{status}</p>
  </dialog></>;
}
