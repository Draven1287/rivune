import { useState } from 'react';
import { visibleConversations, type ConversationRow } from './conversationProjection';
import './ConversationList.css';
export function ConversationList({conversations,runs,activeID,disabled,onOpen}:{conversations:readonly ConversationRow[];runs:readonly {conversationID:string;updatedAt:string}[];activeID:string|null|undefined;disabled:boolean;onOpen:(id:string)=>void}){
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState(false);
 const rows=visibleConversations(conversations,runs,activeID,query,expanded),searching=!!query.trim();
 return <div className="host-conversation-list"><label>Search conversations<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles"/></label>
  <nav aria-label="Saved conversations">{rows.map(c=><button type="button" key={c.id} title={c.title} aria-current={activeID===c.id?'page':undefined} disabled={disabled} onClick={()=>onOpen(c.id)}><span>{c.title}</span></button>)}</nav>
  {!searching&&conversations.length===0&&<p>No saved conversations yet.</p>}
  {searching&&<p role="status">{rows.length?`${rows.length} matching conversation${rows.length===1?'':'s'}`:'No matching conversations'}</p>}
  {!searching&&conversations.length>8&&<button type="button" className="conversation-list-toggle" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Show recent':`Show all (${conversations.length})`}</button>}
 </div>;
}
