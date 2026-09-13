from pathlib import Path
import hashlib,json,subprocess,os,plistlib
r=Path.cwd();e=r/'qa-artifacts/reading-surfaces-source-build-20260910';repo=r/'tools/symphony/source-import-candidate';stage=r/'tools/symphony/source-stage';old=r/'qa-artifacts/compact-native-build-20260910/frontend-dist';new=e/'frontend-dist'
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text())
def git(*a):return subprocess.check_output(['git','-C',str(repo),*a],env={**os.environ,'GIT_OPTIONAL_LOCKS':'0'})
c='5d71ab110175f53101ff4b82dc1f6c6dbc9c1c4b';parent='3bc19ce0bd7e7a9a1f59dbf11c16a35f0d089f8d';path='prototypes/ai-native-workspace/src/styles.css';m=read(e/'source-manifest.json');pm=read(e/'parent-source-manifest.json')
assert git('rev-parse',c+'^').decode().strip()==parent;assert git('diff','--name-only',parent,c).decode().splitlines()==[path]
source=git('show',c+':'+path);assert sha(source)=='7243010e5c9668eb5a025ded36656b2b78ad33d52c2b91c4a71becd1ec8c0643';assert source==(r/'qa-artifacts/export-reading-surfaces-20260910/proposed'/path).read_bytes()
assert git('diff',parent,c)==(e/'source.patch').read_bytes()
assert len(m['files'])==141;assert set(git('ls-tree','-r','--name-only',c).decode().splitlines())=={f['path'] for f in m['files']}
for f in m['files']:
 b=git('show',c+':'+f['path']);assert sha(b)==f['sha256'] and len(b)==f['bytes'];assert b==(repo/f['path']).read_bytes()==(stage/'tree'/f['path']).read_bytes()
 if f['path']!=path:assert b==git('show',parent+':'+f['path'])
assert sum(f['bytes'] for f in m['files'])==m['totalBytes'];assert sha(''.join(f['path']+'\0'+f['sha256']+'\n' for f in m['files']).encode())==m['treeSHA256'];assert m==read(stage/'SOURCE_MANIFEST.json');assert set((stage/'ALLOWLIST.txt').read_text().splitlines())=={f['path'] for f in m['files']}
assert read(e/'source-before.json')==read(e/'source-after.json');assert read(e/'preserved-before.json')==read(e/'preserved-after.json')
for name in ['preserved-before.json','prior-artifact-hashes.json','preserved-live.json']:
 for p,h in read(e/name).items():assert sha((r/p).read_bytes())==h,p
assets=read(e/'frontend-assets.json');assert {str(p.relative_to(new)) for p in new.rglob('*') if p.is_file()}==set(assets)
for p,h in assets.items():assert sha((new/p).read_bytes())==h
oc=next((old/'assets').glob('*.css'));nc=next((new/'assets').glob('*.css'));a=oc.read_bytes();b=nc.read_bytes();delta=(e/'compiled-css-delta.css').read_bytes().rstrip(b'\n');assert len(delta)==854 and b.count(delta)==1 and b.replace(delta,b'',1)==a
# Independently enumerate intended compiled declarations, rather than trusting the recorded delta.
expected='.chat-first.theme-orbit.host-workspace{background:linear-gradient(90deg,#070d1890 0%,#080e18b8 24%,#080e18f5 65%),url(./rivune-workspace-milky-way-B-psVFJf.png) 0/cover}.chat-first.theme-orbit.host-workspace .app-header{background:#080f1b66}.chat-first.theme-orbit.host-workspace .host-sidebar{background:linear-gradient(#091220a6,#091220db)}.chat-first.theme-orbit.host-workspace .host-chat{background:#101722}.chat-first.theme-orbit.host-workspace .host-chat-header{background:#111a26}.chat-first.theme-orbit.host-workspace .host-composer{background:linear-gradient(120deg,#253246,#1a2637)}@media (width<=700px){.chat-first.theme-orbit.host-workspace,.chat-first.theme-orbit.host-workspace .app-header,.chat-first.theme-orbit.host-workspace .mobile-panel-tabs{background:#0b121d}.chat-first.theme-orbit.host-workspace .host-sidebar{background:#101a29}}'
assert delta==expected.encode()
oj=next((old/'assets').glob('*.js'));nj=next((new/'assets').glob('*.js'));assert oj.read_bytes()==nj.read_bytes()
for p in ['desktop-host.mjs']+[str(p.relative_to(old)) for p in (old/'assets').glob('*.png')]:assert (old/p).read_bytes()==(new/p).read_bytes()
for p in ['index.html','desktop-entry.mjs']:assert (old/p).read_text().replace(oj.name,nj.name).replace(oc.name,nc.name)==(new/p).read_text(),p
build=read(e/'build-receipt.json');assert build['embeddedFiles']==assets;bundle=Path(build['artifact']);assert {str(p.relative_to(bundle)) for p in bundle.rglob('*') if p.is_file()}==set(build['bundleFiles'])
for p,h in build['bundleFiles'].items():assert sha((bundle/p).read_bytes())==h
assert sha(Path(build['binary']).read_bytes())==build['binarySHA256']=='3be98bd7deab1c0feab5882a7cd57ca267fdb385dc9b53a4964bdc7f2972633a'
plist=plistlib.loads((bundle/'Contents/Info.plist').read_bytes());assert plist['CFBundleIdentifier']=='com.rivune.desktop.qa.reading20260910';assert plist['CFBundleExecutable']=='rivune'
dep=(e/'native-asset-dependencies.d').read_text().replace('\\ ',' ')
for p in assets:assert str(new/p) in dep,p
assert build['sourceCommit']==c and build['sourceTreeSHA256']==m['treeSHA256'];assert all(cmd['exitCode']==0 for cmd in build['commands']);assert 'custom-protocol' in build['commands'][1]['argv']
assert git('rev-parse','HEAD').decode().strip()==c;assert not git('diff','--name-only').strip() and not git('diff','--cached','--name-only').strip();assert not git('remote').strip()
out={'verdict':'PASS','commit':c,'parent':parent,'tree':git('rev-parse',c+'^{tree}').decode().strip(),'manifestFiles':141,'unchangedOtherFiles':140,'aggregate':m['treeSHA256'],'compiledCSSSHA256':sha(b),'compiledInsertionBytes':len(delta),'otherCSSBytesIdentical':True,'unchangedJSBridgePNG':True,'HTMLAndEntryOnlyAssetNamesChanged':True,'bundleFiles':build['bundleFiles'],'nativeDependencyAssetCount':len(assets),'preservedCounts':{n:len(read(e/n)) for n in ['preserved-before.json','prior-artifact-hashes.json','preserved-live.json']},'status':git('status','--porcelain').decode().splitlines()}
(r/'qa-artifacts/constellation-state-review-20260909/READING_IDENTITY_VERIFICATION.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
