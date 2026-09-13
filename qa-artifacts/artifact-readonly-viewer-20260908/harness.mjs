import {mountArtifactViewer} from './artifact-viewer.mjs';
import {fixture} from './fixtures.mjs';
const a=await fixture(),b=await fixture({revision:'b',content:'NEW REVISION B — exact bytes\n'}),archived=await fixture({artifactId:'archived-A',revision:'c',access:'archived-read-only',content:'Archived original bytes\n'});
const lookup=new Map([a,b,archived].map(f=>[f.record.revisionSha256,f]));let missing=false,delay=false,readError=false,pending=[];const requests=[];
const response=req=>{const f=lookup.get(req.expectedRevisionSha256),file=f?.record.files.find(x=>x.path===req.path);return file?{ok:true,value:{content:f.contents[file.path],sha256:file.sha256}}:{ok:false,error:{code:'missing'}}};
const viewer=mountArtifactViewer({container:document.querySelector('#viewer'),adapter:{
 listArtifacts:async()=>({ok:true,value:[a.record,archived.record]}),
 readArtifactFile:async req=>{requests.push(req);document.querySelector('#requests').textContent=JSON.stringify(requests,null,2);if(readError)throw Error('Synthetic read failure');if(missing)return {ok:false,error:{code:'missing'}};if(delay&&req.expectedRevisionSha256===a.record.revisionSha256)return new Promise(resolve=>pending.push(()=>resolve(response(req))));return response(req)}
}});
document.querySelector('#normal').onclick=()=>{delay=false;missing=false;readError=false;viewer.load('conversation-A')};
document.querySelector('#delay').onclick=()=>{delay=true;missing=false;viewer.setArtifacts('conversation-A',[a.record])};
document.querySelector('#switch').onclick=()=>{delay=false;viewer.setArtifacts('conversation-A',[b.record])};
document.querySelector('#resolve').onclick=()=>{pending.splice(0).forEach(resolve=>resolve())};
document.querySelector('#missing').onclick=()=>{missing=true;delay=false;viewer.setArtifacts('conversation-A',[a.record])};
document.querySelector('#available').onclick=()=>{missing=false};
document.querySelector('#empty').onclick=()=>viewer.setArtifacts('conversation-A',[]);
viewer.load('conversation-A');

document.querySelector('#error').onclick=()=>{readError=true;viewer.setArtifacts('conversation-A',[a.record])};
