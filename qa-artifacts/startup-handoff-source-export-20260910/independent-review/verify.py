from pathlib import Path
import json,hashlib,subprocess,os
r=Path.cwd();e=r/'qa-artifacts/startup-handoff-source-export-20260910';out=e/'independent-review';repo=r/'tools/symphony/source-import-candidate';stage=r/'tools/symphony/source-stage'
def j(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git','-C',str(repo),*a],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
c='2ea834a1e2385c34b8f516854b5317c6a08a0607';parent='c84cc2d07fffc1050c2be52ef31b62fbd3c1181a';tree='9da0c197e0b5d81a0ee96398eda787984f0150fe';agg='171ccf39b8cbee0189968505950f1085e12d5b261ecfeb61813e2e878d2c7f28'
a=j(r/'qa-artifacts/startup-contention-correction-20260910/source-hashes.json');h=j(r/'qa-artifacts/connection-handoff-implementation-20260910/source-hashes.json');assert len(a)==2 and len(h)==4 and not set(a)&set(h);a.update(h);assert a==j(e/'accepted-delta-hashes.json');assert h==j(r/'qa-artifacts/connection-handoff-implementation-20260910/state-review/hashes.json')
main=next(p for p in a if p.endswith('/main.rs'));assert a[main]['sourceSHA256']=='cd29d3fa5d7f5aa0bd467b47b35af3fa9e42dffaaa07b21e5a969657c339cd1d';assert a[main]['sourceSHA256']!='3294fceae48998eb73de91ffef271d3094003b6e09e4c1917ce4feb78fe03298'
assert git('rev-parse',c+'^').decode().strip()==parent;assert git('rev-parse',c+'^{tree}').decode().strip()==tree;assert git('rev-parse','HEAD').decode().strip()==c
changes=git('diff','--name-status',parent,c).decode().splitlines();assert len(changes)==6 and all(x.startswith('M\t') for x in changes) and {x[2:] for x in changes}==set(a)
for p,v in a.items():assert sha(git('show',parent+':'+p))==v['baselineSHA256'];assert sha(git('show',c+':'+p))==v['sourceSHA256']==sha((r/p).read_bytes())
m=j(e/'source-manifest.json');assert m==j(stage/'SOURCE_MANIFEST.json');names={f['path'] for f in m['files']};assert len(names)==len(m['files'])==m['fileCount']==148;assert names==set(git('ls-tree','-r','--name-only',c).decode().splitlines())
for f in m['files']:
 b=git('show',c+':'+f['path']);assert sha(b)==f['sha256'] and len(b)==f['bytes'];assert b==(repo/f['path']).read_bytes()==(stage/'tree'/f['path']).read_bytes()
 if f['path'] not in a:assert b==git('show',parent+':'+f['path'])
assert len(names-set(a))==142;assert m['treeSHA256']==agg==sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode());assert m['totalBytes']==sum(f['bytes'] for f in m['files'])
allow=(stage/'ALLOWLIST.txt').read_text().splitlines();assert len(allow)==148 and set(allow)==names;assert {str(p.relative_to(stage/'tree')) for p in (stage/'tree').rglob('*') if p.is_file()}==names
for p,v in j(stage/'VALIDATOR_HASHES.json').items():assert sha((stage/p).read_bytes())==v
assert j(stage/'STATIC_CHECKS.json')==j(e/'static-checks.json');meta=j(stage/'GIT_IMPORT_CANDIDATE.json');assert (meta['commit'],meta['parentCommit'],meta['gitTree'],meta['sourceTreeSHA256'])==(c,parent,tree,agg);assert set(meta['deltaFiles'])==set(a)
status=git('status','--porcelain').decode().splitlines();assert status==meta['preservedUntrackedPaths'];assert git('branch','--show-current').decode().strip()==meta['branch'];assert not git('remote').strip();assert not git('diff','--check',parent,c)
assert sha(git('show',c+':prototypes/ai-native-workspace/src/styles.css'))=='7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643'
live=j(e/'live-before.json');assert len(live)==148
for p,v in live.items():assert sha((r/p).read_bytes())==v
bundles={}
for name in ['results-native-build-20260910','sent-draft-native-build-20260910']:
 br=j(r/'qa-artifacts'/name/'build-receipt.json');app=Path(br['artifact']);assert len(br['bundleFiles'])==3;assert {str(p.relative_to(app)) for p in app.rglob('*') if p.is_file()}==set(br['bundleFiles'])
 for p,v in br['bundleFiles'].items():assert sha((app/p).read_bytes())==v
 bundles[name]={'sourceCommit':br['sourceCommit'],'binarySHA256':br['binarySHA256'],'files':3}
result={'verdict':'BOUNDED PASS','commit':c,'parent':parent,'tree':tree,'aggregate':agg,'acceptedModifiedPaths':6,'blobs':148,'preservedOtherPaths':142,'liveCaptureFilesUnchanged':148,'correctedMainSHA256':a[main]['sourceSHA256'],'priorBundles':bundles,'status':status,'runtimeTested':False};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
