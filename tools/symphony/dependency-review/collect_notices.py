"""Offline notice-input collector. Does not install, build, or copy source trees."""
from pathlib import Path
import json, hashlib, re, collections

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
FRESH = Path('/private/tmp/rivune-s00-fresh-3qmgz0k4/prototypes/ai-native-workspace')
CACHE = ROOT / '.toolchains/cargo/registry/src/index.crates.io-1949cf8c6b5b557f'
lock = json.loads((ROOT/'tools/symphony/source-stage/tree/prototypes/ai-native-workspace/package-lock.json').read_text())
metadata = json.loads((ROOT/'qa-artifacts/s00-fresh-source-20260909/cargo-metadata.json').read_text())
records, texts = [], {}

def notices(directory):
    result=[]
    if not directory.exists(): return result
    # License/notice resources only; nested included resources can have separate notices.
    for f in sorted(directory.rglob('*')):
        if not f.is_file() or f.is_symlink() or 'node_modules' in f.relative_to(directory).parts: continue
        if not re.match(r'^(licen[sc]e|notice|copying|copyright)([.\-_]|$)',f.name,re.I): continue
        b=f.read_bytes()
        try: text=b.decode('utf-8')
        except UnicodeDecodeError: continue
        digest=hashlib.sha256(b).hexdigest();texts[digest]=text
        result.append({'file':str(f.relative_to(directory)),'sha256':digest,'bytes':len(b)})
    return result

# Actual JS dependency graph rooted at React/ReactDOM, not npm's dev flag alone.
runtime=set(); todo=['react','react-dom']
while todo:
    name=todo.pop()
    if name in runtime: continue
    runtime.add(name);p=FRESH/'node_modules'/name/'package.json'
    if p.exists(): todo.extend(json.loads(p.read_text()).get('dependencies',{}))
for key,value in lock['packages'].items():
    if not key: continue
    name=key.split('node_modules/')[-1];directory=FRESH/key
    pkg=json.loads((directory/'package.json').read_text()) if (directory/'package.json').exists() else {}
    category='frontend-runtime-candidate' if name in runtime else 'frontend-build-development'
    if name=='tailwindcss': category='frontend-generated-css-attribution'
    records.append({'ecosystem':'npm','name':name,'version':value['version'],'category':category,'license':pkg.get('license',value.get('license')),'installed':bool(pkg),'versionMatches':pkg.get('version')==value['version'] if pkg else None,'notices':notices(directory),'integrityPresent':bool(value.get('integrity'))})

packages={p['id']:p for p in metadata['packages']};nodes={n['id']:n for n in metadata['resolve']['nodes']}
runtime=set();todo=[metadata['resolve']['root']]
while todo:
    identity=todo.pop()
    if identity in runtime: continue
    runtime.add(identity)
    for dep in nodes.get(identity,{}).get('deps',[]):
        p=packages[dep['pkg']]
        macro=any('proc-macro' in t['kind'] for t in p['targets'])
        if not macro and any(k['kind'] is None for k in dep['dep_kinds']): todo.append(dep['pkg'])
for identity,p in packages.items():
    if not p.get('source'): continue # first-party path crates not third-party notices
    directory=CACHE/(p['name']+'-'+p['version'])
    records.append({'ecosystem':'cargo','name':p['name'],'version':p['version'],'category':'native-runtime-candidate' if identity in runtime else 'native-build-proc-macro-development','license':p['license'],'licenseFile':p.get('license_file'),'installed':directory.exists(),'notices':notices(directory)})

(OUT/'NOTICE_INPUTS.json').write_text(json.dumps({'scope':'Existing npm install and macOS-filtered Cargo cache; graph classification, not binary linkage proof','packages':records},indent=2)+'\n')
for name,categories in [('CANDIDATE_RUNTIME_NOTICES.txt',{'frontend-runtime-candidate','frontend-generated-css-attribution','native-runtime-candidate'}),('BUILD_DEPENDENCY_NOTICES.txt',{'frontend-build-development','native-build-proc-macro-development'})]:
    entries=[r for r in records if r['category'] in categories]
    sections=['CANDIDATE ATTRIBUTION INPUTS — NOT FINAL DISTRIBUTION CLEARANCE\nArtwork excluded. Package license expressions are preserved; no alternative-license choice inferred.\n']
    byhash=collections.defaultdict(list)
    for r in entries:
        label=f"{r['ecosystem']} {r['name']} {r['version']} [{r['license']}]"
        if not r['notices']: sections.append('UNRESOLVED: '+label+' — no cached notice text found.\n')
        for n in r['notices']: byhash[n['sha256']].append(label+' / '+n['file'])
    for digest,labels in sorted(byhash.items()): sections.extend(['\n'+'='*72+'\n'+'\n'.join(labels)+'\nSHA-256 '+digest+'\n',texts[digest]+'\n'])
    (OUT/name).write_text(''.join(sections))
missing=[r for r in records if not r['notices']]
print(json.dumps({'categories':dict(collections.Counter(r['category'] for r in records)),'missing':[{k:r[k] for k in ['ecosystem','name','version','category','license','installed']} for r in missing],'uniqueNoticeTexts':len(texts)},indent=2))
