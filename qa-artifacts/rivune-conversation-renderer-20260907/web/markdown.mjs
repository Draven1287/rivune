import { Lexer } from './vendor/marked.esm.js';

export function safeExternalURL(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// Marked is used only as a lexer. No generated HTML is inserted into the document.
export function renderMarkdown(source, { document, copyText, openExternal, report = () => {} }) {
  const text = typeof source === 'string' ? source : '';
  const el = (tag, value) => { const node = document.createElement(tag); if (value !== undefined) node.textContent = value; return node; };
  const result = el('div'); result.className = 'markdown';
  const decode = value => String(value).replace(/&(?:#[0-9]{1,8}|#x[0-9a-fA-F]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/g, entity => {
    // Only the matched entity spelling reaches this sink; it cannot contain markup.
    const decoder = el('textarea'); decoder.innerHTML = entity; return decoder.value;
  });
  function link(token, parent, image = false) {
    const url = safeExternalURL(decode(token.href));
    const label = image ? `Image: ${token.text || 'linked image'}` : decode(token.text || token.href);
    if (!url || typeof openExternal !== 'function') {
      parent.append(el('span', label + (url ? ` (${url})` : ''))); return;
    }
    const anchor = el('button'); anchor.type = 'button'; anchor.className = 'external-link'; anchor.setAttribute('role', 'link'); anchor.title = url;
    if (image) anchor.textContent = label; else inline(token.tokens ?? [{type:'text',text:label}], anchor, 0, true);
    anchor.addEventListener('click', event => {
      event.preventDefault();
      Promise.resolve().then(() => openExternal(url)).catch(() => report('Could not open this link.'));
    });
    parent.append(anchor);
  }
  function inline(tokens, parent, depth = 0, insideLink = false) {
    if (depth > 48) { parent.append(document.createTextNode(tokens.map(t => t.raw ?? t.text ?? '').join(''))); return; }
    for (const t of tokens) {
      if (['strong','em','del'].includes(t.type)) { const node=el(t.type); inline(t.tokens??[],node,depth+1,insideLink);parent.append(node); }
      else if (t.type==='codespan') parent.append(el('code',t.text));
      else if (t.type==='br') parent.append(el('br'));
      else if (t.type==='link'||t.type==='image') { if(insideLink)parent.append(document.createTextNode(decode(t.text||'Image')));else link(t,parent,t.type==='image'); }
      else if (t.type==='html') parent.append(document.createTextNode(t.raw ?? t.text ?? ''));
      else if (t.tokens) inline(t.tokens,parent,depth+1,insideLink);
      else parent.append(document.createTextNode(t.type==='escape' ? t.text : decode(t.text??t.raw??'')));
    }
  }
  function blocks(tokens, parent, depth = 0) {
    if (depth > 48) { parent.append(el('pre',tokens.map(t=>t.raw??'').join(''))); return; }
    for (const t of tokens) {
      if (t.type==='space'||t.type==='def') continue;
      if (t.type==='heading') { const node=el(`h${Math.min(6,Math.max(2,t.depth+1))}`);inline(t.tokens,node);parent.append(node); }
      else if (t.type==='paragraph'||t.type==='text') { const node=el('p');inline(t.tokens??[{type:'text',text:t.text}],node);parent.append(node); }
      else if (t.type==='blockquote') { const node=el('blockquote');blocks(t.tokens,node,depth+1);parent.append(node); }
      else if (t.type==='hr') parent.append(el('hr'));
      else if (t.type==='html') parent.append(el('pre',t.raw));
      else if (t.type==='list') {
        const list=el(t.ordered?'ol':'ul');if(t.ordered&&Number.isSafeInteger(t.start))list.start=t.start;
        for(const item of t.items){const li=el('li');if(item.task){const mark=el('span',item.checked?'☑ ':'☐ ');mark.setAttribute('aria-label',item.checked?'Completed: ':'Not completed: ');li.append(mark);}blocks(item.tokens,li,depth+1);list.append(li)}parent.append(list);
      } else if (t.type==='code') {
        const frame=el('div');frame.className='code-block';const header=el('div');header.className='code-header';header.append(el('span',(t.lang||'Code').split(/\s+/)[0]));
        if(typeof copyText==='function'){
          const button=el('button','Copy code');button.type='button';
          button.addEventListener('click',async()=>{try{await copyText(t.text);report('Code copied.')}catch{report('Could not copy code. Select it and copy manually.')}});header.append(button);
        }
        const pre=el('pre');pre.tabIndex=0;pre.setAttribute('aria-label','Code');pre.append(el('code',t.text));frame.append(header,pre);parent.append(frame);
      } else if (t.type==='table') {
        const scroll=el('div');scroll.className='table-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Response table');const table=el('table');const head=el('thead'),hr=el('tr');
        for(const cell of t.header){const th=el('th');th.scope='col';inline(cell.tokens,th);hr.append(th)}head.append(hr);table.append(head);const body=el('tbody');
        for(const row of t.rows){const tr=el('tr');for(const cell of row){const td=el('td');inline(cell.tokens,td);tr.append(td)}body.append(tr)}table.append(body);scroll.append(table);parent.append(scroll);
      } else parent.append(el('p',t.raw??t.text??''));
    }
  }
  // Preserve unusually large output as selectable plain text instead of expensive formatting.
  if (text.length > 250_000) {
    result.append(el('p','Long response shown as plain text.'));
    const pre=el('pre',text);pre.className='plain-response';result.append(pre);return result;
  }
  try { blocks(Lexer.lex(text,{gfm:true,breaks:false}),result); }
  catch { result.replaceChildren(el('pre',text)); }
  return result;
}
