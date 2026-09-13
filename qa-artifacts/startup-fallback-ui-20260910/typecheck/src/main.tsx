import React from 'react';
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
