from pathlib import Path
import subprocess

source = Path(__file__).resolve().parent / 'source-import-candidate'
revision = 'a52cde8f25d0af4fc57ebd42b858510ca69b6797'
workspace = Path.cwd().resolve()
allowed = Path(__file__).resolve().parents[2] / 'qa-artifacts/symphony/workspaces'
if workspace.parent != allowed.resolve() or any(workspace.iterdir()):
    raise SystemExit('Expected an empty direct Symphony issue workspace')
subprocess.run(['git', 'clone', '--no-local', '--no-hardlinks', str(source), '.'], check=True)
subprocess.run(['git', 'checkout', '--detach', revision], check=True)
subprocess.run(['git', 'remote', 'remove', 'origin'], check=True)
actual = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
if actual != revision:
    raise SystemExit('Source revision mismatch')
print('Prepared reviewed local source', actual)
