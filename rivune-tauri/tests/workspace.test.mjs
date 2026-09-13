import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConversations } from './compiled/workspace.js';
test('retains single-provider identity and pending engine strategy without guessing', () => {
 const single = { id: 's', prompt: 'Build an app', mode: 'single', provider: 'Claude', createdAt: 1 };
 const engine = { id: 'e', prompt: 'Build an app', mode: 'pending', createdAt: 2 };
 assert.deepEqual(parseConversations(JSON.stringify([single, engine])), [single, engine]);
 assert.deepEqual(parseConversations(JSON.stringify([{...single, provider: 'unknown'}])), []);
});
test('recovers safely from malformed or invalid stored conversations', () => {
 assert.deepEqual(parseConversations('{'), []);
 assert.deepEqual(parseConversations('{}'), []);
 const row = {id:'one',prompt:'<img src=x onerror=alert(1)>',mode:'council',createdAt:1};
 assert.deepEqual(parseConversations(JSON.stringify([null, {}, row, row, {...row,id:'two',mode:'invalid'}])), [row]);
 assert.equal(parseConversations(JSON.stringify(Array.from({length:60},(_,i)=>({...row,id:String(i)})))).length,50);
});
test('preserves legacy prompts and multi-message continuation with per-message routing', () => {
 const legacy = {id:'legacy',prompt:'First question',mode:'single',provider:'Claude',createdAt:1};
 const messages = [
  {prompt:'First question',mode:'single',provider:'Claude',createdAt:1},
  {prompt:'Compare another perspective',mode:'single',provider:'Gemini',createdAt:2},
  {prompt:'Bring the team together',mode:'pending',createdAt:3}
 ];
 const continued = {...legacy,id:'continued',messages};
 assert.deepEqual(parseConversations(JSON.stringify([legacy,continued])),[legacy,continued]);
 assert.equal(parseConversations(JSON.stringify([legacy]))[0].messages,undefined);
});
test('rejects invalid message histories without dropping valid neighboring conversations', () => {
 const message = {prompt:'Hello',mode:'single',provider:'Codex',createdAt:1};
 const row = {id:'valid',...message,messages:[message]};
 const invalidHistories = [null,{},[],[null],[{...message,prompt:' '}],[{...message,prompt:'x'.repeat(12001)}],[{...message,mode:'wrong'}],[{...message,provider:'unknown'}],[{...message,createdAt:'1'}],Array(101).fill(message)];
 for (const messages of invalidHistories) {
  assert.deepEqual(parseConversations(JSON.stringify([{...row,id:'invalid',messages},row])),[row]);
 }
 assert.equal(parseConversations(JSON.stringify([{...row,messages:Array(100).fill(message)}]))[0].messages.length,100);
});
test('restores simulated replies and marks unfinished streams interrupted on restart', () => {
 const message = {prompt:'Hello',mode:'single',provider:'Codex',createdAt:1};
 const messages = ['completed','stopped','error','streaming','interrupted'].map(status=>({...message,simulation:{text:'Partial mock text',status,scenario:'streaming',...(status==='error'?{error:'Simulated failure'}:{})}}));
 const row = {id:'one',...message,messages};
 const recovered = parseConversations(JSON.stringify([row]))[0];
 assert.deepEqual(recovered.messages.map(message=>message.simulation.status),['completed','stopped','error','interrupted','interrupted']);
 assert.equal(recovered.messages[3].simulation.text,'Partial mock text');
 assert.equal(recovered.messages[2].simulation.error,'Simulated failure');
 assert.equal(recovered.messages[0].simulation.scenario,'streaming');
});
test('corrupt simulated results cannot erase user prompts or become real responses', () => {
 const message = {prompt:'Keep this request',mode:'pending',createdAt:1};
 const invalid = [null,[],{}, {text:'Reply',status:'real'}, {text:2,status:'completed'}, {text:'x'.repeat(48001),status:'completed'}, {text:'',status:'error',error:'x'.repeat(2001)}, {text:'',status:'completed',scenario:'unknown'}];
 for (const simulation of invalid) {
  const row = {id:'one',...message,messages:[{...message,simulation}]};
  assert.deepEqual(parseConversations(JSON.stringify([row]))[0].messages,[message]);
 }
 const legacy = {id:'legacy',...message,simulated:true,assistant:'Unverified legacy output'};
 assert.deepEqual(parseConversations(JSON.stringify([legacy])),[{id:'legacy',...message}]);
 const boundary = {text:'x'.repeat(48000),status:'error',error:'x'.repeat(2000)};
 assert.deepEqual(parseConversations(JSON.stringify([{id:'boundary',...message,messages:[{...message,simulation:boundary}]}]))[0].messages[0].simulation,boundary);
});
test('archive and project associations survive recovery without changing legacy chats', () => {
 const legacy = {id:'legacy',prompt:'Hello',mode:'pending',createdAt:1};
 const archived = {...legacy,id:'archived',archived:true,projectId:'project-123'};
 const restored = {...legacy,id:'restored',archived:false,projectId:'project-123'};
 assert.deepEqual(parseConversations(JSON.stringify([legacy,archived,restored])),[legacy,archived,restored]);
 assert.equal(parseConversations(JSON.stringify([{...legacy,projectId:'  project-123  '}]))[0].projectId,'project-123');
});
test('malformed archive and project fields do not hide or discard valid conversations', () => {
 const legacy = {id:'legacy',prompt:'Keep this conversation',mode:'pending',createdAt:1};
 for (const archived of [null,1,'true',{},[]]) {
  assert.deepEqual(parseConversations(JSON.stringify([{...legacy,archived}])),[legacy]);
 }
 for (const projectId of [null,1,{},[],'','  ','x'.repeat(201)]) {
  assert.deepEqual(parseConversations(JSON.stringify([{...legacy,projectId}])),[legacy]);
 }
 assert.equal(parseConversations(JSON.stringify([{...legacy,projectId:'x'.repeat(200)}]))[0].projectId.length,200);
});
test('Council example contributions survive reload and cannot replace a valid prompt when malformed', () => {
 const fixture = {title:'Example',summary:'Summary',contributions:[{perspective:'Demand',summary:'Test',detail:'Authored detail'},{perspective:'Risk',summary:'Check',detail:'Authored detail'}]};
 const row = {id:'council',prompt:'Keep request',mode:'council',createdAt:1,simulation:{text:'Summary',status:'completed',council:fixture}};
 assert.deepEqual(parseConversations(JSON.stringify([row]))[0].simulation.council,fixture);
 for (const council of [null,{}, {...fixture,contributions:[]}, {...fixture,contributions:[{...fixture.contributions[0],detail:42},fixture.contributions[1]]}]) {
  const restored=parseConversations(JSON.stringify([{...row,simulation:{...row.simulation,council}}]))[0];
  assert.equal(restored.prompt,'Keep request');assert.equal(restored.simulation.text,'Summary');assert.equal(restored.simulation.council,undefined);
 }
});
