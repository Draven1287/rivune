"""Static checks only. Does not make provider, network, shell subprocess or UI calls."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['status'] == 'prepared_not_run'
for name, expected in manifest['files'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
payload = json.loads((root / 'prompts.json').read_text())
assert payload['status'] == 'prepared_not_run'
tasks = payload['tasks']
assert [t['id'] for t in tasks] == [f'T{i:02}' for i in range(1, 9)]
for task in tasks:
    assert set(task) == {'id', 'title', 'intended_workflow', 'prompt', 'attachments'}
    assert task['attachments'] == []
    assert hashlib.sha256(task['prompt'].encode()).hexdigest() == manifest['task_prompt_sha256'][task['id']]
rubrics = json.loads((root / 'rubrics.private.json').read_text())
assert rubrics['status'] == 'withheld_from_execution'
assert set(rubrics['tasks']) == {t['id'] for t in tasks}
for rubric in rubrics['tasks'].values():
    assert set(rubric) == {'deterministic', 'semantic', 'critical_failures'}
    assert all(isinstance(values, list) and values for values in rubric.values())
receipt = json.loads((root / 'run-receipt.template.json').read_text())
assert receipt['status'] == 'template_not_a_run'
assert receipt['run_id'] is None and receipt['calls'] == []
assert receipt['timing']['wall_seconds_including_queue_and_repairs'] is None
print('PASS: 8 frozen prompts, 8 separate rubrics, receipt template and hashes. No evaluations executed.')
