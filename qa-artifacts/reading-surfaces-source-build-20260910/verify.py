from pathlib import Path
import json,hashlib,shutil
r=Path.cwd();o=r/'qa-artifacts/reading-surfaces-source-build-20260910';old=r/'qa-artifacts/compact-native-build-20260910/frontend-dist';new=o/'frontend-dist';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
preserved=json.loads((o/'prior-artifact-hashes.json').read_text());assert all(sha(r/p)==v for p,v in preserved.items())
a=next((old/'assets').glob('*.css')).read_text();bp=next((new/'assets').glob('*.css'));b=bp.read_text();i=0
while i<min(len(a),len(b)) and a[i]==b[i]:i+=1
j=len(a)-i;delta=b[i:len(b)-j];assert b[:i]+b[len(b)-j:]==a
oldjs=next((old/'assets').glob('*.js'));newjs=next((new/'assets').glob('*.js'));assert oldjs.read_bytes()==newjs.read_bytes()
assert (old/'desktop-host.mjs').read_bytes()==(new/'desktop-host.mjs').read_bytes()
assert (old/'desktop-entry.mjs').read_text().replace(oldjs.name,newjs.name)==(new/'desktop-entry.mjs').read_text()
for p in (old/'assets').glob('*.png'):assert sha(p)==sha(new/'assets'/p.name)
(o/'compiled-css-delta.css').write_text(delta+'\n')
dep=r/'.toolchains/target-candidate4-r2/debug/rivune.d';shutil.copy2(dep,o/'native-asset-dependencies.d');assert str(new) in dep.read_text().replace('\\ ', ' ')
build=json.loads((o/'build-receipt.json').read_text());src=json.loads((o/'source-result.json').read_text())
v={'compiledCSSSHA256':sha(bp),'cssInsertionBytes':len(delta),'priorCSSOtherwiseByteIdentical':True,'javascriptByteIdentical':True,'bridgeImagesByteIdentical':True,'entryOnlyHashedJSReferenceChanged':True,'priorArtifactFilesPreserved':len(preserved),'nativeDependencyReferencesNewFrontend':True,'sourceStylesSHA256':sha(r/'tools/symphony/source-import-candidate/prototypes/ai-native-workspace/src/styles.css')};(o/'identity-verification.json').write_text(json.dumps(v,indent=2)+'\n')
text=f'''# Accepted reading surfaces — source and isolated build receipt

Applied only the independently accepted eleven-line stylesheet proposal. Local candidate commit `{src['commit']}`, parent `{src['parentCommit']}`. Exactly one changed path: `prototypes/ai-native-workspace/src/styles.css`. Source SHA256 `{v['sourceStylesSHA256']}`. Git tree `{src['gitTree']}`; manifest tree SHA256 `{src['sourceTreeSHA256']}` (141 files). Stage tree, import manifest, validator receipt and validator hashes updated; committed blobs match manifest. Tracked candidate clean; pre-existing untracked paths preserved. All manifest-addressable live files and all other candidate source files preserved.

Separate artifact: `{build['artifact']}`. Binary SHA256 `{build['binarySHA256']}`. Identifier `com.rivune.desktop.qa.reading20260910`; separate profile reserved, not initialized. Frontend build and locked/offline custom-protocol Cargo build passed using the existing shared toolchain/cache. No app launch, provider call, signing, installation, publication or server change. Prior compact artifact files, installed binary/plist and S02 binary/plist/profile hashes preserved.

Compiled CSS SHA256 `{v['compiledCSSSHA256']}`. Compared with the prior exact frontend, CSS contains only an {len(delta)}-byte insertion of the accepted declarations; all other CSS bytes are identical. Expected minification rewrites left center to 0, max-width to width<=, merges identical mobile background selectors, and resolves the unchanged hashed galaxy asset. JavaScript bytes, bridge and PNG assets are identical. Generated HTML and desktop entry reference new hashed asset names; the JS filename changed while its contents did not. No unrelated regenerated CSS changes. Native dependency record references the new isolated frontend directory.

Evidence directory: `qa-artifacts/reading-surfaces-source-build-20260910/`. See source-result.json, source-manifest.json, source.patch, build-receipt.json, frontend-assets.json, identity-verification.json, compiled-css-delta.css, native-asset-dependencies.d, preserved-before/after.json, prior-artifact-hashes.json and build logs. No unrelated functional audits repeated. Ready for independent final identity verification; build is unlaunched.
'''
(r/'docs/coordination/READING_SURFACES_SOURCE_BUILD_RECEIPT_20260910.md').write_text(text)
print(json.dumps({'commit':src['commit'],'binarySHA256':build['binarySHA256'],**v},indent=2))
