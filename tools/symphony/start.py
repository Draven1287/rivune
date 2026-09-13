from pathlib import Path
import os, subprocess, json, socket
root = Path(__file__).resolve().parents[2]
state = root / 'qa-artifacts/symphony'
state.mkdir(parents=True, exist_ok=True)
pidfile = state / 'process.json'
if pidfile.exists():
    pid = json.loads(pidfile.read_text())['pid']
    result = subprocess.run(['ps', '-p', str(pid), '-o', 'command='], capture_output=True, text=True)
    if result.returncode == 0:
        raise SystemExit('Recorded process exists; inspect before starting another.')
with socket.socket() as probe:
    if probe.connect_ex(('127.0.0.1',4320)) == 0:
        raise SystemExit('Port 4320 is occupied; refusing duplicate service.')
env=os.environ.copy()
env['GITHUB_TOKEN']=subprocess.check_output(['/Users/Aaravshah/.local/bin/gh','auth','token'],text=True).strip()
env['RIVUNE_SYMPHONY_WORKSPACES']=str(state/'workspaces')
command=[str(root/'.toolchains/symphony-v0.0.2/symphony-v0.0.2-macos_arm64'),str(root/'tools/symphony/WORKFLOW.md'),'--logs-root',str(state/'logs'),'--i-understand-that-this-will-be-running-without-the-usual-guardrails']
with (state/'launcher.log').open('ab') as log:
    process=subprocess.Popen(command,cwd=root,env=env,stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True)
pidfile.write_text(json.dumps({'pid':process.pid,'dashboard':'http://127.0.0.1:4320','mode':'ready-issue-workers'}))
print('Started Symphony PID',process.pid, '; worker activity must be verified in /api/v1/state')
