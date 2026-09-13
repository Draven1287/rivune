import React from 'react';
import {createRoot} from 'react-dom/client';
import {ProviderSetup} from '/src/host/ProviderSetup.tsx';
import {connectionGuidance} from '/src/host/connectionGuidance.ts';
import '/src/styles.css';
const base={adapterState:'supported',installation:'installed',authentication:'authenticated',responseTest:'notTested',catalogState:'available',supportsProviderDefault:true};
const snapshot={schemaVersion:1,conversations:[],runs:[],providers:[],activeConversationID:null,selectedProviderID:null,runtimeCapabilities:null};
const counts={discovery:0,configuration:0,send:0};
function update(){document.getElementById('counts')!.textContent=JSON.stringify(counts);}
const bridge={async getSnapshot(){return snapshot;},async discoverProviders(){counts.discovery++;update();return [{id:'codex:discovered:copy',kind:'codex',executablePath:'/synthetic/codex',installed:true}];},async configureSelectedProvider(provider){counts.configuration++;update();return {schemaVersion:1,state:'durable',provider,selectedProviderID:provider.id};}};
createRoot(document.getElementById('root')!).render(<main style={{padding:16,maxWidth:600,margin:'auto',color:'#eee',background:'#101722',minHeight:'100vh'}}><h1>Copy review</h1><p>Synthetic fixture only</p><pre id="counts" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{JSON.stringify(counts)}</pre><h2>Missing installation</h2><p>{connectionGuidance({...base,installation:'missing'})}</p><h2>No recorded response</h2><p>{connectionGuidance(base)}</p><ProviderSetup bridge={bridge} disabled={false} onConfirmed={async()=>{}}/></main>);
