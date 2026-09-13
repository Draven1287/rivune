import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
const root=new URL('../src/',import.meta.url);
async function files(dir) { const entries=await readdir(dir,{withFileTypes:true}); return (await Promise.all(entries.map(e=>e.isDirectory()?files(join(dir,e.name)):join(dir,e.name)))).flat(); }
test('shared code cannot import Tauri or independently detect an operating system',async()=>{
 for(const path of await files(root.pathname)){
  if(!path.endsWith('.ts'))continue;
  const rel=relative(root.pathname,path);const source=await readFile(path,'utf8');
  if(!rel.startsWith('services/native/'))assert.doesNotMatch(source, /from\s+['"]@tauri-apps\//,rel);
  if(!rel.startsWith('platform/')&&!rel.startsWith('services/native/'))assert.doesNotMatch(source,/navigator\.(userAgent|platform)|__TAURI_INTERNALS__|\bisTauri\s*\(/,rel);
 }
});
test('persistent storage access stays behind the shared service',async()=>{
 for(const path of await files(root.pathname)){
  if(!path.endsWith('.ts')||relative(root.pathname,path).startsWith('services/storage/'))continue;
  assert.doesNotMatch(await readFile(path,'utf8'),/\blocalStorage\b/,path);
 }
});
