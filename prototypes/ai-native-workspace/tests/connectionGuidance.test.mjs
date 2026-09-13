import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionGuidance} from '../src/host/connectionGuidance.ts';
const base={adapterState:'supported',installation:'installed',authentication:'authenticated',responseTest:'passed',catalogState:'available',supportsProviderDefault:true};
test('a previous response never overrides missing installation or unknown authentication',()=>{
 assert.match(connectionGuidance({...base,installation:'missing'}),/Install the provider/);
 assert.match(connectionGuidance({...base,authentication:'unknown'}),/Sign-in is unverified/);
 assert.match(connectionGuidance({...base,authentication:'authNeeded'}),/Sign in through the provider/);
});
test('unsupported and stale routes never recommend sending',()=>{
 assert.match(connectionGuidance({...base,adapterState:'unsupported'}),/not supported/);
 assert.match(connectionGuidance({...base,catalogState:'stale'}),/before sending/);
 assert.match(connectionGuidance({...base,supportsProviderDefault:false}),/does not admit/);
});
test('response guidance distinguishes failed untested and historical success',()=>{
 assert.match(connectionGuidance({...base,responseTest:'failed'}),/draft remains available/);
 assert.match(connectionGuidance({...base,responseTest:'notTested'}),/explicitly send/);
 assert.match(connectionGuidance(base),/not a new connection check/);
});
