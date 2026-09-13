import { createRoot } from 'react-dom/client';
import { SavedResult } from '../src/host/SavedResult';
import '../src/styles.css';
import './savedResult.fixture.css';

const selected=new URLSearchParams(location.search).getAll('scenario');
const container=document.getElementById('fixture-root')!;
if(selected.length!==1||selected[0]!=='saved-result'){
 container.textContent='No fixture selected. Use ?scenario=saved-result. No checks or clipboard stubs started.';
}else{
 const completed='COMPLETED RESULT A\n  Indentation stays intact.\n```html\n<script>window.__SHOULD_NOT_EXECUTE__ = true;</script>\n<div title="literal">Read as text & preserve symbols</div>\n```\n'+Array.from({length:65},(_,i)=>`Line ${i+1}: ${i===4?'long-code-token-'.repeat(100):'Synthetic saved content for scrolling.'}`).join('\n');
 const partial='PARTIAL RESULT B\nA separate unfinished answer.\n  Keep these spaces.\nNo final completion is claimed.';
 const shortened='SHORTENED MEMBER C\nThis saved independent contribution was shortened by the host.\nIt is distinct from either lead answer.';
 let mode:'deny'|'defer'='deny';let writes=0;let pending:{resolve:()=>void;reject:()=>void}[]=[];
 const report=()=>{const el=document.getElementById('fixture-clipboard-status');if(el)el.textContent=`Stub: ${mode}; writes: ${writes}; pending: ${pending.length}. OS clipboard is never accessed.`;};
 const settle=(success:boolean)=>{const batch=pending;pending=[];batch.forEach(p=>success?p.resolve():p.reject());report();};
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:Object.freeze({writeText:async (_text:string)=>{writes++;report();if(mode==='deny')throw Error('Synthetic clipboard denial');return new Promise<void>((resolve,reject)=>{pending.push({resolve,reject:()=>reject(Error('Synthetic deferred denial'))});report();});}})});
 const key=(event:KeyboardEvent)=>{if(event.altKey&&event.shiftKey&&['KeyR','KeyJ'].includes(event.code)){event.preventDefault();settle(event.code==='KeyR');}};
 window.addEventListener('keydown',key);
 // Keep both isolation and settlement controls for the full document lifetime,
 // including back/forward-cache restoration. Never restore the native clipboard.

 createRoot(container).render(<main className="saved-result-fixture">
  <h1>Synthetic saved-result review</h1><p>Actual SavedResult component and global app stylesheet. No host bridge, provider, persistence, or OS clipboard access.</p>
  <section aria-label="Fixture clipboard controls"><label>Clipboard stub <select defaultValue="deny" onChange={e=>{mode=e.target.value as typeof mode;report();}}><option value="deny">Deny immediately</option><option value="defer">Defer completion</option></select></label><button onClick={()=>settle(true)}>Resolve pending copies</button><button onClick={()=>settle(false)}>Reject pending copies</button><p>While a modal is open: Alt+Shift+R resolves pending copies; Alt+Shift+J rejects them. Close a pending viewer and open another to check stale completion.</p><p id="fixture-clipboard-status" role="status">Stub: deny; writes: 0; pending: 0. OS clipboard is never accessed.</p></section>
  <section><h2>Completed result A</h2><SavedResult text={completed} label="saved answer"/></section>
  <section><h2>Partial result B</h2><SavedResult text={partial} label="saved partial answer"/></section>
  <section><h2>Host-shortened member C</h2><SavedResult text={shortened} label="Member 1 contribution (shortened by host)"/></section>
 </main>);
}
