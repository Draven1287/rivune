from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess, tempfile

args = argparse.ArgumentParser()
args.add_argument('action', choices=['launch', 'finish'])
args.add_argument('variant', choices=['unsupported-schema', 'cross-bound'])
args = args.parse_args()
info = json.loads(Path('qa-artifacts/direct-host-native-validation-20260909/latest-run.json').read_text())
run = Path(info['run'])
receipt_path = run / f'supplemental-{args.variant}.json'
def hashes(profile):
    return {str(p.relative_to(profile)): hashlib.sha256(p.read_bytes()).hexdigest() for p in profile.rglob('*') if p.is_file()}
fixture_log = Path(info['profileRoot']) / 'fixture-invocations.jsonl'
if args.action == 'launch':
    assert not receipt_path.exists(), 'Keep previous supplemental evidence immutable'
    owned = Path(tempfile.mkdtemp(prefix='rivune-supplement-qa-', dir='/private/tmp')).resolve()
    profile = owned / 'profile'
    shutil.copytree(info['profile'], profile)
    latest = sorted((profile / 'snapshots').glob('workspace-v1-*.json'))[-1]
    value = json.loads(latest.read_text())
    value['submissionRecovery'] = dict(schemaVersion=99 if args.variant == 'unsupported-schema' else 1, requestID='qa-corrupt-supplement', conversationID='welcome' if args.variant == 'unsupported-schema' else 'nonexistent-conversation', state='reserved')
    latest.write_text(json.dumps(value))
    with (run / f'supplemental-{args.variant}.log').open('w') as log:
        process = subprocess.Popen([info['executable']], env=dict(os.environ, RIVUNE_ISOLATED_PROFILE_DIR=str(profile)), stdout=log, stderr=log, start_new_session=True)
    receipt = dict(variant=args.variant, pid=process.pid, profile=str(profile), root=str(owned), before=hashes(profile), corruptRecord=value['submissionRecovery'], binarySha256=info['binarySha256'], fixtureLogSha256=hashlib.sha256(fixture_log.read_bytes()).hexdigest())
else:
    receipt = json.loads(receipt_path.read_text()); profile = Path(receipt['profile'])
    receipt['after'] = hashes(profile)
    receipt['unchanged'] = receipt['before'] == receipt['after']
    receipt['fixtureLogUnchanged'] = receipt['fixtureLogSha256'] == hashlib.sha256(fixture_log.read_bytes()).hexdigest()
    try: os.kill(receipt['pid'], 0); receipt['processExited'] = False
    except ProcessLookupError: receipt['processExited'] = True
    assert receipt['unchanged'] and receipt['fixtureLogUnchanged'] and receipt['processExited'], 'Preserve profile if acceptance fails'
    latest = sorted((profile / 'snapshots').glob('workspace-v1-*.json'))[-1]
    shutil.copy2(latest, run / f'supplemental-{args.variant}-corrupt-snapshot.json')
    shutil.rmtree(receipt['root']); receipt['temporaryProfileRemoved'] = not Path(receipt['root']).exists()
receipt_path.write_text(json.dumps(receipt, indent=2))
print(json.dumps({k:receipt[k] for k in ['variant','pid','profile','unchanged','fixtureLogUnchanged','processExited','temporaryProfileRemoved'] if k in receipt}, indent=2))
