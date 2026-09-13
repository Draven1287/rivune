#!/usr/bin/env python3
"""Local text-only overlay on frozen V6. Reuses assets without copying them."""
import sys
sys.dont_write_bytecode = True
import html, importlib.util, json, mimetypes
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, unquote
ROOT=Path(__file__).resolve().parent
BASE=ROOT.parent/'rivune-native-cosmos-candidate-20260907-v6'/'source'
spec=importlib.util.spec_from_file_location('rivune_frozen_builder',BASE/'build.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
tokens=builder.render_tokens(json.loads((BASE/'release.json').read_text()))
pages={}
for name,route in builder.PUBLIC_PAGES:
    source=ROOT/name if (ROOT/name).is_file() else BASE/name
    text=source.read_text()
    text=text.replace('</head>', '<link rel="stylesheet" href="/rivune/refinements.css"></head>')
    nav=builder.render_navigation(route).replace('>The app<','>Explore app<')
    replacements={**tokens,'ROBOTS':'<meta name="robots" content="noindex,nofollow">','CANONICAL':html.escape(builder.SITE_URL+route,quote=True),'NAV':nav,'FOOTER':builder.render_footer(route),'MENU_SCRIPT':builder.MENU_SCRIPT}
    for key,value in replacements.items(): text=text.replace('{{'+key+'}}',value)
    # Retire historical section bookmarks instead of sending visitors down the home page.
    if not route: text=text.replace('</body>','<script>const oldPages={faq:"faq/",workflow:"how-it-works/",requirements:"app/",support:"contact/",download:"download/"};const followOldLink=()=>{const page=oldPages[location.hash.slice(1)];if(page)location.replace("/rivune/"+page);};addEventListener("hashchange",followOldLink);followOldLink();</script></body>')
    pages['/rivune/'+route]=text.encode()
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path in ('/','/rivune'):
            self.send_response(302);self.send_header('Location','/rivune/');self.end_headers();return
        if path.endswith('/index.html'): path=path[:-10]
        if path in pages: data=pages[path];kind='text/html; charset=utf-8'
        else:
            name=path.removeprefix('/rivune/')
            allowed={'site.css':BASE/'site.css','tour.css':ROOT/'tour.css','tour.js':ROOT/'tour.js','refinements.css':ROOT/'refinements.css'}
            allowed.update({'assets/'+p.name:p for p in (BASE/'assets').iterdir() if p.is_file()})
            file=allowed.get(name) if path.startswith('/rivune/') else None
            if not file: self.send_error(404);return
            data=file.read_bytes();kind=mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        self.send_response(200);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(data)
    def log_message(self,*args): pass
if __name__=='__main__':
    print('Rivune interactive preview: http://127.0.0.1:57036/rivune/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',57036),Handler).serve_forever()
