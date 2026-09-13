import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentTaskQueue } from './compiled/agentQueue.js';
const agents = [{id:'builder',capabilities:['code']},{id:'reviewer',capabilities:['code']},{id:'designer',capabilities:['design']}];
const task = (id,dependencies=[])=>({id,dependencies,capabilities:['code']});
test('dependencies unlock only after a different agent approves the work',()=>{
 const queue = new AgentTaskQueue([task('first'),task('next',['first'])],agents);
 assert.equal(queue.snapshot()[1].state,'blocked');
 assert.equal(queue.assignNext('designer'),null);
 assert.deepEqual(queue.assignNext('builder'),{taskId:'first',agentId:'builder',kind:'work'});
 queue.submitForReview('first','builder');
 assert.equal(queue.assignNext('builder'),null);
 assert.throws(()=>queue.review('first','builder','approve'));
 assert.equal(queue.snapshot()[1].state,'blocked');
 assert.deepEqual(queue.assignNext('reviewer'),{taskId:'first',agentId:'reviewer',kind:'review'});
 queue.review('first','reviewer','approve');
 assert.equal(queue.snapshot()[0].state,'done');
 assert.equal(queue.snapshot()[1].state,'ready');
});
test('claims prevent duplicate work and one agent taking simultaneous tasks',()=>{
 const queue = new AgentTaskQueue([task('one'),task('two')],agents);
 queue.assignNext('builder');
 assert.equal(queue.assignNext('builder'),null);
 assert.equal(queue.assignNext('reviewer').taskId,'two');
 assert.throws(()=>queue.submitForReview('one','reviewer'));
 queue.submitForReview('one','builder');
 assert.equal(queue.assignNext('builder'),null);
});
test('requested changes require another work and independent review cycle',()=>{
 const queue = new AgentTaskQueue([task('one')],agents);
 queue.assignNext('builder'); queue.submitForReview('one','builder'); queue.assignNext('reviewer');
 queue.review('one','reviewer','request-changes');
 assert.equal(queue.snapshot()[0].state,'ready');
 assert.throws(()=>queue.review('one','reviewer','approve'));
 queue.assignNext('reviewer'); queue.submitForReview('one','reviewer');
 assert.equal(queue.assignNext('reviewer'),null);
 queue.assignNext('builder'); queue.review('one','builder','approve');
 assert.equal(queue.snapshot()[0].state,'done');
});
test('explicit blocks release claims but cannot bypass unfinished dependencies',()=>{
 const queue = new AgentTaskQueue([task('one'),task('two',['one'])],agents);
 queue.assignNext('builder'); queue.block('one','Needs input');
 assert.throws(()=>queue.submitForReview('one','builder'));
 assert.equal(queue.assignNext('builder'),null);
 queue.block('two','External blocker'); queue.unblock('two');
 assert.equal(queue.snapshot()[1].state,'blocked');
 queue.unblock('one'); assert.equal(queue.assignNext('builder').taskId,'one');
});
test('invalid graphs and definitions fail before scheduling',()=>{
 for (const definitions of [[task('a',['missing'])],[task('a',['a'])],[task('a',['b']),task('b',['a'])],[task('a'),task('a')],[task('a',['b','b']),task('b')]]) assert.throws(()=>new AgentTaskQueue(definitions,agents));
 assert.throws(()=>new AgentTaskQueue([task('a')],[agents[0],agents[0]]));
 assert.throws(()=>new AgentTaskQueue(Array.from({length:201},(_,i)=>task(String(i))),agents));
});
test('snapshots and caller-owned arrays cannot mutate queue permissions or state',()=>{
 const definitions = [task('a')]; const roster = structuredClone(agents);
 const queue = new AgentTaskQueue(definitions,roster);
 definitions[0].capabilities.length=0; roster[2].capabilities.push('code');
 const snapshot = queue.snapshot(); snapshot[0].state='done'; snapshot[0].capabilities.length=0;
 assert.equal(queue.snapshot()[0].state,'ready');
 assert.equal(queue.assignNext('designer'),null);
 assert.throws(()=>queue.assignNext('unknown'));
});
