#!/usr/bin/env python3
"""Read-only evaluation preflight. No inference, authentication, or app UI calls.
Only --version and --help CLI invocations are allowed. Always returns blocked
until a separately reviewed production execution adapter establishes isolation.
"""
import datetime, hashlib, json, pathlib, plistlib, random, subprocess

OUT = pathlib.Path(__file__).resolve().parent
ROOT = OUT.parents[1]
SOURCE = pathlib.Path('/private/tmp/rivune-review-2026090620/final-source/Rivune')
PLAN = ROOT / 'qa-artifacts/team-evaluation-plan'
HOME_DIR = pathlib.Path.home()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def observe_cli(label, args):
    executable = HOME_DIR / '.local/bin' / label
    result = {'executable': str(executable), 'argv': args}
    try:
        proc = subprocess.run([str(executable), *args], capture_output=True, timeout=20)
        file = OUT / (label + '-' + args[-1].lstrip('-') + '.txt')
        file.write_bytes(proc.stdout)
        result.update(exit_code=proc.returncode, stdout_file=file.name,
                      stdout_sha256=digest(proc.stdout), stderr_present=bool(proc.stderr))
    except (OSError, subprocess.TimeoutExpired) as exc:
        result.update(error_type=type(exc).__name__)
    return result

manifest = json.loads((PLAN / 'manifest.json').read_text())
task_data = (PLAN / 'prompts.json').read_bytes()
assert digest(task_data) == manifest['files']['prompts.json']
tasks = [t for t in json.loads(task_data)['tasks'] if t['id'] in ('T03', 'T04')]
for t in tasks:
    assert not t['attachments']
    assert digest(t['prompt'].encode()) == manifest['task_prompt_sha256'][t['id']]
source_hashes = {n: digest((SOURCE / n).read_bytes()) for n in (
    'TerminalAIService.swift', 'CouncilRunner.swift', 'TeamConfiguration.swift',
    'ProviderRegistry.swift', 'RivuneStore.swift')}
app = pathlib.Path('/Applications/Rivune.app/Contents')
info = plistlib.loads((app / 'Info.plist').read_bytes())
installed = {'build': info.get('CFBundleVersion'),
             'version': info.get('CFBundleShortVersionString'),
             'executable_sha256': digest((app / 'MacOS' / info['CFBundleExecutable']).read_bytes())}
cache_path = HOME_DIR / '.codex/models_cache.json'
cache = json.loads(cache_path.read_text())
models = [{k: m.get(k) for k in ('slug', 'supported_reasoning_levels', 'visibility')}
          for m in cache.get('models', []) if m.get('slug') in ('gpt-6-astra', 'gpt-5.6-sol')]
observed = [observe_cli('codex', ['--version']), observe_cli('codex', ['exec', '--help']),
            observe_cli('claude', ['--version']), observe_cli('claude', ['--help'])]
# No personal instruction contents or credentials are opened or copied.
global_files = {n: (HOME_DIR / '.codex' / n).exists()
                for n in ('AGENTS.md', 'AGENTS.override.md')}
receipt = {
    'schema_version': 1, 'observed_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'status': 'blocked_before_inference', 'provider_request_count': 0,
    'auth_probes_performed': False, 'usage': None, 'cost': None,
    'installed_app': installed, 'reviewed_source_root': str(SOURCE),
    'source_sha256': source_hashes, 'cli_observations': observed,
    'codex_model_metadata': {'cache_fetched_at': cache.get('fetched_at'), 'models': models,
                             'entitlement_verified': False},
    'global_instruction_file_exists': global_files,
    'global_instruction_actual_loading': 'unverified; no request was sent',
    'prompt_hashes': {t['id']: digest(t['prompt'].encode()) for t in tasks},
    'blockers': [
        {'id': 'QE01', 'finding': 'Production Codex retains real HOME. ignore-user-config and ignore-rules do not establish exclusion of global AGENTS instructions or memory. A global AGENTS.md exists; its loading/content was not observed in a provider request.'},
        {'id': 'QE02', 'finding': 'Production transport returns parsed text and elapsed seconds, deleting raw stdout/stderr. Full failure output and provider-reported resolution/usage cannot be retained through the unchanged public seam.'}
    ],
    'followups': [
        'Production Claude team admission supports explicit model with automatic effort only; do not bypass it using the global help effort list.',
        'A CLI help model alias is not account entitlement or an immutable resolved model ID.',
        'Direct baseline must use the production independentPrompt wrapper, not a manually approximated prompt.',
        'No security/auth settings changed. No rubric, private history, or workspace context sent to a provider.'
    ],
    'quality_result': 'not_evaluated', 'superiority_result': 'not_evaluated'
}
(OUT / 'preflight.json').write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({'status': receipt['status'], 'provider_requests': 0, 'receipt': str(OUT / 'preflight.json')}))
