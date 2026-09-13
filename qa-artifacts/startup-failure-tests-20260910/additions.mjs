// Uses the existing hostController.test.mjs fixture; actual controller, synthetic bridge.
const startupGate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const startupNoWrites=f=>assert.deepEqual(f.calls.filter(c=>['save','submit','configure','journal.write','journal.clear','reconcile'].includes(c[0])),[]);
for(const pending of [false,true])test(`startup failure: rejected initial snapshot retains recovery identity (${pending})`,async t=>{
 const f=fixture();if(pending)f.pending={requestID:'retained-request',conversationID:'chat'};const before=clone(f.pending);
 f.bridge.getSnapshot=async()=>{f.calls.push(['snapshot']);throw Error('private profile failure');};f.bridge.configureSelectedProvider=async()=>{f.calls.push(['configure']);throw Error('Forbidden');};
 const c=f.controller();t.after(()=>c.dispose());await c.start();assert.equal(c.getState().snapshot,null);assert.equal(c.getState().phase,pending?'uncertain':'error');assert(!c.getState().error.includes('private profile'));assert.deepEqual(f.pending,before);assert.deepEqual(c.getState().drafts,{});
 await assert.rejects(()=>c.send('chat'));await assert.rejects(()=>c.saveDraft('chat'));startupNoWrites(f);assert.deepEqual(f.pending,before);
});
for(const outcome of ['resolve','reject'])test(`startup failure: disposed hydration ${outcome} cannot replace fresh controller`,async t=>{
 const old=fixture(),g=startupGate();old.bridge.getSnapshot=()=>{old.calls.push(['snapshot']);return g.promise;};let entered=0;const c=old.controller();c.subscribe(()=>entered++);const starting=c.start();await flush();assert.equal(count(old,'snapshot'),1);c.dispose();const frozen=clone(c.getState()),notifications=entered;
 const fresh=fixture();fresh.snapshot.conversations[0].draft='Fresh controller draft';const replacement=fresh.controller();t.after(()=>replacement.dispose());await replacement.start();const replacementBefore=clone(replacement.getState());
 if(outcome==='resolve')g.resolve(clone(old.snapshot));else g.reject(Error('Old rejection'));await starting;await flush();assert.deepEqual(c.getState(),frozen);assert.equal(entered,notifications);assert.deepEqual(replacement.getState(),replacementBefore);assert.equal(count(old,'unsubscribe'),1);startupNoWrites(old);startupNoWrites(fresh);
});
test('startup failure: disposal during subscription releases late listener without fetching snapshot',async()=>{
 const f=fixture(),g=startupGate();let removed=0;f.bridge.onRunEvent=()=>{f.calls.push(['subscribe']);return g.promise;};const c=f.controller();const starting=c.start();await flush();c.dispose();g.resolve(()=>removed++);await starting;assert.equal(removed,1);assert.equal(count(f,'snapshot'),0);startupNoWrites(f);
});
