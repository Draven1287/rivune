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

    def test_beta_target_retains_acceptance_and_public_asset_checks(self):
        # Build real code with isolated test metadata; never treat mocks as a release.
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as directory:
            release = Path(directory) / "release.json"
            release.write_text(json.dumps(self.production))
            with patch("build.verify_public_asset", side_effect=ValueError("public asset absent")) as check:
                with self.assertRaisesRegex(ValueError, "public asset absent"):
                    build(release, publish_target="validated-beta")
                check.assert_called_once_with(self.production)
            with patch("build.verify_public_asset") as check:
                output = build(release, publish_target="validated-beta")
                check.assert_called_once_with(self.production)
                manifest = json.loads((output / "build-manifest.json").read_text())
                self.assertEqual(manifest["publishTarget"], "validated-beta")
                self.assertEqual(manifest["releaseStatus"], "ready")
                installers = (Document((output / "index.html").read_text()).installers
                              + Document((output / "download/index.html").read_text()).installers)
                self.assertEqual(installers, [self.production["assetUrl"]])
            bad = copy.deepcopy(self.production)
            bad["validation"]["notarized"] = False
            release.write_text(json.dumps(bad))
            with patch("build.verify_public_asset") as check:
                with self.assertRaises(ValueError):
                    build(release, publish_target="validated-beta")
                check.assert_not_called()

    def test_coming_soon_cannot_hide_an_installer_url(self):
        data = json.loads((ROOT / "fixtures/coming-soon.json").read_text())
        data["assetUrl"] = self.production["assetUrl"]
        with self.assertRaises(ValueError):
            validate_release(data)


class StaticOutputTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.output = build(ROOT / 'fixtures/coming-soon.json', publish_target='preview')
        cls.fixture = build(ROOT / "fixtures/ready.json", ROOT / ".qa/ready", fixture=True)

    def test_base_paths_assets_and_fragment_navigation(self):
        for output in (self.output, self.fixture):
            for file in output.rglob("*.html"):
                doc = Document(file.read_text())
                for url in doc.urls:
                    parts = urlsplit(url)
                    if parts.scheme:
                        if parts.scheme == "mailto":
                            self.assertEqual(url, "mailto:rivune.crave757@slmails.com")
                        else:
                            self.assertEqual(parts.scheme, "https")
                        continue
                    if parts.path:
                        self.assertTrue(parts.path.startswith("/rivune/"), url)
                        target = output / unquote(parts.path.removeprefix("/rivune/"))
                        if target.is_dir():
                            target /= "index.html"
                        self.assertTrue(target.is_file(), url)
                        target_doc = Document(target.read_text()) if target.suffix == ".html" else None
                    else:
                        target_doc = doc
                    if parts.fragment:
                        self.assertIn(parts.fragment, target_doc.ids)

    def test_current_page_has_no_dmg_or_fake_download(self):
        home = (self.output / "index.html").read_text()
        app = (self.output / "app/index.html").read_text()
        download = (self.output / "download/index.html").read_text()
        combined = home + app + download
        self.assertEqual(Document(home).installers + Document(download).installers, [])
        self.assertNotIn(' disabled', download)
        self.assertEqual(download.split('<script>', 1)[0].count('Mac installer coming soon'), 1)
        self.assertNotIn('Open the DMG', download)
        self.assertIn('<summary>Developer source</summary>', download)
        self.assertNotIn('.dmg', combined)
        self.assertNotIn('SIMULATED', combined)
        self.assertIn('macOS 26 or later', app)
        self.assertIn('source-preview.4', download)
        self.assertNotIn('Open the DMG', download)
        self.assertNotIn('<form', combined)
        self.assertNotIn('<script src=', combined)
        for text in (home, app, download):
            self.assertEqual(text.count('<script>'), 1)
            inline_script = text.split('<script>', 1)[1].split('</script>', 1)[0]
            self.assertIn("document.querySelectorAll('.mobile-menu a,.nav-more a')", inline_script)
            for forbidden in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'http://', 'https://'):
                self.assertNotIn(forbidden, inline_script)

    def test_ready_fixture_is_explicit_and_complete(self):
        home = (self.fixture / "index.html").read_text()
        download = (self.fixture / "download/index.html").read_text()
        installers = Document(home).installers + Document(download).installers
        self.assertEqual(len(installers), 1)
        self.assertTrue(all(u.endswith('/Rivune-SIMULATED.dmg') for u in installers))
        combined = home + download
        for value in ('SIMULATED READY STATE', 'noindex,nofollow', 'Download for Mac', '0.2.0-beta.1', '52.4 MB', 'macOS 26.0+', 'Apple silicon &amp; Intel', 'Open the DMG', 'Move Rivune', 'Launch Rivune'):
            self.assertIn(value, combined)

    def test_static_package_has_no_dynamic_workspace_or_fixture(self):
        paths = [str(p.relative_to(self.output)) for p in self.output.rglob('*')]
        self.assertFalse(any(p == 'workspace' or p.startswith('workspace/') or 'fixture' in p or p.endswith('.py') for p in paths))
        self.assertNotIn('assets/native-workspace.png', paths)
        self.assertFalse((self.output / '.nojekyll').exists())

    def test_pages_upload_inventory_matches_manifest(self):
        # The Pages upload action excludes dotfiles. Model that boundary here;
        # the downloaded CI tar artifact is verified separately by release review.
        for output in (self.output, self.fixture):
            with self.subTest(output=output.name):
                packaged = {str(p.relative_to(output)): p.read_bytes()
                            for p in output.rglob("*") if p.is_file()
                            and not any(part.startswith(".") for part in p.relative_to(output).parts)}
                manifest = json.loads(packaged["build-manifest.json"])
                self.assertEqual(set(packaged), set(manifest["files"]) | {"build-manifest.json"})
                for name, digest in manifest["files"].items():
                    self.assertEqual(hashlib.sha256(packaged[name]).hexdigest(), digest, name)

    def test_installer_readiness_does_not_enable_pending_modes(self):
        for output in (self.output, self.fixture):
            with self.subTest(installer_state=output.name):
                text = (output / 'how-it-works/index.html').read_text()
                self.assertEqual(Document(text).mode_availability, {
                    'council': 'not-in-source-preview',
                    'swarm': 'not-in-source-preview',
                })
                self.assertIn('Current native development', text)
                self.assertIn('Not implemented', text)
                self.assertIn('Automatic teamwork and Swarm are still in development; developer source is available', text)
                self.assertIn('Real Swarm and Auto are not public release features', text)
                self.assertNotIn('Lantern', text)

    def test_sitemap_lists_only_intended_public_canonical_pages(self):
        tree = ET.parse(self.output / 'sitemap.xml')
        namespace = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = [node.text for node in tree.findall('s:url/s:loc', namespace)]
        expected = {
            'https://draven1287.github.io/rivune/',
            'https://draven1287.github.io/rivune/app/',
            'https://draven1287.github.io/rivune/how-it-works/',
            'https://draven1287.github.io/rivune/faq/',
            'https://draven1287.github.io/rivune/about/',
            'https://draven1287.github.io/rivune/download/',
            'https://draven1287.github.io/rivune/privacy/',
            'https://draven1287.github.io/rivune/council-vs-swarm/',
        }
        self.assertEqual(set(urls), expected)
        self.assertEqual(len(urls), len(expected))
        for url in urls:
            parsed = urlsplit(url)
            self.assertEqual(parsed.scheme, 'https')
            self.assertFalse(parsed.query or parsed.fragment)
            path = self.output / parsed.path.removeprefix('/rivune/') / 'index.html'
            document = Document(path.read_text())
            self.assertEqual(document.canonicals, [url])
            self.assertNotIn('noindex', document.meta.get('robots', ''))

    def test_routes_have_unique_metadata_and_consistent_active_navigation(self):
        routes = ('', 'app/', 'how-it-works/', 'faq/', 'about/', 'download/', 'privacy/', 'council-vs-swarm/')
        titles, descriptions = set(), set()
        for route in routes:
            text = (self.output / route / 'index.html').read_text() if route else (self.output / 'index.html').read_text()
            doc = Document(text)
            self.assertEqual(doc.canonicals, ['https://draven1287.github.io/rivune/' + route])
            self.assertEqual(text.count('aria-current="page"'), 1 if route == '' else (3 if route == 'privacy/' else 2))
            title = text.split('<title>', 1)[1].split('</title>', 1)[0]
            self.assertNotIn(title, titles)
            self.assertNotIn(doc.meta['description'], descriptions)
            titles.add(title); descriptions.add(doc.meta['description'])
        how = Document((self.output / 'how-it-works/index.html').read_text())
        guide = Document((self.output / 'council-vs-swarm/index.html').read_text())
        self.assertIn('/rivune/council-vs-swarm/', how.urls)
        self.assertIn('/rivune/how-it-works/', guide.urls)
        self.assertIn('/rivune/privacy/', guide.urls)
        home = Document((self.output / 'index.html').read_text())
        privacy = Document((self.output / 'privacy/index.html').read_text())
        self.assertIn('mailto:rivune.crave757@slmails.com', Document((self.output / 'about/index.html').read_text()).urls)
        self.assertIn('mailto:rivune.crave757@slmails.com', privacy.urls)

    def test_preview_artifact_is_explicit_and_noncommercial(self):
        manifest = json.loads((self.output / 'build-manifest.json').read_text())
        self.assertEqual(manifest['publishTarget'], 'preview')
        self.assertEqual(manifest['releaseStatus'], 'coming-soon')
        self.assertFalse(manifest['simulation'])
        for page in self.output.rglob('*.html'):
            text = page.read_text()
            self.assertFalse(Document(text).installers)
            for forbidden in ('<form', '<script src=', 'data-installer', 'checkout', '$10', 'stripe.com'):
                self.assertNotIn(forbidden, text)
            if '<script>' in text:
                self.assertEqual(text.count('<script>'), 1)
                inline_script = text.split('<script>', 1)[1].split('</script>', 1)[0]
                self.assertIn("document.querySelectorAll('.mobile-menu a,.nav-more a')", inline_script)
                for forbidden in ('fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'http://', 'https://'):
                    self.assertNotIn(forbidden, inline_script)
        guide = (self.output / 'council-vs-swarm/index.html').read_text()
        self.assertIn('Rivune should propose an eligible team and lead', guide)
        self.assertIn('Multiple members may use the same provider tool', guide)
        self.assertIn('Auto is the target default after both execution paths qualify', guide)

    def test_product_preview_is_dom_built_and_accessible(self):
        app = (self.output / 'app/index.html').read_text()
        home = (self.output / 'index.html').read_text()
        for text in (home, app):
            self.assertIn('workspace-preview', text)
            self.assertIn('Illustrative interface preview — prewritten; no AI request is sent.', text)
            self.assertNotIn('native-workspace.png', text)
            self.assertNotIn('product-image-zoom', text)
        self.assertIn('<details><summary>Independent perspectives</summary>', app)
        self.assertIn('<details><summary>Reviewed draft</summary>', app)
        self.assertIn("document.querySelectorAll('.mobile-menu a,.nav-more a')", app)
        self.assertIn("removeAttribute('open')", app)

    def test_demo_and_platform_choices_are_honest_and_interactive(self):
        home = (self.output / 'index.html').read_text()
        download = (self.output / 'download/index.html').read_text()
        self.assertIn('Illustrative demo — prewritten example; no AI request is sent.', home)
        for value in ('Plan a project', 'Review a proposal', 'Compare approaches', 'data-demo-stage="perspectives"', 'data-demo-reset'):
            self.assertIn(value, home)
        for value in ('data-platform="mac"', 'data-platform="windows"', 'data-platform="linux"', 'Windows version is planned', 'Linux version is planned'):
            self.assertIn(value, download)
        self.assertIn('Built in Denver, Colorado.', home)
        self.assertIn('mailto:rivune.crave757@slmails.com', home)

    def test_fixtures_and_noncontent_stay_out_of_discovery_output(self):
        self.assertFalse((self.fixture / 'sitemap.xml').exists())
        for page in self.fixture.rglob('*.html'):
            with self.subTest(page=str(page.relative_to(self.fixture))):
                self.assertIn('noindex', Document(page.read_text()).meta.get('robots', ''))
        self.assertIn('noindex', Document((self.output / '404.html').read_text()).meta['robots'])
        for output in (self.output, self.fixture):
            self.assertFalse((output / 'robots.txt').exists())
            self.assertFalse((output / 'llms.txt').exists())


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
