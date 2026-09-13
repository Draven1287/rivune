# Follow-up regression verification

All five actual-module fixture tests pass for captured app.mjs cb5c273c97b23ecd58758274a7bc0dbdef5c2c524c5213393119bbcffe0ed015. The rendered Chromium fixture also retains conversation-button keyboard focus through one ordinary refresh. These results resolve the specific draft/save/admission/focus findings in the two preceding renderer audit folders.

This does not establish Rust/JS wire compatibility or native-app completion. The separate wire-contract audit found a blocking serialization mismatch that these synthetic host fixtures did not cover. No user data, AI provider, or native app was used.
