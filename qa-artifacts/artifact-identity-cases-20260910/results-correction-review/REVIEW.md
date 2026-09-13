# Results correction — narrow source closure

2026-09-10. PASS within source/test-inspection scope. The prior Results-list scroll P3 is closed in the inspected implementation and its explicit regression assertions. No remaining concrete blocker found in this six-file correction. Browser evidence and viewport/focus execution remain owned by the UI reviewer; no browser, build, native or production edits were performed here.

## Identity

All six corrected files match the supplied correction manifest. Each baseline matches this reviewer's prior integration snapshot. All 13 current foundation hashes match the current foundation manifest. Full before/after identity evidence and copied correction files are in hashes.json and snapshot/ beside this report. Earlier integration manifest remains historical; it was not overwritten.

## Source closure

ResultsPane now captures the actual pane scrollTop before row selection. Back retains the exact artifact row identity, focuses it with preventScroll:true in the layout effect, then restores the saved scroll offset. The same pane DOM remains mounted across list/detail. This closes the missing explicit list-scroll preservation mechanism. If the list changes enough to shorten its extent, browser scroll clamping remains natural; no claim of an impossible exact offset is made for a different list.

Close fallback adds computed visibility to its existing connected/rect/inert checks, so visibility:hidden openers do not receive attempted focus. The existing generation ticket, connected flag and reopened-pane check still suppress stale animation-frame restoration; open/detach invalidate tickets. Hidden/detached fallback remains the chat heading. No change to session/read/copy generations was made.

HostWorkspace initializes and updates matchMedia at max-width:1200px; ResultsPane.css uses the identical breakpoint. At <=1200 Chat remains mounted/inert while Results replaces it; above1200 the three-column layout resumes. The new test asserts >=480px Chat above1200. This is source alignment and an inspected assertion, not independent measured geometry or resize testing.

Authoritative tuple reconciliation and pre-render gating remain unchanged from the prior accepted lifecycle source. The new test now reaches ready state before removing selected metadata and checks that the text disappears. It then opens another ready result and replaces the bridge with an unavailable empty object, asserting no Results pane/text remains. This tests component/controller replacement, not a real transport disconnect event or native process failure.

## Actual assertion distinctions

The added correction fixture creates 42 rows, selects row25 after setting a nonzero1700px scroll offset, returns Back, and asserts both exact accessible row identity and exact saved scrollTop. It explicitly tests visibility:hidden and DOM-detached openers, restoring each afterward, and waits for chat-heading focus. No OS clipboard is used by this scenario.

Navigation now uses actual row actions at both widths. Above700px (including1001px replacement mode), rejected open retains ready Results and accepted open closes it. At390px, the visible Conversations action first deliberately closes Results; rejected row navigation retains the old conversation and visible list, then acceptance navigates. This correctly replaces the former narrow direct-snapshot substitution without pretending a deliberately closed pane survives mobile navigation.

Receipt reports correction fixture passes at390/1001/1201 and navigation at390/1001; these are owner-run outcomes. This reviewer inspected the actual assertions and verified source identities only. No unrelated matrix, parser, persistence or packaging review was repeated. Native/provider/release claims remain separate.

## Corrected SHA-256 values

- prototypes/ai-native-workspace/src/host/HostWorkspace.tsx: `6ff5b9f28b0ac58fe01080e7824c7a5b375077b8f1398a929a3959296e80d05f`
- prototypes/ai-native-workspace/src/host/ResultsPane.css: `a97634daa99bab84a66a6e20ad1b99254061ed2497a9b86fa89394aeb10dd8dc`
- prototypes/ai-native-workspace/src/host/ResultsPane.tsx: `d786a666b7a340e6e29db7bbe0865e44c7107c183b3c4e51fc95805d8f92b490`
- prototypes/ai-native-workspace/src/host/useHostResults.ts: `eb140f3d27ebf8cfac5fca8a208f96a50476af6b5c78e3ad9304d540f7e75c5c`
- prototypes/ai-native-workspace/tests/hostRenderer.test.tsx: `50b550d084282bd4776be62efd4284e3f620200671d869f0ae431f4529ef23e9`
- prototypes/ai-native-workspace/tests/rendererScenarios.ts: `6307492ec0e5ba337ef1f4633b5bb281c30c1abb9fdfc3c1d3d727fd972f067a`
