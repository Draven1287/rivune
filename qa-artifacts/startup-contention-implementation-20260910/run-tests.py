from pathlib import Path
import os,subprocess,json
r=Path.cwd();o=r/'qa-artifacts/startup-contention-implementation-20260910';native=r/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri'
e={k:v for k,v in os.environ.items() if not k.startswith(('CARGO_','RUST','TAURI_'))};e.update(CARGO_HOME=str(r/'.toolchains/cargo'),RUSTUP_HOME=str(r/'.toolchains/rustup'),CARGO_TARGET_DIR=str(r/'.toolchains/target-candidate4-r2'));e['PATH']=str(r/'.toolchains/cargo/bin')+':'+e['PATH'];e['TAURI_CONFIG']=json.dumps({'build':{'frontendDist':str(r/'qa-artifacts/sent-draft-native-build-20260910/frontend-dist')}})
for label,args in [('host-contention',['--lib','contention']),('startup',['--bin','rivune','startup']),('dock',['--bin','rivune','dock_reopen'])]:
 command=[str(r/'.toolchains/cargo/bin/cargo'),'test','--locked','--offline',*args,'--','--nocapture']
 with (o/(label+'.log')).open('w') as f:result=subprocess.run(command,cwd=native,env=e,stdout=f,stderr=subprocess.STDOUT)
 print(label,result.returncode,flush=True)
 if result.returncode:raise SystemExit(result.returncode)
