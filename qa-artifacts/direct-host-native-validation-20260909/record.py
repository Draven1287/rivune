from pathlib import Path
import argparse, datetime, hashlib, json, os, signal, subprocess
p=argparse.ArgumentParser();p.add_argument('label');p.add_argument('--kill',action='store_true');args=p.parse_args()
info=json.loads(Path('qa-artifacts/direct-host-native-validation-20260909/latest-run.json').read_text());run=Path(info['run']);profile=Path(info['profile'])
rows=subprocess.check_output(['/bin/ps','-axo','pid,ppid,command'],text=True).splitlines()
matches=[]
for row in rows:
    fields=row.strip().split(None,2)
    if len(fields)==3 and fields[2]==info['executable']:matches.append({'pid':int(fields[0]),'ppid':int(fields[1]),'executable':fields[2]})
files=sorted((profile/'snapshots').glob('workspace-v1-*.json'));latest=files[-1] if files else None
snapshot=json.loads(latest.read_text()) if latest else None
record={'label':args.label,'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'processes':matches,'profile':str(profile),'binarySha256':info['binarySha256'],'snapshotPath':str(latest) if latest else None,'snapshotSha256':hashlib.sha256(latest.read_bytes()).hexdigest() if latest else None,'snapshot':snapshot}
log=Path(info['profileRoot'])/'fixture-invocations.jsonl';record['fixtureInvocations']=[json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
if args.kill:
    assert len(matches)==1, 'Refusing kill unless exactly one own executable is found'
    os.kill(matches[0]['pid'],signal.SIGKILL);record['signal']='SIGKILL'
(run/f'{args.label}.json').write_text(json.dumps(record,indent=2))
print(json.dumps({'label':args.label,'processes':matches,'recovery':snapshot.get('submissionRecovery') if snapshot else None,'runs':[{k:r.get(k) for k in ['id','conversationID','status','answer','error']} for r in snapshot.get('runs',[])] if snapshot else [],'drafts':[{k:c.get(k) for k in ['id','draft','richDraft']} for c in snapshot.get('conversations',[])] if snapshot else [],'fixtureInvocations':record['fixtureInvocations'],'signal':record.get('signal')},indent=2))
