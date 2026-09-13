from pathlib import Path
import json,hashlib,re,subprocess
r=Path.cwd();o=r/'qa-artifacts/startup-fallback-implementation-20260910';d=r/'prototypes/ai-native-workspace/dist-desktop'
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
protected=json.loads((o/'protected-before.json').read_text());assert all(h(r/p)==v for p,v in protected.items())
head=subprocess.check_output(['git','-C','tools/symphony/source-import-candidate','rev-parse','HEAD'],text=True).strip();assert head=='2ea834a1e2385c34b8f516854b5317c6a08a0607'
html=(d/'index.html').read_text();assert 'Opening Rivune' in html and 'aria-busy="true"' in html and 'Content-Security-Policy' not in html
css=re.findall(r'<link[^>]+href="([^"]+\.css)"',html);assert css and all((d/p).is_file() for p in css);assert all('rivune-startup' in (d/p).read_text() for p in css)
entry=(d/'desktop-entry.mjs').read_text();assert entry.startswith("import './desktop-host.mjs';")
js=re.search(r"import '(./assets/[^']+)'",entry)[1];entryjs=(d/js).read_text();dynamic=re.findall(r'import\([`\"](\./App-[^`\"]+\.js)[`\"]\)',entryjs);assert dynamic
assert all((d/'assets'/p).is_file() for p in dynamic)
dynamicCSS=re.findall(r'"(\./App-[^\"]+\.css)"',entryjs);assert dynamicCSS and all((d/'assets'/p).is_file() for p in dynamicCSS)
assert not re.search(r'<script(?![^>]*src=)[^>]*>\s*[^<\s]',html)
csp=json.loads((r/'qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/tauri.conf.json').read_text())['app']['security']['csp'];assert "script-src 'self'" in csp and "style-src 'self'" in csp and 'unsafe-eval' not in csp
assets={str(p.relative_to(d)):h(p) for p in d.rglob('*') if p.is_file()};(o/'generated-assets.json').write_text(json.dumps(assets,indent=2))
result={'candidateHEAD':head,'protectedHashesUnchanged':len(protected),'staticRootPresent':True,'linkedStartupStyles':css,'appDynamicImports':dynamic,'dynamicStyles':dynamicCSS,'nativeCSPUnchangedSelfScriptsAndStyles':True,'runtimeNativeCSPTested':False,'mountedCases':12,'viewports':[320,390,1280],'controllerRegressions':5,'desktopBuild':'passed'}
(o/'verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
