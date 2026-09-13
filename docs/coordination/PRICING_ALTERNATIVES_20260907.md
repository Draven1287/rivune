# Rivune pricing alternatives — independent offer critique

September 7, 2026. This supports the selected direction in [PRICING_PRODUCT_DECISION_20260907.md](PRICING_PRODUCT_DECISION_20260907.md); it is not a competing pricing decision or live offer. No checkout, infrastructure, purchase or public copy changed.

## Recommendation

Support **one free local product, one optional Plus plan at $12/month, and independently purchasable hosted AI usage later**. Keep annual billing unavailable during the first monthly pilot. Consider $120/year only after customers renew and the service's variable costs are understood.

The old $10 sync-only offer monetized an implementation detail. The stronger paid outcome is: *continue your workspace across devices, recover an earlier version, and securely control your available Mac while away*. These must be real, tested capabilities before charging. The Mac must remain awake and reachable for relay-based execution. Hosted execution with the Mac off is a separate service.

Council/Swarm, safe execution, local project files, local export/recovery and same-network phone control should remain part of the free local product when verified. Making ordinary work frustrating to push an upgrade would weaken adoption and trust. Provider usage under a customer's own account remains that customer's provider bill.

## Three alternatives evaluated

These are mutually exclusive packaging hypotheses, not three launch tiers.

| Alternative | Proposed paid benefit | Price hypothesis | Assessment |
|---|---|---:|---|
| Essentials | Sync and versioned backup/restore; local-network phone control stays free. Away-from-home relay remains outside this smaller product. | $8/month; $80/year later | Coherent low-service bundle, but recovery must be excellent to distinguish it from ordinary file sync. Least room for support and service failures; not selected. |
| Continuity pilot | Same intended continuity/recovery/remote-control bundle as Plus, offered as a clearly bounded pilot price rather than permanent cheaper functionality. | $9/month; no annual pilot | Reasonable fallback experiment only if qualified users value the working bundle but reject $12. Do not start a broad permanent discount or grandfather unlimited cloud obligations. Not the selected launch hypothesis. |
| Rivune Plus | Workspace continuity, versioned backup/restore and away-from-home control of an awake, reachable Mac; bounded storage/retention/relay usage. No included AI credits. | **$12/month; $120/year only after validation** | **Selected.** Charges for continuity and recovery, leaves the free core intact, and gives more room to operate a reliable service. |

A lower price is not the main differentiation. Traycer currently lists free BYOA, $10/month Sync with cloud sync/device switching/team collaboration, and $20/$40/$100 credit-bearing tiers. Those are advertised features and prices, not independently measured quality or unit economics. Rivune should not assume its bundle is better simply because it costs more or less. [Traycer pricing](https://traycer.ai/pricing), checked September 7.

## Margin critique and comparable sensitivity

The original calculator explicitly leaves several cloud operating buckets unmeasured. Its high-looking margins must not be read as profit. Root's refined comparison sensibly adds an illustrative $2/user/month reserve; that is a placeholder, not evidence those costs are covered. It needs eventual allocation to support, refunds/disputes, auth/key management, relay/control-plane compute and monitoring, with any separate taxes/channel charges added.

Use the same assumptions as the selected decision to avoid competing spreadsheets: 50 subscribers, $25/month fixed backend allocation, 2GB stored and 5GB uncached egress per subscriber valued at full-volume overage rates ($0.4926), and $2/month extra reserve. Card processing is modeled at 2.9% + $0.30 with an additional 0.7% Stripe Billing fee. These published rates were rechecked; they do not cover every payment method, region, tax product or marketplace. [Stripe pricing](https://stripe.com/pricing). Supabase's $25 starting Pro price and storage/egress rates are only a comparison baseline, not a vendor selection. [Supabase pricing](https://supabase.com/pricing).

| Hypothesis | Monthly remainder after modeled fees, infrastructure and reserve | Remainder / revenue | Annual alternative's monthly-equivalent remainder | Annual remainder / revenue |
|---|---:|---:|---:|---:|
| $8/month; $80/year | $4.4194 | 55.24% | $3.4091 | 51.14% |
| $9/month; $90/year | $5.3834 | 59.82% | $4.2124 | 56.17% |
| **$12/month; $120/year** | **$8.2754** | **68.96%** | **$6.6224** | **66.22%** |

These are synthetic planning remainders, not measured margins or profit. Engineering, acquisition, extra support, taxes and high-usage tails can reduce them. Actual package usage can differ; the table holds costs constant to isolate price. The earlier high-usage scenario already shows why an average-user estimate cannot justify unbounded storage or relay. Count retained versions against the stated storage allowance; define retention and relay limits before sale, then test their real costs and recovery behavior.

Reproduction: monthly remainder = P − (0.036P + 0.30) − 0.50 − 0.4926 − 2. Annual monthly-equivalent remainder = A/12 − (0.036A + 0.30)/12 − 0.50 − 0.4926 − 2. Calculated with Decimal. Inputs are inherited planning assumptions, not observed Rivune telemetry.

## Annual cash is an obligation

The $120 annual hypothesis saves $24 against twelve $12 payments, a 16.67% discount. Fewer fixed payment fees do not offset the whole revenue reduction: the modeled remainder falls from 68.96% monthly to 66.22% annual. After the assumed payment/Billing fees, $120 brings $115.38 cash upfront, but twelve months of service and refund exposure remain. Keep an operating/refund reserve; do not treat the receipt as money available to fund unrelated features. No lifetime cloud plan.

## Hosted AI: separate, transparent and measured

Support the selected later $10 minimum prepaid balance, available to Free and Plus users independently. A dollar balance is easier to understand than proprietary credits. It represents Rivune service purchasing power, not a dollar-for-dollar provider-credit transfer or a fixed number of answers. Show the selected models, estimated debit and maximum debit before a run; require an explicit new decision to exceed that maximum. No automatic refill by default and no included unlimited frontier models.

The previous five-times-token-cost scenario is useful as a sensitivity case only. Set actual task/model prices after measuring provider charges, routing/lead calls, failures/retries, tool charges, queue execution and support. Use a defined contribution target on the complete variable cost, plus payment costs, rather than an arbitrary multiplier on tokens alone. Do not bill Rivune-hosted inference for a run actually supplied through the user's own provider account. Avoid charging a card for every small job.

## Conditions and unknowns

The $12 direction is suitable for a **validation hypothesis now**, not current sales. Before a paid monthly pilot: verify the complete advertised sync/restore/remote-access bundle; define bounded storage/retention/relay terms; measure an ordinary and heavy-use cohort; and show that qualified returning users explicitly accept $12 for that working benefit. A signup or positive comment is weaker evidence than a paid renewal. Keep the initial offer singular rather than dividing a small sample into three price tests.

Remaining unknowns are willingness to pay, retention, storage/version amplification, remote-relay traffic, support time, refunds/disputes, key-recovery costs, sales-channel fees and actual hosted run costs. There is no concrete contradiction in root's selected direction. The next useful work is to validate those unknowns while continuing the app's functional and visual polish—not implement billing for unfinished features.
