import unittest
from decimal import Decimal
from pathlib import Path

from pricing_calculator import (
    council_call_counts,
    current_council_rows,
    decimal,
    fee_rows,
    legacy_rows,
    operating_cost_summary,
    payment_fee,
    pooled_overage_per_subscriber,
    sync_rows,
    token_cost,
)

BASE = Path(__file__).parent


class PricingCalculatorTests(unittest.TestCase):
    def test_current_two_member_council_is_three_call_success_path(self):
        rows = current_council_rows(BASE)
        self.assertEqual(len(rows), 9)
        for row in rows:
            self.assertEqual(row["workflow_shape"], "current_council_n_member_plus_lead")
            self.assertEqual(row["member_count"], "2")
            self.assertEqual(row["success_path_call_count"], "3")

    def test_current_council_derives_n_member_stage_count(self):
        self.assertEqual(council_call_counts(2), (3, 3))
        self.assertEqual(council_call_counts(4), (5, 5))
        self.assertEqual(council_call_counts(6), (7, 7))
        self.assertEqual(
            council_call_counts(4, failed_member_attempts=1, replacement_lead_attempts=2, length_repair_attempts=1),
            (5, 9),
        )

    def test_high_load_counts_failed_member_replacement_lead_and_one_repair(self):
        rows = [row for row in current_council_rows(BASE) if row["load"] == "high"]
        self.assertEqual(len(rows), 3)
        for row in rows:
            self.assertEqual(row["modeled_attempt_count"], "6")
            self.assertGreater(Decimal(row["failed_member_allowance_usd"]), 0)
            self.assertGreater(Decimal(row["replacement_lead_allowance_usd"]), 0)
            self.assertGreater(Decimal(row["length_repair_allowance_usd"]), 0)

    def test_legacy_and_hypothetical_shapes_are_separate(self):
        rows = legacy_rows(BASE)
        self.assertEqual(len(rows), 27)
        counts = {row["workflow_shape"]: row["success_path_call_count"] for row in rows}
        self.assertEqual(counts["legacy_together_direct_3"], "3")
        self.assertEqual(counts["hypothetical_cross_review_5"], "5")
        self.assertEqual(counts["legacy_together_coordinated_7"], "7")
        self.assertTrue(all("not current Council" in row["status"] for row in rows))

    def test_subscription_and_wallet_fee_profiles(self):
        self.assertEqual(payment_fee(Decimal("10"), include_billing=True), Decimal("0.660"))
        self.assertEqual(payment_fee(Decimal("10"), include_billing=False), Decimal("0.590"))
        rows = {row["fee_profile"]: row for row in fee_rows()}
        self.assertEqual(rows["cloud_subscription_domestic_card_with_stripe_billing"]["payment_fee_usd"], "0.66")
        self.assertEqual(rows["wallet_topup_domestic_card_standard_payments"]["payment_fee_usd"], "0.59")

    def test_pooled_quota_boundaries(self):
        self.assertEqual(
            pooled_overage_per_subscriber(Decimal("10"), Decimal("10"), Decimal("25")),
            Decimal("0"),
        )
        expected = Decimal("1") * Decimal("0.0213") / Decimal("10")
        self.assertEqual(
            pooled_overage_per_subscriber(Decimal("10"), Decimal("10.1"), Decimal("25")),
            expected,
        )

    def test_base_sync_uses_zero_actual_overage_and_separate_shadow(self):
        row = next(row for row in sync_rows(BASE) if row["load"] == "base")
        self.assertEqual(row["subscription_payment_fee_usd"], "0.6600")
        self.assertEqual(row["actual_pooled_overage_usd_per_subscriber"], "0.0000")
        self.assertEqual(row["full_volume_shadow_usd_per_subscriber"], "0.4926")
        self.assertEqual(row["modeled_cash_margin_before_unmeasured_costs_pct"], "88.40")

    def test_zero_subscribers_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "subscribers"):
            pooled_overage_per_subscriber(Decimal("0"), Decimal("1"), Decimal("1"))

    def test_negative_and_missing_assumptions_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "nonnegative"):
            decimal({"tokens": "-1"}, "tokens")
        with self.assertRaisesRegex(ValueError, "missing"):
            decimal({}, "tokens")
        with self.assertRaisesRegex(ValueError, "nonnegative"):
            token_cost({"input_usd_per_million": "1", "output_usd_per_million": "1"}, Decimal("-1"), Decimal("0"))
        with self.assertRaisesRegex(ValueError, "two to six"):
            council_call_counts(1)
        with self.assertRaisesRegex(ValueError, "at most one"):
            council_call_counts(2, length_repair_attempts=2)
        with self.assertRaisesRegex(ValueError, "remaining Council members"):
            council_call_counts(2, replacement_lead_attempts=2)

    def test_unmeasured_cost_buckets_are_explicit(self):
        hosted_known, hosted_unknown = operating_cost_summary(BASE, "hosted_council")
        cloud_known, cloud_unknown = operating_cost_summary(BASE, "rivune_cloud")
        self.assertEqual(hosted_known, 0)
        self.assertEqual(cloud_known, 0)
        self.assertIn("orchestration_and_queue_compute", hosted_unknown)
        self.assertIn("authentication_and_remote_relay", cloud_unknown)
        self.assertTrue(all(row["unmeasured_cost_buckets"] for row in current_council_rows(BASE)))
        self.assertTrue(all(row["unmeasured_cost_buckets"] for row in sync_rows(BASE)))


if __name__ == "__main__":
    unittest.main(verbosity=2)
