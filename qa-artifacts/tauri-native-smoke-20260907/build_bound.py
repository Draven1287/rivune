from pathlib import Path
import os,subprocess,json,hashlib,sys,shutil,plistlib,datetime
qa=Path(__file__).resolve().parent;workspace=qa.parents[1];source=workspace/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2'
def manifest():
 return {str(p.relative_to(source)):hashlib.sha256(p.read_bytes()).hexdigest() for sub in ['web','src-tauri'] for p in sorted((source/sub).rglob('*')) if p.is_file() and 'target' not in p.relative_to(source).parts}
before=manifest();(qa/'SOURCE_BEFORE.json').write_text(json.dumps({'source':str(source),'files':before},indent=2)+'\n')
env=dict(os.environ);env['CARGO_HOME']=str(workspace/'.toolchains/cargo');env['RUSTUP_HOME']=str(workspace/'.toolchains/rustup');env['CARGO_TARGET_DIR']=str(workspace/'.toolchains/target-candidate4-r2');env['PATH']=env['CARGO_HOME']+'/bin:'+env.get('PATH','')
command=['cargo','build','--locked','--offline','--features','custom-protocol','--bin','rivune-desktop']
with (qa/'BUILD.log').open('w') as log:
 process=subprocess.Popen(command,cwd=source/'src-tauri',env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 for line in process.stdout:log.write(line);log.flush();print(line,end='',flush=True)
 code=process.wait()
after=manifest();changed=[p for p in set(before)|set(after) if before.get(p)!=after.get(p)]
receipt={'command':command,'cwd':str(source/'src-tauri'),'exit_code':code,'source_files':len(before),'changed_inputs':changed,'built_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'toolchain':subprocess.check_output(['rustc','--version'],env=env,text=True).strip(),'target':'aarch64-apple-darwin','debug_assertions':True,'custom_protocol':True,'source_manifest_sha256':hashlib.sha256((qa/'SOURCE_BEFORE.json').read_bytes()).hexdigest()}
if code or changed:
 (qa/'BUILD_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');sys.exit(code or 2)
binary=workspace/'.toolchains/target-candidate4-r2/debug/rivune-desktop'
bundle=qa/'Rivune Development.app';(bundle/'Contents/MacOS').mkdir(parents=True,exist_ok=False)
output=bundle/'Contents/MacOS/rivune-desktop';shutil.copy2(binary,output)
info={'CFBundleExecutable':'rivune-desktop','CFBundleIdentifier':'com.rivune.desktop.development','CFBundleName':'Rivune Development','CFBundleDisplayName':'Rivune Development','CFBundlePackageType':'APPL','CFBundleShortVersionString':'0.0.1','CFBundleVersion':'2026090701','NSHighResolutionCapable':True}
(bundle/'Contents/Info.plist').write_bytes(plistlib.dumps(info))
receipt.update({'binary':str(binary),'binary_sha256':hashlib.sha256(binary.read_bytes()).hexdigest(),'bundle':str(bundle),'bundle_executable_sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'info_plist_sha256':hashlib.sha256((bundle/'Contents/Info.plist').read_bytes()).hexdigest(),'bundle_identifier':info['CFBundleIdentifier'],'wrapper':'Local QA bundle around exact debug executable; not a signed distribution artifact'})
(qa/'BUILD_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
