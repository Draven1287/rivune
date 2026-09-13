# Independent Council saved-appointment integrity review

**ACCEPT the bounded two-file validation correction. No remaining P1/P2 findings in this targeted delta.** This accepts structural saved-appointment integrity; it does not establish live Council quality, a new lead strategy, or truthful semantic content of every saved rationale.

## Frozen identity

Verified both accepted 0623 base hashes, both candidate hashes and every artifact hash listed in source-manifest.json. Candidate CouncilRunner.swift is `ddbbe33fdbef6c1768d3214bf3b7d6571956c64eb4a76cd0354bbf194c75df8e`; candidate tests are `d75e5736c103d2534bb8e55fac1731979080eecb2e2aa25fc49c7dcd34b8b96a`; patch is `b25a7274073e81803fedd3c596afc98f9daeda70874b42acd08e6691268583de`. Read the exact two-file patch and surrounding Council execution/retry paths. Owner's mutable staging directory was not the authority for source review.

## Independent synthetic evidence

Executed `independent-evidence/AppointmentProbe.swift`: **nine cases passed**. The probe contains the exact baseline and candidate `validateSavedResults` method bodies, with explicit small synthetic carrier types. Unrelated Team/context validators are stubs, so this is a targeted validator-seam test, not a full coordinator test.

- Original foreign lead appointment passes baseline and is rejected by the candidate.
- Valid configured manager-to-fallback chain is accepted.
- Preserved chain across retry can restart the configured manager after a previous fallback; this matches the current runner retaining prior appointments.
- Empty appointments remain readable for historical/pre-lead records.
- A valid legacy policy chain remains readable.
- Wrong policy, broken replacement chain, failed independent lead and fallback outside a stop policy are rejected.

The supplied native fixture exercises corruption through coordinator restoration and includes the new foreign appointment. Owner reports 324 full native and four focused tests passing; those suites were not independently rerun here. All independent evidence is synthetic; no provider, shared source, UI or installation changes occurred.

## Why the correction is compatible

The validator now requires an appointment's full participant identity to belong to the frozen participant list, its draft to remain successful, its member ID to be eligible under the saved configuration, the expected policy version, bounded/nonempty reason and evidence fields, and a replacement pointer to the preceding appointment. Legacy policy selection remains distinct from configured orchestrator selection.

Inspection of CouncilRunner shows appointments are appended only after successful drafting and input admission. Retry retains successful drafts and previous appointments, then appends new appointments linked to the previous last lead. The validation accommodates that history rather than banning repeated members or requiring every saved chain to be a single run through the fallback list. Empty appointment arrays are intentionally accepted before synthesis and for compatible older records.

Eligibility/replacement-chain validation is not proof that a specific historical fallback decision was optimal or that saved explanation text is factually true. Exact future selection/admission strategy remains the separate workstream identified by root. No unrelated execution or UI changes are included in this candidate.

The native owner may incorporate the exact correction into its isolated integration candidate and run appropriate combined regressions. This review adds no new permission gate and does not itself apply or install the patch.
