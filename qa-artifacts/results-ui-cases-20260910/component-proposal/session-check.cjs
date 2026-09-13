const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('../../../prototypes/ai-native-workspace/node_modules/typescript');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/inspectionSession.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject});
const f=JSON.parse(fs.readFileSync(__dirname+'/../dto-fixtures.json','utf8'));
const A=f.A.HostArtifactSummary,B=f.B.HostArtifactSummary;
function setup(){const pending=[],states=[];const session=exportsObject.createInspectionSession(q=>new Promise((resolve,reject)=>pending.push({q,resolve,reject})),s=>states.push(s));return {pending,states,session};}
(async()=>{
 let t=setup(),a=t.session.open(A),b=t.session.open(B);
 t.pending[1].resolve(f.B.HostArtifactInspection);await b;t.pending[0].resolve(f.A.HostArtifactInspection);await a;
 assert.equal(t.states.at(-1).selected.artifactID,B.artifactID);assert.equal(t.states.length,3);
 t=setup();a=t.session.open(A);t.session.clear();b=t.session.open(A);t.pending[1].resolve(f.A.HostArtifactInspection);await b;t.pending[0].reject(Error('late'));await a;assert.equal(t.states.at(-1).phase,'ready');assert.equal(t.states.length,4);
 t=setup();a=t.session.open(A);t.pending[0].reject(Error('read'));await a;b=t.session.retry();await t.session.retry();assert.equal(t.pending.length,2);t.pending[1].resolve(f.A.HostArtifactInspection);await b;assert.equal(t.states.at(-1).phase,'ready');
 t=setup();a=t.session.open(A);t.session.dispose();t.pending[0].resolve(f.A.HostArtifactInspection);await a;assert.equal(t.states.length,1);
 t=setup();a=t.session.open(A);t.pending[0].resolve(f.C.HostArtifactInspection);await a;assert.equal(t.states.at(-1).phase,'error');assert.equal('result' in t.states.at(-1),false);
 console.log('PASS 5 session checks: A/B race, same-tuple reopen, duplicate retry, dispose, foreign identity. No React/browser/native execution.');
})().catch(e=>{console.error(e);process.exitCode=1;});
