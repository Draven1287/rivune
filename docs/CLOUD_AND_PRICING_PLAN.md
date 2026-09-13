# Rivune cloud and pricing proposal

Prepared September 6, 2026. This is a recommendation to validate, not an announced price, a shipped service, or authorization to purchase hosting or collect payments. Amounts are USD.

## Current decision cycle

The user wants commercial planning to proceed alongside native app verification, and all task questions/decisions routed through the root audit task. Two questions are currently pending: preferred first paid offer (optional sync/backup versus hosted AI versus paid app), and the monthly pre-revenue planning budget. Do not treat the recommended options as selected answers. No spending or payment account activation is authorized by these planning questions.

Prepare a free open-source project information site independently of the signed-installer milestone. GitHub Pages is not the proposed home for a paid SaaS app or checkout: its current limits explicitly exclude sites primarily providing commercial SaaS or facilitating commercial transactions. A later commercial site/service needs appropriate hosting. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), verified September 6.

Three separate launches must remain visible: project-information preview; downloadable, verified Mac beta; usable paid cloud service. The first can precede the other two. Current public source availability does not establish binary or cloud readiness.

## Recommendation

Prove repeat use of the local app first, while testing willingness to pay for a specific cloud benefit now. Do not build a broad cloud platform before learning what users need. Cloud is optional in the same Rivune app; it does not turn Council and Swarm into separate products.

The current priority remains live Council acceptance and real Swarm execution. An account screen, compiled implementation, or recording-transport test is not evidence that a hosted service works or that people will buy it.

## Proposed offer

| Offer | Price to test | Scope |
| --- | --- | --- |
| Rivune Community | Free | Open-source local workspace, projects, Council and Swarm as each passes its release checks. Users supply supported provider access. |
| Optional Rivune Cloud | $10 per month | First candidate: opt-in conversation/project sync and recoverable backups across supported devices. Build only if users actually request this benefit; define storage and retention limits before selling it. |
| Hosted agent execution | Undecided; later | Jobs that continue on Rivune servers while the user's computer is off. Meter AI usage and worker runtime, then establish a price and enforce a spending cap. Not included in the $10 hypothesis. |

The $10 figure is a starting offer for interviews, not measured willingness to pay. Begin with monthly billing if a paid pilot proceeds; defer annual and lifetime promises until costs and retention are known. A cloud account must remain optional for local use, consistent with OPEN_SOURCE_STRATEGY.md. Provider charges are separate from the Rivune service fee.

If users value unattended execution but do not need sync, do not build sync just because it is easier to price. Test a narrowly bounded execution prototype after the local worker contract is proven. Verify supported provider authentication and billing for hosted execution; do not assume a local CLI subscription or free consumer account can fund server-side jobs.

## Evidence before building paid cloud

1. Run the five-person product pilot in DISCOVERY_PLAN.md: aim for four completing a useful task without intervention and three returning within a week. These are proposed targets, not observed results.
2. Interview returning users about their actual last project and the inconvenience they encountered. Ask whether they need sync, recovery, collaboration, or work that continues with their Mac closed.
3. Offer the same concrete benefit and $10 monthly price to relevant users. Record objections and explicit interest in a paid pilot. Do not treat compliments, stars, or a vague “maybe” as purchases.
4. As an initial decision rule, look for roughly ten people returning over two weeks and at least three who want to try paying for the same cloud benefit. This justifies a small prototype, not a broad launch or a claim of product-market fit. Stronger evidence may come from a smaller group with a clear, repeated need.
5. Before taking payment, demonstrate the promised feature, recovery/export, cancellation, and its actual cost. Actual paid retention is stronger evidence than interview intent.

Initial interviews and a manual pilot record need no paid marketing stack. Do not create a checkout or advertise cloud as available merely to test interest.

## Cost model and limits

Monthly contribution = subscription revenue minus payment fees/refunds, storage and transfer, worker compute, provider inference, and support costs. Fixed hosting and other operating expenses still need to be covered. Ten customers at $10 produce $100 monthly gross revenue, not $100 profit.

### Illustrative sync-only economics

For a hypothetical US domestic-card $10 monthly subscription, standard Stripe Payments pricing is 2.9% + $0.30, with an additional 0.7% Billing-volume assumption if that subscription product is used: $0.66 per payment. Verify account country/product rates before checkout implementation. [Stripe Payments](https://stripe.com/pricing), [Stripe Billing](https://stripe.com/billing/pricing), checked September 6. International cards, currency conversion, taxes, refunds and disputes may add costs.

The table assumes $1 per customer/month in variable storage/transfer expense and $25/month in backend hosting. The $1 is an unmeasured planning assumption; $25 references Supabase Pro's current starting price, not a provisioned service or the total production stack cost. No AI inference is included.

| Paying customers | Gross monthly revenue | Remainder after modeled payment, variable and backend costs |
| --- | --- | --- |
| 10 | $100 | $58.40 |
| 50 | $500 | $392.00 |
| 100 | $1,000 | $809.00 |

Calculation: `customers × (10 − 0.66 − 1) − 25`. These are arithmetic scenarios, not forecasts or profit figures; they exclude support labor, other services, taxes, refunds/disputes, marketing and Apple membership. A plan must earn repeat use and willingness to pay before its price is validated.

Hosted Council/Swarm must use separately measured inference and worker costs. A customer subscription to a consumer AI app is not a budget for Rivune-operated servers. [CLOUD_MODEL_OPTIONS.md](CLOUD_MODEL_OPTIONS.md) now contains three hypothetical API teams and six whole-Council cost scenarios with a Decimal calculator. Its middle configuration's illustrative medium job is $0.162 for two drafts plus synthesis, or $0.3056 with one synthesis repair and one fully billed unusable draft. Thus 100 such stress-scenario jobs would consume $30.56 in inference alone; they cannot be included in a $10 all-in plan. These assumptions are not measured typical usage, maximum costs, or quality results. Four synthetic calculator tests passed; no API access or cloud execution occurred.

For a sync-only prototype, avoid provisioning agent workers or a second backend without a demonstrated need. Current reference costs, checked September 6, 2026:

- Supabase offers a free development tier; Pro starts at $25 per month, with the first project included. The free tier can pause after inactivity and does not include automatic backups. These backend backups are not a complete user-facing recovery feature. [Supabase pricing](https://supabase.com/pricing)
- Railway Hobby has a $5 monthly minimum including $5 of resource usage; usage above that costs extra. This is an optional compute reference, not a required purchase or an all-in production budget. [Railway plans](https://docs.railway.com/pricing/plans)
- TypingMind separately offers its interface license, users' provider usage, and optional cloud storage. This demonstrates a possible separation of charges, not demand for Rivune or validation of the proposed $10 price. [TypingMind pricing and FAQ](https://checkout.typingmind.com/buy)

Before pricing hosted Council or Swarm runs, measure real small, medium, and large tasks, including failed attempts and retries. Record inference charges, worker seconds, storage, and transfer. Set maximum runtime, concurrent workers, and spend per job. Do not offer unlimited hosted agents at a fixed low subscription price.

## Immediate work

- Keep native and worker tasks focused on the current acceptance work.
- Keep the website accurate about availability. Do not publish this tentative price or promise cloud features as included in the current app.
- Use this proposal alongside DISCOVERY_PLAN.md when preparing the first pilot; choose the first cloud feature from observed needs.
- Recheck hosting prices and provider access rules before implementing a paid service. No hosting plan, payment account, deployment, or paid tier was activated for this proposal.
