# Frozen team controls and app mount review

Disposition: no blocking defect found in this bounded source review and two independently executed pure Node catalog tests. This is team draft configuration review, not Constellation execution or native UI acceptance.

Snapshot: layout-milestone/team-mount-review-snapshot-v1. All nine TEAM_MOUNT_HASHES.json entries independently verified. app fbe0e30585624eabecc7c224b3c100bf0820761809be68e41de38e436b051316; team-controls 3f5fb435c1b8edc2e4daa0b938db5e425eafea349f8b5810d7a3486da8813770.

Reviewed route generation against actual catalog flags, authNeeded/missing/unsupported/stale/unavailable exclusion, explicit model/default-effort support, preserved stale chosen members, route identity uniqueness, 2–6 bound and explicit lead/reselection after lead removal. No invented model options. Catalog revision mismatch prevents saving retained stale choices.

Reviewed component pending/disabled guards, context epoch reset, rejected callback retention, disposed callback suppression, focus replacement, native radio semantics and custom route-button arrow/Home/End navigation. No browser was launched by this reviewer.

Reviewed app mount generation and conversation guards, close disposal/focus restoration, rich draft selection/team/text/files save wiring, same conversation capture across awaits, shutdown/read-only checks, and capability gating in both Send state and submission handler. Existing rich persistence algorithms were not re-accepted in this narrow review. Choosing a single AI explicitly clears team state via the existing model picker.

Validation: routes-node-only.test.mjs contains the two original pure Node tests with only import location adaptation and browser setup excluded; 2/2 pass. Owner reports six component Chromium cases plus eleven integrated synthetic-transport browser checks with zero errors; those were inspected as evidence, not independently rerun. Native behavior, real provider execution, Council restart/retry, and runtime integration remain separate gates. Our authored Rust acceptance tests still await runtime rerun after the macOS false-program path correction.
