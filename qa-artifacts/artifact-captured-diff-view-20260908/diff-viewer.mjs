import {createDiffController} from './diff-controller.mjs';
export function mountCapturedDiff({container,adapter}){
 const d=container.ownerDocument,el=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const root=el('section');root.className='captured-diff';root.setAttribute('aria-label','Captured artifact diff');
 const title=el('h2','Captured changes'),origin=el('p'),status=el('p');origin.className='diff-origin';status.setAttribute('role','status');status.tabIndex=-1;
 const files=el('div');files.setAttribute('role','group');files.setAttribute('aria-label','Captured files');files.className='diff-files';
 const action=el('h3'),grid=el('div');grid.className='diff-columns';
 const sides=['Captured before','Proposed after'].map(label=>{const section=el('section'),h=el('h4',label),range=el('p'),pre=el('pre'),code=el('code');pre.tabIndex=0;pre.setAttribute('aria-label',label+' exact text');pre.append(code);section.append(h,range,pre);grid.append(section);return {h,range,pre,code}});
 const paging=el('div');paging.className='diff-paging';const prev=el('button','Previous page'),label=el('span'),next=el('button','Next page');prev.type=next.type='button';paging.append(prev,label,next);
 root.append(title,origin,status,files,action,grid,paging);container.replaceChildren(root);let prepared=null,controller;
 function render(s){const active=d.activeElement,wasInside=root.contains(active);
  if(prepared!==s.prepared){prepared=s.prepared;files.replaceChildren(...(prepared?.files||[]).map((f,i)=>{const b=el('button',f.path);b.type='button';b.addEventListener('click',()=>controller.selectFile(i));return b}))}
  [...files.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===s.fileIndex)));
  const f=prepared?.files[s.fileIndex];origin.textContent=prepared?`Operation ${prepared.operationId} · Capture ${prepared.capturedSnapshotSha256} · Project ${prepared.targetProjectId}`:'';
  action.textContent=f?`${f.action==='create'?'Create':'Replace'} ${f.path}`:'';status.textContent=s.message;root.dataset.state=s.phase;
  grid.hidden=paging.hidden=s.phase!=='ready';
  for(const [i,pages] of [s.beforePages,s.afterPages].entries()){const page=pages[s.pageIndex],missing=i===0&&f?.action==='create';sides[i].range.textContent=missing?'Missing before capture — new file':page?(page.endByte===0?'Existing empty file · 0 bytes':`Bytes ${page.startByte}–${page.endByte} of ${i===0?f.beforeBytes:f.afterBytes}`):'No remaining bytes on this side';sides[i].code.textContent=page?.text||'';sides[i].pre.hidden=missing||!page}
  const count=Math.max(s.beforePages.length,s.afterPages.length);label.textContent=`Page ${s.pageIndex+1} of ${count}`;
  prev.disabled=s.pageIndex<=0;next.disabled=s.pageIndex>=count-1;
  if(wasInside&&(!root.contains(active)||active.disabled)){(active===next&&!prev.disabled?prev:active===prev&&!next.disabled?next:files.children[s.fileIndex]||status).focus()}
 }
 controller=createDiffController({adapter,onState:render});prev.onclick=()=>controller.setPage(controller.getState().pageIndex-1);next.onclick=()=>controller.setPage(controller.getState().pageIndex+1);
 files.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const bs=[...files.children],i=bs.indexOf(d.activeElement);if(i<0)return;e.preventDefault();bs[e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus()});
 render(controller.getState());return Object.freeze({setPrepared:controller.setPrepared,destroy(){controller.destroy();root.remove()}});
}
