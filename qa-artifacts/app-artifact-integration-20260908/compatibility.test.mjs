import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostAdapter} from './candidate/web/core.mjs';
import {artifactReads} from './candidate/web/artifact-review.mjs';
const base = {getSnapshot(){},openConversation(){},submitRun(){},reconcileRun(){}};
test('canonical host without artifact commands remains unavailable',()=>assert.equal(artifactReads(createHostAdapter(base)),null));
test('partial catalog never exposes a broken catalog action',()=>assert.equal(artifactReads(createHostAdapter({...base,listArtifacts(){}})),null));
test('DTO read requests preserve binding and drop unrelated fields',async()=>{
 const calls=[]; const host={...base,listArtifacts(r){calls.push(r);return {ok:true,value:[]}},readArtifactFile(r){calls.push(r);return {ok:false,error:{code:'source_changed'}}},readPreparedDiff(r){calls.push(r);return {ok:false,error:{code:'stale_generation'}}}};
 const adapter=artifactReads(createHostAdapter(host));
 assert.deepEqual(await adapter.listArtifacts({conversationId:'c1',root:'/private'}),{ok:true,value:[]});
 assert.equal((await adapter.readArtifactFile({artifactId:'a',expectedRevisionSha256:'h',path:'x.txt',grantId:'bad'})).error.code,'source_changed');
 await adapter.readPreparedDiff({preparedOperationId:'p',expectedCapturedSnapshotSha256:'s',fileIndex:0,beforeOffset:0,afterOffset:2,path:'/private'});
 assert.deepEqual(calls,[{conversationId:'c1'},{artifactId:'a',expectedRevisionSha256:'h',path:'x.txt'},{preparedOperationId:'p',expectedCapturedSnapshotSha256:'s',fileIndex:0,beforeOffset:0,afterOffset:2}]);
 assert.equal(adapter.applyPreparedArtifact,undefined);
});
