import fs from 'node:fs';
import cp from 'node:child_process';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const repo='tools/symphony/source-import-candidate';
const bridgePath='qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs';
const get=(rev,p)=>cp.execFileSync('git',['-C',repo,'show',rev+':'+p],{encoding:'utf8',maxBuffer:10000000});
const h=s=>crypto.createHash('sha256').update(s).digest('hex');
const old=get('dd9cfedd6130c4704e5addeb28307a12b20c341f',bridgePath);
assert.equal(h(old),'0d23ea7fb3bdc3cb521994fad953ca568f0e73ef88ac46ef5fdd2fa1a722c17f');
for(const [name,source] of [['S02',old],['Startup Handoff',get('2ea834a1e2385c34b8f516854b5317c6a08a0607',bridgePath)]]) {
 for(const available of [false,true]) {
  let calls=0;const sandbox=available?{__TAURI__:{core:{invoke:()=>{calls++;throw Error('unexpected dispatch');}},event:{listen:()=>{calls++;throw Error('unexpected listener');}}}}:{};
  vm.runInNewContext(source,sandbox,{timeout:1000});
  assert.equal(calls,0);assert.equal(typeof sandbox.__RIVUNE_DESKTOP_HOST__,available?'object':'undefined');
 }
 console.log(name+': bridge evaluation safe with/without synthetic Tauri; no eager dispatch');
}
const oldEntry="import './desktop-host.mjs';\nimport './assets/index-D_OJvy65.js';\n";
assert.equal(h(oldEntry),'0314da682f1715bce4183dab8c23eb2fb44545e10dbc961b294cf367ffb41b89');
console.log('S02 entry reconstructed exactly from provenance hash: bridge before JS');
const p='qa-artifacts/startup-handoff-native-build-20260910/frontend-dist/';
for(const f of ['desktop-entry.mjs','desktop-host.mjs','assets/index-BYxvQFus.js'])assert(fs.existsSync(p+f));
console.log('Current desktop module references exist; no browser/IPC/profile access performed');
