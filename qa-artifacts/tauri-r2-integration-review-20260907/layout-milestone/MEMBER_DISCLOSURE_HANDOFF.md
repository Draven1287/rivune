# Member answer disclosure — renderer mechanics

Consumes run.memberResults/run.resolution using runtime-agreed narrow mapper DTO.6rows,24KiB per answer,96KiB aggregate; no Decide/privatecheckpoint/arguments. Member card bodies use textContent. Lead synthesis card shows only actual factual summary, not fabricated critique. Final RunRecord.answer stays primary.

Collapsed below transcript, keyboard summary, state retained during update; switching runs closes old disclosure. Invalid projection clears only its cards, retains final answer/draft. Truncated and empty-omitted bodies have explicit notices.

20 parser/model tests passed. CONSTELLATION_UI_CHECKS15pass includes4 explicitly synthetic projection UI checks: collapseddefault,textsafe,truncation,final/draftpreservation and invaliddata recovery. Remaining11use normalized host Councilfixture for run/retry/capability. No productfixtures. Actual generatedhostprojection fixture still required before projection acceptance. No native/provider/build calls.
