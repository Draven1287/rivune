import fs from 'node:fs';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const q=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(q,'../..'),s=path.join(root,'tools/symphony/source-import-candidate');
const j=n=>JSON.parse(fs.readFileSync(path.join(q,n))),h=b=>crypto.createHash('sha256').update(b).digest('hex'),hf=f=>h(fs.readFileSync(f));
const m=j('source-manifest.json'),r=j('build-receipt.json');
const git=(...args)=>cp.execFileSync('git',['-C',s,...args],{maxBuffer:20000000});
assert.equal(git('rev-parse','HEAD').toString().trim(),'2ea834a1e2385c34b8f516854b5317c6a08a0607');
assert.equal(m.files.length,148);
for(const f of m.files){assert.equal(hf(path.join(s,f.path)),f.sha256,f.path);assert.equal(h(git('show',r.sourceCommit+':'+f.path)),f.sha256,f.path);}
assert.equal(h(m.files.map(f=>f.path+'\0'+f.sha256+'\n').join('')),r.sourceTreeSHA256);
const files=root=>fs.readdirSync(root,{recursive:true}).filter(f=>fs.statSync(path.join(root,f)).isFile()).sort();
for(const [root,map,count] of [[r.artifact,r.bundleFiles,3],[r.embeddedFrontendPath,r.embeddedFiles,7]]){assert.equal(Object.keys(map).length,count);assert.deepEqual(files(root),Object.keys(map).sort());for(const [f,v] of Object.entries(map))assert.equal(hf(path.join(root,f)),v);}
assert.equal(hf(r.binary),'37c8751c631631477579ce848c90620d375495181394471a3214fe07be261c86');
assert.deepEqual(j('source-before.json'),j('source-after.json'));
const p=j('preserved-after.json');assert.equal(Object.keys(p).length,525);assert.deepEqual(j('preserved-before.json'),p);for(const [f,v] of Object.entries(p))assert.equal(hf(f),v,f);
const deps=fs.readFileSync(path.join(q,'native-asset-dependencies.d'),'utf8').replaceAll('\\ ',' ');for(const f of Object.keys(r.embeddedFiles))assert(deps.includes(r.embeddedFrontendPath+'/'+f),f);
assert.equal(hf(path.join(s,'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs')),r.embeddedFiles['desktop-host.mjs']);
assert(!fs.existsSync(path.join(q,'profile-reserved-not-launched')));
console.log('PASS: 148 source/blob, 3 bundle, 7 frontend, 525 preservation, bridge, dependency mapping, profile absent');
console.log('tree',git('rev-parse','HEAD^{tree}').toString().trim());
console.log('status',git('status','--porcelain').toString());
console.log('override',JSON.stringify(r.effectiveConfigOverride));
