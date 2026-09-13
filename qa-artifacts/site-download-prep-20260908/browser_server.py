"""Loopback-only fixture server; reads approved assets without copying artwork."""
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
import json,mimetypes
from download_adapter import ROOT,render_download,platform_script,baseline
SITE=ROOT.parent.parent/'pages-site'
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  url=urlsplit(self.path); q=parse_qs(url.query)
  if url.path=='/rivune/download/':
   case=q.get('case',['ready'])[0];data=json.loads((ROOT/'synthetic-ready.json').read_text()) if case in ('ready','invalid') else None
   if case=='invalid': data['sha256']='bad'
   page,_=render_download(data,fixture=True);data=page.encode();mime='text/html'
  elif url.path=='/rivune/contact/':
   page=(SITE/'dist/contact/index.html').read_text().replace(baseline.MENU_SCRIPT,platform_script())
   page=page.replace('<body class="theme-native-cosmos">','<body class="theme-native-cosmos"><aside class="fixture-banner">SYNTHETIC LOCAL CONTACT CHECK — no email will be sent.</aside>')
   data=page.encode();mime='text/html'
  else:
   name=url.path.removeprefix('/rivune/')
   allowed=['site.css','refinements.css','tour.css','tour.js','assets/og.png','assets/rivune-icon-128.png','assets/rivune-wordmark.svg','assets/rivune-workspace-milky-way.png']
   if name not in allowed:self.send_error(404);return
   data=(SITE/name).read_bytes();mime=mimetypes.guess_type(name)[0] or 'application/octet-stream'
  self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Cache-Control','no-store');self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'none'; form-action 'none'");self.end_headers();self.wfile.write(data)
 def log_message(self,*a):pass
if __name__=='__main__':
 server=ThreadingHTTPServer(('127.0.0.1',0),Handler);print(server.server_address[1],flush=True);server.serve_forever()
