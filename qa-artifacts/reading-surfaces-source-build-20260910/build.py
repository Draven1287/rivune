from pathlib import Path
import os,json,hashlib,subprocess,shutil,datetime,plistlib
root=Path.cwd();candidate=root/'tools/symphony/source-import-candidate';out=root/'qa-artifacts/reading-surfaces-source-build-20260910';frontend=candidate/'prototypes/ai-native-workspace';native=candidate/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri'
expected='5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b';manifest=json.loads((root/'tools/symphony/source-stage/SOURCE_MANIFEST.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(name,value):(out/name).write_text(json.dumps(value,indent=2)+'\n')
env={k:v for k,v in os.environ.items() if not k.startswith(('GIT_','CARGO_','RUST','TAURI_')) and k not in {'CC','CXX','CFLAGS','CXXFLAGS','LDFLAGS'}}
env.update(CARGO_HOME=str(root/'.toolchains/cargo'),RUSTUP_HOME=str(root/'.toolchains/rustup'),CARGO_TARGET_DIR=str(root/'.toolchains/target-candidate4-r2'));env['PATH']=str(root/'.toolchains/cargo/bin')+':'+env['PATH']
def git(*args):return subprocess.check_output(['git','-C',str(candidate),*args],env=env,text=True).strip()
def identity():
 assert git('rev-parse','HEAD')==expected;assert not git('diff','--name-only');assert not git('diff','--cached','--name-only')
 hashes={f['path']:sha(candidate/f['path']) for f in manifest['files']};assert hashes=={f['path']:f['sha256'] for f in manifest['files']};return {'commit':expected,'gitTree':git('rev-parse','HEAD^{tree}'),'treeSHA256':manifest['treeSHA256'],'files':hashes}
def preserved():
 paths=[Path('/Applications/Rivune.app/Contents/MacOS/Rivune'),Path('/Applications/Rivune.app/Contents/Info.plist'),root/'qa-artifacts/s02-native-runtime-20260910/Rivune S02 QA.app/Contents/MacOS/rivune',root/'qa-artifacts/s02-native-runtime-20260910/Rivune S02 QA.app/Contents/Info.plist'];paths+=sorted((root/'qa-artifacts/s02-native-runtime-20260910/profile').rglob('*'))
 return {str(p):sha(p) for p in paths if p.is_file()}
assert not (out/'build-receipt.json').exists();before=identity();save('source-before.json',before);old=preserved();save('preserved-before.json',old)
config={'productName':'Rivune Reading QA','identifier':'com.rivune.desktop.qa.reading20260910','build':{'frontendDist':str(out/'frontend-dist')},'app':{'windows':[{'label':'main','title':'Rivune Reading QA · build review only','width':1200,'height':900,'minWidth':760,'minHeight':560,'resizable':True}]}}
save('tauri-override.json',config);env['TAURI_CONFIG']=json.dumps(config)
receipt={'sourceCommit':expected,'sourceTreeSHA256':manifest['treeSHA256'],'startedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'commands':[],'buildEnvironment':{k:env[k] for k in ['CARGO_HOME','RUSTUP_HOME','CARGO_TARGET_DIR','PATH','TAURI_CONFIG']},'launchPerformed':False,'installedAppModified':False,'signingPerformed':False}
def run(command,cwd,log):
 receipt['commands'].append({'argv':command,'cwd':str(cwd),'log':str(out/log)});save('build-progress.json',receipt)
 with (out/log).open('w') as stream:result=subprocess.run(command,cwd=cwd,env=env,stdout=stream,stderr=subprocess.STDOUT)
 receipt['commands'][-1]['exitCode']=result.returncode
 if result.returncode:raise RuntimeError(f'{log}: exit {result.returncode}')
try:
 cargo=str(root/'.toolchains/cargo/bin/cargo');rustc=str(root/'.toolchains/cargo/bin/rustc')
 receipt['cargoVersion']=subprocess.check_output([cargo,'--version','--verbose'],env=env,text=True);receipt['rustcVersion']=subprocess.check_output([rustc,'--version','--verbose'],env=env,text=True)
 assert 'host: aarch64-apple-darwin' in receipt['rustcVersion']
 print('Building accepted desktop frontend and matching bridge',flush=True);run(['npm','run','build:desktop'],frontend,'frontend-build.log')
 shutil.copytree(frontend/'dist-desktop',out/'frontend-dist');assets={str(p.relative_to(out/'frontend-dist')):sha(p) for p in sorted((out/'frontend-dist').rglob('*')) if p.is_file()};save('frontend-assets.json',assets)
 assert assets['desktop-host.mjs']==sha(native.parent/'web/desktop-host.mjs')
 html=(out/'frontend-dist/index.html').read_text();entry=(out/'frontend-dist/desktop-entry.mjs').read_text();assert './desktop-entry.mjs' in html;assert entry.startswith("import './desktop-host.mjs';\n");assert 'Content-Security-Policy' not in html
 receipt['embeddedFrontendPath']=str(out/'frontend-dist');receipt['embeddedFiles']=assets;receipt['effectiveConfigOverride']=config
 print('Compiling native custom-protocol binary using shared cache, locked/offline',flush=True);run([cargo,'build','--locked','--offline','--features','custom-protocol','--bin','rivune'],native,'native-build.log')
 app=out/'Rivune Reading QA.app';binary=app/'Contents/MacOS/rivune';binary.parent.mkdir(parents=True);(app/'Contents/Resources').mkdir();shutil.copy2(root/'.toolchains/target-candidate4-r2/debug/rivune',binary);shutil.copy2(native/'icons/icon.icns',app/'Contents/Resources/icon.icns')
 info={'CFBundleDisplayName':'Rivune Reading QA','CFBundleName':'Rivune Reading QA','CFBundleExecutable':'rivune','CFBundleIdentifier':config['identifier'],'CFBundlePackageType':'APPL','CFBundleShortVersionString':'0.0.1','CFBundleVersion':'2026091003','CFBundleIconFile':'icon.icns','NSHighResolutionCapable':True,'LSMinimumSystemVersion':'11.0','LSEnvironment':{'RIVUNE_ISOLATED_PROFILE_DIR':str(out/'profile-reserved-not-launched'),'PATH':'/usr/bin:/bin'}}
 (app/'Contents/Info.plist').write_bytes(plistlib.dumps(info));receipt['artifact']=str(app);receipt['binary']=str(binary);receipt['binarySHA256']=sha(binary);receipt['bundleFiles']={str(p.relative_to(app)):sha(p) for p in sorted(app.rglob('*')) if p.is_file()};receipt['success']=True;print('Native build completed; isolated bundle staged without launch',flush=True)
except Exception as error:receipt['success']=False;receipt['error']=str(error);print(str(error),flush=True)
finally:
 after=identity();save('source-after.json',after);receipt['sourceUnchanged']=before==after;now=preserved();save('preserved-after.json',now);receipt['priorBinariesProfilesUnchanged']=old==now;receipt['completedAtUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();save('build-receipt.json',receipt)
if not receipt['success'] or not receipt['sourceUnchanged'] or not receipt['priorBinariesProfilesUnchanged']:raise SystemExit(1)
