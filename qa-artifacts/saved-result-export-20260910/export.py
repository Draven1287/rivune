from pathlib import Path
import os,json,hashlib,shutil,subprocess,datetime
root=Path.cwd();stage=root/'tools/symphony/source-stage';candidate=root/'tools/symphony/source-import-candidate';out=root/'qa-artifacts/saved-result-export-20260910'
env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};env.update(GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL='/dev/null')
def git(*args):return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-C',str(candidate),*args],env=env,text=True).strip()
sha=lambda b:hashlib.sha256(b).hexdigest()
parent=git('rev-parse','HEAD');assert parent=='dd9cfedd6130c4704e5addeb28307a12b20c341f';assert not git('diff','--name-only');assert not git('diff','--cached','--name-only')
status=git('status','--porcelain');assert set(status.splitlines())=={'?? prototypes/ai-native-workspace/node_modules','?? qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen/'}
def generated():
 result={};link=candidate/'prototypes/ai-native-workspace/node_modules';assert link.is_symlink();result[str(link.relative_to(candidate))]={'symlink':os.readlink(link)}
 directory=candidate/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen'
 for p in sorted(directory.rglob('*')):
  if p.is_file():result[str(p.relative_to(candidate))]={'sha256':sha(p.read_bytes())}
 return result
untouched=generated();(out/'preserved-generated.json').write_text(json.dumps(untouched,indent=2))
base=json.loads((root/'qa-artifacts/saved-result-viewer-20260910/source-hashes.json').read_text());updated=json.loads((root/'qa-artifacts/saved-result-rendered-fixture-20260910/source-hashes.json').read_text());expected={**base,**updated};excluded='prototypes/ai-native-workspace/src/styles.css';expected.pop(excluded)
files=sorted([*expected,'qa-artifacts/saved-result-lifecycle-focus-20260910/fixtureSafety.test.cjs']);(out/'included-paths.json').write_text(json.dumps(files,indent=2))
for f,checksum in expected.items():assert sha((root/f).read_bytes())==checksum,f
before=json.loads((stage/'SOURCE_MANIFEST.json').read_text());excluded_before={f['path']:f['sha256'] for f in before['files'] if f['path'] in json.loads((stage/'GIT_IMPORT_CANDIDATE.json').read_text())['excludedWorkspaceChanges']}
for f in files:
 for dest in [stage/'tree'/f,candidate/f]:dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/f,dest)
shutil.copy2(stage/'SOURCE_MANIFEST.json',stage/'SOURCE_MANIFEST.pre-accepted-saved-result.json');m=before.copy();names=sorted(set([f['path'] for f in before['files']]+files));m['files']=[{'path':n,'bytes':(stage/'tree'/n).stat().st_size,'sha256':sha((stage/'tree'/n).read_bytes())} for n in names];m.update(fileCount=len(names),totalBytes=sum(f['bytes'] for f in m['files']),treeSHA256=sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode()),capturedAtUTC=datetime.datetime.now(datetime.timezone.utc).isoformat());(stage/'SOURCE_MANIFEST.json').write_text(json.dumps(m,indent=2)+'\n');(stage/'ALLOWLIST.txt').write_text('\n'.join(names)+'\n')
with (stage/'STATIC_CHECKS.json').open('w') as log:subprocess.run(['node',str(stage/'validate.mjs'),'--source',str(candidate)],stdout=log,check=True)
shutil.copy2(stage/'STATIC_CHECKS.json',out/'static-checks.json')
git('add','--',*files);assert set(git('diff','--cached','--name-only').splitlines())==set(files)
print(git('-c','user.name=Codex Local Source Handoff','-c','user.email=codex-local@localhost','commit','--no-gpg-sign','-m','Import accepted saved-result viewer and isolated review fixture'))
assert git('status','--porcelain')==status;assert generated()==untouched;assert not git('remote')
for f in m['files']:assert sha(subprocess.check_output(['git','-C',str(candidate),'show','HEAD:'+f['path']],env=env))==f['sha256']
for f,h in excluded_before.items():assert sha((candidate/f).read_bytes())==h and sha((stage/'tree'/f).read_bytes())==h
p=stage/'GIT_IMPORT_CANDIDATE.json';r=json.loads(p.read_text());r.update(commit=git('rev-parse','HEAD'),parentCommit=parent,gitTree=git('rev-parse','HEAD^{tree}'),sourceTreeSHA256=m['treeSHA256'],fileCount=m['fileCount'],deltaFiles=files,cleanWorkingTree=False,cleanTrackedWorkingTree=True,preservedUntrackedPaths=status.splitlines());p.write_text(json.dumps(r,indent=2)+'\n');(stage/'VALIDATOR_HASHES.json').write_text(json.dumps({n:sha((stage/n).read_bytes()) for n in ['validate.mjs','validate.test.mjs','STATIC_CHECKS.json']},indent=2)+'\n');(out/'result.json').write_text(json.dumps(r,indent=2));print(r['commit']);print(m['treeSHA256'])
