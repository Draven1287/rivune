#!/usr/bin/env python3
"""Read explicit candidate files; report bounded mechanics, never semantic correctness."""
import argparse
import csv
import hashlib
import io
import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 2 * 1024 * 1024
FROZEN_V1_HASHES = {'prompts.json': 'e61e318cda17c81e8f87955e8b87f34179fac5ab0fa7f6ac7aeae8ff8c63ab88', 'rubrics.private.json': '80ed39b2e438e3da0c1aa90826cefd1ffd931eecb6aa86533b1b188c0a343b50'}
LIMITS = {'T01': (230, False), 'T02': (220, False), 'T03': (180, True),
          'T04': (140, False), 'T05': (260, False), 'T06': (180, False)}
EXPECTED_ROWS = {'food': (24, Decimal('3.25'), Decimal('78.00')),
                 'drinks': (30, Decimal('0.80'), Decimal('24.00')),
                 'reusable signs': (3, Decimal('6.00'), Decimal('18.00'))}
MONEY_FIELDS = {
    'subtotal': (r'subtotal', Decimal('120.00')),
    'remaining_before_contingency': (r'remaining money|remaining before contingency|remaining budget', Decimal('30.00')),
    'contingency': (r'(?:proposed )?(?:10% )?contingency(?: \(10%(?: of subtotal)?\))?', Decimal('12.00')),
    'remaining_after_contingency': (r'(?:money )?remaining after (?:reserving (?:the )?)?contingency', Decimal('18.00')),
}
ERROR_ONLY = re.compile(
    r'^(?:error(?:\s*[:\-]|\s*$)|failed(?:\s*[:\-]|\s*$)|'
    r'(?:request|authentication|authorization|connection) (?:failed|error|timed out)\b|'
    r'rate limit(?:ed| exceeded| reached)?(?:\b)|unauthorized\b|'
    r'no (?:response|output)(?:\s|$)|(?:service|provider) unavailable\b|'
    r'an error occurred\b|unable to (?:complete|process) (?:the |your )?request\b)', re.I)


def check(checks, name, status, measured=None, expected=None, detail=None):
    entry = dict(check=name, status=status, measured=measured, expected=expected)
    if detail:
        entry['detail'] = detail
    checks.append(entry)


def frozen_version():
    manifest = json.loads((ROOT / 'manifest.json').read_text())
    for name, pinned_hash in FROZEN_V1_HASHES.items():
        if manifest['files'][name] != pinned_hash:
            raise ValueError('Unsupported rubric version: ' + name)
        digest = hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
        if digest != pinned_hash:
            raise ValueError('Frozen version mismatch: ' + name)
    return {name: manifest['files'][name] for name in ('prompts.json', 'rubrics.private.json')}


def read_candidate(path, label, checks, files):
    if path is None:
        check(checks, label + '.readable', 'fail', False, True, 'Required explicit candidate path missing.')
        return None
    path = Path(path)
    try:
        if not path.is_file():
            raise OSError('Not a regular file')
        with path.open('rb') as handle:
            data = handle.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            check(checks, label + '.readable', 'uncheckable', 'over size bound', '<= 2 MiB',
                  'Candidate not truncated or evaluated.')
            return None
        text = data.decode('utf-8-sig')
    except (OSError, UnicodeError) as error:
        check(checks, label + '.readable', 'fail', False, True, type(error).__name__)
        return None
    files[label] = {'path': str(path.absolute()), 'bytes': len(data),
                    'sha256': hashlib.sha256(data).hexdigest()}
    check(checks, label + '.readable', 'pass', True, True)
    return text


def obvious_error(text):
    candidate = text.strip().lstrip('#').strip()
    if ERROR_ONLY.match(candidate):
        return True
    try:
        envelope = json.loads(candidate)
    except (ValueError, TypeError):
        return False
    return isinstance(envelope, dict) and bool(envelope.get('error')) and not envelope.get('answer')


def usability(text, label, checks):
    if text is None:
        check(checks, label + '.not_empty_or_obvious_error', 'uncheckable', None,
              'Nonempty answer without a recognized error-only prefix')
        return
    words = text.split()
    invalid = not words or len(words) == 1 or obvious_error(text)
    check(checks, label + '.not_empty_or_obvious_error', 'fail' if invalid else 'pass',
          {'word_count': len(words), 'recognized_error_prefix': obvious_error(text)},
          'More than one word and no recognized error-only prefix',
          'A screening heuristic only; passing does not establish a usable or correct answer.')


def word_limit(text, label, limit, strict, checks):
    if text is None:
        check(checks, label + '.word_limit', 'uncheckable', None,
              {'limit': limit, 'comparison': '<' if strict else '<='})
        return
    count = len(text.split())
    passed = count < limit if strict else count <= limit
    check(checks, label + '.word_limit', 'pass' if passed else 'fail', count,
          {'limit': limit, 'comparison': '<' if strict else '<=', 'counting': 'whole-file whitespace words'})


def csv_checks(text, checks):
    if text is None:
        check(checks, 'csv.structure_and_arithmetic', 'uncheckable', None, 'Readable CSV required')
        return
    try:
        rows = list(csv.reader(io.StringIO(text), strict=True))
    except csv.Error:
        check(checks, 'csv.parse', 'fail', False, True, 'Malformed CSV; no totals inferred.')
        return
    check(checks, 'csv.parse', 'pass', True, True)
    header = ['item', 'quantity', 'unit_cost', 'line_total']
    check(checks, 'csv.header', 'pass' if rows and rows[0] == header else 'fail',
          rows[0] if rows else None, header)
    data = rows[1:] if rows else []
    check(checks, 'csv.row_count', 'pass' if len(data) == 3 else 'fail', len(data), 3)
    names = [r[0].strip().casefold() for r in data if len(r) == 4]
    names_ok = len(names) == 3 and set(names) == set(EXPECTED_ROWS) and len(set(names)) == 3
    check(checks, 'csv.unique_expected_items', 'pass' if names_ok else 'fail', names,
          sorted(EXPECTED_ROWS))
    total = Decimal('0')
    parsed_all = bool(data)
    for index, row in enumerate(data, start=1):
        label = 'csv.row_' + str(index)
        if len(row) != 4:
            check(checks, label + '.field_count', 'fail', len(row), 4)
            parsed_all = False
            continue
        name, quantity, unit, line = row
        numeric = (re.fullmatch(r'[0-9]+', quantity) and
                   re.fullmatch(r'[0-9]+\.[0-9]{2}', unit) and
                   re.fullmatch(r'[0-9]+\.[0-9]{2}', line))
        check(checks, label + '.numeric_format', 'pass' if numeric else 'fail',
              {'quantity': quantity, 'unit_cost': unit, 'line_total': line},
              'Integer quantity; numeric costs with exactly two decimals')
        if not numeric:
            parsed_all = False
            continue
        # Bound conversion work independently of the input-file limit.
        if any(len(value) > 32 for value in (quantity, unit, line)):
            parsed_all = False
            check(checks, label + '.values', 'fail', 'numeric field exceeds 32 characters', 'Task-sized numbers')
            continue
        try:
            actual = (int(quantity), Decimal(unit), Decimal(line))
            product = Decimal(quantity) * Decimal(unit)
            total += actual[2]
        except (ValueError, InvalidOperation):
            parsed_all = False
            check(checks, label + '.values', 'uncheckable', None, 'Parsable finite numbers')
            continue
        expected = EXPECTED_ROWS.get(name.strip().casefold())
        check(checks, label + '.expected_values', 'pass' if actual == expected else 'fail',
              [str(v) for v in actual], [str(v) for v in expected] if expected else None)
        check(checks, label + '.multiplication', 'pass' if product == actual[2] else 'fail',
              str(actual[2]), str(product))
    if parsed_all and names_ok:
        check(checks, 'csv.subtotal', 'pass' if total == Decimal('120') else 'fail', str(total), '120.00')
    else:
        check(checks, 'csv.subtotal', 'uncheckable', None, '120.00', 'Missing, duplicate or invalid rows; no valid task subtotal established.')


def note_checks(text, checks):
    if text is None:
        check(checks, 'note.budget_values', 'uncheckable', None, 'Readable note required')
        return
    # Read an analysis copy only. General prose is left for a human rather than guessed.
    lines = [line.replace('**', '').strip() for line in text.splitlines()]
    for name, (label, expected) in MONEY_FIELDS.items():
        pattern = re.compile(r'^(?:[-*] )?(?:' + label + r')\s*:\s*\$?([0-9]+(?:\.[0-9]{1,2})?)\s*\.?$', re.I)
        matches = [m.group(1) for line in lines if (m := pattern.fullmatch(line))]
        if len(matches) != 1:
            check(checks, 'note.' + name, 'uncheckable', {'recognized_label_count': len(matches)},
                  str(expected), 'Requires one unambiguous recognized labeled amount; prose/duplicates need human review.')
        else:
            amount = Decimal(matches[0])
            check(checks, 'note.' + name, 'pass' if amount == expected else 'fail', str(amount), str(expected))
    occurrences = len(re.findall(r'(?<![\d.])10\s*%', text))
    check(checks, 'note.literal_ten_percent_mentioned', 'pass' if occurrences else 'uncheckable',
          occurrences, 'At least one literal 10% mention', 'Presence only; does not establish the meaning of surrounding prose.')


def evaluate(task, answer=None, csv_path=None, note=None):
    version = frozen_version()
    checks, files = [], {}
    if task in LIMITS:
        text = read_candidate(answer, 'answer', checks, files)
        usability(text, 'answer', checks)
        word_limit(text, 'answer', *LIMITS[task], checks)
        scope = 'Whole-answer word limit and obvious empty/error screening only; required facts, arithmetic and semantic quality not checked.'
    elif task == 'T07':
        csv_text = read_candidate(csv_path, 'csv', checks, files)
        note_text = read_candidate(note, 'note', checks, files)
        for path, expected, label in ((csv_path, 'budget.csv', 'csv'), (note, 'organizer-note.md', 'note')):
            check(checks, label + '.filename', 'pass' if path and Path(path).name == expected else 'fail',
                  Path(path).name if path else None, expected)
        csv_checks(csv_text, checks)
        usability(note_text, 'note', checks)
        word_limit(note_text, 'note', 120, False, checks)
        note_checks(note_text, checks)
        scope = 'CSV format/required rows/arithmetic, note length and recognized labeled budget amounts only. Review/save identity, prose truth and artifact UX not checked.'
    else:
        raise ValueError('Supported tasks: T01–T07; T08 requires separate rendered inspection.')
    statuses = {c['status'] for c in checks}
    result = 'fail' if 'fail' in statuses else 'uncheckable' if 'uncheckable' in statuses else 'pass'
    usability_statuses = [c['status'] for c in checks if c['check'].endswith('.not_empty_or_obvious_error')]
    return {'schema_version': 1, 'task_id': task, 'evaluation_kind': 'local_candidate_mechanics_only',
            'frozen_version': version, 'candidate_files': files, 'mechanical_result': result,
            'usable_answer': 'rejected' if result == 'fail' or 'fail' in usability_statuses else 'unverified',
            'semantic_quality': 'unverified', 'overall_correctness': 'unverified',
            'scope': scope, 'checks': checks}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--task', required=True, choices=[*LIMITS, 'T07'])
    parser.add_argument('--answer', type=Path)
    parser.add_argument('--csv', dest='csv_path', type=Path)
    parser.add_argument('--note', type=Path)
    args = parser.parse_args()
    if args.task in LIMITS and (args.csv_path or args.note):
        parser.error('T01–T06 accept only --answer.')
    if args.task == 'T07' and args.answer:
        parser.error('T07 accepts --csv and --note, not --answer.')
    try:
        result = evaluate(**vars(args))
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(json.dumps({'status': 'uncheckable', 'reason': str(error),
                          'semantic_quality': 'unverified', 'overall_correctness': 'unverified'}, indent=2))
        return 2
    print(json.dumps(result, indent=2))
    return 1 if result['mechanical_result'] == 'fail' else 2 if result['mechanical_result'] == 'uncheckable' else 0


if __name__ == '__main__':
    raise SystemExit(main())
