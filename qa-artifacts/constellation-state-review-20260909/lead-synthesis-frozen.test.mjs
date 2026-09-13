import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire,Module} from 'node:module';
import path from 'node:path';
const root=process.cwd(), repo=path.join(root,'tools/symphony/source-import-candidate');
const app=path.join(root,'prototypes/ai-native-workspace');
const require=createRequire(path.join(app,'package.json'));
const ts=require('typescript'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const cache=new Map();
function load(rel){
 if(cache.has(rel))return cache.get(rel);
 const source=execFileSync('git',['-C',repo,'show','7ff40f55b43fde56297a96b5806ee80bff3dbac9:prototypes/ai-native-workspace/'+rel],{encoding:'utf8'});
 const m=new Module(path.join(app,rel));m.filename=path.join(app,rel);m.paths=Module._nodeModulePaths(path.dirname(m.filename));
 m.require=name=>name.startsWith('.')?load(path.posix.normalize(path.posix.join(path.posix.dirname(rel),name)).replace(/(?<!\.ts)$/,'.ts')):require(name);
 m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,m.filename);
 cache.set(rel,m.exports);return m.exports;
}
test('frozen lead synthesis renders honest wording and two initially closed evidence levels',()=>{
 const {ConstellationRun}=load('src/host/Constellation.tsx');
 const run={status:'completed',answer:'Canonical answer',admitted:{mode:'constellation',team:{leadIndex:0,members:[{providerID:'first',modelID:null,effortID:null},{providerID:'second',modelID:null,effortID:null}]}},activity:[],memberResults:[{memberID:'member-2',text:'Independent evidence',truncated:false}],resolution:{reviewed:true,summary:'Lead synthesized the answer.'}};
 const html=renderToStaticMarkup(React.createElement(ConstellationRun,{run}));
 assert.match(html,/Lead synthesis · evidence/);assert.match(html,/no separate peer review was run/);
 assert.equal((html.match(/<details[ >]/g)||[]).length,2);assert.doesNotMatch(html,/<details[^>]*\sopen(?:[ =>])/);
 assert.doesNotMatch(html,/Host reports a reviewed delivery/);assert.doesNotMatch(html,/Canonical answer/);
});
