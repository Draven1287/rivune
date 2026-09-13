# Saved-result focus boundary closure

Independent rendered check on existing selected http://127.0.0.1:4317/tests/savedResult.html?scenario=saved-result. Only changed focus boundaries checked; prior responsive/literal/copy-isolation acceptance preserved, not rerun.

PASS: partial B open, Shift+Tab from Close focused Select all directly; Tab from there focused Close directly. No BODY boundary in either sampled transition.

PASS with synthetic deferred copy pending: Copying… disabled; Tab from textarea skipped it and focused Select all; Shift+Tab returned to textarea. Reverse Close→Select all and forward Select all→Close wrap both still passed. Disabled-control filtering is observed, not merely inferred from source.

PASS: Escape while pending closed B and restored Inspect saved partial answer. Rejected the pending stub promise with fixture button. Opened completed A and clicked Close; dialog closed and focus restored Inspect saved answer. No real clipboard/provider/native/server action or app edit.

Bounded verdict: close the prior strict-focus-wrap qualification for these tested edges, including pending-copy disabled filtering. No residual defect observed. Actual BFCache lifecycle belongs to the separate state review; this report does not claim that coverage. Rendered behavior matches corrected source logic; no compiled/served JS byte attestation or whole-app acceptance claimed.

End-of-check source SHA256 versus supplied correction manifest:
- `prototypes/ai-native-workspace/tests/savedResult.html`: `8905212cb6d1d6b2294287be5cd535ad8d7c8d3e0d29c6f414482337029769f2`; matches.
- `prototypes/ai-native-workspace/tests/savedResult.fixture.tsx`: `aafc548ccdce6da8c663c6106f3b6e8d13264bde4a839a7d655b3038636d299d`; matches.
- `prototypes/ai-native-workspace/tests/savedResult.fixture.css`: `bb97c01041439213b5114d54d82633a6f89fd4e6cec4c4d1897dd85844a32c4a`; matches.
- `prototypes/ai-native-workspace/src/host/SavedResult.tsx`: `1f929b99d9353d5b7f9991b2b1a1cad9eb2d4a75b4354cb505dfa82d5c164ce5`; matches.
- `prototypes/ai-native-workspace/src/host/SavedResult.css`: `9f442dc0a113bc35864064731aecde968ef8c65e66e631846e3906ab279a7acc`; matches.
- `prototypes/ai-native-workspace/src/host/savedResultCopy.ts`: `5dae7824119a9248236c5448b29f3817217179539ef2a2c70a2533adc6655f0a`; matches.
- `prototypes/ai-native-workspace/src/styles.css`: `d4f550a06c734f66fa0667f7da3ccfeda0f9a5a444e897ff3c3c0f534e31363c`; matches.
