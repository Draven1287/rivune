import React from 'react';
import ReactDOM from 'react-dom/client';
import {StartupBoundary,StartupLoader} from './StartupFallback';
import './styles.css';

const container=document.getElementById('root');
if(container){
 const root=ReactDOM.createRoot(container);
 root.render(<React.StrictMode><StartupBoundary><StartupLoader/></StartupBoundary></React.StrictMode>);
}
