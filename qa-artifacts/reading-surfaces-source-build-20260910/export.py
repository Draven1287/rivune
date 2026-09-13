from pathlib import Path
import os,json,hashlib,shutil,subprocess,datetime
r=Path.cwd();s=r/'tools/symphony/source-stage';c=r/'tools/symphony/source-import-candidate';o=r/'qa-artifacts/reading-surfaces-source-build-20260910';o.mkdir(exist_ok=True)
e={k:v for k,v in os.environ.items() if not k.startswith('GIT_')};e.update(GIT_CONFIG_NOSYSTEM='1',GIT_CONFIG_GLOBAL='/dev/null')
def git(*a):return subprocess.check_output(['git','-c','core.hooksPath=/dev/null','-C',str(c),*a],env=e,text=True).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
f='prototypes/ai-native-workspace/src/styles.css';p=r/'qa-artifacts/export-reading-surfaces-20260910/proposed'/f
assert sha(p)=='7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643'
parent=git('rev-parse','HEAD');assert parent=='3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d';assert not git('diff','--name-only');assert not git('diff','--cached','--name-only');assert not git('remote')
status=git('status','--porcelain');before=json.loads((s/'SOURCE_MANIFEST.json').read_text());prev=json.loads((s/'GIT_IMPORT_CANDIDATE.json').read_text());live={x['path']:sha(r/x['path']) for x in before['files'] if (r/x['path']).is_file()}
for x in before['files']:
 assert sha(c/x['path'])==x['sha256'];assert sha(s/'tree'/x['path'])==x['sha256']
save(o/'parent-source-manifest.json',before);save(o/'preserved-live.json',live)
for d in [c/f,s/'tree'/f]:shutil.copy2(p,d)
m={**before,'files':[{'path':x['path'],'bytes':(c/x['path']).stat().st_size,'sha256':sha(c/x['path'])} for x in before['files']]};m.update(totalBytes=sum(x['bytes'] for x in m['files']),treeSHA256=hashlib.sha256(''.join(x['path']+'\0'+x['sha256']+'\n' for x in m['files']).encode()).hexdigest(),capturedAtUTC=datetime.datetime.now(datetime.timezone.utc).isoformat());save(s/'SOURCE_MANIFEST.json',m)
with (o/'static-checks.json').open('w') as out:subprocess.run(['node',str(s/'validate.mjs'),'--source',str(c)],env=e,stdout=out,check=True)
shutil.copy2(o/'static-checks.json',s/'STATIC_CHECKS.json');git('add','--',f);assert git('diff','--cached','--name-only')==f
(o/'source.patch').write_text(git('diff','--cached')+'\n');git('-c','user.name=Codex Local Source Handoff','-c','user.email=codex-local@localhost','commit','--no-gpg-sign','-m','Apply accepted calm reading surfaces')
assert git('status','--porcelain')==status
for x in before['files']:
 if x['path']!=f:assert sha(c/x['path'])==x['sha256']
assert live=={n:sha(r/n) for n in live}
res={**prev,'commit':git('rev-parse','HEAD'),'parentCommit':parent,'gitTree':git('rev-parse','HEAD^{tree}'),'sourceTreeSHA256':m['treeSHA256'],'deltaFiles':[f],'committedBlobsMatchManifest':True}
for x in m['files']:assert hashlib.sha256(subprocess.check_output(['git','-C',str(c),'show','HEAD:'+x['path']],env=e)).hexdigest()==x['sha256']
save(s/'GIT_IMPORT_CANDIDATE.json',res);save(s/'VALIDATOR_HASHES.json',{n:sha(s/n) for n in ['validate.mjs','validate.test.mjs','STATIC_CHECKS.json']});save(o/'source-result.json',res);save(o/'source-manifest.json',m)
print(json.dumps(res))
