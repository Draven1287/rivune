import copy
import json
import unittest
from unittest.mock import patch
from download_adapter import ROOT, adapt, render_download


class DownloadAdapterTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'synthetic-ready.json').read_text())

    def test_synthetic_fields_and_noindex(self):
        page, reason = render_download(self.data, fixture=True)
        self.assertEqual(reason, 'synthetic-ready')
        for value in ['SYNTHETIC DOWNLOAD FIXTURE', 'noindex,nofollow', '0.2.0-beta.1',
                      'Apple silicon &amp; Intel', 'macOS 26.0+', '52.4 MB',
                      self.data['sha256'], self.data['assetUrl'],
                      'data-platform="mac" aria-pressed="true"']:
            self.assertIn(value, page)
        self.assertEqual(page.count(' data-installer '), 1)

    def test_all_architectures_are_derived(self):
        for arch, label in [('arm64', 'Apple silicon'), ('x86_64', 'Intel'), ('universal', 'Apple silicon &amp; Intel')]:
            data = {**self.data, 'architecture': arch}
            self.assertIn(label, adapt(data, fixture=True)[0]['RELEASE_META'])

    def test_missing_and_malformed_fail_closed(self):
        cases = [None, {}, [], 'ready', 1, {'status': 'ready'},
                 {**self.data, 'architecture': []}, {**self.data, 'validation': []}]
        for data in cases:
            with self.subTest(data=data):
                page, _ = render_download(data, fixture=True)
                self.assertNotIn(' data-installer ', page)
                self.assertIn('data-release-ready="false"', page)
                self.assertIn('SYNTHETIC DOWNLOAD FIXTURE', page)

    def test_each_required_field_and_acceptance_gate_fails_closed(self):
        keys = ['version', 'architecture', 'minimumMacOS', 'sizeBytes', 'sha256',
                'tag', 'assetUrl', 'validatedAt', 'validationEvidence', 'sourceRelease']
        for key in keys:
            data = copy.deepcopy(self.data); data.pop(key)
            self.assertEqual(adapt(data, fixture=True)[0]['RELEASE_READY'], 'false', key)
        for key in self.data['validation']:
            data = copy.deepcopy(self.data); data['validation'][key] = False
            self.assertEqual(adapt(data, fixture=True)[0]['RELEASE_READY'], 'false', key)

    def test_unsafe_link_and_synthetic_production_are_rejected(self):
        for link in ['javascript:alert(1)', 'https://example.com/file.dmg', self.data['assetUrl'].replace('.dmg', '.zip')]:
            self.assertEqual(adapt({**self.data, 'assetUrl': link}, fixture=True)[0]['DOWNLOAD_CONTROL'], '')
        self.assertEqual(adapt(self.data)[0]['DOWNLOAD_CONTROL'], '')

    def test_missing_or_mismatched_public_snapshot_blocks_binding(self):
        # Entire test is synthetic, even the non-fixture validator branch.
        data = {**self.data, 'simulation': False, 'tag': 'v0.2.0-test-only',
                'assetUrl': 'https://github.com/Draven1287/rivune/releases/download/v0.2.0-test-only/Test-only.dmg',
                'validationEvidence': 'Synthetic unit-test record; no acceptance attestation exists.'}
        snapshot = {'draft': False, 'tag_name': data['tag'], 'assets': [{
            'browser_download_url': data['assetUrl'], 'state': 'uploaded',
            'size': data['sizeBytes'], 'digest': 'sha256:' + data['sha256']}]}
        with patch('urllib.request.urlopen', side_effect=AssertionError('No network allowed')):
            self.assertEqual(adapt(data)[0]['RELEASE_READY'], 'false')
            self.assertEqual(adapt(data, public_release=snapshot)[0]['RELEASE_READY'], 'true')
            for bad in [{}, {'draft': True}, {**snapshot, 'assets': []}, {**snapshot, 'assets': [None]}, {**snapshot, 'assets': [snapshot['assets'][0], snapshot['assets'][0]]}]:
                self.assertEqual(adapt(data, public_release=bad)[0]['RELEASE_READY'], 'false')
            for key, value in [('size', 1), ('digest', 'sha256:bad'), ('state', 'new')]:
                bad = copy.deepcopy(snapshot); bad['assets'][0][key] = value
                self.assertEqual(adapt(data, public_release=bad)[0]['RELEASE_READY'], 'false')

    def test_ready_to_invalid_clears_all_installer_fields(self):
        self.assertEqual(adapt(self.data, fixture=True)[0]['RELEASE_READY'], 'true')
        tokens, _ = adapt(None)
        for key in ['DOWNLOAD_CONTROL', 'MAC_RELEASE_DETAILS', 'INSTALL_SECTION', 'RELEASE_META', 'INTEGRITY']:
            self.assertEqual(tokens[key], '')
        self.assertEqual(tokens['RELEASE_READY'], 'false')


if __name__ == '__main__':
    unittest.main()
