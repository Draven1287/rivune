import copy
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET
from build import ROOT, build, render_tokens, validate_release, verify_public_asset, validate_publish_target
from check_publish import authorize_publication


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.urls, self.installers = set(), [], []
        self.mode_availability = {}
        self.canonicals, self.meta = [], {}
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            if attrs["id"] in self.ids:
                raise AssertionError("duplicate ID")
            self.ids.add(attrs["id"])
        if tag in ("a", "link", "img", "script"):
            url = attrs.get("href", attrs.get("src"))
            if url:
                self.urls.append(url)
        if "data-installer" in attrs:
            self.installers.append(attrs.get("href"))
        if tag == "article" and "data-availability" in attrs:
            self.mode_availability[attrs.get("id")] = attrs["data-availability"]
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href"))
        if tag == "meta":
            self.meta[attrs.get("name", attrs.get("property"))] = attrs.get("content", "")


class ReleaseGateTests(unittest.TestCase):
    def setUp(self):
        self.ready = json.loads((ROOT / "fixtures/ready.json").read_text())
        self.production = copy.deepcopy(self.ready)
        self.production.pop("simulation")
        self.production["tag"] = "v0.2.0-beta.1"
        self.production["assetUrl"] = "https://github.com/Draven1287/rivune/releases/download/v0.2.0-beta.1/Rivune-0.2.0.dmg"
        self.production["validationEvidence"] = "tests-only mocked validation evidence; never a release attestation"

    def test_fixture_never_enters_production(self):
        with self.assertRaises(ValueError):
            validate_release(self.ready)
        with self.assertRaises(ValueError):
            build(ROOT / "fixtures/ready.json", ROOT / "dist", fixture=True)

    def test_missing_or_failed_acceptance_blocks_download(self):
        for key in self.production["validation"]:
            for bad in (False, None, "true"):
                candidate = copy.deepcopy(self.production)
                candidate["validation"][key] = bad
                with self.subTest(key=key, value=bad), self.assertRaises(ValueError):
                    validate_release(candidate)

    def test_no_source_zip_repository_or_external_download(self):
        for url in ("https://github.com/Draven1287/rivune", self.production["assetUrl"].replace(".dmg", ".zip"), self.production["assetUrl"].replace("Draven1287", "someone-else"), "javascript:alert(1)", self.production["assetUrl"] + "?download=1"):
            candidate = copy.deepcopy(self.production)
            candidate["assetUrl"] = url
            with self.subTest(url=url), self.assertRaises(ValueError):
                validate_release(candidate)

    def test_actual_version_platform_size_and_integrity_required(self):
        for key, value in (("version", "latest"), ("architecture", "unknown"), ("minimumMacOS", "any"), ("sizeBytes", 0), ("sizeBytes", True), ("sha256", ""), ("validatedAt", ""), ("validationEvidence", "")):
            candidate = copy.deepcopy(self.production)
            candidate[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_release(candidate)

    def test_public_release_must_match_exact_reviewed_asset(self):
        good = {"draft": False, "tag_name": self.production["tag"], "assets": [{"browser_download_url": self.production["assetUrl"], "state": "uploaded", "size": self.production["sizeBytes"], "digest": "sha256:" + self.production["sha256"]}]}
        verify_public_asset(self.production, lambda _: good)
        for field, value in (("size", 1), ("digest", None), ("state", "new"), ("browser_download_url", "https://github.com/Draven1287/rivune")):
            bad = copy.deepcopy(good)
            bad["assets"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                verify_public_asset(self.production, lambda _: bad)

    def test_current_release_cannot_be_published_as_ready(self):
        with self.assertRaises(ValueError):
            build(ROOT / 'fixtures/coming-soon.json', require_ready=True)

    def test_publication_targets_cannot_be_interchanged(self):
        coming = json.loads((ROOT / "fixtures/coming-soon.json").read_text())
        self.assertEqual(validate_publish_target(coming, publish_target="preview"), "preview")
        self.assertEqual(validate_publish_target(self.production, publish_target="validated-beta"), "validated-beta")
        for data, target in ((coming, "validated-beta"), (self.production, "preview"), (coming, "unknown")):
            with self.subTest(target=target), self.assertRaises(ValueError):
                validate_publish_target(data, publish_target=target)
        with self.assertRaises(ValueError):
            validate_publish_target(coming, publish_target="preview", require_ready=True)
        for target in ("preview", "validated-beta"):
            with self.subTest(target=target), self.assertRaises(ValueError):
                validate_publish_target(self.ready, fixture=True, publish_target=target)

    def test_ready_build_waits_for_accepted_installer_binding(self):
        # Approved V2 has no accepted installer binding, even with valid metadata.
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as directory:
            release = Path(directory) / "release.json"
            release.write_text(json.dumps(self.production))
            before = (ROOT / "dist/build-manifest.json").read_bytes() if (ROOT / "dist/build-manifest.json").exists() else None
            with patch("build.verify_public_asset") as check:
                with self.assertRaisesRegex(ValueError, "accepted installer binding"):
                    build(release, publish_target="validated-beta")
                check.assert_not_called()
            after = (ROOT / "dist/build-manifest.json").read_bytes() if (ROOT / "dist/build-manifest.json").exists() else None
            self.assertEqual(before, after)
        with self.assertRaisesRegex(ValueError, "accepted installer binding"):
            build(ROOT / "fixtures/ready.json", ROOT / ".qa/ready", fixture=True)

    def test_coming_soon_cannot_hide_an_installer_url(self):
        data = json.loads((ROOT / "fixtures/coming-soon.json").read_text())
        data["assetUrl"] = self.production["assetUrl"]
        with self.assertRaises(ValueError):
            validate_release(data)


class StaticOutputTests(unittest.TestCase):
    # Golden hashes from the user-approved static-review-v2 / 64-check receipt.
    # Deliberately standalone: canonical CI does not depend on QA artifact folders.
    APPROVED = {'index.html': '574065ab0dcf53324ae7d1dd268547a33addcae283aac7e03e290167f4b8d59b', 'app/index.html': 'ef0d810fdef022ee80f2ec9355e8d18df868e3403c0cd95995206ce9893a479e', 'how-it-works/index.html': 'f8a344394d3923721d0561d8e39f2b5474ce207b05b4a6b5443ae966d3894b28', 'faq/index.html': 'bb82de8e7857895fc918650ea72d48284297f5379c3fdfc999ab3595fd97fac0', 'about/index.html': '4ea76ed0814c738fd3d0d6449f9ced402fbbca33695c64779e277b3cf20d7f7a', 'contact/index.html': '28f44461ba3cce1a047f2110c66d0642ad88e2f7217cd630bbffca69b32e02e9', 'download/index.html': 'c7b2f4c84d4e9d3afc16704e3a4145900092fb3198c0c434841208f5fd8c7803', 'privacy/index.html': 'cf0dee58d47b0b2a95523d09f008ef3fda50fde5db1827846d8e4e11faafdccf', 'council-vs-swarm/index.html': '8a71b32895d47baa0304c6e527071fde887abec50b8c8a8f6d31be1563032d42', 'site.css': '3fdeaa68cc8d5b51e12d53a5d5a047fb393d81a3f5143445ba09d817186b8aad', 'tour.css': '72d97edfb1d526802a8bed14412709bde33022161f8311a79b4a4669fcfa7aa2', 'tour.js': '072bcd4ba06aa8cc62e95d05bcf87d633fc80f2a79219038ff9f7b62468d7474', 'refinements.css': '38f0cb714ac387930c90830d32b3694f0329b9a51d224764489ffab9f7dd7a48'}

    # Independently approved platform-summary delta; normalize only this exact line.
    ORIGINAL_PLATFORM = b"const platformPanel=document.querySelector('[data-platform-panel]'),macReady=platformPanel?.dataset.releaseReady==='true';const platforms={mac:['macOS',macReady?'Mac download available':'macOS download not yet available',macReady?'A validated Mac DMG is available below. Check its version and system requirements before downloading.':'The desktop app is in development. The macOS download is not yet available.'],windows:['Windows','Windows download not yet available','The desktop app is in development. The Windows download is not yet available.'],linux:['Linux','Linux download not yet available','The desktop app is in development. The Linux download is not yet available.']};"
    REVIEWED_PLATFORM = b"const platformPanel=document.querySelector('[data-platform-panel]'),macReady=platformPanel?.dataset.releaseReady==='true';const platforms={mac:['macOS',document.querySelector('[data-platform-title]')?.textContent,document.querySelector('[data-platform-body]')?.textContent],windows:['Windows','Windows download not yet available','The desktop app is in development. The Windows download is not yet available.'],linux:['Linux','Linux download not yet available','The desktop app is in development. The Linux download is not yet available.']};"

    @classmethod
    def setUpClass(cls):
        cls.output = build(ROOT / 'fixtures/coming-soon.json', publish_target='preview')

    def test_nine_routes_and_styles_scripts_match_approved_v2(self):
        self.assertEqual(len([name for name in self.APPROVED if name.endswith('index.html')]), 9)
        for name, digest in self.APPROVED.items():
            with self.subTest(file=name):
                content = (self.output / name).read_bytes()
                if name.endswith('index.html'):
                    self.assertEqual(content.count(self.REVIEWED_PLATFORM), 1)
                    content = content.replace(self.REVIEWED_PLATFORM, self.ORIGINAL_PLATFORM)
                    refined = b'<link rel="stylesheet" href="/rivune/refinements.css"></head>'
                    robots = b'<meta name="robots" content="noindex,nofollow">'
                    if name == 'council-vs-swarm/index.html':
                        marker = b'  \n' + refined
                        self.assertEqual(content.count(marker), 1)
                        content = content.replace(marker, b'  ' + robots + b'\n' + refined)
                    else:
                        self.assertEqual(content.count(refined), 1)
                        content = content.replace(refined, robots + refined)
                if name == 'privacy/index.html':
                    # SITE-PRIVACY-CONSISTENCY is the only accepted-baseline delta.
                    content = content.replace(b'<meta property="og:url" content="https://draven1287.github.io/rivune/privacy/">', b'')
                    content = content.replace(b'The <a href="/rivune/contact/">Contact Aarav</a> page offers Gmail and copy-email options.', b'The <a href="mailto:rivune.crave757@slmails.com">Email Aarav</a> link opens your email app.')
                self.assertEqual(hashlib.sha256(content).hexdigest(), digest)

    def test_base_paths_assets_and_fragment_navigation(self):
        for file in self.output.rglob("*.html"):
            doc = Document(file.read_text())
            for url in doc.urls:
                parts = urlsplit(url)
                if parts.scheme:
                    self.assertIn(parts.scheme, ("https", "mailto"))
                    continue
                if parts.path:
                    self.assertTrue(parts.path.startswith("/rivune/"), url)
                    target = self.output / unquote(parts.path.removeprefix("/rivune/"))
                    if target.is_dir():
                        target /= "index.html"
                    self.assertTrue(target.is_file(), url)
                    target_doc = Document(target.read_text()) if target.suffix == ".html" else None
                else:
                    target_doc = doc
                if parts.fragment:
                    self.assertIn(unquote(parts.fragment), target_doc.ids)

    def test_all_pages_have_no_installer_or_payment(self):
        for file in self.output.rglob('*.html'):
            text = file.read_text()
            self.assertFalse(Document(text).installers)
            self.assertNotIn('.dmg', text)
            self.assertNotIn('stripe.com', text)
            self.assertNotIn('SIMULATED READY STATE', text)
        download = (self.output / 'download/index.html').read_text()
        self.assertIn('data-platform="mac" aria-pressed="true"', download)
        self.assertIn('data-release-ready="false"', download)
        self.assertIn('macOS download is not yet available', download)
        self.assertIn('not the forthcoming Tauri app or an installer', download)

    def test_static_package_includes_only_intentional_content(self):
        paths = [str(p.relative_to(self.output)) for p in self.output.rglob('*') if p.is_file()]
        self.assertFalse(any('fixture' in p or p.endswith('.py') for p in paths))
        self.assertTrue((self.output / 'app/index.html').is_file())
        self.assertTrue((self.output / 'tour.js').is_file())
        # The custom upload-pages-artifact workflow uploads dist; no Jekyll build.
        self.assertFalse((self.output / '.nojekyll').exists())
        self.assertFalse((self.output / 'robots.txt').exists())
        self.assertFalse((self.output / 'llms.txt').exists())

    def test_sitemap_contains_nine_routes_with_canonical_and_indexable_pages(self):
        tree = ET.parse(self.output / 'sitemap.xml')
        urls = [n.text for n in tree.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        expected = {'https://draven1287.github.io/rivune/' + name.removesuffix('index.html')
                    for name in self.APPROVED if name.endswith('index.html')}
        self.assertEqual(set(urls), expected)
        self.assertEqual(len(urls), 9)
        for url in urls:
            document = Document((self.output / urlsplit(url).path.removeprefix('/rivune/') / 'index.html').read_text())
            self.assertEqual(document.canonicals, [url])
            self.assertNotIn('robots', document.meta)
            self.assertEqual(document.meta['og:url'], url)

    def test_privacy_routes_questions_to_supported_contact_options(self):
        text = (self.output / 'privacy/index.html').read_text()
        document = Document(text)
        self.assertEqual(document.meta['og:url'], document.canonicals[0])
        self.assertNotIn('robots', document.meta)
        self.assertIn('The <a href="/rivune/contact/">Contact Aarav</a> page offers Gmail and copy-email options.', text)
        self.assertFalse(any(url.startswith('mailto:') for url in document.urls))
        contact = (self.output / 'contact/index.html').read_text()
        self.assertIn('data-copy-email="rivune.crave757@slmails.com"', contact)
        self.assertIn('select the address and copy it manually', contact)
        self.assertIn('Email delivery depends on that service.', text)
        self.assertIn('the security reporting instructions', text)

    def test_preview_disclosures_and_contact_controls(self):
        app = (self.output / 'app/index.html').read_text()
        self.assertIn('Sample content, no AI requests', app)
        self.assertIn('No sign-in or account is created', app)
        contact = Document((self.output / 'contact/index.html').read_text())
        self.assertFalse(any(url.startswith('mailto:') for url in contact.urls))
        from urllib.parse import parse_qs
        gmail = [urlsplit(u) for u in contact.urls if urlsplit(u).netloc == 'mail.google.com']
        self.assertEqual(len(gmail), 1)
        self.assertEqual(parse_qs(gmail[0].query)['to'], ['rivune.crave757@slmails.com'])

    def test_export_manifest_and_404(self):
        manifest = json.loads((self.output / 'build-manifest.json').read_text())
        self.assertEqual(manifest['publishTarget'], 'preview')
        self.assertEqual(manifest['releaseStatus'], 'coming-soon')
        self.assertFalse(manifest['simulation'])
        for name, digest in manifest['files'].items():
            self.assertEqual(hashlib.sha256((self.output / name).read_bytes()).hexdigest(), digest)
        missing = Document((self.output / '404.html').read_text())
        self.assertEqual(missing.meta['robots'], 'noindex,nofollow')
        self.assertIn('/rivune/', missing.urls)


class PublicationApprovalTests(unittest.TestCase):
    def setUp(self):
        self.env = {"GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_REF": "refs/heads/main",
                    "PUBLISH_REQUESTED": "true", "PUBLISH_TARGET": "preview",
                    "PREVIEW_APPROVED": "true", "BETA_APPROVED": "false"}
        self.manifest = {"publishTarget": "preview", "releaseStatus": "coming-soon", "simulation": False}

    def test_preview_approval_does_not_require_beta_approval(self):
        self.assertEqual(authorize_publication(self.env, self.manifest), "preview")

    def test_beta_requires_its_own_approval_and_ready_artifact(self):
        self.env["PUBLISH_TARGET"] = "validated-beta"
        self.manifest.update(publishTarget="validated-beta", releaseStatus="ready")
        with self.assertRaises(ValueError):
            authorize_publication(self.env, self.manifest)
        self.env["BETA_APPROVED"] = "true"
        self.assertEqual(authorize_publication(self.env, self.manifest), "validated-beta")
        self.manifest["releaseStatus"] = "coming-soon"
        with self.assertRaises(ValueError):
            authorize_publication(self.env, self.manifest)

    def test_missing_wrong_target_or_nonmanual_approval_fails_closed(self):
        for key, value in (("GITHUB_EVENT_NAME", "push"), ("GITHUB_EVENT_NAME", "pull_request"),
                           ("GITHUB_REF", "refs/heads/review"), ("PUBLISH_REQUESTED", "false"),
                           ("PREVIEW_APPROVED", "false"), ("PREVIEW_APPROVED", ""),
                           ("PUBLISH_TARGET", "unknown")):
            env = {**self.env, key: value}
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                authorize_publication(env, self.manifest)
        for key, value in (("publishTarget", "review"), ("releaseStatus", "ready"), ("simulation", True), ("simulation", None)):
            with self.subTest(key=key), self.assertRaises(ValueError):
                authorize_publication(self.env, {**self.manifest, key: value})


if __name__ == '__main__':
    unittest.main()
