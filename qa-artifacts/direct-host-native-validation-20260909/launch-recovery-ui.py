from pathlib import Path
import hashlib, json, os, shutil, subprocess, tempfile

info = json.loads(Path('qa-artifacts/direct-host-native-validation-20260909/latest-run.json').read_text())
run = Path(info['run'])
owned = Path(tempfile.mkdtemp(prefix='rivune-recovery-screen-qa-', dir='/private/tmp')).resolve()
profile = owned / 'profile'
shutil.copytree(info['profile'], profile)
latest = sorted((profile / 'snapshots').glob('workspace-v1-*.json'))[-1]
value = json.loads(latest.read_text())
value['submissionRecovery'] = dict(schemaVersion=1, requestID='qa-corrupt-ui', conversationID='welcome', state='unsupported')
latest.write_text(json.dumps(value))
before = {str(p.relative_to(profile)): hashlib.sha256(p.read_bytes()).hexdigest() for p in profile.rglob('*') if p.is_file()}
fixture_log = Path(info['profileRoot']) / 'fixture-invocations.jsonl'
with (run / 'N6-fixed-launch.log').open('w') as log:
    process = subprocess.Popen([info['executable']], env=dict(os.environ, RIVUNE_ISOLATED_PROFILE_DIR=str(profile)), stdout=log, stderr=log, start_new_session=True)
receipt = dict(pid=process.pid, profile=str(profile), root=str(owned), before=before, binarySha256=info['binarySha256'], fixtureLogSha256=hashlib.sha256(fixture_log.read_bytes()).hexdigest())
(run / 'N6-fixed-launch.json').write_text(json.dumps(receipt, indent=2))
print(json.dumps({k:receipt[k] for k in ['pid','profile','binarySha256']}, indent=2))
