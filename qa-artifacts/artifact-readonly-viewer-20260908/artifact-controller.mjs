// Read-only boundary: the injected adapter supplies metadata and bounded text only.
const MAX_FILE=128*1024,MAX_TOTAL=256*1024,MAX_METADATA=256*1024;
const encoder=new TextEncoder();
const bytes=s=>encoder.encode(s);
const id=s=>typeof s==='string'&&s.length>0&&s.length<=128&&!/[\u0000-\u001f\u007f]/.test(s);
const hash=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const text=s=>typeof s==='string'&&![...s].some(c=>{const n=c.codePointAt(0);return n>=0xd800&&n<=0xdfff});
const fail=()=>{throw Error('INVALID_METADATA')};
export function validateCatalog(records,conversationId){
 if(!id(conversationId)||!Array.isArray(records)||records.length>100)fail();
 let encoded;try{encoded=JSON.stringify(records)}catch{fail()}
 if(bytes(encoded).length>MAX_METADATA)fail();
 const seen=new Set();
 return Object.freeze(records.map(r=>{
  if(!r||r.schemaVersion!==1||!id(r.artifactId)||!hash(r.revisionSha256)||!r.origin||r.origin.conversationId!==conversationId||!id(r.origin.turnId)||!id(r.origin.answerId)||!(r.origin.projectId===null||id(r.origin.projectId))||!hash(r.origin.responseSha256)||!['active','archived-read-only'].includes(r.access)||!text(r.summary)||!r.summary.trim()||bytes(r.summary).length>4096||!Array.isArray(r.files)||r.files.length<1||r.files.length>40)fail();
  const key=JSON.stringify([r.artifactId,r.revisionSha256]);if(seen.has(key))fail();seen.add(key);
  const paths=new Set();let total=0;
  const files=r.files.map(f=>{
   if(!f||!text(f.path)||bytes(f.path).length>240||!f.path||/[\\:%?#\u0000-\u001f\u007f]/.test(f.path)||!f.path.split('/').every(p=>p&&!p.startsWith('.')&&!/[ .]$/.test(p)&&! /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))||! /\.(html|css|js|json|md|txt)$/i.test(f.path)||!hash(f.sha256)||!Number.isInteger(f.byteCount)||f.byteCount<1||f.byteCount>MAX_FILE)fail();
   const key=f.path.normalize('NFC').toLowerCase();if(paths.has(key))fail();paths.add(key);total+=f.byteCount;
   return Object.freeze({path:f.path,sha256:f.sha256,byteCount:f.byteCount});
  });
  if(total>MAX_TOTAL||total!==r.totalBytes)fail();
  return Object.freeze({schemaVersion:1,artifactId:r.artifactId,revisionSha256:r.revisionSha256,origin:Object.freeze({conversationId,turnId:r.origin.turnId,answerId:r.origin.answerId,projectId:r.origin.projectId,responseSha256:r.origin.responseSha256}),summary:r.summary,access:r.access,files:Object.freeze(files),totalBytes:total});
 }));
}
export async function sha256(content){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(content)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function createArtifactController({adapter,onState=()=>{}}){
 if(typeof adapter?.listArtifacts!=='function'||typeof adapter?.readArtifactFile!=='function')throw Error('Read-only adapter required');
 let epoch=0,disposed=false,state=Object.freeze({phase:'empty',conversationId:null,records:Object.freeze([]),artifactIndex:-1,fileIndex:-1,content:'',message:'Choose a conversation.'});
 const publish=patch=>{if(!disposed){state=Object.freeze({...state,...patch});onState(state)}};
 const active=t=>!disposed&&t===epoch;
 async function read(index){
  const r=state.records[state.artifactIndex],f=r?.files[index];
  if(!f||!Number.isInteger(index)||disposed)return false;
  const ticket=++epoch;publish({fileIndex:index,phase:'loading-file',content:'',message:'Loading file…'});
  try{
   const result=await adapter.readArtifactFile(Object.freeze({artifactId:r.artifactId,expectedRevisionSha256:r.revisionSha256,path:f.path}));
   if(!active(ticket))return false;
   if(result?.ok!==true){publish({phase:result?.error?.code==='missing'?'missing-file':'error',message:result?.error?.code==='missing'?'This file is no longer available.':'Could not read this file. Retry or choose another file.'});return false}
   const v=result.value;
   if(!v||typeof v.content!=='string'||v.content.length>MAX_FILE||!text(v.content)||bytes(v.content).length!==f.byteCount||v.sha256!==f.sha256||await sha256(v.content)!==f.sha256){if(active(ticket))publish({phase:'error',content:'',message:'File content does not match the selected revision.'});return false}
   if(!active(ticket))return false;publish({phase:'ready',content:v.content,message:'Read-only file. No project files changed.'});return true;
  }catch{if(active(ticket))publish({phase:'error',content:'',message:'Could not read this file. Retry or choose another file.'});return false}
 }
 function selectArtifact(index){
  if(disposed||!Number.isInteger(index)||!state.records[index])return false;
  ++epoch;publish({artifactIndex:index,fileIndex:-1,content:'',message:''});return read(0);
 }
 function setArtifacts(conversationId,records){
  if(disposed)return false;++epoch;
  try{const catalog=validateCatalog(records,conversationId);publish({conversationId,records:catalog,artifactIndex:-1,fileIndex:-1,content:'',phase:catalog.length?'select-file':'empty',message:catalog.length?'Choose a file.':'No generated artifacts in this conversation.'});if(catalog.length)return selectArtifact(0);return true}
  catch{publish({conversationId:null,records:Object.freeze([]),artifactIndex:-1,fileIndex:-1,content:'',phase:'error',message:'Artifact metadata is unavailable or invalid.'});return false}
 }
 async function load(conversationId){
  if(disposed)return false;const ticket=++epoch;
  publish({conversationId,records:Object.freeze([]),artifactIndex:-1,fileIndex:-1,content:'',phase:'loading-list',message:'Loading artifacts…'});
  if(!id(conversationId)){publish({phase:'error',message:'Invalid conversation.'});return false}
  try{const result=await adapter.listArtifacts({conversationId});if(!active(ticket))return false;if(result?.ok!==true){publish({phase:'error',message:'Could not load artifacts. Retry.'});return false}return setArtifacts(conversationId,result.value)}
  catch{if(active(ticket))publish({phase:'error',message:'Could not load artifacts. Retry.'});return false}
 }
 return Object.freeze({load,setArtifacts,selectArtifact,selectFile:read,getState:()=>state,retry:()=>state.fileIndex>=0?read(state.fileIndex):load(state.conversationId),destroy(){++epoch;disposed=true;state=Object.freeze({...state,records:Object.freeze([]),content:'',phase:'disposed'})}});
}
