import {createArtifactController} from './artifact-controller.mjs';
let instances=0;
export function mountArtifactViewer({container,adapter}){
 const d=container.ownerDocument,prefix='artifact-viewer-'+(++instances);
 const el=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 const root=el('section');root.className='artifact-viewer';root.setAttribute('aria-label','Generated artifacts');
 const heading=el('h2','Generated artifacts'),notice=el('p','Read-only review · project files are unchanged');notice.className='artifact-note';
 const status=el('p');status.className='artifact-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const layout=el('div');layout.className='artifact-layout';
 const nav=el('div'),list=el('div'),files=el('div');list.setAttribute('role','group');list.setAttribute('aria-label','Artifacts');files.setAttribute('role','group');files.setAttribute('aria-label','Artifact files');nav.append(list,files);
 const panel=el('section'),origin=el('p'),revision=el('p'),filename=el('h3','File content'),pre=el('pre'),code=el('code');
 origin.className=revision.className='artifact-origin';filename.id=prefix+'-filename';pre.tabIndex=0;pre.setAttribute('aria-labelledby',filename.id);pre.setAttribute('aria-label','Read-only file content');pre.append(code);panel.append(origin,revision,filename,pre);
 const retry=el('button','Retry');retry.type='button';retry.hidden=true;
 layout.append(nav,panel);root.append(heading,notice,status,layout,retry);container.replaceChildren(root);
 let catalog=null,selection=null,controller;
 function buttons(parent,labels,onSelect){
  parent.replaceChildren(...labels.map((label,index)=>{const b=el('button',label);b.type='button';b.addEventListener('click',()=>onSelect(index));return b}));
 }
 // Arrow/Home/End move focus within each button group; Enter/Space selects.
 for(const group of [list,files])group.addEventListener('keydown',event=>{
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const items=[...group.querySelectorAll('button')],index=items.indexOf(d.activeElement);if(index<0)return;
  const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
  event.preventDefault();items[next]?.focus();
 });
 function render(s){
  const focusWithin=root.contains(d.activeElement),activeElement=d.activeElement;
  if(catalog!==s.records){catalog=s.records;buttons(list,s.records.map(r=>r.summary),i=>controller.selectArtifact(i));selection=null}
  const r=s.records[s.artifactIndex];
  if(selection!==r){selection=r;buttons(files,r?.files.map(f=>f.path)||[],i=>controller.selectFile(i))}
  [...list.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===s.artifactIndex)));
  [...files.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===s.fileIndex)));
  origin.textContent=r?`Origin: ${r.origin.conversationId} / ${r.origin.turnId} / ${r.origin.answerId}${r.origin.projectId?' · Project '+r.origin.projectId:''}${r.access==='archived-read-only'?' · Archived, read-only':''}`:'';
  revision.textContent=r?`Revision ${r.revisionSha256} · Response ${r.origin.responseSha256}`:'';
  filename.textContent=r?.files[s.fileIndex]?.path||'File content';
  code.textContent=s.content;pre.hidden=s.phase!=='ready';
  pre.setAttribute('aria-busy',String(s.phase==='loading-file'));status.textContent=s.message;
  retry.hidden=!['error','missing-file'].includes(s.phase);
  root.dataset.state=s.phase;
  if(focusWithin&&(!root.contains(activeElement)||(activeElement===retry&&retry.hidden))){(files.children[s.fileIndex]||list.children[s.artifactIndex]||status).focus()}
 }
 status.tabIndex=-1;
 controller=createArtifactController({adapter,onState:render});retry.addEventListener('click',()=>controller.retry());render(controller.getState());
 return Object.freeze({load:controller.load,setArtifacts:controller.setArtifacts,destroy(){controller.destroy();root.remove()}});
}
