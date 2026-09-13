const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),crypto=require('crypto');
const {chromium}=require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=__dirname, web=path.join(root,'candidate/web');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const files=[['one.txt','First\r\n\ttext'],['two.txt','<script>window.bad=true</script>\n']];
const record={schemaVersion:1,artifactId:'a',revisionSha256:'a'.repeat(64),origin:{conversationId:'c1',turnId:'t',answerId:'answer',projectId:null,responseSha256:'b'.repeat(64)},summary:'Generated files',access:'active',files:files.map(([path,content])=>({path,sha256:hash(content),byteCount:Buffer.byteLength(content)})),totalBytes:files.reduce((n,f)=>n+Buffer.byteLength(f[1]),0)};
(async()=>{
 const browser=await chromium.launch({executablePath:'/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',headless:true});
 const checks=[],errors=[]; const check=(name,value)=>{assert.ok(value,name);checks.push({name,pass:true})};
 try {for(const available of [false,true]){
  const context=await browser.newContext({viewport:{width:1120,height:760},reducedMotion:'reduce'});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!=='https://artifact-test.local')return route.abort();const file=path.resolve(web,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(web+path.sep)||!fs.existsSync(file))return route.abort();await route.fulfill({body:fs.readFileSync(file),contentType:({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain'})});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(({available,record,files})=>{
   const state={schemaVersion:1,activeConversationID:'c1',conversations:[{id:'c1',title:'First chat',draft:'Retained draft'},{id:'c2',title:'Second chat',draft:''}],runs:[],providers:[],selectedProviderID:null};
   window.testCapture={calls:[],delay:false,resolve:null};
   window.__RIVUNE_DESKTOP_HOST__={getSnapshot:async()=>structuredClone(state),openConversation:async id=>{state.activeConversationID=id},submitRun:async()=>{throw Error('No dispatch')},reconcileRun:async()=>{throw Error('No dispatch')},...(available?{
    listArtifacts:async request=>{testCapture.calls.push(request);return {ok:true,value:request.conversationId==='c1'?[record]:[]}},
    readPreparedDiff:async request=>({ok:true,value:{preparedOperationId:request.preparedOperationId,capturedSnapshotSha256:request.expectedCapturedSnapshotSha256,fileIndex:0,path:'one.txt',before:{absent:true,sha256:null,totalBytes:0,offset:0,base64:'',done:true},after:{sha256:record.files[0].sha256,totalBytes:record.files[0].byteCount,offset:0,base64:btoa(files[0][1]),done:true}}}),
    readArtifactFile:async request=>{testCapture.calls.push(request);const f=record.files.find(f=>f.path===request.path);if(testCapture.delay)await new Promise(resolve=>testCapture.resolve=resolve);return {ok:true,value:{content:files.find(f=>f[0]===request.path)[1],sha256:f.sha256}}}
   }:{})};
  },{available,record,files});
  await page.goto('https://artifact-test.local/',{waitUntil:'networkidle'});
  if(await page.locator('#onboarding-dialog').evaluate(n=>n.open))await page.keyboard.press('Escape');
  if(!available){check('absent capability exposes no artifact action',await page.getByRole('button',{name:'Artifacts',exact:true}).count()===0);await context.close();continue}
  await page.locator('#prompt').fill('Unsaved draft\n\tretained');
  const draft=await page.locator('#prompt').inputValue(),transcript=await page.locator('#transcript').innerHTML();
  await page.getByRole('button',{name:'Artifacts',exact:true}).click();
  await page.locator('.artifact-viewer[data-state=ready]').waitFor();
  check('open exact captured first file',await page.locator('.artifact-viewer code').textContent()===files[0][1]);
  await page.getByRole('button',{name:'two.txt',exact:true}).click();await page.locator('.artifact-viewer[data-state=ready]').waitFor();
  check('file switch remains inert',await page.locator('.artifact-viewer code').textContent()===files[1][1]&&await page.locator('.artifact-viewer script').count()===0);
  await page.getByRole('button',{name:'Close artifact review'}).click();
  check('close preserves draft and transcript',await page.locator('#prompt').inputValue()===draft&&await page.locator('#transcript').innerHTML()===transcript);
  check('close restores triggering focus',await page.getByRole('button',{name:'Artifacts',exact:true}).evaluate(n=>n===document.activeElement));
  await page.evaluate(()=>{testCapture.delay=true});await page.getByRole('button',{name:'Artifacts',exact:true}).click();await page.waitForFunction(()=>testCapture.resolve!==null);
  await page.keyboard.press('Escape');await page.evaluate(()=>{testCapture.delay=false;testCapture.resolve()});
  check('late read after Escape leaves closed pane empty',await page.locator('.artifact-review-dialog').evaluate(n=>!n.open&&n.querySelectorAll('code').length===0));
  await page.getByRole('button',{name:'Artifacts',exact:true}).click();await page.locator('.artifact-viewer[data-state=ready]').waitFor();
  check('reopen does not lose unsaved draft',await page.locator('#prompt').inputValue()===draft);
  await page.screenshot({path:path.join(root,'integrated-artifact.png')});await page.keyboard.press('Escape');
  const prepared={operationId:'prepared-test',artifact:{artifactId:'a',expectedRevisionSha256:record.revisionSha256},ownerConversationId:'c1',targetProjectId:'p',expectedProjectGeneration:'1',grantId:'synthetic-grant',state:'prepared',capturedSnapshotSha256:'c'.repeat(64),files:[{path:'one.txt',beforeSha256:null,afterSha256:record.files[0].sha256,action:'create',beforeBytes:0,afterBytes:record.files[0].byteCount}]};
  check('foreign prepared owner rejected',await page.evaluate(async prepared=>(await import('/app.mjs')).artifactReview.openPrepared({...prepared,ownerConversationId:'other'}),prepared)===false);
  await page.evaluate(async prepared=>(await import('/app.mjs')).artifactReview.openPrepared(prepared),prepared);
  await page.locator('.captured-diff[data-state=ready]').waitFor();
  check('accepted prepared DTO opens captured diff',await page.locator('.captured-diff code').nth(1).textContent()===files[0][1]);
  check('no project write controls',await page.getByRole('button',{name:/^(Apply|Revert)$/}).count()===0);
  await page.keyboard.press('Escape');
  check('captured diff close preserves draft',await page.locator('#prompt').inputValue()===draft);
  await context.close();
 }
 check('no unhandled renderer errors',errors.length===0);fs.writeFileSync(path.join(root,'BROWSER.json'),JSON.stringify({scope:'Exact isolated patched renderer with synthetic host; no native/runtime acceptance',checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
