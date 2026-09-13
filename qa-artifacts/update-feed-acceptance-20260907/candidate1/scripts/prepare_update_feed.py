#!/usr/bin/env python3
"""Prepare, never publish, a Sparkle feed from a gated public DMG."""
import argparse, hashlib, json, os, pathlib, plistlib, shutil, subprocess, tempfile
from urllib.parse import urlparse
import xml.etree.ElementTree as ET


def run(*args):
    return subprocess.check_output(args, stderr=subprocess.STDOUT)


def validate_generated_feed(feed, archive, info, digest, download_prefix, notes_prefix):
    """Bind the output to the validated archive, app identity and embedded key."""
    ns = '{http://www.andymatuschak.org/xml-namespaces/sparkle}'
    items = ET.parse(feed).findall('./channel/item')
    if len(items) != 1:
        raise ValueError('Expected one verified release entry.')
    item = items[0]
    enclosures = item.findall('enclosure')
    if len(enclosures) != 1 or item.find(ns + 'deltas') is not None:
        raise ValueError('Expected one full update archive without deltas.')
    enclosure = enclosures[0]
    if (enclosure.get('url') != download_prefix.rstrip('/') + '/' + archive.name
            or enclosure.get('length') != str(archive.stat().st_size)
            or hashlib.sha256(archive.read_bytes()).hexdigest() != digest):
        raise ValueError('Generated feed archive URL, size or bytes differ from the validated release.')
    for field, expected in [('version', info['CFBundleVersion']),
                            ('shortVersionString', info['CFBundleShortVersionString'])]:
        values = [(element.text or '').strip() for element in item.findall(ns + field)]
        legacy = enclosure.get(ns + field)
        if legacy is not None:
            values.append(legacy)
        if not values or any(value != expected for value in values):
            raise ValueError('Generated feed version differs from the validated app.')
    notes = item.findall(ns + 'releaseNotesLink')
    expected_notes = notes_prefix.rstrip('/') + '/' + archive.with_suffix('.html').name
    # Sparkle embeds HTML fragments directly and links complete HTML documents.
    if len(notes) > 1 or (notes and (notes[0].text or '').strip() != expected_notes):
        raise ValueError('Generated feed release notes URL differs from the reviewed notes.')
    signature = enclosure.get(ns + 'edSignature', '')
    # Verify with the PUBLIC key in the signed app. Verifying with the supplied
    # private key alone would still accept an accidentally selected wrong key.
    run('xcrun', 'swift', str(pathlib.Path(__file__).with_name('verify_update_signature.swift')),
        str(archive), info['SUPublicEDKey'], signature)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for name in ('dmg', 'release-info', 'notes', 'output', 'sparkle-bin', 'private-key', 'download-prefix', 'notes-prefix', 'team-id', 'previous-build'):
        p.add_argument('--' + name, required=True)
    a = p.parse_args()
    repo = pathlib.Path(__file__).resolve().parent.parent
    key = pathlib.Path(a.private_key).resolve()
    if key.is_relative_to(repo):
        p.error('Private signing key must be outside the repository.')
    for value in (a.download_prefix, a.notes_prefix):
        u = urlparse(value)
        if u.scheme != 'https' or not u.netloc or u.username or u.query or u.fragment:
            p.error('Release endpoints must be HTTPS directory URLs.')
    output = pathlib.Path(a.output).resolve()
    if output.exists():
        p.error('Use a new output directory; existing feeds are never overwritten.')
    report = pathlib.Path(a.release_info).read_text()
    for required in ('Distribution: Distributable public release', 'Signing: Developer ID signed', 'Notarization: App and DMG notarized and stapled'):
        if required not in report:
            p.error('Public packaging gates are missing. Ad-hoc previews cannot enter a feed.')
    dmg = pathlib.Path(a.dmg).resolve()
    digest = hashlib.sha256(dmg.read_bytes()).hexdigest()
    if 'SHA-256: ' + digest not in report:
        p.error('DMG checksum differs from the public packaging report.')
    run('xcrun', 'stapler', 'validate', str(dmg))
    run('spctl', '-a', '-t', 'open', '--context', 'context:primary-signature', str(dmg))
    with tempfile.TemporaryDirectory(prefix='rivune-update-gate-') as temporary:
        mount = pathlib.Path(temporary) / 'mount'
        mount.mkdir()
        run('hdiutil', 'attach', str(dmg), '-readonly', '-nobrowse', '-mountpoint', str(mount))
        try:
            app = mount / 'Rivune.app'
            info = plistlib.loads((app / 'Contents/Info.plist').read_bytes())
            build = info['CFBundleVersion']
            if info['CFBundleIdentifier'] != 'com.aaravshah.alloy.mac' or int(build) <= int(a.previous_build):
                p.error('Unexpected bundle identifier or non-increasing build number.')
            if info.get('RivuneDistribution') != 'developer-id' or info.get('RivuneUpdateTeamID') != a.team_id or not info.get('SUPublicEDKey'):
                p.error('App does not contain the configured production updater identity and public key.')
            run('codesign', '--verify', '--deep', '--strict', '--check-notarization', str(app))
            details = run('codesign', '-d', '--verbose=4', str(app)).decode()
            if 'TeamIdentifier=' + a.team_id not in details or 'runtime' not in details or 'Authority=Developer ID Application:' not in details:
                p.error('Unexpected signing team, identity, or missing hardened runtime.')
            run('xcrun', 'stapler', 'validate', str(app))
            run('spctl', '-a', '-t', 'exec', str(app))
        finally:
            run('hdiutil', 'detach', str(mount))
        stage = pathlib.Path(temporary) / 'feed'
        stage.mkdir()
        archive_name = 'Rivune-' + build + '.dmg'
        shutil.copy2(dmg, stage / archive_name)
        shutil.copy2(a.notes, stage / ('Rivune-' + build + '.html'))
        run(str(pathlib.Path(a.sparkle_bin) / 'generate_appcast'), '--ed-key-file', str(key), '--download-url-prefix', a.download_prefix, '--release-notes-url-prefix', a.notes_prefix, '--maximum-deltas', '0', str(stage))
        feeds = list(stage.glob('*.xml'))
        if len(feeds) != 1:
            p.error('Expected one generated appcast.')
        try:
            validate_generated_feed(feeds[0], stage / archive_name, info, digest,
                                    a.download_prefix, a.notes_prefix)
        except (ValueError, OSError, ET.ParseError, subprocess.CalledProcessError):
            p.error('Generated feed failed archive, metadata or embedded-public-key verification; no output prepared.')
        (stage / 'release-provenance.json').write_text(json.dumps({'build': build, 'version': info['CFBundleShortVersionString'], 'bundleID': info['CFBundleIdentifier'], 'teamID': a.team_id, 'sha256': digest, 'archive': archive_name, 'published': False}, indent=2))
        shutil.copytree(stage, output)
    print('Prepared verified release feed locally:', output)
    print('No files were uploaded. Review before publication.')

if __name__ == '__main__':
    main()
