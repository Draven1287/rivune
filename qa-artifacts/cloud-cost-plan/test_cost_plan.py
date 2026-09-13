"""Checks synthetic arithmetic and tariff boundaries; never calls a provider."""
import copy
import json
import unittest
from decimal import Decimal
from pathlib import Path
from council_cost import calculate, cost

SPEC = json.loads((Path(__file__).parent / 'scenarios.json').read_text())


class CostPlanTests(unittest.TestCase):
    def test_full_run_totals_and_stress_calls(self):
        expected = [('0.0202', '0.0395'), ('0.078', '0.1498'),
                    ('0.04165', '0.08025'), ('0.162', '0.3056'),
                    ('0.107', '0.2035'), ('0.417', '0.776')]
        result = calculate(SPEC)
        for row, (base, stress) in zip(result['results'], expected):
            self.assertEqual(Decimal(row['base_usd']), Decimal(base))
            self.assertEqual(Decimal(row['stress_usd']), Decimal(stress))
            self.assertEqual(row['base_call_count'], 3)
            self.assertEqual(row['stress_call_count'], 5)
        self.assertIsNone(result['profit'])

    def test_wrong_context_band_rejected(self):
        with self.assertRaises(ValueError):
            cost(SPEC['models']['gemini-3.1-pro-preview'], 200001, 100)

    def test_expired_promotional_scenario_rejected(self):
        changed = copy.deepcopy(SPEC)
        changed['price_checked_date'] = '2027-01-01'
        with self.assertRaises(ValueError):
            calculate(changed)

    def test_unknown_negative_and_fractional_tokens_not_zero(self):
        for input_tokens in [None, -1, 1.5, True]:
            with self.subTest(input_tokens=input_tokens):
                with self.assertRaises(ValueError):
                    cost(SPEC['models']['claude-sonnet-5'], input_tokens, 100)


if __name__ == '__main__':
    unittest.main(verbosity=2)
