from pathlib import Path
import hashlib, json, os, shutil, subprocess, tempfile

info = json.loads(Path('qa-artifacts/direct-host-native-validation-20260909/latest-run.json').read_text())
run = Path(info['run'])
owned = Path(tempfile.mkdtemp(prefix='rivune-corrupt-qa-', dir='/private/tmp')).resolve()
profile = owned / 'profile'
shutil.copytree(info['profile'], profile)
latest = sorted((profile / 'snapshots').glob('workspace-v1-*.json'))[-1]
value = json.loads(latest.read_text())
value['submissionRecovery'] = dict(schemaVersion=1, requestID='qa-corrupt', conversationID='welcome', state='unsupported')
latest.write_text(json.dumps(value))
def hashes():
    return {str(p.relative_to(profile)): hashlib.sha256(p.read_bytes()).hexdigest() for p in profile.rglob('*') if p.is_file()}
before = hashes()
env = dict(os.environ, RIVUNE_ISOLATED_PROFILE_DIR=str(profile))
result = subprocess.run([info['executable']], env=env, capture_output=True, text=True, timeout=30)
after = hashes()
receipt = dict(profile=str(profile), returncode=result.returncode, stdout=result.stdout, stderr=result.stderr, before=before, after=after, unchanged=before == after)
shutil.copytree(profile, run / 'N6-corrupt-profile-evidence-canonical')
shutil.rmtree(owned)
receipt['ownedTemporaryProfileRemoved'] = not owned.exists()
(run / 'N6-corrupt-profile.json').write_text(json.dumps(receipt, indent=2))
print(json.dumps(receipt, indent=2))
