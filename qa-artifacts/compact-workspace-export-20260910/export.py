from pathlib import Path
import os,json,hashlib,shutil,subprocess,datetime
root=Path.cwd();stage=root/'tools/symphony/source-stage';candidate=root/'tools/symphony/source-import-candidate';out=root/'qa-artifacts/compact-workspace-export-20260910'
env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};env.update(GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL='/dev/null')
def git(*args):return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-C',str(candidate),*args],env=env,text=True).strip()
def sha(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads((root/path).read_text())
def save(path,data):path.write_text(json.dumps(data,indent=2)+'\n')
parent=git('rev-parse','HEAD');assert parent=='4ae1b21ab3d0687babde9a86a8e4496363cd65c1';assert git('branch','--show-current')=='codex/s00-source-import';assert not git('remote');assert not git('diff','--name-only');assert not git('diff','--cached','--name-only')
status=git('status','--porcelain');assert set(status.splitlines())=={'?? prototypes/ai-native-workspace/node_modules','?? qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen/'}
def generated():
 result={};link=candidate/'prototypes/ai-native-workspace/node_modules';assert link.is_symlink();result[str(link.relative_to(candidate))]={'symlink':os.readlink(link)}
 for p in sorted((candidate/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen').rglob('*')):
  if p.is_file():result[str(p.relative_to(candidate))]={'sha256':sha(p.read_bytes())}
 return result
untouched=generated();save(out/'preserved-generated.json',untouched)
composer={**read('qa-artifacts/compact-composer-20260910/supersession-fix-hashes.json'),**read('qa-artifacts/compact-composer-20260910/retained-fixture-hashes.json')}
assert composer==read('qa-artifacts/compact-composer-20260910/source-hashes.json')
expected={**read('qa-artifacts/compact-conversation-list-20260910/delta-source-hashes.json'),**composer};files=sorted(expected);assert len(files)==12
for f,h in expected.items():assert sha((root/f).read_bytes())==h,f
save(out/'accepted-input-hashes.json',expected);save(out/'included-paths.json',files)
before=read('tools/symphony/source-stage/SOURCE_MANIFEST.json');previous=read('tools/symphony/source-stage/GIT_IMPORT_CANDIDATE.json')
for f in before['files']:
 assert sha((stage/'tree'/f['path']).read_bytes())==f['sha256'],f['path']
 assert sha((candidate/f['path']).read_bytes())==f['sha256'],f['path']
excluded={f:{'candidateSHA256':sha((candidate/f).read_bytes()),'liveSHA256':sha((root/f).read_bytes())} for f in previous['excludedWorkspaceChanges']};save(out/'excluded-live-deltas.json',excluded)
save(out/'parent-source-manifest.json',before);save(out/'parent-import-candidate.json',previous)
for f in files:
 for dest in [stage/'tree'/f,candidate/f]:dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/f,dest)
names=sorted(set([f['path'] for f in before['files']]+files));m={**before,'files':[{'path':n,'bytes':(stage/'tree'/n).stat().st_size,'sha256':sha((stage/'tree'/n).read_bytes())} for n in names]};m.update(fileCount=len(names),totalBytes=sum(f['bytes'] for f in m['files']),treeSHA256=sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode()),capturedAtUTC=datetime.datetime.now(datetime.timezone.utc).isoformat());save(stage/'SOURCE_MANIFEST.json',m);(stage/'ALLOWLIST.txt').write_text('\n'.join(names)+'\n')
def check(args,cwd,log):
 with (out/log).open('w') as output:subprocess.run(args,cwd=cwd,stdout=output,stderr=subprocess.STDOUT,check=True,env=env)
check(['node',str(stage/'validate.mjs'),'--source',str(candidate)],root,'static-checks.json');shutil.copy2(out/'static-checks.json',stage/'STATIC_CHECKS.json')
frontend=candidate/'prototypes/ai-native-workspace'
check(['npm','run','typecheck'],frontend,'typecheck.log')
check(['node','--experimental-strip-types','--test','tests/conversationList.test.mjs'],frontend,'conversation-tests.log')
check(['node','--experimental-strip-types','--test','--test-name-pattern=compact composer','tests/hostController.test.mjs'],frontend,'composer-tests.log')
git('add','--',*files);assert set(git('diff','--cached','--name-only').splitlines())==set(files)
(out/'path-delta.txt').write_text(git('diff','--cached','--name-status')+'\n')
print(git('-c','user.name=Codex Local Source Handoff','-c','user.email=codex-local@localhost','commit','--no-gpg-sign','-m','Import accepted compact conversation list and composer'))
assert git('status','--porcelain')==status;assert generated()==untouched;assert not git('remote')
for f in m['files']:assert sha(subprocess.check_output(['git','-C',str(candidate),'show','HEAD:'+f['path']],env=env))==f['sha256']
for f in before['files']:
 if f['path'] not in files:assert sha((candidate/f['path']).read_bytes())==f['sha256'],f['path']
for f,v in excluded.items():assert sha((candidate/f).read_bytes())==v['candidateSHA256'] and sha((stage/'tree'/f).read_bytes())==v['candidateSHA256']
r={**previous,'commit':git('rev-parse','HEAD'),'parentCommit':parent,'gitTree':git('rev-parse','HEAD^{tree}'),'sourceTreeSHA256':m['treeSHA256'],'fileCount':m['fileCount'],'deltaFiles':files,'cleanWorkingTree':False,'cleanTrackedWorkingTree':True,'committedBlobsMatchManifest':True,'preservedUntrackedPaths':status.splitlines()};save(stage/'GIT_IMPORT_CANDIDATE.json',r);save(stage/'VALIDATOR_HASHES.json',{n:sha((stage/n).read_bytes()) for n in ['validate.mjs','validate.test.mjs','STATIC_CHECKS.json']});save(out/'result.json',r);save(out/'exported-source-manifest.json',m)
print(json.dumps({'parent':parent,'commit':r['commit'],'gitTree':r['gitTree'],'sourceTreeSHA256':m['treeSHA256'],'fileCount':len(names)}))
