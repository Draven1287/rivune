#!/usr/bin/env python3
"""Own one detached loopback Vite process; no login/global startup changes."""
from pathlib import Path
import argparse,fcntl,hashlib,json,os,signal,socket,subprocess,time,urllib.request,shutil
ROOT=Path(__file__).resolve().parents[1]
STATE=ROOT/'../../qa-artifacts/local-preview-4317'
STATE=STATE.resolve();STATE.mkdir(parents=True,exist_ok=True)
PIDFILE=STATE/'process.json';LOG=STATE/'vite.log'
VITE=ROOT/'node_modules/vite/bin/vite.js'
def read():
 return json.loads(PIDFILE.read_text()) if PIDFILE.exists() else None
def owned(info):
 if not info:return False
 p=subprocess.run(['ps','-p',str(info['pid']),'-o','command='],text=True,capture_output=True)
 return p.returncode==0 and p.stdout.strip()==info['commandText']
def occupied():
 with socket.socket() as sock:return sock.connect_ex(('127.0.0.1',4317))==0
def urls():
 result={}
 for route in ['/', '/tests/hostRenderer.html?preview=1&team=1', '/tests/hostRenderer.html?scenario=team-form&preview=1&team=1']:
  with urllib.request.urlopen('http://127.0.0.1:4317'+route,timeout=3) as response:result[route]=response.status
 return result
parser=argparse.ArgumentParser();parser.add_argument('action',choices=['start','status','stop']);args=parser.parse_args()
with (STATE/'control.lock').open('w') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX)
 info=read()
 if args.action=='stop':
  if not owned(info):raise SystemExit('No matching owned preview process; nothing stopped.')
  os.kill(info['pid'],signal.SIGTERM)
  for _ in range(50):
   if not owned(info):break
   time.sleep(.1)
  else:raise SystemExit('Preview did not stop within five seconds.')
  info['stoppedAt']=time.time();PIDFILE.write_text(json.dumps(info,indent=2));print(json.dumps(info,indent=2))
 else:
  if args.action=='start' and not owned(info):
   if occupied():raise SystemExit('Port 4317 is already occupied by an unowned process; refusing to start or kill it.')
   node=str(Path(shutil.which('node')).resolve());command=[node,str(VITE),'--host','127.0.0.1','--port','4317','--strictPort']
   with LOG.open('ab',buffering=0) as log:
    child=subprocess.Popen(command,cwd=ROOT,stdin=subprocess.DEVNULL,stdout=log,stderr=log,start_new_session=True,close_fds=True)
   info={'pid':child.pid,'command':command,'commandText':' '.join(command),'cwd':str(ROOT),'port':4317,'startedAt':time.time(),'log':str(LOG),'owner':'RIVUNE APP BUILDER / preview.py','launch':'detached session; file-backed output; stdin /dev/null'}
   PIDFILE.write_text(json.dumps(info,indent=2))
   for _ in range(50):
    if child.poll() is not None:raise SystemExit('Vite exited; inspect '+str(LOG))
    if occupied():break
    time.sleep(.1)
  if not owned(info):raise SystemExit('Owned preview is not running.')
  info['http']=urls();info['checkedAt']=time.time();PIDFILE.write_text(json.dumps(info,indent=2));print(json.dumps(info,indent=2))
