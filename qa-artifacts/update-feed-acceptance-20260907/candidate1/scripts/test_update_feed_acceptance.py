"""Offline feed acceptance using disposable keys and the actual Sparkle signer.

Apple packaging checks and appcast generation are mocked; archive signatures
are real. No Keychain access, mount, notarization, network or publication.
"""
import base64
import contextlib
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import plistlib
import subprocess
import sys
import tempfile
import unittest
import zipfile
from unittest.mock import patch
import xml.etree.ElementTree as ET

SCRIPT = Path(os.environ.get('RIVUNE_FEED_UNDER_TEST', Path(__file__).with_name('prepare_update_feed.py')))
spec = importlib.util.spec_from_file_location('feed_under_test', SCRIPT)
feed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(feed)
NS = '{http://www.andymatuschak.org/xml-namespaces/sparkle}'


class FeedAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.scratch = tempfile.TemporaryDirectory(prefix='rivune-feed-test-')
        cls.root = Path(cls.scratch.name)
        cls.sparkle = Path(os.environ['RIVUNE_TEST_SPARKLE_BIN'])
        fixture = cls.root / 'fixture.swift'
        fixture.write_text('''import Foundation
import CryptoKit
let root = URL(fileURLWithPath: CommandLine.arguments[1])
for name in ["app", "other"] {
    let key = Curve25519.Signing.PrivateKey()
    try key.rawRepresentation.base64EncodedData().write(to: root.appendingPathComponent(name + ".key"))
    try key.publicKey.rawRepresentation.base64EncodedData().write(to: root.appendingPathComponent(name + ".pub"))
}
''')
        cache = cls.root / 'module-cache'
        subprocess.run(['xcrun', 'swift', '-module-cache-path', str(cache), str(fixture), str(cls.root)], check=True, capture_output=True)
        for name in ['app', 'other']:
            (cls.root / (name + '.key')).chmod(0o600)
        cls.verifier = cls.root / 'verify'
        verifier_source = Path(__file__).with_name('verify_update_signature.swift')
        subprocess.run(['xcrun', 'swiftc', '-module-cache-path', str(cache), str(verifier_source), '-o', str(cls.verifier)], check=True, capture_output=True)

    @classmethod
    def tearDownClass(cls):
        cls.scratch.cleanup()

    def exercise(self, mutation=None):
        with tempfile.TemporaryDirectory(prefix='rivune-feed-case-') as folder:
            root = Path(folder)
            archive = root / 'fixture.dmg'
            archive.write_bytes(b'Disposable archive payload, not a disk image.')
            report = root / 'release.txt'
            report.write_text('Distribution: Distributable public release\nSigning: Developer ID signed\nNotarization: App and DMG notarized and stapled\nSHA-256: ' + hashlib.sha256(archive.read_bytes()).hexdigest())
            notes = root / 'notes.html'
            notes.write_text('<p>Fictional test notes</p>')
            output = root / 'prepared'
            args = [str(SCRIPT), '--dmg', str(archive), '--release-info', str(report), '--notes', str(notes), '--output', str(output), '--sparkle-bin', str(self.sparkle), '--private-key', str(self.root / 'app.key'), '--download-prefix', 'https://example.com/releases/', '--notes-prefix', 'https://example.com/notes/', '--team-id', 'ABCDE12345', '--previous-build', '1']
            calls = []

            def fake_run(*command):
                calls.append(command)
                if command[:2] == ('hdiutil', 'attach'):
                    app = Path(command[-1]) / 'Rivune.app/Contents'
                    app.mkdir(parents=True)
                    info = dict(CFBundleIdentifier='com.aaravshah.alloy.mac', CFBundleVersion='2', CFBundleShortVersionString='0.2', RivuneDistribution='developer-id', RivuneUpdateTeamID='ABCDE12345', SUPublicEDKey=(self.root / 'app.pub').read_text())
                    (app / 'Info.plist').write_bytes(plistlib.dumps(info))
                elif command[:2] == ('codesign', '-d'):
                    return b'TeamIdentifier=ABCDE12345\nCodeDirectory flags=0x10000(runtime)\nAuthority=Developer ID Application: Fixture\n'
                elif Path(command[0]).name == 'generate_appcast':
                    stage = Path(command[-1])
                    staged_archive = stage / 'Rivune-2.dmg'
                    key_name = 'other' if mutation == 'wrong_key' else 'app'
                    signature = subprocess.check_output([str(self.sparkle / 'sign_update'), '--ed-key-file', str(self.root / (key_name + '.key')), '-p', str(staged_archive)], text=True).strip()
                    if mutation == 'tampered':
                        staged_archive.write_bytes(b'X' * staged_archive.stat().st_size)
                    if mutation == 'invalid_signature':
                        signature = base64.b64encode(bytes(64)).decode()
                    rss = ET.Element('rss')
                    item = ET.SubElement(ET.SubElement(rss, 'channel'), 'item')
                    ET.SubElement(item, NS + 'version').text = '1' if mutation == 'wrong_build' else '2'
                    ET.SubElement(item, NS + 'shortVersionString').text = '0.2'
                    ET.SubElement(item, NS + 'releaseNotesLink').text = 'https://example.com/notes/Rivune-2.html'
                    ET.SubElement(item, 'enclosure', {'url': 'https://example.com/releases/' + ('Other.dmg' if mutation == 'wrong_url' else 'Rivune-2.dmg'), NS + 'edSignature': signature, 'length': str(staged_archive.stat().st_size)})
                    ET.ElementTree(rss).write(stage / 'appcast.xml')
                elif command[:2] == ('xcrun', 'swift'):
                    return subprocess.check_output([str(self.verifier), *command[-3:]], stderr=subprocess.STDOUT)
                return b''

            with patch.object(sys, 'argv', args), patch.object(feed, 'run', side_effect=fake_run), contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                if mutation:
                    with self.assertRaises((SystemExit, ValueError, subprocess.CalledProcessError)):
                        feed.main()
                    self.assertFalse(output.exists(), 'Rejected update produced a publishable output directory')
                else:
                    feed.main()
                    self.assertTrue((output / 'appcast.xml').exists())
                    self.assertEqual((output / 'Rivune-2.dmg').read_bytes(), archive.read_bytes())
            return calls

    def test_matching_archive_and_embedded_key_prepare(self):
        self.exercise()

    def test_wrong_private_key_cannot_prepare(self):
        self.exercise('wrong_key')

    def test_tampered_staged_archive_cannot_prepare(self):
        self.exercise('tampered')

    def test_nonempty_invalid_signature_cannot_prepare(self):
        self.exercise('invalid_signature')

    def test_wrong_archive_url_cannot_prepare(self):
        self.exercise('wrong_url')

    def test_wrong_build_cannot_prepare(self):
        self.exercise('wrong_build')

    def test_actual_sparkle_appcast_and_verifier(self):
        with tempfile.TemporaryDirectory(prefix='rivune-real-appcast-') as folder:
            root = Path(folder)
            archive = root / 'Rivune-2.zip'
            info = dict(CFBundleIdentifier='invalid.example.rivune.fixture',
                        CFBundleName='Rivune', CFBundleVersion='2',
                        CFBundleShortVersionString='0.2', CFBundlePackageType='APPL',
                        CFBundleExecutable='Fixture', LSMinimumSystemVersion='13.0',
                        SUPublicEDKey=(self.root / 'app.pub').read_text())
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('Rivune.app/Contents/Info.plist', plistlib.dumps(info))
                z.writestr('Rivune.app/Contents/MacOS/Fixture', b'Fictional non-executable test data')
            (root / 'Rivune-2.html').write_text('<p>Fictional test notes</p>')
            generated = subprocess.run([str(self.sparkle / 'generate_appcast'), '--ed-key-file', str(self.root / 'app.key'),
                            '--download-url-prefix', 'https://example.com/releases/',
                            '--release-notes-url-prefix', 'https://example.com/notes/',
                            '--maximum-deltas', '0', str(root)], capture_output=True, text=True)
            self.assertEqual(generated.returncode, 0, generated.stdout + generated.stderr)
            appcasts = list(root.glob('*.xml'))
            self.assertEqual(len(appcasts), 1)
            # Run the production Swift command as well as the official generator.
            feed.validate_generated_feed(appcasts[0], archive, info,
                                         hashlib.sha256(archive.read_bytes()).hexdigest(),
                                         'https://example.com/releases/', 'https://example.com/notes/')


if __name__ == '__main__':
    unittest.main()
