#!/usr/bin/env python3
"""Render the reviewed overlay as static files, without deploying or copying artwork."""
import sys
sys.dont_write_bytecode = True
import hashlib
import html.parser
import importlib.util
import json
import os
from pathlib import Path
import re
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'static-review-v2' / 'rivune'


def sha(data):
    return hashlib.sha256(data).hexdigest()


class References(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                raise ValueError('Duplicate HTML ID: ' + attrs['id'])
            self.ids.add(attrs['id'])
        for key in ('href', 'src'):
            if key in attrs:
                self.refs.append(attrs[key])


def build():
    spec = importlib.util.spec_from_file_location('rivune_interactive_preview', ROOT / 'preview.py')
    preview = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(preview)
    data = json.loads((preview.BASE / 'release.json').read_text())
    if data.get('status') != 'coming-soon':
        raise ValueError('This informational review build requires coming-soon release metadata')
    payloads = {}
    for route, content in preview.pages.items():
        relative = route.removeprefix('/rivune/') + 'index.html'
        if re.search(rb'\{\{[A-Z_]+\}\}', content):
            raise ValueError('Unresolved page template: ' + relative)
        payloads[relative] = content
    for name, source in [('site.css', preview.BASE / 'site.css'), ('tour.css', ROOT / 'tour.css'), ('tour.js', ROOT / 'tour.js'), ('refinements.css', ROOT / 'refinements.css')]:
        payloads[name] = source.read_bytes()
    payloads['404.html'] = b'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Page not found - Rivune</title><link rel="stylesheet" href="/rivune/site.css"><main class="shell prose"><h1>That page is not here.</h1><p><a href="/rivune/">Back to Rivune</a></p></main></html>'
    payloads['.nojekyll'] = b''
    assets = {'assets/' + p.name: p for p in (preview.BASE / 'assets').iterdir() if p.is_file()}
    known = set(payloads) | set(assets)
    parsed = {}
    for name, content in payloads.items():
        if name.endswith('.html'):
            parser = References(); parser.feed(content.decode()); parsed[name] = parser
    checked = 0
    for name, content in payloads.items():
        refs = parsed[name].refs if name in parsed else re.findall(r'url\([\'"]?([^\)\'\"]+)', content.decode()) if name.endswith('.css') else []
        for ref in refs:
            url = urlsplit(urljoin('https://static-review.invalid/rivune/' + name, ref))
            if url.netloc != 'static-review.invalid' or url.scheme not in ('http', 'https'):
                continue
            if not url.path.startswith('/rivune/'):
                raise ValueError(f'Link escaped project base: {name}: {ref}')
            relative = unquote(url.path[len('/rivune/'):])
            if not relative or relative.endswith('/'):
                relative += 'index.html'
            if relative not in known:
                raise ValueError(f'Missing static destination: {name}: {ref}')
            if url.fragment and relative in parsed and unquote(url.fragment) not in parsed[relative].ids:
                raise ValueError(f'Missing anchor: {name}: {ref}')
            checked += 1
    manifest = {'scope': 'Unpublished static review of interactive informational website',
        'publication': False, 'noindex': True, 'basePath': '/rivune/',
        'pageCount': len(preview.pages), 'localReferencesChecked': checked,
        'files': {name: sha(content) for name, content in payloads.items()},
        'artwork': {name: {'sha256': sha(path.read_bytes()), 'source': str(path.relative_to(ROOT.parent)), 'storage': 'hardlink'} for name, path in assets.items()}}
    # Keep build provenance outside the deployable directory, with no machine-specific paths.
    manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    manifest_path = OUTPUT.parent / 'REVIEW_MANIFEST.json'
    if manifest_path.exists() and manifest_path.read_bytes() != manifest_bytes:
        raise ValueError('Existing review manifest differs; preserve it before rebuilding')
    # Never rewrite a hard-linked file or silently replace a changed reviewed artifact.
    for name, content in payloads.items():
        target = OUTPUT / name
        if target.exists() and target.read_bytes() != content:
            raise ValueError('Existing review differs; preserve it before rebuilding: ' + str(target))
    for name, source in assets.items():
        target = OUTPUT / name
        if target.exists() and not target.samefile(source):
            raise ValueError('Existing asset is not the expected approved hardlink: ' + str(target))
    for name, content in payloads.items():
        target = OUTPUT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            target.write_bytes(content)
    for name, source in assets.items():
        target = OUTPUT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            os.link(source, target)
    if not manifest_path.exists():
        manifest_path.write_bytes(manifest_bytes)
    print(json.dumps({'output': str(OUTPUT), 'pages': len(preview.pages), 'localReferencesChecked': checked,
                      'newArtworkBytes': 0, 'published': False}, indent=2))


if __name__ == '__main__':
    build()
