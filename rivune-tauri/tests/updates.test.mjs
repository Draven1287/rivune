import test from 'node:test';
import assert from 'node:assert/strict';
import {UpdateController} from './compiled/services/updates/controller.js';
import {validateRelease} from '../scripts/release-config.mjs';
import {verifyBundle,inventory} from '../scripts/shared-bundle.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('unconfigured updater never contacts a provider or update server',async()=>{
 const controller=new UpdateController(null,()=>true); await controller.check(); await controller.install();
 assert.equal(controller.state.phase,'unconfigured');
});
test('updates require an explicit install and wait for active work',async()=>{
 let installed=0,ready=false;
 const controller=new UpdateController({check:async()=>({version:'1.1.0',install:async()=>{installed++;},dispose:async()=>{}})},()=>ready);
 await controller.check();assert.equal(controller.state.phase,'available');assert.equal(installed,0);
 await controller.install();assert.equal(installed,0);assert.equal(controller.state.phase,'available');
 ready=true;await controller.install();assert.equal(installed,1);
});
test('duplicate checks coalesce and failed installs require a fresh check',async()=>{
 let resolve,calls=0,disposed=0;
 const controller=new UpdateController({check:()=>{calls++;return new Promise(r=>resolve=r);}},()=>true);
 const first=controller.check();await Promise.resolve();await controller.check();assert.equal(calls,1);
 resolve({version:'1.1.0',install:async()=>{throw Error('signature mismatch');},dispose:async()=>{disposed++;}});
 await first;await controller.install();assert.equal(controller.state.phase,'error');assert.equal(disposed,1);
 await controller.install();assert.equal(disposed,1);
});
test('release preparation refuses missing feeds, insecure transport and placeholder trust',()=>{
 const blank={channel:'development',tauri:{endpoint:null,publicKey:null},sparkle:{endpoint:null,publicKey:null}};
 assert.equal(validateRelease(blank),blank);assert.throws(()=>validateRelease(blank,true));
 for(const endpoint of ['http://updates.rivune.test/feed','https://user:secret@updates.rivune.test/feed','https://example.com/feed'])assert.throws(()=>validateRelease({...blank,tauri:{endpoint,publicKey:'fake'}}));
});
test('shared bundle verification detects stale, missing and modified assets',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'rivune-bundle-test-'));
 try{
  await writeFile(join(dir,'index.html'),'original');
  const assets=await inventory(dir);await writeFile(join(dir,'bundle-manifest.json'),JSON.stringify({schema:1,assets,version:'1.0.0',sourceDigest:'0'.repeat(64)}));
  assert.equal((await verifyBundle(dir,false)).version,'1.0.0');
  await writeFile(join(dir,'old.js'),'stale');await assert.rejects(verifyBundle(dir,false));await rm(join(dir,'old.js'));
  await writeFile(join(dir,'index.html'),'changed');await assert.rejects(verifyBundle(dir,false));
  await rm(join(dir,'index.html'));await assert.rejects(verifyBundle(dir,false));
 }finally{await rm(dir,{recursive:true,force:true});}
});
