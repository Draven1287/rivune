from pathlib import Path
import json,hashlib,subprocess,os
r=Path.cwd();out=r/'qa-artifacts/artifact-identity-cases-20260910/sent-draft-export-review';ev=r/'qa-artifacts/sent-draft-source-export-20260910';repo=r/'tools/symphony/source-import-candidate';stage=r/'tools/symphony/source-stage';c='c84cc2d07fffc1050c2be52ef31b62fbd3c1181a';parent='5fa49168a9284efeec713b7222e0e5c74be16c8a'
def j(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git','-C',str(repo),*a],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
accepted=j(r/'qa-artifacts/sent-draft-implementation-20260910/source-hashes.json');mounted=j(r/'qa-artifacts/sent-draft-mounted-20260910/source-hashes.json')
assert len(accepted)==4 and len(mounted)==2 and not set(accepted)&set(mounted);accepted.update(mounted)
assert len(accepted)==6 and accepted==j(ev/'accepted-delta-hashes.json')
reviewed=j(r/'qa-artifacts/results-ui-cases-20260910/sent-draft-review/hashes.json')
assert set(reviewed)==set(accepted)
for p,v in reviewed.items():assert v['actual']==v['expected']==accepted[p]['sourceSHA256']
for p,v in j(r/'qa-artifacts/artifact-identity-cases-20260910/sent-draft-controller-review/hashes.json').items():
 k='prototypes/ai-native-workspace/'+p
 if k in accepted:assert v==accepted[k]['sourceSHA256']
assert git('rev-parse',c+'^').decode().strip()==parent
m=j(ev/'source-manifest.json');pm=j(ev/'before-SOURCE_MANIFEST.json');names={f['path'] for f in m['files']};assert len(names)==len(m['files'])==148
assert set(git('ls-tree','-r','--name-only',c).decode().splitlines())==names
changes=dict(line.split('\t')[::-1] for line in git('diff','--name-status',parent,c).decode().splitlines());assert set(changes)==set(accepted);assert list(changes.values()).count('A')==1
for p,v in accepted.items():
 assert sha(git('show',c+':'+p))==v['sourceSHA256']==sha((r/p).read_bytes())
 if v['baselineSHA256']:assert sha(git('show',parent+':'+p))==v['baselineSHA256']
 else:assert p not in {f['path'] for f in pm['files']}
assert {str(p.relative_to(stage/'tree')) for p in (stage/'tree').rglob('*') if p.is_file()}==names
assert len((stage/'ALLOWLIST.txt').read_text().splitlines())==148
for f in m['files']:
 b=git('show',c+':'+f['path']);assert sha(b)==f['sha256'] and len(b)==f['bytes'];assert b==(repo/f['path']).read_bytes()==(stage/'tree'/f['path']).read_bytes()
 if f['path'] not in accepted:assert b==git('show',parent+':'+f['path'])
assert len(names-set(accepted))==142;assert sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode())==m['treeSHA256'];assert sum(f['bytes'] for f in m['files'])==m['totalBytes'];assert m==j(stage/'SOURCE_MANIFEST.json');assert set((stage/'ALLOWLIST.txt').read_text().splitlines())==names
for p,v in j(stage/'VALIDATOR_HASHES.json').items():assert sha((stage/p).read_bytes())==v
assert j(stage/'STATIC_CHECKS.json')==j(ev/'static-checks.json')
meta=j(stage/'GIT_IMPORT_CANDIDATE.json');assert meta['commit']==c and meta['parentCommit']==parent and meta['gitTree']==git('rev-parse',c+'^{tree}').decode().strip() and meta['sourceTreeSHA256']==m['treeSHA256'] and set(meta['deltaFiles'])==set(accepted)
assert sha(git('show',c+':prototypes/ai-native-workspace/src/styles.css'))=='7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643'
oldex=j(r/'qa-artifacts/compact-workspace-export-20260910/excluded-live-deltas.json')
for p,v in oldex.items():assert sha((r/p).read_bytes())==v['liveSHA256'];assert git('show',parent+':'+p)==git('show',c+':'+p)
status=git('status','--porcelain').decode().splitlines();assert status==meta['preservedUntrackedPaths'];assert not git('remote').strip();assert git('rev-parse','HEAD').decode().strip()==c;assert git('branch','--show-current').decode().strip()==meta['branch']
for p,v in j(ev/'live-before.json').items():assert sha((r/p).read_bytes())==v
br=j(r/'qa-artifacts/results-native-build-20260910/build-receipt.json');bundle=Path(br['artifact']);expected=j(ev/'results-qa-before.json')
assert br['sourceCommit']==parent and expected==br['bundleFiles']
assert {str(p.relative_to(bundle)) for p in bundle.rglob('*') if p.is_file()}==set(expected)
for p,v in expected.items():assert sha((bundle/p).read_bytes())==v
assert git('diff','--check',parent,c)==b''
res={'verdict' :'PASS','commit':c,'parent':parent,'tree':meta['gitTree'],'aggregate':m['treeSHA256'],'blobs':148,'deltaPaths':6,'newPaths':1,'preservedOtherPaths':142,'acceptedComposition':'4 implementation + 2 mounted fixture/selector','allAcceptedLiveHashesMatch':True,'stageValidatorHashesMatch':True,'status':status,'remotes':[],'olderResultsBundleFilesUnchanged':len(expected),'olderResultsSourceCommit':br['sourceCommit']};(out/'result.json').write_text(json.dumps(res,indent=2)+'\n');print(json.dumps(res,indent=2))
