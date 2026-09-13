import {useState} from 'react';
import type {HostSnapshot,HostProviderConfig} from './contracts';
import type {ModelCatalog} from '../hooks/workspaceAdapter';
import {teamRoutes} from './teamConfiguration';
export function ConversationConnection({snapshot,catalog,conversationID,disabled,onApply,onFollow}:{snapshot:HostSnapshot;catalog:ModelCatalog|null;conversationID:string;disabled:boolean;onApply:(choice:{provider:HostProviderConfig;revision:number;catalogRevision:string})=>Promise<void>;onFollow:(revision:number,defaultID:string|null)=>Promise<void>}){
 const conversation=snapshot.conversations.find(c=>c.id===conversationID)!;
 const [choice,setChoice]=useState<{provider:HostProviderConfig;revision:number;catalogRevision:string}|null>(null);
 const [notice,setNotice]=useState(''),[saving,setSaving]=useState(false);
 const selection=conversation.richDraft.selection,team=conversation.richDraft.team;
 const name=(id:string|null)=>catalog?.providers.find(p=>p.id===id)?.label??id??'None';
 const stale=!!choice&&(choice.revision!==conversation.richDraft.revision||choice.catalogRevision!==catalog?.revision||JSON.stringify(snapshot.providers.find(p=>p.id===choice.provider.id))!==JSON.stringify(choice.provider));
 async function apply(){if(!choice||disabled||saving||stale||team)return;setSaving(true);setNotice('');try{await onApply(choice);setChoice(null);setNotice('Conversation connection saved. Your draft is preserved.');}catch{setNotice('Connection was not confirmed. Your draft is retained. Review the workspace notice or resolve the pending draft save before another change.');}finally{setSaving(false);}}
 async function follow(){if(disabled||saving||team)return;setSaving(true);setNotice('');try{await onFollow(conversation.richDraft.revision,snapshot.selectedProviderID);setChoice(null);setNotice('Now following the workspace default. Your draft is preserved.');}catch{setNotice('Following the default was not confirmed. Review the current settings or resolve the pending draft save.');}finally{setSaving(false);}}
 return <details className="host-team-settings"><summary>Connection · {team?'Constellation team':selection?`Pinned to ${name(selection.providerID)}`:`Workspace default: ${name(snapshot.selectedProviderID)}`}</summary>
 <p>Workspace default: {name(snapshot.selectedProviderID)}. A pinned conversation keeps its own route when this default changes.</p>
 {team?<p>This conversation uses its saved Constellation team. Change participants in Constellation settings; selecting a single route here will not replace the team.</p>:<>
 {selection&&<><button type="button" disabled={disabled||saving||!!selection.modelID||!!selection.effortID} onClick={()=>void follow()}>Follow workspace default</button><p>Future sends use the workspace default at admission, including later changes to that default. Past runs keep their recorded provider.</p></>}
 <label htmlFor="conversation-provider">Pin this conversation to<select id="conversation-provider" disabled={disabled||saving} value={choice?.provider.id??''} onChange={e=>{const p=snapshot.providers.find(p=>p.id===e.target.value);setChoice(p&&catalog?{provider:{...p},revision:conversation.richDraft.revision,catalogRevision:catalog.revision}:null);setNotice('');}}><option value="">Choose a configured connection</option>{teamRoutes(snapshot,catalog).map(p=><option key={p.id} value={p.id}>{p.label} · provider default</option>)}</select></label>
 <p>Saving pins the selected provider default and preserves your current draft. It does not send a message or verify sign-in.</p>
 {stale&&<p role="status">Saved settings changed. Choose the route again to review the latest version.</p>}
 <button type="button" disabled={disabled||saving||!choice||stale} onClick={()=>void apply()}>Save conversation connection</button><p role="status">{notice}</p>
 </>}
 </details>;
}
