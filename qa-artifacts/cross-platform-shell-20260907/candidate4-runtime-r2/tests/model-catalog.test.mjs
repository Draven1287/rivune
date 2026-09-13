import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseModelCatalog,parseModelSelection} from '../web/core.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../../../tauri-r2-integration-review-20260907/r5-model-catalog/fixtures/catalog.json',import.meta.url)));
test('accepted fixture catalog retains scoped identifiers and unknown states',()=>assert.deepEqual(parseModelCatalog(structuredClone(fixture)),fixture));
for(const [name,alter] of [
 ['duplicate provider',c=>c.providers.push(c.providers[0])],
 ['duplicate model',c=>c.providers[0].models.push(c.providers[0].models[0])],
 ['duplicate effort',c=>c.providers[0].models[0].efforts.push(c.providers[0].models[0].efforts[0])],
 ['unknown defaults',c=>c.providers[0].defaults.modelID='invented'],
 ['private path',c=>c.providers[0].executablePath='/private/path'],
 ['missing default capability',c=>delete c.providers[0].supportsProviderDefault],
 ['unknown authentication value',c=>c.providers[0].authentication='probably-signed-in'],
 ['oversize UTF8 identity',c=>c.providers[0].id='é'.repeat(65)],
]) test(`catalog rejects ${name}`,()=>{const c=structuredClone(fixture);alter(c);assert.throws(()=>parseModelCatalog(c));});
test('selection accepts explicit provider default without inventing a model',()=>{const s={schemaVersion:1,providerID:'opaque',modelID:null,effortID:null,catalogRevision:'v1'};assert.deepEqual(parseModelSelection(s),s);assert.equal(parseModelSelection(null),null);});
test('selection rejects effort without a model and missing fields',()=>{assert.throws(()=>parseModelSelection({schemaVersion:1,providerID:'p',modelID:null,effortID:'high',catalogRevision:'v1'}));assert.throws(()=>parseModelSelection({schemaVersion:1,providerID:'p',catalogRevision:'v1'}));});
import {parseTeamSelection,parseRichDraftReceipt,modelChoiceIdentity} from '../web/core.mjs';
const pick=(id='one')=>({schemaVersion:1,providerID:id,modelID:null,effortID:null,catalogRevision:'v1'});
test('team validates ordered distinct routes and lead range',()=>{const team={schemaVersion:1,leadIndex:1,members:[pick(),pick('two')]};assert.equal(parseTeamSelection(team),team);assert.throws(()=>parseTeamSelection({...team,leadIndex:2}));assert.throws(()=>parseTeamSelection({...team,members:[pick(),pick()]}));});
test('durable receipt must echo exact selection and team',()=>{const request={conversationID:'c',mutationID:'m',expectedRevision:1,attachmentIDs:[],selection:pick(),team:null};const receipt={...request,state:'durable',revision:2};assert.equal(parseRichDraftReceipt(receipt,request),receipt);assert.throws(()=>parseRichDraftReceipt({...receipt,selection:pick('two')},request));const missing={...receipt};delete missing.team;assert.throws(()=>parseRichDraftReceipt(missing,request));});
test('choice identity changes with model, effort, team order and lead',()=>{const a={selection:pick(),team:{schemaVersion:1,leadIndex:0,members:[pick(),pick('two')]}};for(const change of [x=>x.selection.modelID='new',x=>x.selection.effortID='high',x=>x.team.leadIndex=1,x=>x.team.members.reverse()]){const b=structuredClone(a);change(b);assert.notEqual(modelChoiceIdentity(a),modelChoiceIdentity(b));}});
import {parseRunActivity} from '../web/core.mjs';
const activity=()=>({schemaVersion:1,baseSequence:8,entries:[{schemaVersion:1,eventID:'r:8',requestID:'r',conversationID:'c',sequence:8,kind:'memberStarted',phase:'contribute',state:'running',memberID:'m',providerID:'p',role:'Answer',summary:'Member started',textDelta:null,error:null}]});
test('activity accepts authoritative truncated snapshot without inventing prior events',()=>{const a=activity();assert.equal(parseRunActivity(a,{id:'r',conversationID:'c'}),a)});
test('activity rejects cross-run entries, gaps, duplicate events and private fields',()=>{for(const alter of [a=>a.entries[0].requestID='other',a=>a.entries[0].sequence=9,a=>a.entries.push(a.entries[0]),a=>a.entries[0].stderr='private']){const a=activity();alter(a);assert.throws(()=>parseRunActivity(a,{id:'r',conversationID:'c'}))}});
test('actual Rust serialized catalog and rich receipt cross the renderer boundary',()=>{
 const actual=JSON.parse(fs.readFileSync(new URL('../../../tauri-r2-integration-review-20260907/r5-model-catalog/RUNTIME_FIXTURE_ACTUAL.json',import.meta.url)));
 const catalog=parseModelCatalog(actual.catalog);
 assert.ok(catalog.providers.every(p=>p.models.length===0&&p.authentication==='unknown'&&p.supportsProviderDefault));
 const receipt=actual.richDraftReceipt;
 assert.equal(parseRichDraftReceipt(receipt,{conversationID:'conversation-fixture-1',mutationID:'mutation-fixture-1',expectedRevision:0,attachmentIDs:[],selection:actual.admittedModelSelection.requested,team:receipt.team}).state,'durable');
 assert.equal(actual.runtimeCapabilities.constellation,'unavailable');
});
import {parseRuntimeCapabilities} from '../web/core.mjs';
test('runtime capability is explicit and rejects inferred availability',()=>{const capability={schemaVersion:1,constellation:'unavailable',minimumMembers:2,reasonCode:'ENGINE_NOT_CONNECTED'};assert.equal(parseRuntimeCapabilities(capability),capability);assert.throws(()=>parseRuntimeCapabilities({...capability,constellation:true}));assert.throws(()=>parseRuntimeCapabilities({...capability,minimumMembers:1}));});
import {parseConstellationDetails} from '../web/core.mjs';
const memberProjection=()=>({memberResults:[{schemaVersion:1,memberID:'member-1',providerID:'provider-1',role:'independentAnswer',text:'Public answer',truncated:false}],resolution:{schemaVersion:1,kind:'leadSynthesis',reviewed:true,reviewerMemberID:'member-1',providerID:'provider-1',summary:'The lead synthesized the independent answers.'}});
test('public member projection retains only bounded answers and factual synthesis summary',()=>{const p=memberProjection();assert.equal(parseConstellationDetails(p),p)});
test('public projection rejects private fields, duplicate members and oversized text',()=>{for(const alter of [p=>p.memberResults[0].checkpoint='private',p=>p.memberResults.push(p.memberResults[0]),p=>p.memberResults[0].text='é'.repeat(12289),p=>p.memberResults[0].role='decide',p=>p.resolution.artifactDigest='private']){const p=memberProjection();alter(p);assert.throws(()=>parseConstellationDetails(p))}});
test('actual concurrent host fixture member projection matches renderer parser',()=>{
 const actual=JSON.parse(fs.readFileSync(new URL('../../../tauri-r2-integration-review-20260907/r5-model-catalog/CONSTELLATION_PUBLIC_FIXTURES_20260908.json',import.meta.url)));
 const run=actual.completedRun;const projection={memberResults:run.memberResults,resolution:run.resolution};
 assert.equal(parseConstellationDetails(projection),projection);assert.equal(projection.memberResults.length,2);assert.equal(projection.resolution.kind,'leadSynthesis');assert.equal(parseRunActivity(run.activity,run),run.activity);
});
