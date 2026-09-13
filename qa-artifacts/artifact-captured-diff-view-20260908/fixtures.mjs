import {digest,encode64} from './diff-controller.mjs';
const enc=new TextEncoder();
export const removed='\ufeffOriginal\r\n\tkeep tabs  \n<script>window.badBefore=true</script>\n';
export const added='<img src="https://invalid.example/x" onerror="alert(1)">\r\n\tProposed  \n';
export async function fixture({operationId='operation-A',capture='a',chunkSize=65536,contents=[['index.html',removed,added],['new.txt',null,'Created bytes\n'],['empty.txt','','Replacement of empty original\n']]}={}){
 const rows=await Promise.all(contents.map(async([path,b,a])=>({path,before:b===null?null:enc.encode(b),after:enc.encode(a)})));
 const files=await Promise.all(rows.map(async r=>({path:r.path,action:r.before===null?'create':'replace',beforeSha256:r.before===null?null:await digest(r.before),afterSha256:await digest(r.after),beforeBytes:r.before?.length||0,afterBytes:r.after.length})));
 const prepared={operationId,capturedSnapshotSha256:capture.repeat(64),ownerConversationId:'conversation-A',targetProjectId:'project-A',grantId:'opaque-root-grant',expectedProjectGeneration:'1',state:'prepared',artifact:{artifactId:'artifact-A',expectedRevisionSha256:'f'.repeat(64)},files};
 const requests=[];
 async function readPreparedDiff(req){requests.push(req);if(req.preparedOperationId!==operationId||req.expectedCapturedSnapshotSha256!==prepared.capturedSnapshotSha256)return {ok:false,error:{code:'stale'}};const row=rows[req.fileIndex],meta=files[req.fileIndex];if(!row)return {ok:false,error:{code:'missing'}};
 const side=(bytes,offset,sha256)=>{const value=bytes||new Uint8Array();return {sha256,totalBytes:value.length,offset,base64:encode64(value.slice(offset,offset+chunkSize)),done:offset+Math.min(chunkSize,value.length-offset)===value.length}};
 return {ok:true,value:{preparedOperationId:operationId,capturedSnapshotSha256:prepared.capturedSnapshotSha256,fileIndex:req.fileIndex,path:row.path,before:{...side(row.before,req.beforeOffset,meta.beforeSha256),absent:row.before===null},after:side(row.after,req.afterOffset,meta.afterSha256)}};
 }
 return {prepared,rows,requests,readPreparedDiff};
}
