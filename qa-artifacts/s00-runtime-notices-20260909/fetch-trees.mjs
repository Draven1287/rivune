import { readFile, writeFile } from 'node:fs/promises';
const entries = JSON.parse(await readFile(new URL('./package-lineage.json', import.meta.url)));
const trees=[];
for (const p of entries) {
 const repository=p.repository.replace(/\/$/,'').replace('https://github.com/',''); const commit=p.vcs.git.sha1;
 if(trees.some(t=>t.repository===repository&&t.commit===commit))continue;
 const url=`https://api.github.com/repos/${repository}/git/trees/${commit}?recursive=1`;
 const r=await fetch(url,{headers:{'User-Agent':'Rivune-notice-review'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`${r.status} ${url}`);
 const t=await r.json();if(t.truncated)throw Error('Truncated tree');
 trees.push({repository,commit,url,tree:t.tree.filter(x=> /(^|\/)(licen[cs]e|copying|notice|copyright)([.\-_]|$)/i.test(x.path)||x.path.endsWith('Cargo.toml'))});
}
await writeFile(new URL('./upstream-trees.json',import.meta.url),JSON.stringify(trees,null,2)+'\n');
console.log(JSON.stringify(trees.map(t=>({repository:t.repository,commit:t.commit,notices:t.tree.filter(x=>!x.path.endsWith('Cargo.toml')).map(x=>({path:x.path,mode:x.mode}))})),null,2));
