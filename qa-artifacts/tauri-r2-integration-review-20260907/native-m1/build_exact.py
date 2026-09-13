"""Single shared-target nonlaunch build; never overwrite prior evidence or package the app."""
from pathlib import Path
import os,subprocess,json,hashlib,datetime,sys
qa=Path(__file__).resolve().parent
workspace=qa.parents[2]
source=workspace/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2'
def manifest():
 return {str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for sub in ['web','src-tauri'] for p in sorted((source/sub).rglob('*')) if p.is_file() and 'target' not in p.relative_to(source).parts}
for name in ['BUILD.log','BUILD_RECEIPT.json','SOURCE_BEFORE.json']:
 if (qa/name).exists():raise SystemExit('Refusing to overwrite '+name)
before=manifest()
preflight=json.loads((qa/'TAKEOVER_PREFLIGHT.json').read_text())
if before!=preflight['files']:raise SystemExit('Source changed since takeover preflight; inspect before build')
(qa/'SOURCE_BEFORE.json').write_text(json.dumps({'source':str(source),'files':before},indent=2)+'\n')
env=dict(os.environ);env['CARGO_HOME']=str(workspace/'.toolchains/cargo');env['RUSTUP_HOME']=str(workspace/'.toolchains/rustup');env['CARGO_TARGET_DIR']=str(workspace/'.toolchains/target-candidate4-r2');env['PATH']=env['CARGO_HOME']+'/bin:'+env.get('PATH','')
command=[str(workspace/'.toolchains/cargo/bin/cargo'),'build','--locked','--offline','--features','custom-protocol','--bin','rivune-desktop']
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (qa/'BUILD.log').open('x') as log:
 process=subprocess.Popen(command,cwd=source/'src-tauri',env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 print('BUILD_PID='+str(process.pid),flush=True)
 for line in process.stdout:log.write(line);log.flush();print(line,end='',flush=True)
 code=process.wait()
after=manifest();changed=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p))
binary=workspace/'.toolchains/target-candidate4-r2/debug/rivune-desktop'
receipt={'command':command,'cwd':str(source/'src-tauri'),'startedAt':start,'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exitCode':code,'sourceFiles':len(before),'changedInputs':changed,'sourceManifestSha256':hashlib.sha256((qa/'SOURCE_BEFORE.json').read_bytes()).hexdigest(),'binary':str(binary),'binarySha256':hashlib.sha256(binary.read_bytes()).hexdigest() if code==0 and binary.is_file() else None,'target':'aarch64-apple-darwin','customProtocol':True,'launchPerformed':False,'installedAppModified':False}
(qa/'BUILD_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2));sys.exit(code or (2 if changed else 0))
