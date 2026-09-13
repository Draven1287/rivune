from pathlib import Path
import datetime, hashlib, json, os, shutil, subprocess
info=json.loads(Path('qa-artifacts/direct-host-native-validation-20260909/latest-run.json').read_text())
root=Path(info['root']);run=Path(info['run']);stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%H%M%S')
env=os.environ.copy()
env.update(CARGO_HOME=str(root/'.toolchains/cargo'),RUSTUP_HOME=str(root/'.toolchains/rustup'),CARGO_TARGET_DIR=str(root/'.toolchains/target-candidate4-r2'),PATH=str(root/'.toolchains/cargo/bin')+':'+env['PATH'],TAURI_CONFIG=Path(info['override']).read_text())
cmd=[str(root/'.toolchains/cargo/bin/cargo'),'build','--locked','--offline','--features','custom-protocol','--bin','rivune']
host=root/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2';cwd=host/'src-tauri'
receipt={'command':cmd,'cwd':str(cwd),'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'profile':info['profile'],'override':json.loads(env['TAURI_CONFIG']),'toolchain':subprocess.check_output([cmd[0],'--version'],env=env,text=True).strip()}
with (run/f'build-{stamp}.log').open('w') as log:
    result=subprocess.run(cmd,cwd=cwd,env=env,stdout=log,stderr=subprocess.STDOUT)
receipt['exitCode']=result.returncode;receipt['completedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat()
if result.returncode==0:
    binary=root/'.toolchains/target-candidate4-r2/debug/rivune';receipt['binary']=str(binary);receipt['binarySha256']=hashlib.sha256(binary.read_bytes()).hexdigest()
    shutil.copy2(binary,info['executable']);Path(info['executable']).chmod(0o755)
    info['binarySha256']=receipt['binarySha256'];Path('qa-artifacts/direct-host-native-validation-20260909/latest-run.json').write_text(json.dumps(info,indent=2))
    files=list((root/'prototypes/ai-native-workspace/src').rglob('*'))+list((host/'src-tauri/src').rglob('*'))+list((host/'src-tauri/capabilities').rglob('*'))+[host/'src-tauri/Cargo.toml',host/'src-tauri/Cargo.lock',host/'src-tauri/tauri.conf.json',host/'web/desktop-host.mjs']
    hashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    (run/f'source-hashes-{stamp}.json').write_text(json.dumps(hashes,indent=2));receipt['sourceManifest']=str(run/f'source-hashes-{stamp}.json')
(run/f'build-receipt-{stamp}.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps(receipt,indent=2));print((run/f'build-{stamp}.log').read_text()[-3000:]);raise SystemExit(result.returncode)
