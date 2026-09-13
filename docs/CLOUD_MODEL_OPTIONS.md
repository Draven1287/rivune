# Cloud model options and Council inference costs

Research checked September 6, 2026 against the linked official pages. **Planning only:** no API requests, accounts, payments, deployment, cloud configuration or model-access tests. This supports the root-owned `CLOUD_AND_PRICING_PLAN.md`; these are internal model configurations, not announced subscription plans. The API routes below are candidates, not a statement that Rivune already supports them.

## Starting hypothesis

Evaluate the middle configuration first once the local product is dependable. A cheaper final reviewer should earn its place by passing the same blinded tasks; consolidation can introduce factual errors. Higher provider prices do not establish higher Rivune quality. Offer users explicit team/manager choices and spending bounds rather than silently promoting to a more expensive model.

| Internal tier hypothesis | Independent members | Orchestrator | Proposed experiment |
| --- | --- | --- | --- |
| Economy | Gemini 3.1 Flash-Lite + Claude Haiku 4.5 | Haiku 4.5 | Routine short writing and formatting; verify that low-cost review preserves facts |
| Everyday | Gemini 3.8 Flash + Claude Sonnet 5 | Sonnet 5 | First mixed-provider candidate for ordinary decisions and planning |
| Deeper review | Gemini 3.1 Pro Preview + Claude Opus 5 | Opus 5 | Harder reasoning/artifacts; preview lifecycle risk and extra spend must be justified |

These are price/quality **hypotheses**, not benchmark findings. Two independent drafts plus a separate synthesis are assumed. The orchestrator also produces its independent draft before seeing its partner's work. Larger teams and a separate cheap consolidator are later controlled experiments.

## Verified rate snapshot

USD per million tokens, standard direct-provider text requests, uncached. Not batch, fast/priority, regional, image, audio, or managed-agent runtime pricing.

| Model | Input | Output |
| --- | ---: | ---: |
| Gemini 3.1 Flash-Lite | $0.25 | $1.50 |
| Gemini 3.8 Flash | $0.75 | $3.75 |
| Gemini 3.1 Pro Preview, input ≤200k | $2.00 | $12.00 |

Gemini 3.8 Flash rates above last through December 31, 2026; the page schedules $1.50/$7.50 from January 1, 2027. Pro Preview over 200k input uses $4/$18. Output pricing includes thinking. [Google API pricing](https://ai.google.dev/gemini-api/docs/pricing)

| Model | Input | Output |
| --- | ---: | ---: |
| Claude Haiku 4.5 | $1.00 | $5.00 |
| Claude Sonnet 5 | $2.00 | $10.00 |
| Claude Opus 5 | $5.00 | $25.00 |

Anthropic explicitly says Sonnet 5's planned September increase was cancelled; $2/$10 is standard pricing. Newer Claude tokenizers can count the same text differently, so per-token prices alone are not same-document cost comparisons. [Anthropic API pricing](https://platform.claude.com/docs/en/about-claude/pricing)

## Full Council examples, not single-call prices

These are synthetic arithmetic assumptions, not measured typical use or guaranteed maximums. Token sizes refer to each model's own tokenizer; using the same illustrative count across providers does not mean the same document tokenizes equally. Billable thinking is included separately from visible text forwarded to synthesis.

| Assumption | Small job | Medium job |
| --- | ---: | ---: |
| Request/context plus drafting instructions, sent to **each** member | 2,000 | 12,000 |
| Visible output from each draft | 600 | 2,000 |
| Thinking billed for each draft | 400 | 2,000 |
| Extra synthesis instructions | 500 | 1,000 |
| Synthesis input: request + both visible drafts + extra instructions | 3,700 | 17,000 |
| Final visible text | 900 | 2,500 |
| Synthesis thinking | 600 | 1,500 |
| Repair input: synthesis input + previous visible final + repair instructions | 4,800 | 19,800 |
| Repair billable output allowance | 1,500 | 4,000 |

Base cost is `draft A input/output + draft B input/output + orchestrator synthesis input/output`, using `(input × input rate + billable output × output rate) / 1,000,000` for **every** call. Hidden thinking is charged in the model's output allowance but is not copied into another provider's prompt. Provider-reported billing, not word estimates, must drive real accounting.

The stress example adds one whole synthesis repair **and** one fully billed unsuccessful draft at the more expensive member rate. This represents an unusable generated answer or a retry with consumed tokens, not a claim that every HTTP failure is charged. It is five calls rather than three. More worker turns, longer thinking/context, further retries or tools exceed this scenario.

| Tier | Small: base / stress | Medium: base / stress |
| --- | ---: | ---: |
| Economy | $0.02020 / $0.03950 | $0.07800 / $0.14980 |
| Everyday | $0.04165 / $0.08025 | $0.16200 / $0.30560 |
| Deeper review | $0.10700 / $0.20350 | $0.41700 / $0.77600 |

Inference only. Hosting, storage, tool/search fees, payment fees, taxes, refunds, support and operational failures are excluded. These figures are not margin or profit. For example, 100 medium Everyday jobs with the stated stress allowance consume $30.56 of inference before those expenses; that workload cannot be promised inside a $10 all-in plan. The previous $10 cloud idea concerned convenience such as sync/backups, not unlimited hosted inference.

The dependency-free Decimal calculator and synthetic inputs are under `qa-artifacts/cloud-cost-plan/`. Run:

```sh
python3 qa-artifacts/cloud-cost-plan/council_cost.py qa-artifacts/cloud-cost-plan/scenarios.json
```

Six outputs were independently checked against the formula. The file preserves the dated rate snapshot, rejects a declared scenario date outside the supplied promotional window and rejects Pro input beyond the supplied rate band. It is not an automatically updated tariff engine or a live cost meter; changing prices/models/context requires a fresh source check. `synthetic-results.json` is explicitly synthetic and records no profit.

## Billing details that change the result

- **Reasoning:** visible answer length is not the whole output bill. Anthropic reports thinking within billed output usage; use supported usage fields and include bounded thinking in admission. A requested reasoning setting is not an exact token forecast. [Thinking documentation](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- **Caching:** for the three Claude candidates, short cache writes cost 1.25× base input, hour-long writes 2×, and reads 0.1×. Hits require eligible matching prefixes and lifetime; independent providers do not share caches. Our examples assume no discounts. [Claude caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- **Google caching/search:** storage and cache reads have their own charges. Google Search grounding can trigger several billable queries from one prompt; listed Gemini 3 search pricing is $14/1,000 after the shared 5,000 monthly allowance. Do not multiply free allowances per Rivune member/user. [Google pricing](https://ai.google.dev/gemini-api/docs/pricing)
- **Anthropic tools:** search is $10/1,000 searches plus token costs. Tool schemas/results increase context, and managed agents also have runtime charges. A text-token quote does not cover a Swarm running commands, browsers or workers. [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- **Failures:** Google documents no token charge for 400/500 failures, but they still consume quota. Do not generalize this to successful-but-wrong answers, disconnected streams, other status codes or other providers. Reconcile actual usage for every attempt; leave unresolved billing unknown. [Google billing](https://ai.google.dev/gemini-api/docs/billing)

## Hosted access and spending controls

Claude consumer subscriptions and Console/API usage are separate products; even a paid chat subscription does not itself supply API usage. Therefore a free Claude account cannot be assumed to fund Rivune's hosted inference. [Anthropic support](https://support.claude.com/en/articles/9876003-i-have-a-paid-claude-subscription-pro-max-team-or-enterprise-plans-why-do-i-have-to-pay-separately-to-use-the-claude-api-and-console)

Google distinguishes personal Google-login CLI quotas, API-key quotas and paid API use. A free Gemini/CLI login is not evidence of a production hosted entitlement or API quota for Rivune users. The Gemini API has its own Cloud billing path, potentially requiring prepayment. Local session availability, API access and hosted integration readiness must be verified separately. These are product/account observations, not a legal conclusion about every possible integration. [CLI quota documentation](https://geminicli.com/docs/resources/quota-and-pricing/), [API billing](https://ai.google.dev/gemini-api/docs/billing)

Google's API free tier has limited model access and different data-use treatment; do not quietly route private production projects through it to subsidize a paid plan. Choosing a free/paid route requires explicit product data-flow decisions. [Google API pricing](https://ai.google.dev/gemini-api/docs/pricing)

Recommended initial commercial boundary: optional cloud platform fee plus a clearly metered inference allowance or separately billed supported BYOK. Do not enable overages without the user's chosen limit. Before each job, reserve a conservative budget for selected members, synthesis and allowed repair; cap calls, input/output/context, concurrency, tool use and worker runtime. Reconcile provider usage afterward. Cancellation and a provider billing dashboard are not substitutes for Rivune admission controls, particularly when several jobs reserve the same balance.

**No unlimited agents pricing:** tasks can recursively create work, repeat long context, search, consume reasoning and require repair. An unbounded flat plan leaves cost unrelated to subscription revenue. First measure completed-task cost and user value under hard limits; the root-owned pricing plan can then set retail allowances with infrastructure, fees and refund policy included.

## Inputs still unresolved

1. Which team wins the frozen everyday-task comparison at acceptable latency; no quality/latency estimates here are observations.
2. Actual model access, stable API IDs and provider adapters, rate limits, billing jurisdiction and production data requirements.
3. Usage distribution: context, thinking, calls, repairs, tools, worker minutes and repeated jobs per user.
4. Who pays inference: supported user-owned API billing or Rivune's hosted account; how allowances, caps and refunds work.
5. Hosting/support/payment costs and willingness to pay. No retail price, monthly job allowance, margin or profitability is validated by this research.
