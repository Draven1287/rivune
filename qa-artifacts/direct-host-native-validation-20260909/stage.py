from pathlib import Path
import datetime, hashlib, json, os, re, shutil, subprocess, tempfile

root = Path.cwd()
receipt_root = root / 'qa-artifacts/direct-host-native-validation-20260909'
run = receipt_root / datetime.datetime.now(datetime.timezone.utc).strftime('run-%Y%m%dT%H%M%SZ')
run.mkdir()
profile_root = Path(tempfile.mkdtemp(prefix='rivune-recovery-qa-', dir='/private/tmp'))
profile = profile_root / 'profile'
profile.mkdir(mode=0o700)
stage = run / 'staged-web'
shutil.copytree(root / 'prototypes/ai-native-workspace/dist', stage)
host = root / 'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2'
shutil.copy2(host / 'web/desktop-host.mjs', stage / 'desktop-host.mjs')
fixture = profile_root / 'codex'
fixture.write_text('''#!/usr/bin/python3
import json, os, pathlib, sys, time
base = pathlib.Path(__file__).parent
text = sys.stdin.read()
def log(event):
    with (base / 'fixture-invocations.jsonl').open('a') as f:
        f.write(json.dumps({'event':event,'pid':os.getpid(),'parent':os.getppid(),'long':'QA_LONG' in text})+'\\n'); f.flush(); os.fsync(f.fileno())
log('start')
parent = os.getppid()
if 'QA_LONG' in text:
    for i in range(2400):
        if os.getppid() != parent: log('orphan-exit'); sys.exit(0)
        if (base / 'release-fixture').exists(): break
        time.sleep(.025)
log('complete')
print('Synthetic native fixture answer. No AI account or network was used.')
''')
fixture.chmod(0o700)
html = (stage/'index.html').read_text()
entry = re.search(r'<script type="module"[^>]*src="([^"]+)"[^>]*></script>', html).group(1)
html = re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
html = re.sub(r'<script type="module"[^>]*></script>', '<script type="module" src="/qa-entry.js"></script>', html)
html = html.replace('</head>', '<link rel="stylesheet" href="/qa.css"></head>')
(stage/'index.html').write_text(html)
(stage/'qa-entry.js').write_text("import './desktop-host.mjs';\nimport './qa-controls.js';\nimport '"+entry+"';\n")
(stage/'qa.css').write_text('#qa-native{position:fixed;z-index:9000;right:8px;bottom:8px;max-width:600px;background:#142033;color:white;border:2px solid #d6ad5c;padding:8px;font:12px system-ui}#qa-native button{margin:3px;padding:5px}#qa-native textarea{display:block;width:560px;max-width:75vw;height:130px;background:#07111d;color:white;font:11px monospace}')
controls = r'''
import { createHostWorkspaceController } from '../../prototypes/ai-native-workspace/src/host/workspaceController.ts';
import { createTauriWorkspaceAdapter } from '../../prototypes/ai-native-workspace/src/host/tauriAdapter.ts';
import { createDurableRecoveryJournal } from '../../prototypes/ai-native-workspace/src/host/durableRecovery.ts';
const original = globalThis.__RIVUNE_DESKTOP_HOST__;
const calls = [];
const tracked = new Set(['reserveSubmissionRecovery','submitReservedRun','reconcileRun','cancelRun','clearSubmissionRecovery','beginShutdown','flushShutdownDraft','completeShutdown','abortShutdown','saveRichDraft']);
const bridge = Object.fromEntries(Object.entries(original).map(([name, fn]) => [name, typeof fn !== 'function' || !tracked.has(name) ? fn : async (...args) => {
  calls.push({name,phase:'start',args}); render(calls);
  try { const result=await fn(...args); calls.push({name,phase:'result',result}); render(calls); return result; }
  catch(error){calls.push({name,phase:'error',error:String(error)});render(calls);throw error;}
}]));
globalThis.__RIVUNE_DESKTOP_HOST__ = Object.freeze(bridge);
const panel = document.createElement('details');panel.id='qa-native';panel.open=true;
panel.innerHTML='<summary>ISOLATED NATIVE QA · synthetic executable only</summary><div></div><textarea aria-label="QA evidence" readonly></textarea>';
document.body.append(panel);const output=panel.querySelector('textarea');
function render(value){output.value=JSON.stringify(value,null,2);}
function button(name, fn){const el=document.createElement('button');el.textContent=name;el.onclick=async()=>{try{render(await fn());}catch(e){render({error:String(e)});}};panel.querySelector('div').append(el);}
button('QA configure synthetic', async()=>{await bridge.configureProvider({id:'qa:synthetic-only',kind:'codex',executablePath:FIXTURE,model:null,timeoutMs:65000},true);return {configured:FIXTURE};});
button('QA inspect state', async()=>({snapshot:await bridge.getSnapshot(),recovery:await bridge.getSubmissionRecovery()}));
button('QA inspect calls', async()=>calls);
button('QA reserve orphan', async()=>{const s=await bridge.getSnapshot();return await bridge.reserveSubmissionRecovery({requestID:'qa-orphan-'+crypto.randomUUID(),conversationID:s.activeConversationID});});
button('QA terminal retain', async()=>{const s=await bridge.getSnapshot(),c=s.conversations.find(c=>c.id===s.activeConversationID),cat=await bridge.getModelCatalog(); const r=await bridge.saveRichDraft({conversationID:c.id,mutationID:crypto.randomUUID(),expectedRevision:c.richDraft.revision,draft:'QA_TERMINAL_RETAIN',attachmentIDs:[],selection:{schemaVersion:1,providerID:s.selectedProviderID,modelID:null,effortID:null,catalogRevision:cat.revision},team:null});const id=crypto.randomUUID();await bridge.reserveSubmissionRecovery({requestID:id,conversationID:c.id});const result=await bridge.submitReservedRun({id,conversationID:c.id,prompt:'QA_TERMINAL_RETAIN',mode:'direct',richDraftRevision:r.revision});return {result,recovery:await bridge.getSubmissionRecovery()};});
button('QA external draft edit', async()=>{const s=await bridge.getSnapshot(),c=s.conversations.find(c=>c.id===s.activeConversationID);return await bridge.saveRichDraft({conversationID:c.id,mutationID:crypto.randomUUID(),expectedRevision:c.richDraft.revision,draft:'Synthetic external edit for conflict test',attachmentIDs:c.richDraft.attachmentIDs,selection:c.richDraft.selection,team:c.richDraft.team});});
button('QA invalid and duplicate cancel', async()=>{const c=createHostWorkspaceController(createTauriWorkspaceAdapter(bridge,{reservedSubmission:true}),createDurableRecoveryJournal(bridge));await c.start();try{const s=c.getState().snapshot;const active=s.runs.find(r=>r.status==='running'),done=s.runs.find(r=>r.status==='completed');const bad=await Promise.allSettled([c.cancel('qa-unknown'),...(done?[c.cancel(done.id)]:[])]);const result=active?await Promise.allSettled([c.cancel(active.id),c.cancel(active.id)]):[];return {invalid:bad.map(r=>r.status),active:active?.id,result:result.map(r=>r.status),calls};}finally{c.dispose();}});
'''.replace('FIXTURE', json.dumps(str(fixture)))
controls_path = receipt_root/'qa-controls-entry.ts'
controls_path.write_text(controls)
esbuild = root/'website/node_modules/.bin/esbuild'
subprocess.run([str(esbuild),str(controls_path),'--bundle','--format=esm',f'--outfile={stage / "qa-controls.js"}'],check=True)
config = {'productName':'Rivune Recovery QA','identifier':'com.rivune.desktop.qa.recovery20260909','build':{'frontendDist':str(stage)},'app':{'windows':[{'label':'main','title':'Rivune Recovery QA · isolated fixture','width':1120,'height':860,'minWidth':760,'minHeight':560,'resizable':True}]}}
(run/'tauri-override.json').write_text(json.dumps(config,indent=2))
files = list((root/'prototypes/ai-native-workspace/src').rglob('*')) + list((host/'src-tauri/src').rglob('*')) + [host/'src-tauri/Cargo.toml',host/'src-tauri/Cargo.lock',host/'src-tauri/tauri.conf.json',host/'web/desktop-host.mjs']
hashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
(run/'source-hashes.json').write_text(json.dumps(hashes,indent=2))
info={'root':str(root),'run':str(run),'profileRoot':str(profile_root),'profile':str(profile),'fixture':str(fixture),'stage':str(stage),'override':str(run/'tauri-override.json')}
(receipt_root/'latest-run.json').write_text(json.dumps(info,indent=2))
print(json.dumps(info,indent=2))
