/** Isolated synthetic fixture; builder supplies module-serving path. No host calls. */
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import App from './typecheck/src/App';
import {StartupBoundary} from './typecheck/src/StartupFallback';
export async function runStartupFallbackCases(container:HTMLElement){
 const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
 function Broken():React.ReactNode{throw Error('synthetic private error must not be displayed');}
 let root=createRoot(container);
 await act(async()=>root.render(<StartupBoundary><Broken/></StartupBoundary>));
 assert(container.textContent?.includes('Rivune could not display the workspace'),'Render error fallback missing');
 assert(!container.textContent?.includes('synthetic private'),'Raw error leaked');
 assert(container.querySelector('[role=alert]'),'Failure is not announced');
 await act(async()=>root.unmount());
 const previous=Object.getOwnPropertyDescriptor(window,'__RIVUNE_DESKTOP_HOST__');
 try{
  Object.defineProperty(window,'__RIVUNE_DESKTOP_HOST__',{configurable:true,value:null});
  root=createRoot(container);await act(async()=>root.render(<StartupBoundary><App/></StartupBoundary>));
  assert(container.textContent?.includes('Desktop connection unavailable'),'Missing marked bridge not explicit');
  assert(!container.querySelector('textarea'),'Missing bridge mounted writable workspace/demo');
  assert(!container.querySelector('button'),'Failure offered unintended side-effect control');
  await act(async()=>root.unmount());
 }finally{if(previous)Object.defineProperty(window,'__RIVUNE_DESKTOP_HOST__',previous);else Reflect.deleteProperty(window,'__RIVUNE_DESKTOP_HOST__');}
 return ['render error boundary','missing marked desktop bridge'];
}
