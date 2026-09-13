import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {teamRoutes} from 'file:///Users/Aaravshah/Documents/ChatGPT/App%20for%20me%20to%20integrate%20all%20my%20AI/qa-artifacts/tauri-r2-integration-review-20260907/layout-milestone/team-mount-review-snapshot-v1/web/team-controls.mjs';
const catalog=()=>({schemaVersion:1,revision:'r1',providers:Array.from({length:7},(_,i)=>({id:`p${i}`,label:`Provider ${i}`,transport:'cli',adapterState:'supported',installation:'installed',authentication:'unknown',responseTest:'notTested',catalogState:'unknown',models:[],defaults:{modelID:null,effortID:null},supportsProviderDefault:true,errorCode:null}))});
const selection=i=>({schemaVersion:1,providerID:`p${i}`,modelID:null,effortID:null,catalogRevision:'r1'});
const team=()=>({schemaVersion:1,leadIndex:0,members:[selection(0),selection(1)]});
const capability={schemaVersion:1,constellation:'unavailable',minimumMembers:2,reasonCode:'ENGINE_NOT_CONNECTED'};
test('routes use actual defaults capability without inventing models or authentication',()=>{
 const c=catalog();assert.equal(teamRoutes(c).length,7);
 c.providers[0].supportsProviderDefault=false;c.providers[1].catalogState='stale';c.providers[2].adapterState='unsupported';c.providers[3].installation='missing';c.providers[4].authentication='authNeeded';
 assert.deepEqual(teamRoutes(c).map(r=>r.selection.providerID),['p5','p6']);
});
test('model and reasoning options require catalog availability and explicit default support',()=>{
 const c=catalog();c.providers=c.providers.slice(0,1);const p=c.providers[0];p.supportsProviderDefault=false;p.catalogState='available';
 p.models=[{id:'m',label:'Model',availability:'available',effortState:'supported',efforts:[{id:'high',label:'High'}],supportsDefaultEffort:false}];
 assert.deepEqual(teamRoutes(c).map(r=>r.selection.effortID),['high']);p.models[0].supportsDefaultEffort=true;
 assert.deepEqual(teamRoutes(c).map(r=>r.selection.effortID),[null,'high']);p.models[0].availability='unknown';assert.equal(teamRoutes(c).length,0);
});