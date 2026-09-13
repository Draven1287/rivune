# Corrected independent pricing review — 2026-09-07

## Correction to the first review

The first review mapped the 3/7-call paths in `RivuneCollaborationRunner` as current Council. That was wrong. `RivuneRunCoordinator.swift:206-213` dispatches `.council` to `CouncilRunner`; `.together` alone uses `RivuneCollaborationRunner` at lines 214-223. The conclusions about the old five-call calculator, cost-basis mixing, payment fees, and missing operating costs remain useful, but the product entry-point mapping is corrected here and in the pricing artifacts.

## Current execution model

Current configurable Council admits **N = 2–6 participants**, runs one concurrent independent answer for each admitted member, then appoints one successful member as lead to synthesize the result. Its normal success path is therefore **N + 1 provider calls**; the default two-member team uses three. Source: `Rivune/CouncilRunner.swift:220-250`, `296-318`, and `338-375`.

The bounded extra attempts are distinct:

- a missing/failed member answer can be retried while completed answers are retained;
- a failed synthesis can appoint an admitted replacement lead in configured order;
- one successful but over-budget synthesis can receive one word-limit repair from that lead.

The older Together runner remains a separate product path. Its direct path is three calls and its coordinated path is seven successful calls with a possible eighth integration fallback. The original five-call cross-review model is hypothetical. All three now live only in `legacy_workflow_results.csv` with explicit names and a “not current Council pricing” status.

## Findings and disposition

### P1 — Five-call economics did not match current Council — corrected

The former calculator hard-coded two drafts, two cross-reviews, and one synthesis. The replacement calculator derives the success path from the admitted member count and prices current Council as N member drafts plus one lead synthesis. It separately models failed-member, replacement-lead, and word-limit-repair attempts. The current two-member low/base provider-cost hypotheses are:

| Profile | Low | Base |
|---|---:|---:|
| Economy | $0.010960 | $0.038560 |
| Balanced | $0.053600 | $0.185600 |
| Frontier | $0.210000 | $0.733000 |

These are synthetic token-shape calculations, not observed telemetry, hosted eligibility, or approved charges. The high row contains six attempts for the two-member case: three success-path calls, one failed member attempt, one replacement-lead attempt, and one repair.

### P1 — Cash, allocated, and shadow sync costs were mixed — corrected

Supabase applies 100 GB storage and 250 GB uncached-egress quotas at the organization level and bills only usage above them. [Supabase storage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size) and [Supabase egress usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

The new sync output separates subscription payment fee, actual pooled overage after quota, full-volume shadow cost, and fixed plan allocation. It publishes two plainly named margins before unmeasured costs:

| Scenario | Actual overage/user | Shadow/user | Cash margin | Allocated-shadow margin |
|---|---:|---:|---:|---:|
| Low | $0.0000 | $0.0503 | 68.40% | 67.90% |
| Base | $0.0000 | $0.4926 | 88.40% | 83.47% |
| High | $2.3398 | $2.4630 | 68.75% | 67.52% |

Neither metric is profit. The separate shadow case is an opportunity-cost stress view, not the predicted Supabase invoice.

### P1 — Operating costs were hidden behind a reserve — corrected structurally, still unmeasured

`operating_cost_buckets.csv` now lists encryption/key management, auth/relay, functions/control-plane compute, monitoring/logging, support/refunds/disputes, tax/platform, orchestration/queueing, concurrency headroom, and abuse controls. Each bucket has an explicit status. Current values are zero with status `unmeasured`; the calculator reports their names in every applicable row and labels margins as before unmeasured costs. Zero is not presented as evidence that these costs are free.

The $10 Cloud hypothesis still needs an awake-Mac relay scenario. That connectivity cost is separate from hosted inference. Mac-off execution remains a separate cloud-execution product and cost model.

### P2 — Subscription and wallet payment assumptions were conflated — corrected

The model now distinguishes:

- $10 Cloud subscription through a domestic card plus Stripe Billing: **$0.66** assumed fee;
- one-off $10 wallet top-up through standard domestic-card Payments without Billing: **$0.59** assumed fee.

Stripe lists 2.9% + $0.30 for domestic cards, 0.7% for Billing volume, and says one-off invoices are excluded from Billing volume. The actual product choice still determines the applicable fee. Taxes, international cards, currency conversion, invoices, disputes, and app-marketplace commissions remain excluded. [Stripe pricing](https://stripe.com/pricing)

### P2 — Pricing and encrypted sync sounded approved — corrected

The decision document is now titled “pricing recommendation.” Its lead states that $10 is a willingness-to-pay hypothesis, encrypted sync must exist and pass acceptance before sale, and nothing authorizes checkout or launch. The 3-of-10 threshold is a bounded pilot-build trigger. Both sync and hosted gates now require measured estimates or explicit conservative reserves for currently unmeasured cost buckets before any fully loaded margin decision.

### P3 — Provider rates and eligibility boundaries remain current

Official list rates were rechecked on September 7: OpenAI Luna $0.20/$1.20, Terra $2/$12, Astra $10/$50; Anthropic Haiku $1/$5, Sonnet $2/$10, Opus $5/$25; Gemini 3.8 Flash $0.75/$3.75 through December 31, 2026 then $1.50/$7.50. [OpenAI models](https://developers.openai.com/api/docs/models/gpt), [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing), and [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/latest-model)

Consumer subscriptions remain separate from API billing/access. Model catalog presence still does not prove that Rivune's eventual hosted organization can call a model. [OpenAI billing](https://help.openai.com/en/articles/9039756) and [Claude subscription/API separation](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console)

## Verification

- `python3 pricing_calculator.py` regenerated four result files.
- `python3 -m unittest -v test_pricing_calculator.py`: **10/10 passed**.
- Tests cover N-member stage derivation, replacement/repair attempt counts, separate legacy shapes, fee profiles, quota boundaries, zero subscribers, negative and missing assumptions, and explicit unmeasured buckets.
- No native source, billing account, provider, infrastructure, deployment, checkout, or public site was changed.

The corrected files are a reproducible recommendation package. They remain synthetic planning evidence and cannot establish demand, encrypted-sync readiness, provider eligibility, or production margin.
