"""Synthetic local adversarial fixtures. No model results or provider receipts."""
import hashlib
import tempfile
import unittest
from pathlib import Path
from check_candidate import ROOT, evaluate

CSV = ('item,quantity,unit_cost,line_total\n'
       'food,24,3.25,78.00\n'
       'drinks,30,0.80,24.00\n'
       'reusable signs,3,6.00,18.00\n')
NOTE = ('Subtotal: $120.00\nRemaining money: $30.00\n'
        'Proposed contingency (10% of subtotal): $12.00\n'
        'Remaining after contingency: $18.00\n'
        'This is a proposed budget; nothing has been purchased.\n')


class CandidateCheckerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='.checker-test-', dir=ROOT)
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.answer = self.folder / 'answer.txt'
        self.csv = self.folder / 'budget.csv'
        self.note = self.folder / 'organizer-note.md'
        self.csv.write_text(CSV)
        self.note.write_text(NOTE)

    def prose(self, text, task='T01'):
        self.answer.write_text(text)
        return evaluate(task, answer=self.answer)

    def artifacts(self):
        return evaluate('T07', csv_path=self.csv, note=self.note)

    def result(self, report, name):
        return next(c for c in report['checks'] if c['check'] == name)

    def test_inclusive_boundary_and_full_response(self):
        report = self.prose(' '.join(['word'] * 230))
        self.assertEqual(self.result(report, 'answer.word_limit')['status'], 'pass')
        report = self.prose(' '.join(['word'] * 230) + '\nReview: added words')
        self.assertEqual(self.result(report, 'answer.word_limit')['measured'], 233)
        self.assertEqual(report['mechanical_result'], 'fail')

    def test_strict_boundary(self):
        self.assertEqual(self.prose(' '.join(['word'] * 179), 'T03')['mechanical_result'], 'pass')
        self.assertEqual(self.prose(' '.join(['word'] * 180), 'T03')['mechanical_result'], 'fail')

    def test_all_prose_limits(self):
        for task, limit in [('T02', 220), ('T04', 140), ('T05', 260), ('T06', 180)]:
            with self.subTest(task=task):
                self.assertEqual(self.prose(' '.join(['word'] * limit), task)['mechanical_result'], 'pass')
                self.assertEqual(self.prose(' '.join(['word'] * (limit + 1)), task)['mechanical_result'], 'fail')

    def test_empty_and_errors_can_pass_length_but_are_rejected(self):
        for text in ['', '   ', 'Error', 'Error: request timed out.', '# Error: unavailable',
                     'Rate limit exceeded.', 'Authentication failed.', '{"error":"quota exceeded"}']:
            with self.subTest(text=text):
                report = self.prose(text)
                self.assertEqual(self.result(report, 'answer.word_limit')['status'], 'pass')
                self.assertEqual(report['usable_answer'], 'rejected')
                self.assertEqual(report['semantic_quality'], 'unverified')

    def test_read_failure_is_not_zero_words(self):
        report = evaluate('T01', answer=self.folder / 'missing.txt')
        self.assertEqual(report['mechanical_result'], 'fail')
        self.assertIsNone(self.result(report, 'answer.word_limit')['measured'])
        self.assertEqual(self.result(report, 'answer.word_limit')['status'], 'uncheckable')

    def test_utf8_failure(self):
        self.answer.write_bytes(b'\xff\xfe')
        report = evaluate('T01', answer=self.answer)
        self.assertEqual(self.result(report, 'answer.readable')['status'], 'fail')

    def test_artifact_fixture_pass_is_not_semantic_verification(self):
        report = self.artifacts()
        self.assertEqual(report['mechanical_result'], 'pass')
        self.assertEqual(report['semantic_quality'], 'unverified')
        self.assertEqual(report['overall_correctness'], 'unverified')
        self.assertEqual(report['usable_answer'], 'unverified')

    def test_wrong_line_total(self):
        self.csv.write_text(CSV.replace('3.25,78.00', '3.25,77.00'))
        report = self.artifacts()
        self.assertEqual(self.result(report, 'csv.row_1.multiplication')['status'], 'fail')
        self.assertEqual(self.result(report, 'csv.subtotal')['measured'], '119.00')
        self.assertEqual(report['mechanical_result'], 'fail')

    def test_duplicate_missing_or_extra_rows(self):
        bad = [CSV.replace('drinks,30,0.80,24.00', 'food,24,3.25,78.00'),
               CSV.replace('drinks,30,0.80,24.00\n', ''),
               CSV + 'total,0,0.00,120.00\n']
        for text in bad:
            with self.subTest(text=text):
                self.csv.write_text(text)
                report = self.artifacts()
                self.assertEqual(report['mechanical_result'], 'fail')
                self.assertEqual(self.result(report, 'csv.subtotal')['status'], 'uncheckable')

    def test_missing_field_and_currency_symbol(self):
        for text in [CSV.replace('food,24,3.25,78.00', 'food,24,78.00'),
                     CSV.replace('3.25', '$3.25'), CSV.replace('78.00', '78')]:
            with self.subTest(text=text):
                self.csv.write_text(text)
                self.assertEqual(self.artifacts()['mechanical_result'], 'fail')

    def test_wrong_header_and_malformed_csv(self):
        self.csv.write_text(CSV.replace('unit_cost', 'cost'))
        self.assertEqual(self.result(self.artifacts(), 'csv.header')['status'], 'fail')
        self.csv.write_text('item,quantity,unit_cost,line_total\n"unterminated')
        self.assertEqual(self.result(self.artifacts(), 'csv.parse')['status'], 'fail')

    def test_wrong_labeled_note_total(self):
        self.note.write_text(NOTE.replace('Subtotal: $120.00', 'Subtotal: $125.00'))
        report = self.artifacts()
        self.assertEqual(self.result(report, 'note.subtotal')['status'], 'fail')
        self.assertEqual(report['mechanical_result'], 'fail')

    def test_ambiguous_or_prose_note_amounts_uncheckable(self):
        for text in [NOTE + 'Subtotal: $120.00\n',
                     'The subtotal is $120, with $30 remaining. Reserve 10%, or $12, leaving $18.']:
            with self.subTest(text=text):
                self.note.write_text(text)
                report = self.artifacts()
                self.assertEqual(self.result(report, 'note.subtotal')['status'], 'uncheckable')
                self.assertEqual(report['mechanical_result'], 'uncheckable')

    def test_missing_note_field(self):
        self.note.write_text(NOTE.replace('Remaining after contingency: $18.00\n', ''))
        report = self.artifacts()
        self.assertEqual(self.result(report, 'note.remaining_after_contingency')['status'], 'uncheckable')
        self.assertEqual(report['overall_correctness'], 'unverified')

    def test_note_over_limit(self):
        self.note.write_text(NOTE + ' '.join(['extra'] * 121))
        report = self.artifacts()
        self.assertEqual(self.result(report, 'note.word_limit')['status'], 'fail')

    def test_missing_file_and_missing_path(self):
        self.csv.unlink()
        self.assertEqual(self.artifacts()['mechanical_result'], 'fail')
        report = evaluate('T07')
        self.assertEqual(report['mechanical_result'], 'fail')
        self.assertEqual(self.result(report, 'note.word_limit')['status'], 'uncheckable')

    def test_preserves_candidate_bytes(self):
        before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in [self.csv, self.note]}
        self.artifacts()
        self.assertEqual(before, {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in before})

    def test_wrong_filename(self):
        wrong = self.folder / 'wrong.csv'
        wrong.write_text(CSV)
        report = evaluate('T07', csv_path=wrong, note=self.note)
        self.assertEqual(self.result(report, 'csv.filename')['status'], 'fail')

    def test_semantically_false_content_is_not_certified(self):
        report = self.prose('The moon is made of cheese. Everything is guaranteed.')
        self.assertEqual(report['mechanical_result'], 'pass')
        self.assertEqual(report['semantic_quality'], 'unverified')
        self.assertEqual(report['usable_answer'], 'unverified')


if __name__ == '__main__':
    unittest.main(verbosity=2)
