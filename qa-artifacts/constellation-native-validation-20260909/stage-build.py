from pathlib import Path
import os,json,shutil,tempfile,re,plistlib,subprocess,hashlib,datetime
root=Path.cwd(); out=root/'qa-artifacts/constellation-native-validation-20260909'; run=out/datetime.datetime.now(datetime.timezone.utc).strftime('run-%H%M%S');run.mkdir()
profileRoot=Path(tempfile.mkdtemp(prefix='rivune-team-qa-',dir='/private/tmp'));profile=profileRoot/'profile';profile.mkdir(mode=0o700)
stage=run/'staged-web';shutil.copytree(root/'prototypes/ai-native-workspace/dist',stage)
host=root/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2';shutil.copy2(host/'web/desktop-host.mjs',stage/'desktop-host.mjs')
fixture=profileRoot/'codex';fixture.write_text('''#!/usr/bin/python3
import json,sys,os,time,pathlib
base=pathlib.Path(__file__).parent
raw=sys.stdin.read(); outer=json.loads(raw.split("JSON PAYLOAD\\n",1)[1]); request=json.loads(outer["currentUserRequest"]); binding=request["binding"]; role=binding["role"]
def log(event):
 with (base/'fixture-invocations.jsonl').open('a') as f:
  f.write(json.dumps(dict(event=event,pid=os.getpid(),binding=binding))+'\\n');f.flush();os.fsync(f.fileno())
log('start')
if role=='decide':
 print(json.dumps(dict(schemaVersion=1,runId=binding['runId'],inputDigest=binding['inputDigest'],leadMemberId=binding['memberId'],strategy='council',reason='Synthetic two-member cancellation fixture',councilMemberIds=['member-1','member-2'],tasks=[])))
elif role=='independentAnswer':
 if binding['memberId']=='member-2':
  parent=os.getppid()
  for _ in range(24000):
   if os.getppid()!=parent: sys.exit(0)
   if (base/'release-held-member').exists():break
   time.sleep(.025)
 print('Synthetic saved contribution from '+binding['memberId']+'. No AI provider was used.')
else:
 print('Unexpected synthesis in cancellation fixture',file=sys.stderr);sys.exit(3)
log('complete')
''');fixture.chmod(0o700)
html=(stage/'index.html').read_text();entry=re.search(r'<script type="module"[^>]*src="([^"]+)"[^>]*></script>',html).group(1)
html=re.sub(r'\s*<meta http-equiv="Content-Security-Policy"[^>]*>','',html);html=re.sub(r'<script type="module"[^>]*></script>','<script type="module" src="/qa-entry.js"></script>',html);(stage/'index.html').write_text(html)
(stage/'qa-entry.js').write_text("import './desktop-host.mjs';\nimport './qa-controls.js';\nimport '"+entry+"';\n")
controls='''
const b=globalThis.__RIVUNE_DESKTOP_HOST__;
const panel=document.createElement('details');panel.open=true;panel.style='position:fixed;z-index:9999;right:8px;top:8px;background:#152238;color:white;border:2px solid gold;padding:8px;font:12px system-ui';panel.innerHTML='<summary>ISOLATED TEAM QA — synthetic routes only</summary><div></div><textarea aria-label="QA evidence" readonly style="width:440px;height:100px"></textarea>';document.body.append(panel);
function button(label,fn){const el=document.createElement('button');el.textContent=label;el.onclick=async()=>{try{panel.querySelector('textarea').value=JSON.stringify(await fn());}catch(e){panel.querySelector('textarea').value=String(e);}};panel.querySelector('div').append(el);}
button('QA configure two routes',async()=>{for(const id of ['qa:team-first','qa:team-second'])await b.configureProvider({id,kind:'codex',executablePath:FIXTURE,model:null,timeoutMs:600000},true);return b.getModelCatalog();});
button('QA inspect saved state',async()=>({snapshot:await b.getSnapshot(),recovery:await b.getSubmissionRecovery()}));
'''.replace('FIXTURE',json.dumps(str(fixture)))
(stage/'qa-controls.js').write_text(controls)
config={'productName':'Rivune Team QA','identifier':'com.rivune.desktop.qa.team20260909','build':{'frontendDist':str(stage)},'app':{'windows':[{'label':'main','title':'Rivune Team QA · isolated synthetic profile','width':1200,'height':900,'minWidth':760,'minHeight':560,'resizable':True}]}}
(run/'tauri-override.json').write_text(json.dumps(config,indent=2))
app=run/'Rivune Team QA.app';(app/'Contents/MacOS').mkdir(parents=True);(app/'Contents/Resources').mkdir()
old=json.loads((root/'qa-artifacts/direct-host-native-validation-20260909/latest-run.json').read_text());shutil.copy2(Path(old['app'])/'Contents/Resources/icon.icns',app/'Contents/Resources/icon.icns')
plist={'CFBundleDisplayName':'Rivune Team QA','CFBundleName':'Rivune Team QA','CFBundleIdentifier':config['identifier'],'CFBundleExecutable':'rivune','CFBundleIconFile':'icon.icns','CFBundlePackageType':'APPL','CFBundleVersion':'2026090902','CFBundleShortVersionString':'0.0.1','NSHighResolutionCapable':True,'LSEnvironment':{'RIVUNE_ISOLATED_PROFILE_DIR':str(profile)}}
(app/'Contents/Info.plist').write_bytes(plistlib.dumps(plist))
info={'run':str(run),'profileRoot':str(profileRoot),'profile':str(profile),'stage':str(stage),'app':str(app),'executable':str(app/'Contents/MacOS/rivune'),'config':config};(out/'latest-run.json').write_text(json.dumps(info,indent=2))
env=dict(os.environ,CARGO_HOME=str(root/'.toolchains/cargo'),RUSTUP_HOME=str(root/'.toolchains/rustup'),CARGO_TARGET_DIR=str(root/'.toolchains/target-candidate4-r2'));env['PATH']=str(root/'.toolchains/cargo/bin')+':'+env['PATH']
for label,args in [('tests',['test','--locked','--offline','--','--test-threads=1']),('build',['build','--locked','--offline','--features','custom-protocol','--bin','rivune'])]:
 if label=='build':env['TAURI_CONFIG']=json.dumps(config)
 with (run/(label+'.log')).open('w') as log:p=subprocess.run([str(root/'.toolchains/cargo/bin/cargo'),*args],cwd=host/'src-tauri',env=env,stdout=log,stderr=subprocess.STDOUT)
 print(label,p.returncode,flush=True)
 if p.returncode:print((run/(label+'.log')).read_text()[-3000:]);raise SystemExit(p.returncode)
shutil.copy2(root/'.toolchains/target-candidate4-r2/debug/rivune',info['executable']);Path(info['executable']).chmod(0o755)
paths=[*stage.rglob('*'),*host.joinpath('src-tauri/src').rglob('*'),host/'web/desktop-host.mjs',Path(info['executable'])]
(run/'frozen-hashes.json').write_text(json.dumps({str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.is_file()},indent=2));info['binarySha256']=hashlib.sha256(Path(info['executable']).read_bytes()).hexdigest();(out/'latest-run.json').write_text(json.dumps(info,indent=2));print(json.dumps(info,indent=2))
