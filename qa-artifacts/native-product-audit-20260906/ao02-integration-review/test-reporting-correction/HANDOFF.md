# AO-02 integrated source checkpoint

2026-09-06. Root and native owner confirmed disjoint ownership before changes.

Applied only TerminalAIService.swift, new ProviderStatusRecovery.swift, ConnectionSetupSheet.providerRow recovery UI, and new RivuneTests/ProviderStatusRecoveryTests.swift. Shared service/UI matched their reviewed bases exactly before applying small patches; no wholesale Settings replacement. Snapshot copies accompany this handoff. Full patch: full.patch (4 files). No project files edited.

Native owner: register Rivune/ProviderStatusRecovery.swift in app targets and RivuneTests/ProviderStatusRecoveryTests.swift in test target, then build/test. The native XCTest file translates the24 classification/action cases into one test method. It has been syntax-parsed, NOT run as native XCTest. The9 guard cases remain the separately executed exact-source extraction/recording fixture, not native UI proof.

Validation: shared helper compiled with minimal type doubles plus executable fixtures,24/24 passed. tests/check_refresh_guard.rb invoked with shared Rivune/SettingsView.swift extracts its exact action/disabled code;9/9 passed. Receipt results.txt. All4 integrated Swift files parse; scoped git diff --check passes. Patch stat valid. No provider/network/auth/UI/install/full-app-build performed.

Source SHA-256:

```text
43060dcbdf58cd8ff4c17d36f3c96ef49bedd9a75d83c8f1ec562ef10eb194cf Rivune/TerminalAIService.swift
063bb7322539bc9e1bde94293f92729097b3ce70beada54b3ccf5cc4b830e806 Rivune/ProviderStatusRecovery.swift
5ce09bfdf6356ac04f91b8e8ddfde41c24e24e63bc9930dee4a79be306dbd79b Rivune/SettingsView.swift
7bbc9cd4d5d71bce637302b49251af9063cc24211b401a55a4153a6d1da148ee RivuneTests/ProviderStatusRecoveryTests.swift
```

Prior README/UI-NOTES describe conservative protocol assumptions and outstanding rendered recovery work. Native owner owns build/install; independent reviewer owns rendered acceptance. This closes source integration only, not AO-02 overall.

Review correction: removed unconditional PASS printing and manual success counts from the native XCTest translation. All24 assertion scenarios remain, with descriptive action/sanitization messages. Native XCTest results are authoritative; earlier results.txt refers only to the separately run fail-fast standalone fixtures. Frozen test copy and full.patch updated. No test rerun or full build for this reporting-only correction.
