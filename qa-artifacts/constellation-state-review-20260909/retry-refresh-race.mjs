import fs from 'node:fs';
import {createHostWorkspaceController} from '../../prototypes/ai-native-workspace/src/host/workspaceController.ts';
import {createTauriWorkspaceAdapter} from '../../prototypes/ai-native-workspace/src/host/tauriAdapter.ts';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../../prototypes/ai-native-workspace/tests/invocationRetry.test.mjs',import.meta.url),'utf8');
const fixture=Function('createHostWorkspaceController','createTauriWorkspaceAdapter','assert','clone',source.slice(source.indexOf('function fixture()'),source.indexOf("test('Exact retry"))+';return fixture;')(createHostWorkspaceController,createTauriWorkspaceAdapter,assert,structuredClone);
const f=fixture();f.controller.dispose();
let reads=0, rejectRefresh, signal;
const held=new Promise(resolve=>signal=resolve);
const read=f.bridge.getSnapshot;
f.bridge.getSnapshot=async()=>{reads++;if(reads===3){signal();return new Promise((resolve,reject)=>rejectRefresh=reject);}return read();};
f.setBehavior(async()=>{f.run.status='running';return {requestID:'run',state:'accepted'};});
const c=createHostWorkspaceController(createTauriWorkspaceAdapter(f.bridge),{read:()=>null,write:()=>assert.fail('reserve'),clear:()=>assert.fail('clear')},{pollMs:60000});
try{await c.start();const pending=c.retryInvocation(f.request());await held;const cancelling=c.cancel('run').catch(error=>error.message);rejectRefresh(Error('late snapshot failure'));await pending;const cancelResult=await cancelling;console.log(JSON.stringify({cancelResult,status:c.getState().snapshot.runs[0].status,retry:c.getState().retry,calls:f.calls},null,2));assert.ok(c.getState().retry,'Unconfirmed cancellation must preserve recovery fence');}finally{c.dispose();}
