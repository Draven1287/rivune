import {parseModelCatalog, parseTeamSelection, modelChoiceIdentity} from './core.mjs';

const routeKey = s => JSON.stringify([s.providerID, s.modelID, s.effortID]);
const copy = value => structuredClone(value);
let nextInstance=0;
export function teamRoutes(value) {
  const catalog = parseModelCatalog(value), routes = [];
  for (const p of catalog.providers) {
    if (p.adapterState !== 'supported' || p.installation === 'missing' || p.authentication === 'authNeeded' || ['stale','unavailable'].includes(p.catalogState)) continue;
    const add = (modelID, effortID, label) => routes.push({label, selection:{schemaVersion:1,providerID:p.id,modelID,effortID,catalogRevision:catalog.revision}});
    if (p.supportsProviderDefault) add(null,null,`${p.label} · Provider default`);
    if (p.catalogState !== 'available') continue;
    for (const m of p.models) {
      if (m.availability !== 'available') continue;
      if (m.supportsDefaultEffort) add(m.id,null,`${p.label} · ${m.label} · Default reasoning`);
      if (m.effortState === 'supported') for (const e of m.efforts) add(m.id,e.id,`${p.label} · ${m.label} · ${e.label}`);
    }
  }
  return routes;
}

export function mountTeamControls({container,catalog=null,capability=null,currentTeam=null,disabled=false,contextKey=null,onChange}) {
  if (typeof onChange !== 'function') throw new Error('Team change handler required.');
  const d=container.ownerDocument,groupName='team-lead-'+(++nextInstance);
  const el=(tag,text)=>{const n=d.createElement(tag);if(text!==undefined)n.textContent=text;return n};
  const root=el('section');root.setAttribute('aria-label','Team for next message');
  const heading=el('h3','Choose your team'),availability=el('p'),notice=el('p'),members=el('fieldset'),legend=el('legend','Team members and lead');
  availability.setAttribute('role','status');notice.setAttribute('role','status');notice.tabIndex=-1;
  const label=el('div','Add an AI'),options=el('div');options.className='team-route-list';options.setAttribute('role','group');options.setAttribute('aria-label','Model route to add');options.style.maxHeight='240px';options.style.overflowY='auto';label.append(options);
  members.className='team-members';
  const add=el('button','Add member'),apply=el('button','Save team draft');add.type=apply.type='button';
  const hint=el('p','Choose 2–6 AI members and select a lead. This changes your next-message choice; it does not start a task.');
  const actions=el('div');actions.className='team-actions';actions.append(add,apply);root.append(heading,availability,hint,members,label,actions,notice);container.append(root);
  let routes=[],chosen=[],leadKey=null,sourceKey=null,invalidCurrent=false,disposed=false,pending=false,saveError=null,epoch=0,selectedRoute=null;
  function permitted(s){return routes.some(r=>routeKey(r.selection)===routeKey(s)&&r.selection.catalogRevision===s.catalogRevision)}
  function valid(){return !invalidCurrent&&chosen.length>=2&&chosen.length<=6&&chosen.every(permitted)&&chosen.some(s=>routeKey(s)===leadKey)}
  function render(focusKey=null){
    const active=d.activeElement,hadFocus=root.contains(active),previousFocusKey=active?.dataset?.focusKey,previousRoute=selectedRoute;
    const available=routes.filter(r=>!chosen.some(s=>routeKey(s)===routeKey(r.selection)));
    selectedRoute=available.some(r=>routeKey(r.selection)===previousRoute)?previousRoute:null;
    const routeDisabled=disabled||pending||invalidCurrent||chosen.length>=6;
    options.replaceChildren(...available.map(r=>{
      const key=routeKey(r.selection),button=el('button',r.label);button.type='button';button.dataset.focusKey=`route:${key}`;
      button.disabled=routeDisabled;button.setAttribute('aria-pressed',String(key===selectedRoute));
      button.addEventListener('click',()=>{if(routeDisabled||disposed)return;selectedRoute=key;render(`route:${key}`)});return button;
    }));
    members.disabled=disabled||pending;
    add.disabled=routeDisabled||!selectedRoute;
    members.replaceChildren(legend,...chosen.map((s,i)=>{
      const row=el('div'),key=routeKey(s),known=routes.find(r=>routeKey(r.selection)===key);
      const name=known?.label||`${s.providerID} · ${s.modelID??'Provider default'} · ${s.effortID??'Default reasoning'}`;
      const leadLabel=el('label'),radio=el('input');radio.type='radio';radio.name=groupName;radio.checked=leadKey===key;radio.setAttribute('aria-label',`Lead: ${name}`);radio.dataset.focusKey=`lead:${key}`;
      radio.addEventListener('change',()=>{if(disabled||pending||disposed)return;leadKey=key;render(`lead:${key}`)});leadLabel.append(radio,d.createTextNode(name+(permitted(s)?'':' · Unavailable or stale; retained')));
      const remove=el('button','Remove');remove.type='button';remove.setAttribute('aria-label',`Remove ${name}`);remove.dataset.focusKey=`remove:${key}`;
      remove.addEventListener('click',()=>{if(disabled||pending||disposed)return;chosen.splice(i,1);if(leadKey===key)leadKey=null;render(chosen.length?`remove:${routeKey(chosen[Math.min(i,chosen.length-1)])}`:'add')});
      row.append(leadLabel,remove);return row;
    }));
    apply.disabled=disabled||pending||!valid();
    notice.textContent=saveError|| (pending?'Saving team draft…':invalidCurrent?'The saved team is unreadable. It has not been replaced.':chosen.some(s=>!permitted(s))?'Your chosen team is retained. Remove or replace stale routes before using a new team.':chosen.length<2?'Add at least two members.':!leadKey?'Select a lead.':'Review your team, then save it for the next message.');
    if(focusKey==='add')add.disabled?notice.focus():add.focus();
    else if(focusKey){[...root.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===focusKey)?.focus()}
    else if(hadFocus&&!root.contains(active)){const replacement=[...root.querySelectorAll('[data-focus-key]')].find(n=>n.dataset.focusKey===previousFocusKey);(replacement||notice).focus()}
  }
  function update(next){
    if(disposed)return;
    if(Object.hasOwn(next,'contextKey')&&next.contextKey!==contextKey){contextKey=next.contextKey;sourceKey=null;selectedRoute=null;chosen=[];leadKey=null;saveError=null;pending=false;epoch++}
    if(Object.hasOwn(next,'disabled'))disabled=Boolean(next.disabled);
    if(Object.hasOwn(next,'catalog'))catalog=next.catalog;
    if(Object.hasOwn(next,'capability'))capability=next.capability;
    try{routes=catalog?teamRoutes(catalog):[]}catch{routes=[]}
    const reason=typeof capability?.reasonCode==='string'?capability.reasonCode.slice(0,256):null;
    availability.textContent=capability?.constellation==='unavailable'?(reason==='ENGINE_NOT_CONNECTED'?'Team execution is not ready in this build. You can save a team draft.':'Team execution is unavailable. You can save a team draft.'):capability?.constellation==='available'?'Team execution is available according to this host. Saving a draft does not start execution.':'Team execution capability is unverified. Choosing a team does not start execution.';
    if(Object.hasOwn(next,'currentTeam')){
      try{
        const team=parseTeamSelection(next.currentTeam);
        const key=modelChoiceIdentity({selection:null,team});
        if(key!==sourceKey){sourceKey=key;chosen=team?copy(team.members):[];leadKey=team?routeKey(team.members[team.leadIndex]):null}
        invalidCurrent=false;
      }catch{invalidCurrent=true}
    }
    render();
  }
  options.addEventListener('keydown',event=>{
    if(!['ArrowDown','ArrowUp','ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    const buttons=[...options.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(d.activeElement);if(index<0)return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();
  });
  add.addEventListener('click',()=>{
    const remaining=routes.filter(r=>!chosen.some(s=>routeKey(s)===routeKey(r.selection)));
    const route=remaining.find(r=>routeKey(r.selection)===selectedRoute);if(!route||chosen.length>=6||invalidCurrent||disabled||pending||disposed)return;
    chosen.push(copy(route.selection));render('add');
  });
  async function emit(value){
    if(disabled||pending||disposed)return;
    const ticket=++epoch;pending=true;saveError=null;render();
    try{await onChange(value);if(!disposed&&ticket===epoch){saveError=null}}
    catch{if(!disposed&&ticket===epoch)saveError='Could not save this team draft. Your choices are retained; retry when ready.'}
    finally{if(!disposed&&ticket===epoch){pending=false;render()}}
  }
  apply.addEventListener('click',()=>{
    if(!valid()||disposed||disabled||pending)return;
    const team=parseTeamSelection({schemaVersion:1,members:copy(chosen),leadIndex:chosen.findIndex(s=>routeKey(s)===leadKey)});
    void emit({selection:copy(team.members[team.leadIndex]),team});
  });
  update({catalog,capability,currentTeam});
  return Object.freeze({update,destroy(){disposed=true;epoch++;root.remove()}});
}
