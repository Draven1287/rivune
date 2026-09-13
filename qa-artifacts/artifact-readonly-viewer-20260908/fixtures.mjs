import {sha256} from './artifact-controller.mjs';
export const unsafe='<!doctype html>\r\n<script>globalThis.artifactExecuted=true</script>\n<img src="https://invalid.example/escape" onerror="alert(1)">\n  tabs\tand spaces  \n';
export async function fixture({artifactId='artifact-A',conversationId='conversation-A',content=unsafe,revision='a',access='active'}={}){
 const contents={'index.html':content,'notes.txt':'Synthetic notes — no project files changed.\n'};
 const files=await Promise.all(Object.entries(contents).map(async([path,content])=>({path,byteCount:new TextEncoder().encode(content).length,sha256:await sha256(content)})));
 return {record:{schemaVersion:1,artifactId,revisionSha256:revision.repeat(64),origin:{conversationId,turnId:'turn-1',answerId:'answer-'+revision,projectId:'project-A',responseSha256:'e'.repeat(64)},summary:'Synthetic '+artifactId+' revision '+revision,files,totalBytes:files.reduce((n,f)=>n+f.byteCount,0),access},contents};
}
