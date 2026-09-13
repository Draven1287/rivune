from pathlib import Path
import hashlib,json,difflib
r=Path(__file__).resolve().parent
changes={}
changes['src/StartupFallback.tsx']='''import { Component, type ReactNode } from 'react';
import './startup.css';
export type StartupState = 'loading' | 'failed' | 'bridge-unavailable';
export function StartupFallback({state}:{state:StartupState}) {
 const title=state==='loading'?'Opening Rivune…':state==='failed'?'Rivune could not display the workspace':'Desktop connection unavailable';
 return <main className="rivune-startup" aria-labelledby="rivune-startup-title" aria-busy={state==='loading'}>
  <p className="rivune-startup-brand">Rivune</p><h1 id="rivune-startup-title">{title}</h1>
  <p role={state==='loading'?'status':'alert'}>{state==='loading'?'Waiting for the workspace interface.':state==='failed'?'The interface encountered a startup or display error.':'The workspace interface could not access the desktop connection.'}</p>
  <p>{state==='loading'?'If this screen remains, the interface has not finished opening.':'This screen cannot determine whether your latest work was saved. It does not mean your saved data is lost.'}</p>
  {state!=='loading'&&<p>Keep this window open and report what happened before the screen appeared.</p>}
 </main>;
}
export class StartupBoundary extends Component<{children:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<StartupFallback state="failed"/>:this.props.children;}
}
'''
changes['src/startup.css']='''.rivune-startup{box-sizing:border-box;min-height:100dvh;padding:clamp(24px,8vw,88px);background:radial-gradient(ellipse at top left,#17263b 0,transparent 60%),#0b121d;color:#e5eaf2;font:16px/1.6 system-ui,sans-serif;overflow-wrap:anywhere}.rivune-startup>*{max-width:40rem}.rivune-startup h1{font-size:clamp(24px,4vw,36px);line-height:1.25;font-weight:600}.rivune-startup-brand{letter-spacing:.03em;color:#c9d6e8;font-weight:600}.rivune-startup p{margin:0 0 16px}.rivune-startup h1{margin:0 0 20px}
'''
changes['src/main.tsx']='''import React from 'react';
import ReactDOM from 'react-dom/client';
import {StartupBoundary,StartupFallback} from './StartupFallback';
import './styles.css';

const container=document.getElementById('root');
if(container){
 const root=ReactDOM.createRoot(container);
 const show=(content:React.ReactNode)=>root.render(<React.StrictMode><StartupBoundary>{content}</StartupBoundary></React.StrictMode>);
 show(<StartupFallback state="loading"/>);
 void import('./App').then(({default:App})=>show(<App/>)).catch(()=>show(<StartupFallback state="failed"/>));
}
'''
a=Path('prototypes/ai-native-workspace/src/App.tsx').read_text();a="import { StartupFallback } from './StartupFallback';\n"+a;a=a.replace("if (descriptor || '__TAURI__' in window || '__TAURI_INTERNALS__' in window) return <HostWorkspace bridge={descriptor?.value}/>;","if (descriptor || '__TAURI__' in window || '__TAURI_INTERNALS__' in window) {\n    if (!descriptor || !('value' in descriptor) || !descriptor.value || typeof descriptor.value !== 'object') return <StartupFallback state=\"bridge-unavailable\"/>;\n    return <HostWorkspace bridge={descriptor.value}/>;\n  }")
changes['src/App.tsx']=a
h=Path('prototypes/ai-native-workspace/index.html').read_text();h=h.replace('<title>','<link rel="stylesheet" href="/src/startup.css" />\n    <title>');h=h.replace('<div id="root"></div>','<div id="root"><main class="rivune-startup" aria-labelledby="rivune-startup-title" aria-busy="true"><p class="rivune-startup-brand">Rivune</p><h1 id="rivune-startup-title">Opening Rivune…</h1><p role="status">Waiting for the workspace interface.</p><p>If this screen remains, the interface has not finished opening.</p></main></div>');changes['index.html']=h
manifest={};patch=''
for rel,s in changes.items():
 p=Path('prototypes/ai-native-workspace')/rel;old=p.read_text() if p.exists() else '';dest=r/'files'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(s);manifest[str(p)]={'baseSHA256':hashlib.sha256(old.encode()).hexdigest() if p.exists() else None,'proposalSHA256':hashlib.sha256(s.encode()).hexdigest()};patch+=''.join(difflib.unified_diff(old.splitlines(True),s.splitlines(True),fromfile='a/'+str(p) if p.exists() else '/dev/null',tofile='b/'+str(p)))
(r/'proposal.patch').write_text(patch);(r/'source-hashes.json').write_text(json.dumps(manifest,indent=2)+'\n')
