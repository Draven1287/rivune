# Results pane correction — ready for narrow recheck

Closed the Results-list scroll P3 from artifact-identity-cases-20260910/results-integration-review/REVIEW.md. ResultsPane captures its scroll offset before selection and restores it after Back alongside exact row focus with preventScroll. Hidden (visibility:hidden) and detached openers now use the chat heading fallback. The side-by-side cutoff is 1200px in both CSS and matchMedia; replacement keeps chat mounted/inert below that width. At 1201px the mounted test asserts chat width at least480px.

Six correction files, exact before/after hashes and isolated correction.patch are in qa-artifacts/results-pane-correction-20260910/. The prior integration manifest remains the immutable baseline. All13 durable foundation hashes remain unchanged. Typecheck passes; scenario selector tests3/3 pass.

Targeted actual mounted fixture `scenario=results-correction` passes at390x844,1001x844,1201x844:42-row scrolling with exact offset and row restoration, hidden/detached opener fallback, already-ready metadata removal, and unavailable bridge replacement while ready. The last case uses an empty unavailable bridge object; it does not claim a native transport disconnect event. An initial null bridge fixture threw in the existing bridge parser; no foundation change was made to accommodate an unsupported fixture input.

Actual `scenario=results-navigation` passes at390 and1001. At390 the visible Conversations control first closes Results; a rejected open retains the original conversation and visible list, then accepted open navigates. This does not claim Results survives that deliberate mobile pane switch. At1001 the sidebar remains reachable while Results replaces chat, so rejected navigation retains the ready result and accepted navigation closes it. No hidden controls or direct snapshot substitution are used in these navigation cases.

Safe existing-server fixtures:
http://127.0.0.1:4317/tests/hostRenderer.html?scenario=results-correction
http://127.0.0.1:4317/tests/hostRenderer.html?scenario=results-navigation

Only these changed scenarios were rerun, not the broad matrix. Synthetic host only; no actual clipboard/provider/native/export/build/commit/publication actions. Ready for independent narrow recheck; edits stop here.
