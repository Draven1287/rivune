import test from 'node:test';
import assert from 'node:assert/strict';
import {subscribeRunUpdates} from '../web/core.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(delayed=false){
 let callback,resolveSubscription;let detached=0,refreshed=0,errors=0;const timers=new Map();let next=0;
 const dispose=subscribeRunUpdates({onRunEvent:fn=>{callback=fn;return delayed?new Promise(resolve=>resolveSubscription=resolve):()=>detached++;}}, {refresh:()=>refreshed++,onError:()=>errors++,schedule:fn=>{timers.set(++next,fn);return next},cancel:id=>timers.delete(id)});
 return {dispose,event:id=>callback({schemaVersion:1,eventID:id}),resolve:()=>resolveSubscription(()=>detached++),timers,counts:()=>({detached,refreshed,errors})};
}
test('pending subscription resolves after disposal and is immediately detached once',async()=>{const f=fixture(true);await tick();f.dispose();f.resolve();await tick();f.dispose();f.event('r:1');assert.deepEqual(f.counts(),{detached:1,refreshed:0,errors:0});assert.equal(f.timers.size,0)});
test('disposal cancels pending refresh and ignores event after teardown',async()=>{const f=fixture();await tick();f.event('r:1');const queued=[...f.timers.values()][0];f.dispose();f.event('r:2');queued();await tick();assert.equal(f.timers.size,0);assert.deepEqual(f.counts(),{detached:1,refreshed:0,errors:0})});
test('disposal before subscription starts creates no listener',async()=>{let calls=0;const dispose=subscribeRunUpdates({onRunEvent:()=>calls++},{refresh:()=>assert.fail('refresh after disposal')});dispose();await tick();assert.equal(calls,0)});
test('duplicates coalesce and a fresh subscription can resume',async()=>{const f=fixture();await tick();f.event('r:1');f.event('r:1');f.event('r:2');assert.equal(f.timers.size,1);[...f.timers.values()][0]();await tick();assert.equal(f.counts().refreshed,1);f.dispose();const g=fixture();await tick();g.event('r:1');[...g.timers.values()][0]();await tick();assert.equal(g.counts().refreshed,1);g.dispose()});
test('late subscription rejection produces no post-disposal status mutation',async()=>{let reject;let errors=0;const dispose=subscribeRunUpdates({onRunEvent:()=>new Promise((_,r)=>reject=r)},{refresh:()=>{},onError:()=>errors++});await tick();dispose();reject(Error('closed'));await tick();assert.equal(errors,0)});
test('in-flight refresh can reject its late result using subscription liveness',async()=>{let event,queued,finish;let applied=0;const dispose=subscribeRunUpdates({onRunEvent:fn=>{event=fn;return ()=>{}}},{schedule:fn=>{queued=fn;return 1},cancel:()=>{},refresh:async isActive=>{await new Promise(resolve=>finish=resolve);if(isActive())applied++}});await tick();event({schemaVersion:1,eventID:'r:1'});queued();await tick();dispose();finish();await tick();assert.equal(applied,0)});
