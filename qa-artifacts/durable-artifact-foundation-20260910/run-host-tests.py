from pathlib import Path
import os,subprocess
r=Path.cwd();e={k:v for k,v in os.environ.items() if not k.startswith(('CARGO_','RUST','TAURI_'))};e.update(CARGO_HOME=str(r/'.toolchains/cargo'),RUSTUP_HOME=str(r/'.toolchains/rustup'),CARGO_TARGET_DIR=str(r/'.toolchains/target-candidate4-r2'));e['PATH']=str(r/'.toolchains/cargo/bin')+':'+e['PATH']
o=r/'qa-artifacts/durable-artifact-foundation-20260910'
with (o/'host-tests.log').open('w') as f:res=subprocess.run([str(r/'.toolchains/cargo/bin/cargo'),'test','--locked','--offline','--lib','saved_artifact','--','--nocapture'],cwd=r/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri',env=e,stdout=f,stderr=subprocess.STDOUT)
print(res.returncode)
