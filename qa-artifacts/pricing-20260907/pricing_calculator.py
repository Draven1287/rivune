#!/usr/bin/env python3
"""Reproduce Rivune pricing scenarios without network, provider, or billing calls."""

from __future__ import annotations

import argparse
import csv
from decimal import Decimal, InvalidOperation, ROUND_CEILING
from pathlib import Path

MILLION = Decimal("1000000")
STRIPE_CARD_PERCENT = Decimal("0.029")
STRIPE_BILLING_PERCENT = Decimal("0.007")
STRIPE_FIXED_USD = Decimal("0.30")
WALLET_TOPUP_USD = Decimal("10.00")
SUPABASE_PRO_USD = Decimal("25.00")
SUPABASE_STORAGE_QUOTA_GB = Decimal("100")
SUPABASE_EGRESS_QUOTA_GB = Decimal("250")
SUPABASE_STORAGE_OVERAGE_PER_GB = Decimal("0.0213")
SUPABASE_UNCACHED_EGRESS_OVERAGE_PER_GB = Decimal("0.09")
HOSTED_RETAIL_MULTIPLIER = Decimal("5")


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows:
        raise ValueError(f"{path.name} must contain at least one data row")
    return rows


def decimal(row: dict[str, str], key: str, *, positive: bool = False) -> Decimal:
    try:
        value = Decimal(row[key])
    except (KeyError, InvalidOperation, TypeError) as error:
        raise ValueError(f"missing or invalid nonnegative assumption: {key}") from error
    if not value.is_finite() or value < 0 or (positive and value == 0):
        qualifier = "positive" if positive else "nonnegative"
        raise ValueError(f"{key} must be finite and {qualifier}")
    return value


def require_rate(rates: dict[str, dict[str, str]], model: str) -> dict[str, str]:
    try:
        return rates[model]
    except KeyError as error:
        raise ValueError(f"missing model-rate assumption: {model}") from error


def token_cost(rate: dict[str, str], input_tokens: Decimal, output_tokens: Decimal) -> Decimal:
    if input_tokens < 0 or output_tokens < 0:
        raise ValueError("token assumptions must be nonnegative")
    return (
        decimal(rate, "input_usd_per_million") * input_tokens
        + decimal(rate, "output_usd_per_million") * output_tokens
    ) / MILLION


def ceil_cents(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_CEILING)


def payment_fee(amount: Decimal, *, include_billing: bool) -> Decimal:
    if not amount.is_finite() or amount < 0:
        raise ValueError("payment amount must be finite and nonnegative")
    rate = STRIPE_CARD_PERCENT + (STRIPE_BILLING_PERCENT if include_billing else Decimal("0"))
    return amount * rate + (STRIPE_FIXED_USD if amount > 0 else Decimal("0"))


def council_call_counts(
    member_count: int,
    *,
    failed_member_attempts: int = 0,
    replacement_lead_attempts: int = 0,
    length_repair_attempts: int = 0,
) -> tuple[int, int]:
    if not 2 <= member_count <= 6:
        raise ValueError("current Council requires two to six members")
    extras = (failed_member_attempts, replacement_lead_attempts, length_repair_attempts)
    if any(not isinstance(value, int) or value < 0 for value in extras):
        raise ValueError("Council attempt counts must be nonnegative integers")
    if length_repair_attempts > 1:
        raise ValueError("current Council permits at most one word-limit repair")
    if replacement_lead_attempts > member_count - 1:
        raise ValueError("replacement lead attempts cannot exceed the remaining Council members")
    success_path_calls = member_count + 1
    return success_path_calls, success_path_calls + sum(extras)


def parse_member_models(profile: dict[str, str]) -> list[str]:
    models = [item.strip() for item in profile.get("member_models", "").split(";") if item.strip()]
    if not 2 <= len(models) <= 6:
        raise ValueError("member_models must contain two to six semicolon-separated models")
    return models


def operating_cost_summary(base: Path, product: str) -> tuple[Decimal, str]:
    known = Decimal("0")
    unmeasured: list[str] = []
    matched = 0
    for row in read_rows(base / "operating_cost_buckets.csv"):
        if row.get("product") != product:
            continue
        matched += 1
        bucket = row.get("cost_bucket", "").strip()
        status = row.get("status", "").strip()
        if not bucket or status not in {"measured", "unmeasured", "not_applicable"}:
            raise ValueError("operating cost buckets need a name and valid status")
        amount = decimal(row, "assumed_usd")
        if status == "measured":
            known += amount
        elif status == "unmeasured":
            unmeasured.append(bucket)
    if matched == 0:
        raise ValueError(f"missing operating cost assumptions for {product}")
    return known, ";".join(unmeasured)


def _attempt_count(load: dict[str, str], key: str) -> int:
    value = decimal(load, key)
    integer = int(value)
    if value != Decimal(integer):
        raise ValueError(f"{key} must be a whole number")
    return integer


def current_council_rows(base: Path) -> list[dict[str, str]]:
    rates = {row["model"]: row for row in read_rows(base / "model_rates.csv")}
    profiles = read_rows(base / "team_profiles.csv")
    loads = read_rows(base / "usage_scenarios.csv")
    wallet_fee_rate = payment_fee(WALLET_TOPUP_USD, include_billing=False) / WALLET_TOPUP_USD
    measured_operations, unmeasured_operations = operating_cost_summary(base, "hosted_council")
    results: list[dict[str, str]] = []

    for profile in profiles:
        member_models = parse_member_models(profile)
        member_rates = [require_rate(rates, model) for model in member_models]
        lead_model = profile.get("lead_model", "")
        replacement_model = profile.get("replacement_lead_model", "")
        lead_rate = require_rate(rates, lead_model)
        replacement_rate = require_rate(rates, replacement_model)
        if lead_model not in member_models or replacement_model not in member_models:
            raise ValueError("lead and replacement lead must be Council members")

        for load in loads:
            prompt = decimal(load, "prompt_input_tokens")
            member_output = decimal(load, "member_billed_output_tokens")
            member_visible = decimal(load, "member_visible_output_tokens")
            lead_input = prompt + Decimal(len(member_models)) * member_visible + decimal(load, "lead_instruction_tokens")
            lead_output = decimal(load, "lead_billed_output_tokens")

            member_costs = [token_cost(rate, prompt, member_output) for rate in member_rates]
            draft_cost = sum(member_costs, Decimal("0"))
            lead_cost = token_cost(lead_rate, lead_input, lead_output)
            failed_members = _attempt_count(load, "failed_member_attempts")
            replacement_leads = _attempt_count(load, "replacement_lead_attempts")
            repairs = _attempt_count(load, "length_repair_attempts")

            failure_allowance = max(member_costs) * failed_members
            replacement_allowance = token_cost(replacement_rate, lead_input, lead_output) * replacement_leads
            repair_input = lead_input + lead_output + decimal(load, "repair_instruction_tokens")
            # The runner repairs the synthesis returned by the currently appointed
            # lead. If a replacement attempt succeeded, that replacement owns repair.
            repair_rate = replacement_rate if replacement_leads else lead_rate
            repair_allowance = token_cost(repair_rate, repair_input, lead_output) * repairs
            provider_cost = draft_cost + lead_cost + failure_allowance + replacement_allowance + repair_allowance
            retail_charge = max(Decimal("0.10"), ceil_cents(provider_cost * HOSTED_RETAIL_MULTIPLIER))
            payment_allocation = retail_charge * wallet_fee_rate
            margin = (retail_charge - provider_cost - payment_allocation - measured_operations) / retail_charge
            success_calls, modeled_attempts = council_call_counts(
                len(member_models),
                failed_member_attempts=failed_members,
                replacement_lead_attempts=replacement_leads,
                length_repair_attempts=repairs,
            )
            results.append({
                "profile": profile["profile"],
                "load": load["load"],
                "workflow_shape": "current_council_n_member_plus_lead",
                "member_count": str(len(member_models)),
                "member_models": ";".join(member_models),
                "lead_model": lead_model,
                "success_path_call_count": str(success_calls),
                "modeled_attempt_count": str(modeled_attempts),
                "lead_input_tokens": str(lead_input),
                "failed_member_allowance_usd": f"{failure_allowance:.6f}",
                "replacement_lead_allowance_usd": f"{replacement_allowance:.6f}",
                "length_repair_allowance_usd": f"{repair_allowance:.6f}",
                "provider_cost_usd": f"{provider_cost:.6f}",
                "suggested_retail_hypothesis_usd": f"{retail_charge:.2f}",
                "wallet_payment_allocation_usd": f"{payment_allocation:.6f}",
                "measured_operating_cost_usd": f"{measured_operations:.6f}",
                "modeled_margin_before_unmeasured_costs_pct": f"{margin * 100:.2f}",
                "unmeasured_cost_buckets": unmeasured_operations,
            })
    return results


def legacy_rows(base: Path) -> list[dict[str, str]]:
    """Keep old Together and five-call research shapes out of current Council pricing."""
    rates = {row["model"]: row for row in read_rows(base / "model_rates.csv")}
    profiles = read_rows(base / "team_profiles.csv")
    loads = read_rows(base / "usage_scenarios.csv")
    results: list[dict[str, str]] = []
    for profile in profiles:
        models = parse_member_models(profile)
        if len(models) != 2:
            continue
        a, b = (require_rate(rates, model) for model in models)
        lead = require_rate(rates, profile["lead_model"])
        for load in loads:
            prompt = decimal(load, "prompt_input_tokens")
            member_output = decimal(load, "member_billed_output_tokens")
            member_visible = decimal(load, "member_visible_output_tokens")
            lead_output = decimal(load, "lead_billed_output_tokens")
            lead_instruction = decimal(load, "lead_instruction_tokens")
            base_drafts = token_cost(a, prompt, member_output) + token_cost(b, prompt, member_output)
            direct_input = prompt + Decimal("2") * member_visible + lead_instruction
            direct_cost = base_drafts + token_cost(lead, direct_input, lead_output)

            review_input = prompt + member_visible + decimal(load, "partner_review_instruction_tokens")
            review_output = decimal(load, "partner_review_billed_output_tokens")
            review_visible = decimal(load, "partner_review_visible_output_tokens")
            review_cost = token_cost(a, review_input, review_output) + token_cost(b, review_input, review_output)
            five_input = prompt + Decimal("2") * member_visible + Decimal("2") * review_visible + lead_instruction
            five_cost = base_drafts + review_cost + token_cost(lead, five_input, lead_output)

            plan_output = decimal(load, "plan_billed_output_tokens")
            plan_visible = decimal(load, "plan_visible_output_tokens")
            plan_review_input = prompt + plan_visible + decimal(load, "plan_review_instruction_tokens")
            plan_review_output = decimal(load, "plan_review_billed_output_tokens")
            plan_review_visible = decimal(load, "plan_review_visible_output_tokens")
            contribution_input = prompt + plan_review_visible
            coordinated_drafts = token_cost(a, contribution_input, member_output) + token_cost(b, contribution_input, member_output)
            coordinated_review_input = contribution_input + member_visible + decimal(load, "partner_review_instruction_tokens")
            coordinated_reviews = token_cost(a, coordinated_review_input, review_output) + token_cost(b, coordinated_review_input, review_output)
            coordinated_lead_input = prompt + plan_review_visible + Decimal("2") * member_visible + Decimal("2") * review_visible + lead_instruction
            coordinated_cost = (
                token_cost(a, prompt, plan_output)
                + token_cost(b, plan_review_input, plan_review_output)
                + coordinated_drafts
                + coordinated_reviews
                + token_cost(lead, coordinated_lead_input, lead_output)
            )
            for shape, count, cost in (
                ("legacy_together_direct_3", 3, direct_cost),
                ("hypothetical_cross_review_5", 5, five_cost),
                ("legacy_together_coordinated_7", 7, coordinated_cost),
            ):
                results.append({
                    "profile": profile["profile"],
                    "load": load["load"],
                    "workflow_shape": shape,
                    "success_path_call_count": str(count),
                    "provider_cost_usd": f"{cost:.6f}",
                    "status": "synthetic legacy/comparison only; not current Council pricing",
                })
    return results


def pooled_overage_per_subscriber(subscribers: Decimal, stored: Decimal, egress: Decimal) -> Decimal:
    if not subscribers.is_finite() or subscribers <= 0:
        raise ValueError("subscribers must be finite and positive")
    if stored < 0 or egress < 0:
        raise ValueError("usage assumptions must be nonnegative")
    storage_overage = max(Decimal("0"), subscribers * stored - SUPABASE_STORAGE_QUOTA_GB) * SUPABASE_STORAGE_OVERAGE_PER_GB
    egress_overage = max(Decimal("0"), subscribers * egress - SUPABASE_EGRESS_QUOTA_GB) * SUPABASE_UNCACHED_EGRESS_OVERAGE_PER_GB
    return (storage_overage + egress_overage) / subscribers


def sync_rows(base: Path) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    measured_operations, unmeasured_operations = operating_cost_summary(base, "rivune_cloud")
    for row in read_rows(base / "sync_scenarios.csv"):
        subscribers = decimal(row, "subscribers", positive=True)
        price = decimal(row, "price_usd", positive=True)
        stored = decimal(row, "stored_gb_per_subscriber")
        egress = decimal(row, "uncached_egress_gb_per_subscriber")
        subscription_fee = payment_fee(price, include_billing=True)
        actual_overage = pooled_overage_per_subscriber(subscribers, stored, egress)
        shadow = stored * SUPABASE_STORAGE_OVERAGE_PER_GB + egress * SUPABASE_UNCACHED_EGRESS_OVERAGE_PER_GB
        fixed = SUPABASE_PRO_USD / subscribers
        cash_margin = (price - subscription_fee - actual_overage - fixed - measured_operations) / price
        shadow_margin = (price - subscription_fee - shadow - fixed - measured_operations) / price
        results.append({
            "load": row["load"],
            "subscribers": str(subscribers),
            "price_hypothesis_usd": f"{price:.2f}",
            "subscription_payment_fee_usd": f"{subscription_fee:.4f}",
            "actual_pooled_overage_usd_per_subscriber": f"{actual_overage:.4f}",
            "full_volume_shadow_usd_per_subscriber": f"{shadow:.4f}",
            "fixed_backend_allocation_usd_per_subscriber": f"{fixed:.4f}",
            "measured_operating_cost_usd_per_subscriber": f"{measured_operations:.4f}",
            "modeled_cash_margin_before_unmeasured_costs_pct": f"{cash_margin * 100:.2f}",
            "modeled_allocated_shadow_margin_before_unmeasured_costs_pct": f"{shadow_margin * 100:.2f}",
            "unmeasured_cost_buckets": unmeasured_operations,
        })
    return results


def fee_rows() -> list[dict[str, str]]:
    rows = []
    for name, include_billing, status in (
        ("cloud_subscription_domestic_card_with_stripe_billing", True, "hypothesis; excludes tax, international, disputes and platform fees"),
        ("wallet_topup_domestic_card_standard_payments", False, "hypothesis; Stripe Billing not assumed for one-off top-up"),
    ):
        fee = payment_fee(WALLET_TOPUP_USD, include_billing=include_billing)
        rows.append({
            "fee_profile": name,
            "transaction_usd": f"{WALLET_TOPUP_USD:.2f}",
            "payment_fee_usd": f"{fee:.2f}",
            "effective_rate_pct": f"{fee / WALLET_TOPUP_USD * 100:.2f}",
            "status": status,
        })
    return rows


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    if not rows:
        raise ValueError(f"no rows generated for {path.name}")
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=Path(__file__).parent)
    args = parser.parse_args()
    write_csv(args.directory / "hosted_results.csv", current_council_rows(args.directory))
    write_csv(args.directory / "legacy_workflow_results.csv", legacy_rows(args.directory))
    write_csv(args.directory / "sync_results.csv", sync_rows(args.directory))
    write_csv(args.directory / "payment_fee_results.csv", fee_rows())
    print("wrote current Council, legacy workflow, sync, and payment fee results")


if __name__ == "__main__":
    main()
