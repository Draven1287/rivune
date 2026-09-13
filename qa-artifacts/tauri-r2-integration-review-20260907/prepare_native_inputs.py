#!/usr/bin/env python3
"""Prepare only synthetic migration inputs; never reads user history or launches apps."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FIXTURES = ROOT.parent / 'tauri-migration-audit-20260907' / 'fixtures'
OUTPUT = ROOT / 'native-synthetic-inputs'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def prepare():
    sources = {}

    def fixture(name):
        data = (FIXTURES / (name + '.json')).read_bytes()
        sources[name + '.json'] = digest(data)
        return json.loads(data)

    history = fixture('conversation-project-reference')['input']
    turn = history[0]['turns'][0]
    turn['executionState'] = 'failed'
    for kind, source, suffix, content in [
        ('claudeAnswer', 'Claude', '002', 'Synthetic Claude answer.\nKeep this separate.'),
        ('combinedAnswer', 'Rivune', '003', 'Synthetic partial synthesis.\nOriginal task failed.'),
    ]:
        turn[kind] = {
            'id': '50000000-0000-4000-8000-000000000' + suffix,
            'source': source, 'content': content, 'responseTime': 0.5,
            'provenance': 'Synthetic native acceptance fixture; no AI executed',
        }
    payloads = {
        'conversations.json': history,
        'drafts.json': fixture('drafts-multiple-and-new')['input'],
        'projects.json': fixture('project-needs-new-file-permission')['input'],
        'preferences.json': fixture('settings-and-stale-consent')['input'],
    }
    encoded = {name: (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
               for name, value in payloads.items()}
    encoded['truncated-drafts.json'] = fixture('truncated-drafts')['rawUTF8'].encode()
    manifest = {
        'syntheticOnly': True, 'nativeExecution': False,
        'sourceEnvelopes': sources,
        'files': {name: {'sha256': digest(data), 'bytes': len(data)} for name, data in encoded.items()},
        'selectTogether': ['conversations.json', 'drafts.json', 'projects.json', 'preferences.json'],
        'selectSeparatelyForRejection': 'truncated-drafts.json',
        'expected': {
            'conversations': 1, 'turns': 1, 'answers': 3, 'originalState': 'failed',
            'matchedDrafts': 1, 'archiveOnlyDrafts': 2, 'projects': 1,
            'turnAttachments': 1, 'preferencesPreserved': True,
            'newProviderDispatches': 0, 'legacyPermissionGrantsActivated': 0,
        },
        'limitation': 'Prepared inputs, not native import/export acceptance. Compare exported files to these exact bytes.',
    }
    encoded['MANIFEST.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    OUTPUT.mkdir(exist_ok=True)
    # Protect an already-reviewed input set from silent regeneration over changed bytes.
    for name, data in encoded.items():
        path = OUTPUT / name
        if path.exists() and path.read_bytes() != data:
            raise RuntimeError(f'Refusing to replace changed fixture: {path}')
    for name, data in encoded.items():
        path = OUTPUT / name
        if not path.exists():
            path.write_bytes(data)
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    prepare()
