import test from 'node:test';
import assert from 'node:assert/strict';
import { rendererScenarioSelection, teamFormScenarioIDs } from './rendererScenarios.ts';
test('Default mounted harness selection preserves the full suite',()=>assert.deepEqual(rendererScenarioSelection('?preview=1&team=1'),{ids:null,error:null}));
test('Explicit team form selection is limited to the safe named scenarios',()=>{
 assert.deepEqual(rendererScenarioSelection('?scenario=team-form').ids,teamFormScenarioIDs);
 for(const id of teamFormScenarioIDs) assert.deepEqual(rendererScenarioSelection('?scenario='+id),{ids:[id],error:null});
});
test('Unknown empty repeated and injected scenario selectors never fall back to the full suite',()=>{
 for(const search of ['?scenario=','?scenario=shutdown','?scenario=.*','?scenario=team-form&scenario=team-keep','?scenario=%3Cscript%3E']){
  const result=rendererScenarioSelection(search);assert.deepEqual(result.ids,[]);assert.ok(result.error);
 }
});
