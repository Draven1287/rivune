import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectionGuidance,connectionStateLabels} from '../src/host/connectionGuidance.ts';
test('historic success never overrides any installation, authentication or route blocker',()=>{
 for(const installation of ['installed','missing','unknown','notApplicable'])
 for(const authentication of ['authenticated','authNeeded','unknown'])
 for(const adapterState of ['supported','unsupported','unavailable']) {
  const p=Object.freeze({installation,authentication,adapterState,responseTest:'passed',catalogState:'available',supportsProviderDefault:true});
  const result=connectionGuidance(p);
  const blocked=adapterState!=='supported'||['missing','unknown'].includes(installation)||authentication!=='authenticated';
  assert.equal(result.includes('Return to your conversation to continue'),!blocked);
  assert.equal(result.includes('previous successful response'),!blocked);
 }
});
test('missing, stale and unsupported guidance is distinct and label coverage is complete',()=>{
 const base={adapterState:'supported',installation:'installed',authentication:'authenticated',responseTest:'passed',catalogState:'available',supportsProviderDefault:true};
 const results=[connectionGuidance({...base,installation:'missing'}),connectionGuidance({...base,catalogState:'stale'}),connectionGuidance({...base,adapterState:'unsupported'})];
 assert.equal(new Set(results).size,3);
 for(const key of ['installed','missing','unknown','notApplicable','authenticated','authNeeded','passed','failed','notTested'])assert.equal(typeof connectionStateLabels[key],'string');
});
