# Rivune pricing recommendation — 2026-09-07

## Recommendation and first price hypothesis

Keep the local product free. Test **Rivune Cloud at $10/month** as the first paid-product hypothesis, limited to encrypted sync, backup, and device handoff after those capabilities exist and pass acceptance. It must not include hosted model usage. This is a research recommendation, not approved pricing, an encrypted-sync claim, or launch authorization.

Do not provision paid cloud infrastructure or enable checkout yet. First validate that people want cross-device continuity and that restore works. Hosted Council should remain a later, separately metered product funded by a prepaid balance—not an “unlimited AI” subscription.

This extends [CLOUD_AND_PRICING_PLAN.md](../CLOUD_AND_PRICING_PLAN.md), [CLOUD_MODEL_OPTIONS.md](../CLOUD_MODEL_OPTIONS.md), and [LAUNCH_AND_REVENUE_CYCLE.md](../LAUNCH_AND_REVENUE_CYCLE.md); it does not replace their local-first or release-readiness boundaries.

## Offer map

| Offer | Customer gets | Who pays the model bill | Rivune price | Now? |
|---|---|---|---:|---|
| Community | Local conversations, projects, provider discovery, Council over supported local CLIs or BYO API keys | Customer, through the provider relationship they chose | $0 | Yes, once the native release itself is ready |
| Rivune Cloud | Encrypted conversation/settings sync, backup, restore, device handoff | Nobody; model inference is not part of this SKU | $10/month hypothesis | Validate, then build/provision |
| Hosted Council | Rivune-operated independent member answers, appointed-lead synthesis, bounded replacement/repair attempts, and usage controls | Rivune, through eligible provider API organizations | $10 prepaid-balance hypothesis; debit each job at a visible estimate and hard cap | Later, after metering and eligibility gates |

The app should show these as separate entitlements. “Cloud subscriber,” “provider connected,” and “hosted model eligible” are three different states.

## Billing and eligibility boundary

- A ChatGPT subscription does **not** fund OpenAI API usage. OpenAI documents separate ChatGPT and API billing systems. Rivune must never infer API credit from a ChatGPT login.
- A paid Claude plan does **not** include general Claude API/Console access. Claude Code can support a Claude App subscription login, but that local CLI entitlement is not a credential Rivune may reuse for a hosted service.
- A local CLI connection means Rivune invokes a provider tool on the customer’s Mac under that customer’s provider terms and limits. It does not mean Rivune can transfer the session to its server.
- A BYO API connection means the customer supplies an API credential and receives the provider bill. Rivune Cloud subscription revenue still does not pay that bill.
- A hosted connection requires a Rivune-owned, billing-enabled API organization with access to the selected model, plus per-user caps and metering. A model appearing in a catalog is not proof that every API account can call it.

GPT-6 Astra is now in OpenAI’s official API catalog at $10/MTok input and $50/MTok output, but the official catalog also describes staged availability and no free-tier API support. Rivune should discover effective model access at runtime rather than hard-code “available.”

## Verified price snapshot

Checked 2026-09-07. USD list rates; taxes, negotiated discounts, regional differences, tools, caching, batch/flex/fast modes, and non-text modalities are excluded from the calculator.

| Input | Verified current fact | Source |
|---|---|---|
| OpenAI GPT-5.6 Luna | $0.20/MTok input; $1.20/MTok output | [OpenAI model catalog](https://developers.openai.com/api/docs/models/gpt) |
| OpenAI GPT-5.6 Terra | $2/MTok input; $12/MTok output | [OpenAI model catalog](https://developers.openai.com/api/docs/models/gpt) |
| OpenAI GPT-6 Astra | $10/MTok input; $50/MTok output; API free tier not supported on the model page | [OpenAI Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra) |
| Claude Haiku 4.5 | $1/MTok input; $5/MTok output | [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Sonnet 5 | $2/MTok input; $10/MTok output | [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Opus 5 | $5/MTok input; $25/MTok output | [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Gemini 3.8 Flash | Introductory $0.75/MTok input and $3.75/MTok output through 2026-12-31; published standard rate doubles on 2027-01-01 | [Google model announcement](https://ai.google.dev/gemini-api/docs/latest-model) |
| Stripe domestic card | 2.9% + $0.30 per successful transaction | [Stripe pricing](https://stripe.com/pricing) |
| Stripe Billing pay-as-you-go | 0.7% of Billing volume | [Stripe pricing](https://stripe.com/pricing) |
| Supabase Pro | $25/month; 100 GB file storage then $0.0213/GB; 250 GB uncached egress then $0.09/GB | [Supabase pricing](https://supabase.com/pricing) |

Billing separation sources: [OpenAI account/API billing](https://help.openai.com/en/articles/9039756-managing-your-work-in-the-api-platform-with-projects), [Claude subscription/API separation](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console), and [Claude Code authentication options](https://docs.anthropic.com/en/docs/claude-code/getting-started).

## Cloud sync unit economics

Supabase applies included storage and egress quotas to the organization. The calculator now separates actual pooled cash overage after those quotas from a **full-volume shadow cost** at the published overage rates. Fixed backend allocation assumes one $25 Pro organization. Both margins remain before the explicitly unmeasured encryption/key-management, auth/relay, functions/compute, monitoring/logging, support/refund, tax, and platform buckets.

| Scenario | Subscribers | Stored / uncached egress per subscriber | Subscription payment | Actual pooled overage | Full-volume shadow | Fixed allocation | Cash / allocated-shadow margin before unmeasured costs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Low | 10 | 0.25 GB / 0.5 GB | $0.66 | $0.0000 | $0.0503 | $2.5000 | 68.40% / 67.90% |
| Base | 50 | 2 GB / 5 GB | $0.66 | $0.0000 | $0.4926 | $0.5000 | 88.40% / 83.47% |
| High usage | 200 | 10 GB / 25 GB | $0.66 | $2.3398 | $2.4630 | $0.1250 | 68.75% / 67.52% |

At three subscribers, allocating a paid $25 backend would erase almost all margin. Therefore use a no-spend prototype/free allowance for validation and buy production infrastructure only after the trigger below.

## Hosted Council unit economics

Current `.council` execution uses `CouncilRunner`: **N concurrent independent member answers plus one appointed-lead synthesis**, with two to six admitted members. The normal two-member case is three calls. A failed lead can appoint an admitted replacement lead, and one word-limit repair may follow a successful synthesis. The high-load illustration adds one fully billed failed member attempt, one replacement-lead attempt, and one repair, for six total attempts in the two-member scenario.

| Team | Low | Base | High with failed member + replacement lead + repair |
|---|---:|---:|---:|
| Economy: Luna + Haiku; Luna leads | $0.011 cost → $0.10 hypothesis | $0.039 → $0.20 | $0.519 → $2.60 |
| Balanced: Terra + Sonnet; Terra leads | $0.054 cost → $0.27 hypothesis | $0.186 → $0.93 | $1.458 → $7.29 |
| Frontier: Astra + Opus; Astra leads | $0.210 cost → $1.05 hypothesis | $0.733 → $3.67 | $5.125 → $25.63 |

The suggested debit is only a hypothesis: five times modeled provider token cost, rounded up to cents with a $0.10 floor. A one-off $10 domestic-card top-up through standard Stripe Payments is modeled at $0.59, or 5.9%, without assuming Stripe Billing. Non-floor rows therefore show about **74.1% modeled margin before unmeasured costs**. This is not profit or launch pricing: orchestration/queue compute, concurrency headroom, monitoring/logging, support/refunds, abuse controls, taxes/platform fees, provider tools/search, cache variants, non-text content, and fixed engineering remain unmeasured.

The calculator retains `legacy_together_direct_3`, `legacy_together_coordinated_7`, and `hypothetical_cross_review_5` only in `legacy_workflow_results.csv`. Those are comparison shapes and must not be used as current Council pricing.

Never charge the card per small job; Stripe’s fixed $0.30 fee makes microtransactions uneconomic. Show a pre-run estimate and hard maximum debit. Block a run that exceeds the wallet balance instead of silently auto-recharging.

## Assumptions, not facts

- Token shapes are planning inputs, not observed Rivune telemetry. Low/base/high prompt sizes are 2K/10K/50K input tokens per member. Billed outputs include assumed visible and reasoning/thinking tokens.
- The high case assumes a failed attempt can be fully billed. Actual error billing differs by provider and failure stage; this is a named stress assumption.
- The two-member rows illustrate the current default. The calculator derives `N + 1` success-path calls for configurable teams of two to six members; estimates must use the actually admitted team.
- Model quality is not inferred from price. The profile names are cost bands, not a claim that a given pair produces the best answer.
- Supabase is a comparison baseline, not a selected vendor. “Encrypted sync” requires an implemented threat model, key design, deletion/export behavior, and tested restore before sale.
- Gemini is recorded only as a verified option. It is not included in the primary calculation because current Rivune hosted access has not been established.

## First price experiment

Use one honest concept-test offer, not an A/B test with too little traffic. Keep this copy inside research until encrypted sync and restore exist and pass acceptance:

> Rivune Cloud — $10/month. Sync and restore your Rivune workspace across your devices. AI usage is not included; your connected providers remain separately billed.

For the first ten qualified returning users, record: cross-device need, whether they successfully complete a restore test, explicit willingness to pay $10/month, activation, and retention through a second monthly cycle. A landing-page click alone is not paid intent.

## Measurable gates

### Provision paid sync only when all are true

1. At least 10 distinct users return on three or more days within a 14-day window.
2. At least 5 of them request cross-device sync/backup without being prompted.
3. At least 3 explicitly accept the $10/month offer; clicks and “sounds useful” do not count.
4. Export, encrypted backup, restore, deletion, and lost-device tests pass on the exact candidate build.
5. The corrected cash and allocated-shadow scenarios remain at or above 65% before unmeasured costs.
6. Every currently unmeasured Cloud cost bucket has either a measured estimate or an explicit conservative reserve, and a fully loaded pilot scenario still clears the chosen gate.

If fewer than 3 of 10 accept, keep Rivune local-first and interview the non-buyers before building cloud.

### Pilot hosted Council only when all are true

1. At least 30 consented BYO Council runs provide real token and retry distributions.
2. Metered totals reconcile against provider usage records within 2% for seven consecutive days.
3. P90 failure/repair overhead remains below 15% of provider cost.
4. Each offered model succeeds in a capability probe under the actual Rivune-owned API organization; catalog presence is insufficient.
5. At least 5 users explicitly accept a $10 prepaid-balance hypothesis and the conservative P90 run keeps at least 60% modeled margin before unmeasured costs.
6. Per-user monthly caps, no automatic recharge by default, estimate-before-run, and hard stop at zero balance are tested.
7. Orchestration, concurrency, monitoring, support/refund, abuse, and tax/platform buckets have measured estimates or explicit conservative reserves; the fully loaded P90 still clears the chosen gate.

## Reproducibility

Inputs, outputs, and tests are in [`qa-artifacts/pricing-20260907`](../../qa-artifacts/pricing-20260907/README.md). The calculator performs no network request and cannot create a charge.

Run:

```sh
cd qa-artifacts/pricing-20260907
python3 pricing_calculator.py
python3 -m unittest -v test_pricing_calculator.py
```

Current verification: 10/10 arithmetic, workflow-shape, fee, quota-boundary, and invalid-input tests pass. No account, payment, provider request, deployment, or public-site change was made.
