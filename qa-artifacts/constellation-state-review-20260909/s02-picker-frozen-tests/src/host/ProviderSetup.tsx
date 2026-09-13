import './ProviderSetup.css';
import { useMemo, useRef, useState } from 'react';
import { parseHostSnapshot, type HostSnapshot } from './contracts';
import { createProviderConfigurationAdapter, prepareProviderConfiguration, type SelectedHostRoute } from './providerConfiguration';

function method(bridge:unknown,key:string){return bridge && typeof bridge==='object' ? Object.getOwnPropertyDescriptor(bridge,key)?.value : undefined;}
export function parseInstalledRoutes(value:unknown):SelectedHostRoute[]{
 if(!Array.isArray(value)||value.length>128)throw Error('Invalid routes');
 const ids=new Set<string>();return value.flatMap(row=>{
  if(!row||typeof row!=='object')throw Error('Invalid route');
  const read=(key:string)=>Object.getOwnPropertyDescriptor(row,key)?.value;
  const id=read('id'),kind=read('kind'),executablePath=read('executablePath'),installed=read('installed');
  if(typeof id!=='string'||ids.has(id)||!['codex','claude'].includes(kind)||typeof executablePath!=='string'||typeof installed!=='boolean')throw Error('Invalid route');
  ids.add(id);if(!installed)return [];
  if(id.length>128||!id.startsWith(`${kind}:discovered:`)||executablePath.length>4096||!executablePath||/[\u0000-\u001f\u007f]/.test(executablePath))throw Error('Invalid route');
  return [{id,kind,executablePath,installed:true} as SelectedHostRoute];
 });
}
export function ProviderSetup({bridge,disabled,onConfirmed}:{bridge:unknown;disabled:boolean;onConfirmed:()=>Promise<void>}){
 const adapter=useMemo(()=>createProviderConfigurationAdapter(bridge),[bridge]);
 const discover=method(bridge,'discoverProviders'),getSnapshot=method(bridge,'getSnapshot');
 const available=!!adapter&&typeof discover==='function'&&typeof getSnapshot==='function';
 const [routes,setRoutes]=useState<SelectedHostRoute[]>([]),[selected,setSelected]=useState('');
 const [snapshot,setSnapshot]=useState<HostSnapshot|null>(null),[phase,setPhase]=useState<'idle'|'inspecting'|'ready'|'saving'|'uncertain'|'checking'|'reviewed'>('idle');
 const [notice,setNotice]=useState('Find installed providers when you are ready to add a connection.');
 const [durabilityUnconfirmed,setDurabilityUnconfirmed]=useState(false);
 const intended=useRef<ReturnType<typeof prepareProviderConfiguration>|null>(null);
 const busy=useRef(false);const currentDisabled=useRef(disabled);currentDisabled.current=disabled;
 const blocked=disabled||busy.current||phase==='saving'||phase==='inspecting'||phase==='checking';
 async function inspect(){
  if(!available||busy.current||currentDisabled.current||phase==='uncertain')return;
  busy.current=true;setPhase('inspecting');setRoutes([]);setSelected('');setSnapshot(null);
  try{const list=parseInstalledRoutes(await discover.call(bridge));const fresh=parseHostSnapshot(await getSnapshot.call(bridge));setRoutes(list);setSnapshot(fresh);setPhase('ready');setNotice(list.length?'Choose an installed route. Sign-in and response readiness have not been checked.':'No supported installed routes were found. Install a supported CLI using its official instructions, then find providers again.');}
  catch{setPhase('idle');setNotice('Local routes could not be inspected. No configuration was requested.');}finally{busy.current=false;}
 }
 async function configure(){
  const route=routes.find(r=>r.id===selected);if(!adapter||!route||!snapshot||busy.current||currentDisabled.current||phase!=='ready')return;
  try{intended.current=prepareProviderConfiguration(route,snapshot,true);}catch{setNotice('This route conflicts with saved settings. Find installed providers again before choosing.');setPhase('idle');return;}
  busy.current=true;setPhase('saving');setNotice('Saving the selected default connection…');
  try{const result=await adapter.configure(route,snapshot,true);
   if(result.state==='durable'){setDurabilityUnconfirmed(false);setPhase('idle');setRoutes([]);setSelected('');setNotice('Default connection saved. Sign-in and a successful response are still unverified.');await onConfirmed();intended.current=null;}
   else{setDurabilityUnconfirmed(true);setPhase('uncertain');setNotice('The save outcome is unconfirmed. Check saved configuration before another attempt.');}
  }catch{setDurabilityUnconfirmed(true);setPhase('uncertain');setNotice('The save outcome is unconfirmed. Check saved configuration before another attempt.');}finally{busy.current=false;}
 }
 async function reconcile(){
  if(!available||busy.current||currentDisabled.current||phase!=='uncertain')return;
  busy.current=true;setPhase('checking');
  try{const fresh=parseHostSnapshot(await getSnapshot.call(bridge));const request=intended.current;
   const saved=request&&fresh.providers.find(p=>p.id===request.provider.id);
   const matches=!!saved&&!!request&&Object.keys(request.provider).every(k=>saved[k as keyof typeof saved]===request.provider[k as keyof typeof request.provider])&&fresh.selectedProviderID===request.provider.id;
   setSnapshot(fresh);setRoutes([]);setSelected('');setPhase('reviewed');
   setNotice(matches?'The visible configuration matches this attempt. Crash durability is still unconfirmed; no request was replayed.':'The latest saved configuration does not match this attempt. Find installed providers again to review before another explicit save.');
   await onConfirmed();intended.current=null;
  }catch{setPhase('uncertain');setNotice('Saved configuration could not be confirmed. Another save remains blocked.');}finally{busy.current=false;}
 }
 return <section className="provider-setup" aria-labelledby="provider-setup-title"><h3 id="provider-setup-title">Add a connection</h3>
  <p>This sets the workspace default. Conversations with a saved provider selection or Constellation team keep that binding. Draft text is preserved.</p>
  {!available?<p>This host does not support guarded connection setup. Reopen with a compatible host; no fallback setup will run.</p>:<>
   <p role="status">{notice}</p>{durabilityUnconfirmed&&<p>The earlier save remains unconfirmed. A matching snapshot does not prove it will survive a crash.</p>}
   <button type="button" onClick={()=>void inspect()} disabled={blocked||phase==='uncertain'||phase==='reviewed'}>Find installed providers</button>
   {routes.length>0&&<><label htmlFor="provider-route">Installed route</label><select id="provider-route" value={selected} disabled={blocked||phase!=='ready'} onChange={e=>setSelected(e.target.value)}><option value="">Choose a provider</option>{routes.map(r=><option key={r.id} value={r.id}>{r.kind==='codex'?'Codex':'Claude'} · {r.executablePath}</option>)}</select><button type="button" disabled={blocked||phase!=='ready'||!selected} onClick={()=>void configure()}>Save as workspace default</button></>}
   {phase==='reviewed'&&<button type="button" disabled={blocked} onClick={()=>void inspect()}>Review routes for a new save</button>}
   {(phase==='uncertain'||phase==='checking')&&<button type="button" disabled={blocked} onClick={()=>void reconcile()}>Check saved configuration</button>}
  </>}
 </section>;
}
