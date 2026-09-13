from pathlib import Path
import json,hashlib,subprocess,os,plistlib
r=Path.cwd();ev=r/'qa-artifacts/sent-draft-native-build-20260910';out=ev/'independent-review';repo=r/'tools/symphony/source-import-candidate'
def j(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def git(*a):return subprocess.check_output(['git','-C',str(repo),*a],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
c='c84cc2d07fffc1050c2be52ef31b62fbd3c1181a';tree='df3dd55c10992ee653bfb9fb82a9bd373151f7b0';aggregate='ac15ded7187b8c85fbbfb600bfc196e4e55234f2d2c8132e41fbcb0584acacc8'
m=j(ev/'source-manifest.json');before=j(ev/'source-before.json');assert before==j(ev/'source-after.json');assert before['commit']==c and before['gitTree']==tree and before['treeSHA256']==aggregate
assert m==j(r/'qa-artifacts/sent-draft-source-export-20260910/source-manifest.json');assert m['fileCount']==len(m['files'])==148
assert before['files']=={f['path']:f['sha256'] for f in m['files']};assert set(git('ls-tree','-r','--name-only',c).decode().splitlines())==set(before['files'])
for f in m['files']:
 b=git('show',c+':'+f['path']);assert sha(b)==f['sha256'] and len(b)==f['bytes'];assert b==(repo/f['path']).read_bytes()
assert sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode())==aggregate;assert sum(f['bytes'] for f in m['files'])==m['totalBytes']
assert git('rev-parse','HEAD').decode().strip()==c and git('rev-parse',c+'^{tree}').decode().strip()==tree
status=git('status','--porcelain').decode().splitlines();assert status==j(r/'tools/symphony/source-stage/GIT_IMPORT_CANDIDATE.json')['preservedUntrackedPaths']
br=j(ev/'build-receipt.json');assert br['sourceCommit']==c and br['sourceTreeSHA256']==aggregate
app=Path(br['artifact']);assets=j(ev/'frontend-assets.json');dist=ev/'frontend-dist'
for base,expected,n in [(app,br['bundleFiles'],3),(dist,assets,7)]:
 assert len(expected)==n and {str(p.relative_to(base)) for p in base.rglob('*') if p.is_file()}==set(expected)
 for p,v in expected.items():assert sha((base/p).read_bytes())==v
assert br['binarySHA256']==sha(Path(br['binary']).read_bytes())=='a3ba0fd767e18033b27d2af1f03d20f1de1975bdfb4383d0b574a91376605281'
assert br['embeddedFiles']==assets and br['embeddedFrontendPath']==str(dist)
config=j(ev/'tauri-override.json');assert config==br['effectiveConfigOverride']==json.loads(br['buildEnvironment']['TAURI_CONFIG']);assert config['build']['frontendDist']==str(dist)
info=plistlib.loads((app/'Contents/Info.plist').read_bytes());assert info['CFBundleIdentifier']==config['identifier']=='com.rivune.desktop.qa.sentdraft20260910';assert info['CFBundleVersion']=='2026091005';profile=Path(info['LSEnvironment']['RIVUNE_ISOLATED_PROFILE_DIR']);assert profile==ev/'profile-reserved-not-launched' and not profile.exists() and not profile.is_symlink()
old=j(ev/'preserved-before.json');assert len(old)==522 and old==j(ev/'preserved-after.json')
for p,v in old.items():assert sha(Path(p).read_bytes())==v,p
# Recorded compiler dependency mapping only; no asset extraction from executable.
dep=(ev/'native-asset-dependencies.d').read_text().replace('\\ ', ' ')
for p in assets:assert str(dist/p) in dep,p
prior=j(r/'qa-artifacts/results-native-build-20260910/frontend-assets.json');same=[p for p,v in assets.items() if prior.get(p)==v];assert len(same)==5
entry=(dist/'desktop-entry.mjs').read_text();assert entry.startswith("import './desktop-host.mjs';\n") and 'index-CqRlVGz3.js' in entry and 'index-Hm6hc6-g.js' not in entry;assert './desktop-entry.mjs' in (dist/'index.html').read_text()
assert all(x['exitCode']==0 for x in br['commands']) and len(br['commands'])==2;assert 'Finished `dev` profile' in (ev/'native-build.log').read_text()
result={'verdict':'BOUNDED PASS','sourceCommit':c,'gitTree':tree,'aggregate':aggregate,'sourceFiles':148,'bundleFiles':3,'frontendAssets':7,'binarySHA256':br['binarySHA256'],'identifier':info['CFBundleIdentifier'],'reservedProfileAbsent':True,'preservedBeforeAfterAndCurrentFiles':522,'dependencyMappedFrontendInputs':7,'priorFrontendFilesUnchanged':same,'status':status,'embeddedAssetsExtracted':False,'nativeRuntimeTested':False}
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
