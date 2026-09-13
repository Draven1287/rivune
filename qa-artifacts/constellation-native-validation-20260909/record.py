from pathlib import Path
import sys,json,hashlib,subprocess
info=json.loads(Path('qa-artifacts/constellation-native-validation-20260909/latest-run.json').read_text());profile=Path(info['profile']);run=Path(info['run']);label=sys.argv[1]
files={str(p.relative_to(profile)):hashlib.sha256(p.read_bytes()).hexdigest() for p in profile.rglob('*') if p.is_file()}
latest=sorted((profile/'snapshots').glob('workspace-v1-*.json'))
value=json.loads(latest[-1].read_text()) if latest else None
log=Path(info['profileRoot'])/'fixture-invocations.jsonl';events=[json.loads(x) for x in log.read_text().splitlines()] if log.exists() else []
record={'profileFiles':files,'snapshot':value,'fixtureEvents':events,'binarySha256':info.get('binarySha256')};(run/(label+'.json')).write_text(json.dumps(record,indent=2))
print(json.dumps({'record':str(run/(label+'.json')),'runs':value.get('runs') if value else None,'starts':len([e for e in events if e['event']=='start'])},indent=2))
