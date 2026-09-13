# Pricing artifacts — 2026-09-07

Synthetic, reproducible planning math only. Nothing in this directory makes a network request, calls a model, provisions infrastructure, or charges a payment method.

Files:

- `model_rates.csv`: direct-provider text-token rates verified from official pages on 2026-09-07.
- `team_profiles.csv`: semicolon-delimited member sets with appointed and replacement lead models; the calculator accepts two to six members.
- `usage_scenarios.csv`: assumed current-Council and legacy-comparison token shapes plus bounded failure, replacement-lead, and repair attempts.
- `sync_scenarios.csv`: assumed $10 sync-plan usage and subscriber counts.
- `operating_cost_buckets.csv`: costs explicitly marked measured, unmeasured, or not applicable; zero never implies that an unmeasured cost is free.
- `pricing_calculator.py`: standard-library-only calculator.
- `hosted_results.csv`: current configurable Council (`N` independent members plus one lead) output.
- `legacy_workflow_results.csv`: separately named legacy Together 3/7-call and hypothetical cross-review 5-call comparisons.
- `sync_results.csv`: generated actual pooled-overage, allocated fixed-cost, and full-volume shadow-cost views.
- `payment_fee_results.csv`: separate Stripe subscription and one-off prepaid-wallet hypotheses.
- `test_pricing_calculator.py`: stage-derivation, arithmetic, fee, quota-boundary, and invalid-assumption checks.
- `verification.txt`: captured local test result.
- `manifest.sha256`: frozen hashes for the corrected recommendation, review, inputs, calculator, tests, and outputs.

The output is a decision aid, not observed usage, approved pricing, a provider-access claim, an encrypted-sync claim, or a profit forecast. Margins are explicitly before unmeasured costs. See [`docs/coordination/PRICING_DECISION_20260907.md`](../../docs/coordination/PRICING_DECISION_20260907.md) for the recommendation and exclusions.
