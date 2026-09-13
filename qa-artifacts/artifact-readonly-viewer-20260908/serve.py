from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parent
STYLE=ROOT.parent/'cross-platform-shell-20260907/candidate4-runtime-r2/web/styles.css'
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  path=urlsplit(path).path
  if path=='/rivune-style.css':return str(STYLE)
  allowed=['index.html','artifact-controller.mjs','artifact-viewer.mjs','fixtures.mjs','harness.mjs','viewer.css']
  name=path.lstrip('/') or 'index.html'
  return str(ROOT/(name if name in allowed else 'missing'))
 def end_headers(self):
  self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; form-action 'none'")
  self.send_header('Cache-Control','no-store');super().end_headers()
 def log_message(self,*a):pass
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);print(server.server_address[1],flush=True);server.serve_forever()
