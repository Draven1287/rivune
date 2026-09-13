"""Read-only fixture integrity/contract check; does not execute the Rust host."""
import hashlib
import json
from pathlib import Path

review = Path(__file__).resolve().parent
inputs = review.parent / 'r4-attachments'
manifest = json.loads((inputs / 'FIXTURE_MANIFEST.json').read_text())
cases = json.loads((inputs / 'CASES.json').read_text())
results = []
for name, expected in manifest.items():
    content = (inputs / 'fixtures' / name).read_bytes()
    actual = {'byteLength': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
    assert actual == expected, name
    try:
        content.decode('utf-8', errors='strict')
        utf8 = True
    except UnicodeDecodeError:
        utf8 = False
    results.append({'file': name, 'manifestMatches': True, 'strictUtf8': utf8,
                    'hasNul': b'\x00' in content, 'bytes': len(content)})
assert len({case['id'] for case in cases}) == len(cases)
for case in cases:
    assert case['fixture'] in manifest
receipt = {
    'scope': 'Fixture integrity and source/contract comparison only; no R4 or Rust execution',
    'inputs': {name: hashlib.sha256((inputs/name).read_bytes()).hexdigest()
               for name in ('CONTRACT.md', 'CASES.json', 'FIXTURE_MANIFEST.json')},
    'files': results,
    'scenarioCount': len(cases),
    'saveFailureCase': next(case for case in cases if case['id'] == 'save-failure'),
    'finding': 'Unqualified save-failure old-snapshot expectation conflicts with existing post-rename committed-error publication. Split fault phases.'
}
(review / 'FIXTURE_REVIEW_RECEIPT.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps({'fixtureFilesVerified': len(results), 'scenarioCount':len(cases),
                  'hostTestsExecuted':False, 'receipt':'FIXTURE_REVIEW_RECEIPT.json'}))
