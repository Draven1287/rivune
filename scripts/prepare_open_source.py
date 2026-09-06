#!/usr/bin/env python3
"""Prepare an allowlisted, disabled-account native source export; never publish."""
import argparse, contextlib, hashlib, json, pathlib, plistlib, re, shutil, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
RULES = {
    'private key': rb'BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY',
    'provider token': rb'(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{20,})',
    'OAuth secret': rb'GOCSPX-[A-Za-z0-9_-]{15,}',
    'backend secret': rb'sb_secret_[A-Za-z0-9_-]{15,}',
    'AWS access key': rb'AKIA[0-9A-Z]{16}',
    'JWT': rb'eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}',
    'private home path': rb'/Users/(?!example(?:/|\b)|test(?:/|\b))[A-Za-z0-9_.-]+/',
}

def _prepare(destination, archive_stream, checksum_stream):
    manifest = ROOT / 'scripts/open_source_files.txt'
    paths = [p for p in manifest.read_text().splitlines() if p and not p.startswith('#')]
    if len(paths) != len(set(paths)):
        raise SystemExit('Duplicate manifest path')
    for name in paths:
        relative = pathlib.PurePosixPath(name)
        source = ROOT / relative
        if relative.is_absolute() or '..' in relative.parts or source.is_symlink() or not source.is_file():
            raise SystemExit('Invalid manifest entry: ' + name)
        if any((ROOT / parent).is_symlink() for parent in relative.parents if str(parent) != "."):
            raise SystemExit('Symlink in manifest path: ' + name)
    for name in paths:
        source = ROOT / name; target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        data = source.read_bytes()
        if not data or len(data) != source.stat().st_size:
            raise SystemExit("Empty or incomplete source file: " + name)
        target.write_bytes(data)
        if target.read_bytes() != data:
            raise SystemExit("Copy verification failed: " + name)
        target.chmod(0o755 if name.startswith('scripts/') and source.stat().st_mode & 0o111 else 0o644)
    # Public build is inert and has no official backend/credential identifiers.
    for name in ['Info-Mac.plist', 'Info-iOS.plist']:
        file = destination / 'Rivune' / name
        config = plistlib.loads(file.read_bytes())
        config['RivuneAccount'] = {'Enabled': False, 'URL': '', 'PublishableKey': '', 'email': False, 'google': False, 'apple': False}
        file.write_bytes(plistlib.dumps(config, sort_keys=False))
    project = (destination/'Rivune.xcodeproj/project.pbxproj').read_text()
    for name in set(re.findall(r'path = ([A-Za-z][A-Za-z0-9_-]*\.swift);', project)):
        if not any((destination / p).name == name for p in paths):
            raise SystemExit('Missing Xcode source: ' + name)
    findings = []
    for name in paths:
        data = (destination/name).read_bytes()
        if b'\x00' in data:  # media still has to be reviewed for provenance
            continue
        for rule, pattern in RULES.items():
            if re.search(pattern, data):
                findings.append({'file': name, 'rule': rule})
    if findings:
        # Never print the matching value or a source line.
        raise SystemExit(json.dumps({'blocked': findings}, indent=2))
    versions = sorted(set(re.findall(r'MARKETING_VERSION = ([^;]+)', project)))
    builds = sorted(set(re.findall(r'CURRENT_PROJECT_VERSION = ([^;]+)', project)))
    provenance = {'status': 'local-unpublished-candidate', 'version': versions, 'build': builds,
        'revision': None, 'revisionNote': 'No repository commit exists; file hashes identify this candidate.',
        'configurationTransform': 'Official account values removed and all account providers disabled.',
        'files': {p: hashlib.sha256((destination/p).read_bytes()).hexdigest() for p in sorted(paths)}}
    (destination/'SOURCE_MANIFEST.json').write_text(json.dumps(provenance, indent=2)+'\n')
    (destination/'SOURCE_MANIFEST.json').chmod(0o644)
    archive = destination.with_suffix('.zip')
    with zipfile.ZipFile(archive_stream, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for file in sorted(destination.rglob('*')):
            if not file.is_file(): continue
            info = zipfile.ZipInfo('Rivune-source/'+file.relative_to(destination).as_posix(), (2026,1,1,0,0,0))
            info.external_attr = (file.stat().st_mode & 0xFFFF) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, file.read_bytes())
    archive_stream.flush()
    archive_stream.seek(0)
    checksum = hashlib.sha256(archive_stream.read()).hexdigest()
    checksum_stream.write(checksum+'  '+archive.name+'\n')
    print(json.dumps({'directory':str(destination),'archive':str(archive),'sha256':checksum,'files':len(paths)},indent=2))

def prepare(destination):
    archive = destination.with_suffix('.zip')
    checksum = archive.with_suffix('.zip.sha256')
    owned = []
    def claim(path):
        stat = path.lstat()
        owned.append((path, stat.st_dev, stat.st_ino))
    try:
        with contextlib.ExitStack() as stack:
            # mkdir and x-mode creation are exclusive; no existence preflight
            # can establish ownership of an output created by a competing run.
            destination.mkdir(parents=True)
            claim(destination)
            archive_stream = stack.enter_context(archive.open('x+b'))
            claim(archive)
            checksum_stream = stack.enter_context(checksum.open('x'))
            claim(checksum)
            _prepare(destination, archive_stream, checksum_stream)
    except BaseException:
        # Do not remove an output we never acquired, or one replaced afterward.
        for path, device, inode in reversed(owned):
            try: current = path.lstat()
            except FileNotFoundError: continue
            if (current.st_dev, current.st_ino) != (device, inode): continue
            if path == destination: shutil.rmtree(path)
            else: path.unlink()
        raise

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=pathlib.Path)
    prepare(parser.parse_args().destination.resolve())
