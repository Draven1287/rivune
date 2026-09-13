const CHUNK=65536,DISPLAY=16384,TOTAL=262144,AFTER_FILE=131072;
const enc=new TextEncoder(),digestPattern=/^[a-f0-9]{64}$/;
const hash=s=>typeof s==='string'&&digestPattern.test(s);
const id=s=>typeof s==='string'&&s.length>0&&s.length<=128&&!/[\u0000-\u001f\u007f]/.test(s);
const size=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
const fail=()=>{throw Error('Invalid captured diff')};
export async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function validatePrepared(p){
 if(!p||p.state!=='prepared'||!id(p.operationId)||!hash(p.capturedSnapshotSha256)||!id(p.ownerConversationId)||!id(p.targetProjectId)||!id(p.grantId)||!p.artifact||!id(p.artifact.artifactId)||!hash(p.artifact.expectedRevisionSha256)||!Array.isArray(p.files)||p.files.length<1||p.files.length>40)fail();
 let before=0,after=0;const seen=new Set();
 const files=p.files.map(f=>{
  if(!f||typeof f.path!=='string'||!f.path||enc.encode(f.path).length>240||/[\\:%?#\u0000-\u001f\u007f]/.test(f.path)||!f.path.split('/').every(v=>v&&!v.startsWith('.')&&!/[ .]$/.test(v)&&! /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(v))||! /\.(html|css|js|json|md|txt)$/i.test(f.path)||!hash(f.afterSha256)||!size(f.beforeBytes,TOTAL)||!size(f.afterBytes,AFTER_FILE)||f.afterBytes<1)fail();
  const k=f.path.normalize('NFC').toLowerCase();if(seen.has(k))fail();seen.add(k);
  if(!(f.action==='create'&&f.beforeSha256===null&&f.beforeBytes===0)&&!(f.action==='replace'&&hash(f.beforeSha256)))fail();
  before+=f.beforeBytes;after+=f.afterBytes;
  return Object.freeze({path:f.path,action:f.action,beforeSha256:f.beforeSha256,afterSha256:f.afterSha256,beforeBytes:f.beforeBytes,afterBytes:f.afterBytes});
 });
 if(before>TOTAL||after>TOTAL)fail();
 return Object.freeze({operationId:p.operationId,capturedSnapshotSha256:p.capturedSnapshotSha256,ownerConversationId:p.ownerConversationId,targetProjectId:p.targetProjectId,artifact:Object.freeze({...p.artifact}),files:Object.freeze(files)});
}
export function encode64(bytes){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)}
function decode64(value){
 if(typeof value!=='string'||value.length>87384||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))fail();
 const raw=atob(value),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(bytes.length>CHUNK||encode64(bytes)!==value)fail();return bytes;
}
function verifyChunk(c,{offset,total,sha256,absent,before}){
 if(!c||c.offset!==offset||c.totalBytes!==total||c.sha256!==sha256||(before&&c.absent!==absent)||typeof c.done!=='boolean')fail();
 const bytes=decode64(c.base64);if(offset+bytes.length>total||c.done!==(offset+bytes.length===total)||(!bytes.length&&offset<total))fail();return bytes;
}
export function pagesOf(bytes){
 // Hash verification happens before this. Fatal UTF-8 decoding preserves BOM/CRLF.
 const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);let current='',count=0,start=0;const pages=[];
 for(const char of text){const n=enc.encode(char).length;if(count+n>DISPLAY){pages.push(Object.freeze({text:current,startByte:start,endByte:start+count}));start+=count;current='';count=0}current+=char;count+=n}
 pages.push(Object.freeze({text:current,startByte:start,endByte:start+count}));return Object.freeze(pages);
}
export function createDiffController({adapter,onState=()=>{}}){
 if(typeof adapter?.readPreparedDiff!=='function')throw Error('readPreparedDiff adapter required');
 let epoch=0,disposed=false,state=Object.freeze({phase:'empty',prepared:null,fileIndex:-1,pageIndex:0,beforePages:Object.freeze([]),afterPages:Object.freeze([]),message:'Select a prepared operation.'});
 const publish=patch=>{if(!disposed){state=Object.freeze({...state,...patch});onState(state)}};const active=t=>!disposed&&t===epoch;
 async function selectFile(index){
  const p=state.prepared,f=p?.files[index];if(disposed||!Number.isInteger(index)||!f)return false;
  const ticket=++epoch;publish({phase:'loading',fileIndex:index,pageIndex:0,beforePages:Object.freeze([]),afterPages:Object.freeze([]),message:'Reading captured bytes…'});
  const before=new Uint8Array(f.beforeBytes),after=new Uint8Array(f.afterBytes);let bo=0,ao=0;
  try{
   // Bounded request budget also accepts smaller host chunks; no partial display.
   for(let call=0;call<64;call++){
    const result=await adapter.readPreparedDiff(Object.freeze({preparedOperationId:p.operationId,expectedCapturedSnapshotSha256:p.capturedSnapshotSha256,fileIndex:index,beforeOffset:bo,afterOffset:ao}));
    if(!active(ticket))return false;
    if(result?.ok!==true){publish({phase:result?.error?.code==='stale_generation'||result?.error?.code==='stale'?'stale':'error',message:'Captured diff unavailable. Refresh the prepared operation; no files changed.'});return false}
    const c=result.value;if(!c||c.preparedOperationId!==p.operationId||c.capturedSnapshotSha256!==p.capturedSnapshotSha256||c.fileIndex!==index||c.path!==f.path)fail();
    const b=verifyChunk(c.before,{offset:bo,total:f.beforeBytes,sha256:f.beforeSha256,absent:f.action==='create',before:true});
    const a=verifyChunk(c.after,{offset:ao,total:f.afterBytes,sha256:f.afterSha256,before:false});
    before.set(b,bo);after.set(a,ao);bo+=b.length;ao+=a.length;
    if(bo===before.length&&ao===after.length)break;
   }
   if(bo!==before.length||ao!==after.length||(f.beforeSha256!==null&&await digest(before)!==f.beforeSha256)||await digest(after)!==f.afterSha256)fail();
   const beforePages=f.action==='create'?Object.freeze([]):pagesOf(before),afterPages=pagesOf(after);
   if(!active(ticket))return false;publish({phase:'ready',beforePages,afterPages,message:'Captured hashes verified · read-only review · no project files changed.'});return true;
  }catch{if(active(ticket))publish({phase:'error',beforePages:Object.freeze([]),afterPages:Object.freeze([]),message:'Captured bytes failed validation. Refresh the prepared operation.'});return false}
 }
 function setPrepared(value){if(disposed)return false;++epoch;try{const prepared=validatePrepared(value);publish({prepared,fileIndex:-1,pageIndex:0,beforePages:Object.freeze([]),afterPages:Object.freeze([]),phase:'empty',message:''});return selectFile(0)}catch{publish({prepared:null,fileIndex:-1,pageIndex:0,beforePages:Object.freeze([]),afterPages:Object.freeze([]),phase:'stale',message:'Prepared operation is missing, stale or invalid.'});return false}}
 function setPage(index){if(state.phase!=='ready'||!Number.isInteger(index)||index<0||index>=Math.max(state.beforePages.length,state.afterPages.length))return false;publish({pageIndex:index});return true}
 return Object.freeze({setPrepared,selectFile,setPage,getState:()=>state,destroy(){++epoch;disposed=true;state=Object.freeze({...state,phase:'disposed',prepared:null,beforePages:Object.freeze([]),afterPages:Object.freeze([])})}});
}
