# Independent saved-result rendered acceptance

Used only existing selected fixture http://127.0.0.1:4317/tests/savedResult.html?scenario=saved-result. No servers/native/provider operations or real clipboard writes. Prior connection-refused dependency is resolved.

## Actual observations

-390×844 completed A: initial Close saved result focus; visible Close text aligned and contained (no X glyph). Readable literal HTML/script/code and indentation in textarea. Long lines scroll inside textarea. Dialog client/scroll width343/343px. All4,845 characters selected on stub clipboard denial: selectionStart0, selectionEnd4845, textarea focused; truthful failure status, no success.
-320×568 completed A: no horizontal dialog overflow (client/scroll width262/262px). Dialog vertically scrolls; clicking Select all brought the lower actions into view and selected textarea. Screenshot showed Copy, Select all and failure message reachable without overlapping controls. Close text remained contained. Escape closed and restored Inspect saved answer.
-1440×900 partial B: screenshot showed readable distinct PARTIAL RESULT B, indentation and saved partial answer title; Close aligned and initially focused, footer actions visible. Dialog client/scroll width778/778px. Close worked. C opened with exact Member1 contribution (shortened by host) label and distinct SHORTENED MEMBER C text.
-Deferred stale success: copy A with stub defer, close A, open B, Alt+Shift+R. Pending returned0; B title/text remained, status empty and Close focus unchanged.
-Deferred stale failure: copy B deferred, close B, open C, Alt+Shift+J. Pending returned0; C label retained, status empty and Close focus unchanged. Escape restored exact C opener. Viewport reset at finish.

## Focus containment qualification

Tab from final Select all and Shift+Tab from first Close produced document.activeElement=BODY in this embedded browser; subsequent Tab returned to Close. No background page control was observed focused. This establishes native modal page-control exclusion in the sampled boundary transitions, but NOT a strict in-dialog focus loop. Browser chrome focus cannot be identified from activeElement alone. If strict wrap from last to first and first to last is a product acceptance requirement, this remains a concrete unresolved behavior: implement/verify wrap or explicitly accept native browser boundary behavior. Do not report strict focus-trap acceptance from these checks. No P1/P2 data or rendering defect reproduced.

## Bounded verdict

Accept observed responsive readability, Close/Escape restoration, literal/partial/shortened content, full denial selection and stale-copy isolation in this synthetic current-stylesheet fixture. Focus-loop qualification above remains. This is not native clipboard, installed app, provider or whole-build acceptance. Screenshots inspected inline only; none exported or forwarded. No shared app edits.

## Source boundary

Fixture imports actual component and current global stylesheet per inspected receipt. Rendered labels/content/behavior correspond to that fixture. End-of-review local manifest checks below; served JS byte equivalence was not independently attested and no before/after frozen bundle claim is made.
- `prototypes/ai-native-workspace/tests/savedResult.html`: `8905212cb6d1d6b2294287be5cd535ad8d7c8d3e0d29c6f414482337029769f2`; matches receipt.
- `prototypes/ai-native-workspace/tests/savedResult.fixture.tsx`: `e493f35fdb833a6f53609437a2ded6827ddc73ffe1fdc6af8fd823067eae2962`; matches receipt.
- `prototypes/ai-native-workspace/tests/savedResult.fixture.css`: `bb97c01041439213b5114d54d82633a6f89fd4e6cec4c4d1897dd85844a32c4a`; matches receipt.
- `prototypes/ai-native-workspace/src/host/SavedResult.tsx`: `b0e10166cedc44d55ef6d5ae76e6c5397cc82df945454e67e183982519a430d2`; matches receipt.
- `prototypes/ai-native-workspace/src/host/SavedResult.css`: `9f442dc0a113bc35864064731aecde968ef8c65e66e631846e3906ab279a7acc`; matches receipt.
- `prototypes/ai-native-workspace/src/host/savedResultCopy.ts`: `5dae7824119a9248236c5448b29f3817217179539ef2a2c70a2533adc6655f0a`; matches receipt.
- `prototypes/ai-native-workspace/src/styles.css`: `d4f550a06c734f66fa0667f7da3ccfeda0f9a5a444e897ff3c3c0f534e31363c`; matches receipt.
