#!/usr/bin/env python3
"""Dependency-free static build; a real installer is a reviewed release, never a ZIP fallback."""
import argparse
import datetime
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
REPO = "https://github.com/Draven1287/rivune"
SOURCE = "v0.2.0-source-preview.4"
SITE_URL = "https://draven1287.github.io/rivune/"
# Intentional public content only. Never discover pages by walking the build tree.
PUBLIC_PAGES = (
    ("index.html", ""),
    ("app.html", "app/"),
    ("how-it-works.html", "how-it-works/"),
    ("faq.html", "faq/"),
    ("about.html", "about/"),
    ("contact.html", "contact/"),
    ("download.html", "download/"),
    ("privacy.html", "privacy/"),
    ("council-vs-swarm.html", "council-vs-swarm/"),
)
ARCHITECTURES = {"universal": "Apple silicon & Intel", "arm64": "Apple silicon", "x86_64": "Intel"}
REQUIRED_CHECKS = ("developerIDSigned", "notarized", "stapled", "gatekeeperAccepted", "pilotAccepted")


def validate_release(data, fixture=False):
    if not isinstance(data, dict) or data.get("sourceRelease") != SOURCE:
        raise ValueError("Expected the reviewed source-preview.4 release reference")
    simulated = data.get("simulation", False)
    if simulated is not False and simulated is not True:
        raise ValueError("simulation must be a boolean")
    if simulated != fixture:
        raise ValueError("Simulated release data is permitted only with --fixture")
    if data.get("status") == "coming-soon":
        if any(k in data for k in ("assetUrl", "version", "validation", "sha256")):
            raise ValueError("Coming-soon metadata must not contain installer fields")
        return False
    if data.get("status") != "ready":
        raise ValueError("Release status must be coming-soon or ready")
    if not re.fullmatch(r"[0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[A-Za-z0-9.]+)?", str(data.get("version", ""))):
        raise ValueError("A concrete installer version is required")
    if data.get("architecture") not in ARCHITECTURES:
        raise ValueError("A validated architecture is required")
    if not re.fullmatch(r"[0-9]+\.[0-9]+(?:\.[0-9]+)?", str(data.get("minimumMacOS", ""))):
        raise ValueError("A validated minimum macOS version is required")
    if type(data.get("sizeBytes")) is not int or data["sizeBytes"] <= 0:
        raise ValueError("The actual positive DMG byte size is required")
    if not re.fullmatch(r"[0-9a-f]{64}", str(data.get("sha256", ""))):
        raise ValueError("The validated DMG SHA-256 is required")
    tag = data.get("tag", "")
    if not isinstance(tag, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", tag) or "source-preview" in tag:
        raise ValueError("An installer release tag is required")
    url = data.get("assetUrl", "")
    if not isinstance(url, str) or not re.fullmatch(re.escape(REPO + "/releases/download/" + tag + "/") + r"[A-Za-z0-9._-]+\.dmg", url):
        raise ValueError("Download must be a direct Rivune GitHub Release .dmg asset")
    if not fixture and "SIMULATED" in json.dumps(data):
        raise ValueError("Simulation markers cannot enter a production build")
    checks = data.get("validation", {})
    if not isinstance(checks, dict) or any(checks.get(k) is not True for k in REQUIRED_CHECKS):
        raise ValueError("Signing, notarization, stapling, Gatekeeper, and pilot acceptance must all pass")
    try:
        verified = datetime.datetime.fromisoformat(data["validatedAt"].replace("Z", "+00:00"))
        if verified.tzinfo is None:
            raise ValueError()
    except (ValueError, KeyError, TypeError, AttributeError):
        raise ValueError("Timestamped installer validation is required")
    if not isinstance(data.get("validationEvidence"), str) or len(data["validationEvidence"].strip()) < 20:
        raise ValueError("Reference the actual installer and pilot validation report")
    return True


def verify_public_asset(data, fetch=None):
    """Read public release metadata. Never infer installer readiness from 'latest'."""
    if fetch is None:
        def fetch(url):
            request = urllib.request.Request(url, headers={"User-Agent": "Rivune-Pages-release-check", "Accept": "application/vnd.github+json"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
    release = fetch("https://api.github.com/repos/Draven1287/rivune/releases/tags/" + urllib.parse.quote(data["tag"], safe=""))
    if release.get("draft") is not False or release.get("tag_name") != data["tag"]:
        raise ValueError("The reviewed release is not publicly available")
    matches = [a for a in release.get("assets", []) if a.get("browser_download_url") == data["assetUrl"]]
    if len(matches) != 1:
        raise ValueError("The exact public DMG asset was not found")
    asset = matches[0]
    if asset.get("state") != "uploaded" or asset.get("size") != data["sizeBytes"] or asset.get("digest") != "sha256:" + data["sha256"]:
        raise ValueError("Public DMG size/digest/state does not match validated installer metadata")


def render_tokens(data, fixture=False):
    ready = validate_release(data, fixture)
    e = html.escape
    disabled = '<button class="button" type="button" disabled>Desktop downloads not yet available</button>'
    control = ""
    tokens = {
        "ROBOTS": '<meta name="robots" content="noindex,nofollow">' if fixture else "",
        "FIXTURE_BANNER": '<aside class="fixture-banner"><p>SIMULATED READY STATE — local layout test only. No real installer is available.</p></aside>' if fixture else "",
        "HERO_DOWNLOAD": disabled,
        "HERO_NOTE": "The desktop app is in development for macOS, Windows, and Linux.",
        "MAC_REQUIREMENT": "Downloads are not yet available for macOS, Windows, or Linux.",
        "DOWNLOAD_TITLE": "Get Rivune.",
        "DOWNLOAD_DESCRIPTION": "Choose your platform to check availability.",
        "DOWNLOAD_CONTROL": control,
        "RELEASE_META": "",
        "RELEASE_NOTE": "Desktop downloads are not available yet.",
        "INSTALL_HEADING": "When the installer is ready, it’s three steps.",
        "INSTALL_NOTE": "These instructions are for the upcoming DMG. They do not apply to the source-code ZIP.",
        "INTEGRITY": "",
        "RELEASE_READY": "false",
        "PLATFORM_MAC_TITLE": "macOS download not yet available",
        "PLATFORM_MAC_BODY": "The desktop app is in development. The macOS download is not yet available.",
        "INSTALL_SECTION": "",
    }
    if ready:
        version, arch, minimum = e(data["version"]), e(ARCHITECTURES[data["architecture"]]), e(data["minimumMacOS"])
        size = f'{data["sizeBytes"] / 1_000_000:.1f} MB'
        control = f'<a class="button button-primary" data-installer href="{e(data["assetUrl"], quote=True)}">Download for Mac <span aria-hidden="true">↓</span></a>'
        tokens.update({
            "HERO_DOWNLOAD": control,
            "HERO_NOTE": f'Rivune {version} · macOS {minimum}+ · {arch}',
            "MAC_REQUIREMENT": f'This installer requires macOS {minimum} or later. Supported Macs: {arch}.',
            "DOWNLOAD_TITLE": "Get Rivune.",
            "DOWNLOAD_DESCRIPTION": "Choose your platform to check availability.",
            "DOWNLOAD_CONTROL": control,
            "RELEASE_META": f'<dl class="release-meta"><div><dt>Version</dt><dd>{version}</dd></div><div><dt>Mac</dt><dd>{arch}</dd></div><div><dt>Requires</dt><dd>macOS {minimum}+</dd></div><div><dt>Download</dt><dd>{size} · DMG</dd></div></dl>',
            "RELEASE_NOTE": f'<a href="{REPO}/releases/tag/{e(data["tag"])}">Read release notes →</a>',
            "INSTALL_HEADING": "Three steps, then you’re in.",
            "INSTALL_NOTE": "You’ll connect your provider after opening Rivune. If macOS reports a security problem, stop and contact support.",
            "INTEGRITY": f'<details class="details"><summary>Download details &amp; checksum</summary><div><p>Exact download size: {data["sizeBytes"]:,} bytes.</p><p>SHA-256: <code>{data["sha256"]}</code></p><p>This release passed the maintainer’s signing, notarization, Gatekeeper, and beta acceptance checks.</p></div></details>',
            "RELEASE_READY": "true",
            "PLATFORM_MAC_TITLE": "Mac download available",
            "PLATFORM_MAC_BODY": f'Rivune {version} is available as a validated DMG for macOS {minimum}+ on {arch}.',
            "INSTALL_SECTION": '<div data-mac-only><h2 class="install-heading">Three steps, then you’re in.</h2><p class="install-note">You’ll connect your provider after opening Rivune. If macOS reports a security problem, stop and contact support.</p><ol class="install-steps"><li><h3>Open the DMG</h3><p>Open the downloaded Rivune disk image.</p></li><li><h3>Move Rivune</h3><p>Drag Rivune to Applications.</p></li><li><h3>Launch Rivune</h3><p>Open Rivune and connect a supported provider.</p></li></ol>' + f'<details class="details"><summary>Download details &amp; checksum</summary><div><p>Exact download size: {data["sizeBytes"]:,} bytes.</p><p>SHA-256: <code>{data["sha256"]}</code></p><p>This release passed the maintainer’s signing, notarization, Gatekeeper, and beta acceptance checks.</p></div></details></div>',
        })
    tokens["MAC_RELEASE_DETAILS"] = (f'<div data-mac-only><p>{tokens["DOWNLOAD_CONTROL"]}</p>{tokens["RELEASE_META"]}<p>{tokens["RELEASE_NOTE"]}</p></div>' if ready else "")
    return tokens


def validate_publish_target(data, fixture=False, publish_target=None, require_ready=False):
    """Choose an informational preview or a validated installer; never relabel one as the other."""
    ready = validate_release(data, fixture)
    if require_ready:
        if publish_target not in (None, "validated-beta"):
            raise ValueError("--require-ready cannot be combined with the preview target")
        publish_target = "validated-beta"
    if publish_target not in (None, "preview", "validated-beta"):
        raise ValueError("Unknown publish target")
    if publish_target is not None and fixture:
        raise ValueError("Simulated fixtures cannot be publication targets")
    if publish_target == "preview" and ready:
        raise ValueError("Informational preview requires coming-soon metadata with no installer")
    if publish_target == "validated-beta" and not ready:
        raise ValueError("Validated beta requires a real validated installer")
    return publish_target or "review"


def render_navigation(route):
    primary = (("app/", "Explore app"), ("how-it-works/", "How it works"), ("about/", "About"))
    more = (("faq/", "FAQ"), ("contact/", "Contact Aarav"), ("https://github.com/Draven1287/rivune", "Source"), ("privacy/", "Privacy"), ("https://github.com/Draven1287/rivune/issues", "Support"))
    active = "how-it-works/" if route == "council-vs-swarm/" else route
    def link(path, label, mobile=False):
        current = ' aria-current="page"' if active == path else ''
        href = path if path.startswith(("http", "mailto:")) else "/rivune/" + path
        action = ' class="nav-action"' if path == "download/" else ''
        return f'<a{action} href="{href}"{current}>{label}</a>'
    brand_current = ' aria-current="page"' if route == "" else ''
    brand = f'<a class="brand" href="/rivune/" aria-label="Rivune home"{brand_current}><img class="icon" src="/rivune/assets/rivune-icon-128.png" alt="" width="32" height="32"><img class="wordmark" src="/rivune/assets/rivune-wordmark.svg" alt="Rivune" width="112" height="15"></a>'
    desktop = ''.join(link(path, label) for path, label in primary)
    desktop_more = ''.join(link(path, label) for path, label in more)
    mobile = ''.join(link(path, label, True) for path, label in (*primary, *more)) + link("download/", "Download", True)
    return f'<a class="skip" href="#main">Skip to content</a><header class="nav shell">{brand}<nav class="nav-links" aria-label="Main navigation">{desktop}<details class="nav-more"><summary>More</summary><div>{desktop_more}</div></details>{link("download/", "Download")}</nav><details class="mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation">{mobile}</nav></details></header>'


def render_footer(route):
    privacy_current = ' aria-current="page"' if route == "privacy/" else ''
    contact_current = ' aria-current="page"' if route == "contact/" else ''
    return f'<footer class="footer shell"><a class="brand" href="/rivune/" aria-label="Rivune home"><img class="icon" src="/rivune/assets/rivune-icon-128.png" alt="" width="32" height="32"><img class="wordmark" src="/rivune/assets/rivune-wordmark.svg" alt="Rivune" width="112" height="15"></a><p class="footer-origin">Built in Denver, Colorado.</p><nav aria-label="Project links"><a href="/rivune/about/">About</a><a href="/rivune/contact/"{contact_current}>Contact</a><a href="https://github.com/Draven1287/rivune">Source</a><a href="/rivune/privacy/"{privacy_current}>Privacy</a><a href="https://github.com/Draven1287/rivune/issues">Support</a></nav><small>© 2026 Rivune contributors. Apache-2.0 licensed independent software, not affiliated with OpenAI, Anthropic, or Apple.</small></footer>'


MENU_SCRIPT = """<script>(() => {
document.querySelectorAll('.mobile-menu a,.nav-more a').forEach((link) => { link.addEventListener('click', () => link.closest('details')?.removeAttribute('open')); });
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.mobile-menu[open],.nav-more[open]').forEach(details=>{details.removeAttribute('open');details.querySelector('summary')?.focus();});});
document.addEventListener('pointerdown',event=>{document.querySelectorAll('.mobile-menu[open],.nav-more[open]').forEach(details=>{if(!details.contains(event.target))details.removeAttribute('open');});});
const copyEmail=document.querySelector('[data-copy-email]');copyEmail?.addEventListener('click',async()=>{const status=document.querySelector('[data-copy-status]'),email=copyEmail.dataset.copyEmail;try{await navigator.clipboard.writeText(email);status.textContent='Email copied.';}catch(error){status.textContent='Copy failed. Select the email address above and copy it manually.';}});
const project={perspectives:['Two useful starting points','One perspective prioritizes a two-week pilot. Another starts with a smaller three-day test so the team can learn before committing.','The approaches disagree on scope. The review step will keep the low-risk test and a clear path to expand.'],review:['A smaller test, with a decision point','The review finds agreement on the goal and flags the timeline conflict. It combines a three-day trial with a written checkpoint before the full pilot.','The disagreement is visible instead of being averaged away.'],final:['A practical pilot plan','Run a three-day test with one owner, two participants, and a short success checklist. Review the evidence on day four, then decide whether to begin a two-week pilot.','Aarav can edit this draft before using it.']};
const stages={perspectives:'Perspectives',review:'Review',final:'Final draft'};let stage='perspectives';
const renderDemo=()=>{const panel=document.querySelector('[data-demo-label]')?.closest('.demo-panel');if(!panel)return;const data=project[stage];document.querySelector('[data-demo-label]').textContent=stages[stage];document.querySelector('[data-demo-title]').textContent=data[0];document.querySelector('[data-demo-body]').textContent=data[1];document.querySelector('[data-demo-note]').textContent=data[2];document.querySelectorAll('[data-demo-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demoStage===stage)));};
document.querySelectorAll('[data-demo-stage]').forEach(b=>b.addEventListener('click',()=>{stage=b.dataset.demoStage;renderDemo();}));
const platformPanel=document.querySelector('[data-platform-panel]'),macReady=platformPanel?.dataset.releaseReady==='true';const platforms={mac:['macOS',document.querySelector('[data-platform-title]')?.textContent,document.querySelector('[data-platform-body]')?.textContent],windows:['Windows','Windows download not yet available','The desktop app is in development. The Windows download is not yet available.'],linux:['Linux','Linux download not yet available','The desktop app is in development. The Linux download is not yet available.']};
document.querySelectorAll('[data-platform]').forEach(b=>b.addEventListener('click',()=>{const p=b.dataset.platform,d=platforms[p],panel=document.querySelector('[data-platform-panel]');document.querySelectorAll('[data-platform]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('[data-mac-only]').forEach(x=>x.hidden=p!=='mac');document.querySelector('[data-platform-label]').textContent=d[0];document.querySelector('[data-platform-title]').textContent=d[1];document.querySelector('[data-platform-body]').textContent=d[2];panel.focus();}));
})();</script>"""


def build(release_file=ROOT / "release.json", output=ROOT / "dist", fixture=False, require_ready=False, publish_target=None):
    data = json.loads(Path(release_file).read_text())
    ready = validate_release(data, fixture)
    target = validate_publish_target(data, fixture, publish_target, require_ready)
    output = Path(output).resolve()
    if fixture:
        if not output.is_relative_to(ROOT / ".qa"):
            raise ValueError("Fixture output must stay under pages-site/.qa; never dist")
    elif output != ROOT / "dist":
        raise ValueError("Production static output must be pages-site/dist")
    if ready:
        raise ValueError("Approved overlay integration is coming-soon only; accepted installer binding needs separate verification")
    tokens = render_tokens(data, fixture)
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    shutil.copytree(ROOT / "assets", output / "assets")
    for asset in ("site.css", "refinements.css", "tour.css", "tour.js"):
        shutil.copyfile(ROOT / asset, output / asset)
    for source, route in PUBLIC_PAGES:
        destination = output / route / "index.html"
        text = (ROOT / source).read_text()
        text = text.replace('</head>', '<link rel="stylesheet" href="/rivune/refinements.css"></head>')
        page_tokens = {**tokens, "CANONICAL": html.escape(SITE_URL + route, quote=True), "NAV": render_navigation(route), "FOOTER": render_footer(route), "MENU_SCRIPT": MENU_SCRIPT}
        for key, value in page_tokens.items():
            text = text.replace("{{" + key + "}}", value)
        if not route:
            text = text.replace("</body>", '<script>const oldPages={faq:"faq/",workflow:"how-it-works/",requirements:"app/",support:"contact/",download:"download/"};const followOldLink=()=>{const page=oldPages[location.hash.slice(1)];if(page)location.replace("/rivune/"+page);};addEventListener("hashchange",followOldLink);followOldLink();</script>' + "</body>")
        if re.search(r"\{\{[A-Z_]+\}\}", text):
            raise ValueError("Unresolved page template")
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(text)
    if not fixture:
        namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
        ET.register_namespace("", namespace)
        sitemap = ET.Element(f"{{{namespace}}}urlset")
        for _, route in PUBLIC_PAGES:
            url = ET.SubElement(sitemap, f"{{{namespace}}}url")
            ET.SubElement(url, f"{{{namespace}}}loc").text = SITE_URL + route
        ET.ElementTree(sitemap).write(output / "sitemap.xml", encoding="utf-8", xml_declaration=True)
    # Custom Pages workflows serve this artifact directly; the uploader excludes dotfiles.
    (output / "404.html").write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Page not found — Rivune</title><link rel="stylesheet" href="/rivune/site.css"><main class="prose shell"><h1>That page isn’t here.</h1><p><a href="/rivune/">Back to Rivune →</a></p></main></html>')
    manifest = {"target": "https://draven1287.github.io/rivune/", "basePath": "/rivune/", "publishTarget": target, "releaseStatus": data["status"], "simulation": fixture, "files": {str(p.relative_to(output)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(output.rglob("*")) if p.is_file()}}
    (output / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f'Static site built: {output} ({data["status"]}; simulation={fixture}; target={target})')
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", type=Path, default=ROOT / "release.json")
    parser.add_argument("--out", type=Path, default=ROOT / "dist")
    parser.add_argument("--fixture", action="store_true")
    parser.add_argument("--require-ready", action="store_true", help="Compatibility alias for --publish-target validated-beta")
    parser.add_argument("--publish-target", choices=("preview", "validated-beta"), help="Explicit publication artifact; this command does not deploy")
    args = parser.parse_args()
    try:
        build(args.release, args.out, args.fixture, args.require_ready, args.publish_target)
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f'Build refused: {error}\n')
