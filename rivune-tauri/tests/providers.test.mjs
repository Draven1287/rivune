import test from 'node:test';
import assert from 'node:assert/strict';
import { MockProvider } from './compiled/providers.js';
const request = scenario => ({prompt:'test', model:'Mock OpenAI', scenario, signal:new AbortController().signal});
async function collect(req) { const events=[]; for await (const event of new MockProvider(1).stream(req)) events.push(event); return events; }
test('streaming produces chunks and explicit fixture usage without networking', async () => {
 const previous=globalThis.fetch; globalThis.fetch=()=>{throw Error('Network forbidden');};
 try { const events=await collect(request('streaming')); assert.ok(events.filter(e=>e.type==='text').length>1); assert.deepEqual(events.at(-1),{type:'usage',input:120,output:35,simulated:true}); } finally {globalThis.fetch=previous;}
});
test('failure scenarios preserve error codes and retry eligibility', async () => {
 for (const [scenario,code,retryable] of [['rate-limit','429',true],['offline','offline',true],['invalid-auth','401',false],['malformed','invalid-response',false],['context-limit','context-limit',false]]) await assert.rejects(collect(request(scenario)),e=>e.code===code && e.retryable===retryable);
});
test('abort stops a pending slow reply', async () => {
 const controller=new AbortController(); const pending=collect({...request('slow'),signal:controller.signal}); controller.abort(); await assert.rejects(pending,{name:'AbortError'});
});
test('tool event is simulated and never executes a file operation', async()=> { const events=await collect(request('tool-call')); assert.equal(events[0].type,'tool'); assert.match(events[0].name,/no file access/); });
test('continuation receives prior context without pretending to infer an answer', async () => {
 const events = await collect({...request('success'), history: [{role:'user',content:'first'}, {role:'assistant',content:'mock response'}]});
 assert.match(events[0].text,/2 previous messages/);
 assert.match(events[0].text,/No model ran/);
});
test('cancellation after the last text chunk does not report completed usage', async () => {
 const controller = new AbortController();
 const stream = new MockProvider(1).stream({...request('success'),signal:controller.signal});
 assert.equal((await stream.next()).value.type,'text'); controller.abort();
 await assert.rejects(stream.next(),{name:'AbortError'});
});
