"""Isolated download rendering adapter. No network, file writes, or publication."""
import copy
import html
import importlib.util
from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('download_baseline', ROOT / 'baseline/build.py')
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)
UNAVAILABLE = {'status': 'coming-soon', 'sourceRelease': baseline.SOURCE}


def adapt(metadata=None, *, public_release=None, fixture=False):
    """Return tokens plus an internal reason. No metadata alone enables a real link.

    public_release must be a separately verified release-API snapshot supplied by
    the release owner. This adapter does not establish its provenance or freshness.
    Synthetic metadata is admitted only with explicit fixture=True.
    """
    tokens = baseline.render_tokens(UNAVAILABLE)
    reason = 'unavailable'
    try:
        data = copy.deepcopy(metadata)
        ready = baseline.validate_release(data, fixture=fixture)
        if ready:
            if not fixture:
                if public_release is None:
                    raise ValueError('Missing verified public release snapshot')
                snapshot = copy.deepcopy(public_release)
                baseline.verify_public_asset(data, fetch=lambda _: snapshot)
            tokens = baseline.render_tokens(data, fixture=fixture)
            reason = 'synthetic-ready' if fixture else 'validated-metadata'
    except (ValueError, TypeError, KeyError, AttributeError, OverflowError):
        reason = 'invalid-or-missing-metadata'
    tokens['ROBOTS'] = '<meta name="robots" content="noindex,nofollow">'
    if fixture:
        tokens['FIXTURE_BANNER'] = '<aside class="fixture-banner"><p>SYNTHETIC DOWNLOAD FIXTURE — local test only. No real installer or acceptance evidence exists.</p></aside>'
    return tokens, reason


def platform_script():
    # Preserve the server-rendered metadata summary after Mac -> other -> Mac.
    original = baseline.MENU_SCRIPT
    start = "const platforms={mac:['macOS',macReady?'Mac download available':'macOS download not yet available',macReady?'A validated Mac DMG is available below. Check its version and system requirements before downloading.':'The desktop app is in development. The macOS download is not yet available.']"
    replacement = "const platforms={mac:['macOS',document.querySelector('[data-platform-title]')?.textContent,document.querySelector('[data-platform-body]')?.textContent]"
    if original.count(start) != 1:
        raise ValueError('Baseline platform script changed; review patch')
    return original.replace(start, replacement)


def render_download(metadata=None, *, public_release=None, fixture=False):
    tokens, reason = adapt(metadata, public_release=public_release, fixture=fixture)
    tokens.update(CANONICAL=html.escape(baseline.SITE_URL + 'download/', quote=True),
                  NAV=baseline.render_navigation('download/'),
                  FOOTER=baseline.render_footer('download/'), MENU_SCRIPT=platform_script())
    page = (ROOT / 'baseline/download.html').read_text()
    page = page.replace('</head>', '<link rel="stylesheet" href="/rivune/refinements.css"></head>')
    for key, value in tokens.items():
        page = page.replace('{{' + key + '}}', value)
    if re.search(r'\{\{[A-Z_]+\}\}', page):
        raise ValueError('Unresolved template')
    return page, reason
