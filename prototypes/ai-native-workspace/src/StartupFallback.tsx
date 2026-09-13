import { Component, useEffect, useState, type ComponentType, type ReactNode } from 'react';
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

type AppModule = { default: ComponentType };
const loadApp = () => import('./App');
// The optional loader lets mounted tests exercise the same pending/rejection
// path without changing window globals or installing a production retry path.
export function StartupLoader({load = loadApp}: {load?: () => Promise<AppModule>}) {
 const [result, setResult] = useState<{module?: AppModule; failed?: boolean}>({});
 useEffect(() => {
  let live = true;
  setResult({});
  void Promise.resolve().then(load).then(module => {
   if (live) setResult({module});
  }, () => { if (live) setResult({failed:true}); });
  return () => { live = false; };
 }, [load]);
 const App = result.module?.default;
 return App ? <App/> : <StartupFallback state={result.failed ? 'failed' : 'loading'}/>;
}
