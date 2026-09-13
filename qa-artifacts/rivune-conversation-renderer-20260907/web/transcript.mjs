import { renderMarkdown } from './markdown.mjs';
const STATES = new Set(['queued','running','completed','failed','cancelled']);

// R2 stores runs by admission order; completion timestamps must not reorder dialogue.
// Keep this projection explicit. Neither provider config nor approved private context is rendered.
export function projectConversation(snapshot, conversationID) {
  if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.conversations) || !Array.isArray(snapshot.runs)) throw new Error('Conversation history is unavailable.');
  const conversation=snapshot.conversations.find(c=>c.id===conversationID);
  if (!conversation) throw new Error('This conversation is unavailable.');
  const ids=new Set();
  const rows=snapshot.runs.filter(r=>r.conversationID===conversationID).map(run=>{
    if(typeof run.id!=='string'||!run.id||ids.has(run.id)||!STATES.has(run.status)||typeof run.admitted?.prompt!=='string'||run.admitted.conversationID!==conversationID||run.admitted.requestID!==run.id)throw new Error('A conversation record is unreadable.');
    if(run.answer!=null&&typeof run.answer!=='string'||run.error!=null&&typeof run.error!=='string')throw new Error('A conversation response is unreadable.');
    ids.add(run.id);
    const provider=run.admitted.provider;
    return Object.freeze({id:run.id,conversationID,prompt:run.admitted.prompt,status:run.status,answer:run.answer??null,error:run.error??null,retryOf:typeof run.admitted.retryOf==='string'?run.admitted.retryOf:null,providerLabel:provider?.kind==='codex'?'Codex':provider?.kind==='claude'?'Claude':provider?.kind==='fixture'?'Test fixture':'AI',model:typeof provider?.model==='string'?provider.model:null});
  });
  return Object.freeze({id:conversationID,title:conversation.title,rows:Object.freeze(rows)});
}

export function createTranscript({container,scroller=container,copyText,openExternal,onStatus=()=>{}}) {
  const document=container.ownerDocument;
  const nodes=new Map(),positions=new Map();let current=null;
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
  container.setAttribute('aria-label','Conversation messages');
  // Only concise changes are announced; a polling refresh never re-announces the full transcript.
  const notify=message=>onStatus(message);
  function mergeContent(old,node){
    if(old.isEqualNode(node)) return;
    if(old.nodeType===3&&node.nodeType===3&&node.data.startsWith(old.data)){
      old.appendData(node.data.slice(old.data.length));return;
    }
    const sameAttributes=old.nodeType===1&&node.nodeType===1&&old.tagName===node.tagName&&old.attributes.length===node.attributes.length&&[...old.attributes].every(a=>node.getAttribute(a.name)===a.value);
    if(sameAttributes&&!old.matches('button')&&!old.querySelector('button')&&!node.querySelector('button')){
      const incoming=[...node.childNodes];
      incoming.forEach((child,index)=>{const previous=old.childNodes[index];if(previous)mergeContent(previous,child);else old.append(child)});
      while(old.childNodes.length>incoming.length)old.lastChild.remove();
      return;
    }
    const controls=old.nodeType===1?[...old.querySelectorAll('button,[tabindex="0"]')]:[];
    const focused=controls.find(control=>control===document.activeElement);
    const identity=control=>JSON.stringify([control.tagName,control.getAttribute('role'),control.title,control.textContent,control.closest('.code-block')?.querySelector('code')?.textContent??null]);
    const targetIdentity=focused?identity(focused):null;
    const fallback=old.closest?.('.response-content');
    old.replaceWith(node);
    if(focused){
      const match=[...node.querySelectorAll('button,[tabindex="0"]')].find(control=>identity(control)===targetIdentity);
      (match??fallback)?.focus({preventScroll:true});
    }
  }
  function create(row){
    const node=el('article');node.className='transcript-turn';node.dataset.runId=row.id;
    const user=el('section');user.className='user-message';user.setAttribute('aria-label','Your message');const prompt=el('p');user.append(prompt);
    const assistant=el('section');assistant.className='assistant-message';assistant.setAttribute('aria-label','AI response');
    const header=el('div');header.className='message-header';const provider=el('strong'),state=el('span');state.className='message-state';header.append(provider,state);
    const response=el('div'),error=el('p');response.className='response-content';response.tabIndex=-1;response.setAttribute('aria-label','AI response content');error.className='message-error';
    const footer=el('div');footer.className='message-footer';const retry=el('span');retry.className='retry-note';footer.append(retry);
    assistant.append(header,response,error,footer);node.append(user,assistant);
    return {node,prompt,provider,state,response,error,footer,retry,answer:null,status:null,signature:null};
  }
  function update(entry,row){
    const signature=JSON.stringify(row);if(signature===entry.signature)return false;
    if(entry.prompt.textContent!==row.prompt)entry.prompt.textContent=row.prompt;
    const provider=row.providerLabel+(row.model?` · ${row.model}`:'');if(entry.provider.textContent!==provider)entry.provider.textContent=provider;
    const labels={queued:'Queued',running:row.answer?'Responding · partial answer':'Working…',completed:row.answer?.trim()?'Complete':'Finished without an answer',failed:row.answer?'Failed · partial answer':'Failed',cancelled:row.answer?'Stopped · partial answer':'Stopped'};
    entry.state.textContent=labels[row.status];entry.node.dataset.state=row.status;
    if(entry.answer!==row.answer){
      if(!row.answer) entry.response.replaceChildren();
      else {
        const fresh=renderMarkdown(row.answer,{document,copyText,openExternal,report:notify});
        const existing=entry.response.firstElementChild;
        if(!existing) entry.response.append(fresh);
        else {
          // Keep identical blocks and their focus/selection/listeners when a later chunk arrives.
          const incoming=[...fresh.childNodes];
          incoming.forEach((node,index)=>{
            const old=existing.childNodes[index];
            if(old) mergeContent(old,node); else existing.append(node);
          });
          while(existing.childNodes.length>incoming.length) existing.lastChild.remove();
        }
      }
      entry.answer=row.answer;
    }
    const error=row.error||(row.status==='failed'?'The task failed without an error message.':row.status==='cancelled'?'The task was stopped. Any partial response is shown above.':row.status==='completed'&&!row.answer?.trim()?'The provider finished without returning an answer.':'');
    if(entry.error.textContent!==error)entry.error.textContent=error;entry.error.hidden=!error;
    entry.retry.textContent=row.retryOf?'Retry of an earlier request':'';entry.retry.hidden=!row.retryOf;
    if(entry.status!==null&&entry.status!==row.status)notify(`${row.providerLabel}: ${labels[row.status]}.`);
    entry.status=row.status;entry.signature=signature;return true;
  }
  return {
    render(snapshot,conversationID){
      // Validate the whole projection before touching the previous visible history.
      const conversation=projectConversation(snapshot,conversationID);
      const switching=current!==conversationID;
      if(switching){if(current!==null)positions.set(current,scroller.scrollTop);container.replaceChildren();nodes.clear();current=conversationID;}
      const nearBottom=scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<64;
      const activeIDs=new Set(conversation.rows.map(r=>r.id));
      for(const [id,entry] of nodes)if(!activeIDs.has(id)){entry.node.remove();nodes.delete(id)}
      let changed=switching;
      conversation.rows.forEach((row,index)=>{
        let entry=nodes.get(row.id);if(!entry){entry=create(row);nodes.set(row.id,entry);changed=true;}
        changed=update(entry,row)||changed;
        const at=container.children[index];if(at!==entry.node)container.insertBefore(entry.node,at??null);
      });
      container.hidden=conversation.rows.length===0;
      if(switching)scroller.scrollTop=positions.get(conversationID)??scroller.scrollHeight;
      else if(changed&&nearBottom)scroller.scrollTop=scroller.scrollHeight;
      return conversation;
    },
    dispose(){nodes.clear();positions.clear();container.replaceChildren();current=null;}
  };
}
