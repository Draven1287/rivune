import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from './compiled/platform/detect.js';
import { parseConnectionStatuses } from './compiled/platform/types.js';
const fixture = [{name:'Codex',state:'Fixture only'}];
const dependencies = (overrides={}) => ({isNative:()=>false,runtimeInfo:async()=>({os:'macos'}),nativeConnections:async()=>fixture,browserConnections:async()=>fixture,development:true,...overrides});
test('browser development checks use injected local adapter without native detection',async()=>{
 const platform = createPlatform(dependencies({runtimeInfo:()=>{throw Error('Must not run');}}));
 await platform.initialize(); assert.equal(platform.name,'browser'); assert.equal(platform.runtime,'browser');
 assert.equal(platform.capabilities.connectionChecks,true); assert.equal(platform.capabilities.liquidGlass,false);
 assert.deepEqual(await platform.checkConnections(),fixture);
});
test('production browser fails explicitly rather than invoking a development endpoint',async()=>{
 const platform = createPlatform(dependencies({development:false,browserConnections:()=>{throw Error('Must not run');}}));
 await platform.initialize(); assert.equal(platform.capabilities.connectionChecks,false);
 await assert.rejects(platform.checkConnections(),{code:'unsupported'});
});
test('macOS detection comes from injected native OS information and initializes once',async()=>{
 let calls=0; const platform = createPlatform(dependencies({isNative:()=>true,runtimeInfo:async()=>{calls++;return {os:'macos'};}}));
 await Promise.all([platform.initialize(),platform.initialize()]);
 assert.equal(calls,1); assert.equal(platform.name,'macos'); assert.equal(platform.runtime,'tauri');
 assert.deepEqual(await platform.checkConnections(),fixture);
 for (const flag of ['liquidGlass','nativeShare','nativeNotifications','nativeMenus']) assert.equal(platform.capabilities[flag],false);
});
test('Windows and Linux are detected but unvalidated integrations remain unavailable',async()=>{
 for (const os of ['windows','linux']) {
  const platform = createPlatform(dependencies({isNative:()=>true,runtimeInfo:async()=>({os}),nativeConnections:()=>{throw Error('Must not run');}}));
  await platform.initialize(); assert.equal(platform.name,os); assert.equal(platform.capabilities.connectionChecks,false);
  await assert.rejects(platform.checkConnections(),{code:'unsupported'});
 }
});
test('failed or unknown native detection fails closed and never falls back to browser checks',async()=>{
 for (const runtimeInfo of [async()=>{throw Error('IPC unavailable');},async()=>({os:'other'}),async()=>null]) {
  const platform=createPlatform(dependencies({isNative:()=>true,runtimeInfo,browserConnections:()=>{throw Error('Must not run');}}));
  await platform.initialize(); assert.equal(platform.name,'unknown'); assert.equal(platform.runtime,'tauri');
  assert.equal(platform.capabilities.connectionChecks,false); await assert.rejects(platform.checkConnections(),{code:'unsupported'});
 }
});
test('connection response validation rejects malformed results and strips extra fields',()=>{
 assert.deepEqual(parseConnectionStatuses([{...fixture[0],secret:'discard'}]),fixture);
 for (const value of [null,{},[{}],[{name:'Codex',state:1}]]) assert.throws(()=>parseConnectionStatuses(value));
});
test('Swift is identified through a versioned handshake and never falls back to local development checks',async()=>{
 for(const valid of [true,false]){
  const p=createPlatform(dependencies({isSwift:()=>true,swiftInfo:async()=>({runtime:'swift',os:'macos',protocolVersion:valid?1:2}),browserConnections:()=>{throw Error('Must not run');}}));
  await p.initialize();assert.equal(p.runtime,'swift');assert.equal(p.name,valid?'macos':'unknown');assert.equal(p.capabilities.connectionChecks,false);
  await assert.rejects(p.checkConnections(),{code:'unsupported'});
 }
});
