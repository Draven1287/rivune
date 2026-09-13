from pathlib import Path
import json,hashlib,plistlib,shutil,subprocess
r=Path.cwd();o=r/'qa-artifacts/startup-handoff-native-build-20260910';c=r/'tools/symphony/source-import-candidate';h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();b=json.loads((o/'build-receipt.json').read_text());assets=json.loads((o/'frontend-assets.json').read_text());app=Path(b['artifact'])
assert b['success'] and b['sourceUnchanged'] and b['priorBinariesProfilesUnchanged'];assert not (o/'profile-reserved-not-launched').exists()
for n,v in assets.items():assert h(o/'frontend-dist'/n)==v
for n,v in b['bundleFiles'].items():assert h(app/n)==v
info=plistlib.loads((app/'Contents/Info.plist').read_bytes());assert info['CFBundleIdentifier']=='com.rivune.desktop.qa.startuphandoff20260910';assert info['LSEnvironment']['RIVUNE_ISOLATED_PROFILE_DIR']==str(o/'profile-reserved-not-launched')
old=r/'qa-artifacts/sent-draft-native-build-20260910/frontend-dist';unchanged=[]
for p in old.rglob('*'):
 if p.is_file() and (o/'frontend-dist'/p.relative_to(old)).exists() and h(p)==h(o/'frontend-dist'/p.relative_to(old)):unchanged.append(str(p.relative_to(old)))
for p in (old/'assets').glob('*.png'):assert h(p)==h(o/'frontend-dist/assets'/p.name)
dep=r/'.toolchains/target-candidate4-r2/debug/rivune.d';shutil.copy2(dep,o/'native-asset-dependencies.d');assert str(o/'frontend-dist') in dep.read_text().replace('\\ ',' ')
prior=json.loads((o/'preserved-before.json').read_text());assert prior==json.loads((o/'preserved-after.json').read_text())
status=subprocess.check_output(['git','-C',str(c),'status','--short'],text=True).splitlines();assert status==['?? prototypes/ai-native-workspace/node_modules','?? qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/gen/']
v={'binarySHA256':b['binarySHA256'],'bundleFilesVerified':3,'frontendAssetsVerified':7,'preservedFiles':len(prior),'reservedProfileAbsent':True,'nativeDependencyReferencesNewFrontend':True,'unchangedPriorFrontendFiles':unchanged,'sourceStylesSHA256':h(c/'prototypes/ai-native-workspace/src/styles.css'),'candidateStatus':status,'nativeRuntimeTested':False};(o/'identity-verification.json').write_text(json.dumps(v,indent=2)+'\n')
Path('docs/coordination/STARTUP_HANDOFF_NATIVE_BUILD_RECEIPT_20260910.md').write_text(f'''# Startup Handoff QA — isolated unlaunched debug build

Built once from exact accepted candidate commit `2ea834a1e2385c34b8f516854b5317c6a08a0607`, Git tree `9da0c197e0b5d81a0ee96398eda787984f0150fe`,148-file manifest aggregate `171ccf39b8cbee0189968505950f1085e12d5b261ecfeb61813e2e878d2c7f28`. Independent export identity PASS read before building. All148 candidate source hashes verified before and after without drift.

Artifact: `{app}`. Binary SHA-256 `{b['binarySHA256']}`. Bundle identifier `com.rivune.desktop.qa.startuphandoff20260910`, version2026091006. Reserved isolated profile `{o/'profile-reserved-not-launched'}` is configured in Info.plist and remains absent. Bundle is unlaunched.

Existing reviewed build driver reused with distinct output/name/identifier/profile. Frontend desktop build passed; one Cargo build --locked --offline --features custom-protocol --bin rivune passed using existing shared toolchain/cache. Output is dev/debug, unoptimized with debug information. Native log records the existing unused variable in constellation_projection.rs and an unused admitted_startup_ui helper warning. Accepted source was not changed to suppress warnings. No additional tests or bundle build performed.

Exact commands, sanitized environment, Cargo/rustc versions, override config and timestamps are in build-receipt.json. All7 frontend assets and3 bundle files have recorded/reverified hashes. Bridge matches accepted source. Native dependency record references this isolated frontend path. CSS and galaxy/icon images retain prior Sent Draft build bytes; JavaScript reflects the accepted handoff frontend. Config override changes QA identity/title/frontend path only.

Preservation comparison covers {len(prior)} files: installed Rivune bundle, discovered prior QA app bundles/profile directories and manifest-addressable live source. Before/after captured paths and hashes match. Candidate tracked state is clean with the same2 pre-existing untracked paths. No process inventory/control operation requested or issued. Prior bundles were not overwritten.

Evidence: qa-artifacts/startup-handoff-native-build-20260910/ contains build.py, verify.py, source-manifest.json, source-before/after.json, build-progress/receipt.json, frontend/native logs, frontend-assets.json, tauri-override.json, native-asset-dependencies.d, preserved-before/after.json and identity-verification.json.

This is an unlaunched debug/review artifact, not an installer or release. Input mapping and embedded-path identity do not prove native runtime, startup contention exit, a second-window outcome, provider access or handoff behavior. No launch/restart, process control, installed replacement, provider, signing/notarization action, new cache/server/dependency, installer or publication. Stopped for independent artifact identity review; no further build is the next step.
''')
print(json.dumps(v,indent=2))
