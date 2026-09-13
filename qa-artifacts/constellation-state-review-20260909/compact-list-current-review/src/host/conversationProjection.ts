export interface ConversationRow {id:string;title:string}
/** Projection only: host history is never sorted or edited in place. */
export function visibleConversations<T extends ConversationRow>(conversations:readonly T[],runs:readonly {conversationID:string;updatedAt:string}[],activeID:string|null|undefined,query:string,expanded:boolean):T[]{
 const latest=new Map<string,number>();for(const run of runs){const time=Date.parse(run.updatedAt);if(Number.isFinite(time))latest.set(run.conversationID,Math.max(latest.get(run.conversationID)??0,time));}
 const ordered=conversations.map((value,index)=>({value,index})).sort((a,b)=>(latest.get(b.value.id)??0)-(latest.get(a.value.id)??0)||b.index-a.index).map(item=>item.value);
 const search=query.trim().toLocaleLowerCase();if(search)return ordered.filter(c=>c.title.toLocaleLowerCase().includes(search));
 if(expanded)return ordered;
 const recent=ordered.slice(0,8),active=conversations.find(c=>c.id===activeID);
 if(active&&!recent.some(c=>c.id===active.id))return [...recent.slice(0,7),active];
 return recent;
}
