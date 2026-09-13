import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base=new URL('./',import.meta.url);await mkdir(new URL('./texts/',base),{recursive:true});
const trees=JSON.parse(await readFile(new URL('./upstream-trees.json',base)));const results=[];
for(const t of trees){
 for(const entry of t.tree.filter(x=>['LICENSE','LICENSE.md','LICENSE-APACHE','LICENSE-MIT','COPYRIGHT.md'].includes(x.path))){
 const url=`https://raw.githubusercontent.com/${t.repository}/${t.commit}/${entry.path}`;
 const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`${r.status} ${url}`);
 const bytes=Buffer.from(await r.arrayBuffer());const sha256=createHash('sha256').update(bytes).digest('hex');const blob=createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');if(blob!==entry.sha)throw Error('Git blob mismatch');
 await writeFile(new URL(`./texts/${sha256}.txt`,base),bytes);results.push({repository:t.repository,commit:t.commit,path:entry.path,url,sha256,gitBlobSHA1:blob,bytes:bytes.length});
 }
}
await writeFile(new URL('./fetched-notices.json',base),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({repository:r.repository,commit:r.commit,path:r.path,bytes:r.bytes,sha256:r.sha256})),null,2));
