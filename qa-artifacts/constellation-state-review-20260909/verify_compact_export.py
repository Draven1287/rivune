from pathlib import Path
import hashlib,json,subprocess,os
root=Path.cwd();repo=root/'tools/symphony/source-import-candidate';ev=root/'qa-artifacts/compact-workspace-export-20260910';stage=root/'tools/symphony/source-stage'
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git','-C',str(repo),*args],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
commit='3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d';parent='4ae1b21ab3d0687babde9a86a8e4496363cd65c1';m=read(ev/'exported-source-manifest.json');pm=read(ev/'parent-source-manifest.json');accepted={}
for name in ['qa-artifacts/compact-conversation-list-20260910/delta-source-hashes.json','qa-artifacts/compact-composer-20260910/supersession-fix-hashes.json','qa-artifacts/compact-composer-20260910/retained-fixture-hashes.json']:accepted.update(read(root/name))
assert accepted==read(ev/'accepted-input-hashes.json')
assert len(accepted)==12
assert git('rev-parse',commit+'^').decode().strip()==parent
assert git('rev-parse',commit+'^{tree}').decode().strip()=='9c588772e018a7b1cbbd1f742497f4c69c9ae71f'
entries=git('ls-tree','-r','-z',commit).split(b'\0');paths=[]
for e in entries:
 if not e:continue
 meta,name=e.split(b'\t');mode,kind,oid=meta.split();assert kind==b'blob' and mode in (b'100644',b'100755');paths.append(name.decode())
assert sorted(paths)==sorted(f['path'] for f in m['files'])
assert len(paths)==m['fileCount']==141
assert len(set(paths))==141
assert sorted(paths)==sorted((stage/'ALLOWLIST.txt').read_text().splitlines())
for manifest,ref in [(m,commit),(pm,parent)]:
 for f in manifest['files']:
  blob=git('show',ref+':'+f['path']);assert len(blob)==f['bytes'] and sha(blob)==f['sha256'],f['path']
 assert sum(f['bytes'] for f in manifest['files'])==manifest['totalBytes']
 assert sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in manifest['files']).encode())==manifest['treeSHA256']
assert m==read(stage/'SOURCE_MANIFEST.json')
for f in m['files']:
 for p in [repo/f['path'],stage/'tree'/f['path']]:assert sha(p.read_bytes())==f['sha256'],str(p)
rawdelta=git('diff','--name-status',parent,commit).decode();delta={line.split('\t')[1]:line.split('\t')[0] for line in rawdelta.splitlines()}
assert set(delta)==set(accepted);assert list(delta.values()).count('A')==7 and list(delta.values()).count('M')==5
assert rawdelta== (ev/'path-delta.txt').read_text().replace('\\t','\t')
for p,h in accepted.items():assert sha(git('show',commit+':'+p))==h,p
for f in pm['files']:
 if f['path'] not in accepted:assert git('show',parent+':'+f['path'])==git('show',commit+':'+f['path'])
excluded=read(ev/'excluded-live-deltas.json')
for p,v in excluded.items():
 assert sha(git('show',commit+':'+p))==v['candidateSHA256']==sha(git('show',parent+':'+p));assert sha((root/p).read_bytes())==v['liveSHA256']
generated=read(ev/'preserved-generated.json')
for p,v in generated.items():
 if 'symlink' in v:assert (repo/p).is_symlink() and os.readlink(repo/p)==v['symlink']
 else:assert sha((repo/p).read_bytes())==v['sha256']
genroot=repo/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen';assert {str(p.relative_to(repo)) for p in genroot.rglob('*') if p.is_file()}=={p for p,v in generated.items() if 'sha256'in v}
status=git('status','--porcelain').decode().splitlines();assert status==['?? prototypes/ai-native-workspace/node_modules','?? qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen/'],status
assert not git('remote').strip();assert git('rev-parse','HEAD').decode().strip()==commit
result={'verdict':'PASS','commit':commit,'parent':parent,'gitTree':git('rev-parse',commit+'^{tree}').decode().strip(),'manifestFiles':141,'parentFiles':len(pm['files']),'bytes':m['totalBytes'],'aggregateSHA256':m['treeSHA256'],'delta':delta,'acceptedInputOverlayMatches':True,'unchangedParentFilesOutsideDelta':sum(f['path']not in accepted for f in pm['files']),'stageAndCandidateMatchEveryBlob':True,'excludedLiveFiles':list(excluded),'preservedGeneratedEntries':len(generated),'status':status,'remotes':[]}
(root/'qa-artifacts/constellation-state-review-20260909/COMPACT_EXPORT_VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
