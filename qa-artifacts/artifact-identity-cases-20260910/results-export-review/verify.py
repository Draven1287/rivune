from pathlib import Path
import json,hashlib,subprocess,os
r=Path.cwd();out=r/'qa-artifacts/artifact-identity-cases-20260910/results-export-review';ev=r/'qa-artifacts/accepted-results-source-export-20260910';repo=r/'tools/symphony/source-import-candidate';stage=r/'tools/symphony/source-stage';c='5fa49168a9284efeec713b7222e0e5c74be16c8a';parent='5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b'
def j(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git','-C',str(repo),*a],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
accepted=j(r/'qa-artifacts/durable-artifact-foundation-20260910/source-hashes.json');ui=j(r/'qa-artifacts/results-pane-integration-20260910/source-hashes.json');cor=j(r/'qa-artifacts/results-pane-correction-20260910/source-hashes.json')
for p,v in cor.items():assert ui[p]['sourceSHA256']==v['baselineSHA256'];ui[p]['sourceSHA256']=v['sourceSHA256']
accepted.update(ui)
for p,v in j(r/'qa-artifacts/connection-copy-applied-20260910/hashes.json').items():accepted[p]={'baselineSHA256':v['before'],'sourceSHA256':v['after']}
assert len(accepted)==23 and accepted==j(ev/'accepted-delta-hashes.json')
assert git('rev-parse',c+'^').decode().strip()==parent
m=j(ev/'source-manifest.json');pm=j(ev/'before-SOURCE_MANIFEST.json');names={f['path'] for f in m['files']};assert len(names)==len(m['files'])==147
assert set(git('ls-tree','-r','--name-only',c).decode().splitlines())==names
changes=dict(line.split('\t')[::-1] for line in git('diff','--name-status',parent,c).decode().splitlines());assert set(changes)==set(accepted);assert list(changes.values()).count('A')==6
for p,v in accepted.items():
 assert sha(git('show',c+':'+p))==v['sourceSHA256']==sha((r/p).read_bytes())
 if v['baselineSHA256']:assert sha(git('show',parent+':'+p))==v['baselineSHA256']
 else:assert p not in {f['path'] for f in pm['files']}
for f in m['files']:
 b=git('show',c+':'+f['path']);assert sha(b)==f['sha256'] and len(b)==f['bytes'];assert b==(repo/f['path']).read_bytes()==(stage/'tree'/f['path']).read_bytes()
 if f['path'] not in accepted:assert b==git('show',parent+':'+f['path'])
assert len(names-set(accepted))==124;assert sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode())==m['treeSHA256'];assert sum(f['bytes'] for f in m['files'])==m['totalBytes'];assert m==j(stage/'SOURCE_MANIFEST.json');assert set((stage/'ALLOWLIST.txt').read_text().splitlines())==names
for p,v in j(stage/'VALIDATOR_HASHES.json').items():assert sha((stage/p).read_bytes())==v
assert j(stage/'STATIC_CHECKS.json')==j(ev/'static-checks.json')
meta=j(stage/'GIT_IMPORT_CANDIDATE.json');assert meta['commit']==c and meta['parentCommit']==parent and meta['gitTree']==git('rev-parse',c+'^{tree}').decode().strip() and meta['sourceTreeSHA256']==m['treeSHA256'] and set(meta['deltaFiles'])==set(accepted)
assert sha(git('show',c+':prototypes/ai-native-workspace/src/styles.css'))=='7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643'
oldex=j(r/'qa-artifacts/compact-workspace-export-20260910/excluded-live-deltas.json')
for p,v in oldex.items():assert sha((r/p).read_bytes())==v['liveSHA256'];assert git('show',parent+':'+p)==git('show',c+':'+p)
status=git('status','--porcelain').decode().splitlines();assert status==meta['preservedUntrackedPaths'];assert not git('remote').strip();assert git('rev-parse','HEAD').decode().strip()==c;assert git('branch','--show-current').decode().strip()==meta['branch']
res={'verdict':'PASS','commit':c,'parent':parent,'tree':meta['gitTree'],'aggregate':m['treeSHA256'],'blobs':147,'deltaPaths':23,'newPaths':6,'preservedOtherPaths':124,'acceptedComposition':'13 foundation + 2 copy + 8 corrected Results','allAcceptedLiveHashesMatch':True,'stageValidatorHashesMatch':True,'status':status,'remotes':[]};(out/'result.json').write_text(json.dumps(res,indent=2)+'\n');print(json.dumps(res,indent=2))
