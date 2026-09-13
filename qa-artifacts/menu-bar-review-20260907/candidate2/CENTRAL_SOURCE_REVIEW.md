# Central menu-bar source review

Disposition: CHANGES REQUESTED for idle readiness copy; native rendering remains pending.

Source reviewed: RivuneMenuBar.swift SHA8407c3ee59df0f924c20597c4e8294607cafbe8d22c2e6cdddd26c17521261e6 (owner-supplied identity; independent complete manifest verification pending). This is an early source finding, not a complete acceptance review or independently run native test suite.

P2: zero active tasks is labeled Ready, and an empty task list renders a green success check with Ready for a conversation regardless of provider readiness. The snapshot has no provider readiness input at all. A first launch with no connected provider therefore receives the same positive headline as a usable connection; engineFooterSummary underneath does not make the top readiness claim true. This conflicts with the required honest zero-provider/setup state.

Minimal correction: label this state Idle / No tasks running with a neutral activity icon and retain the real connection summary, or derive actual readiness from existing supported routes. Do not add a separate provider scanner or configure providers. Cover zero-ready and usable-provider idle copy in focused tests if choosing readiness-specific labels. Preserve candidate1 and prepare a separate small corrected candidate.

Draft merge preserves nonempty existing text and does not dispatch. NSApp.terminate uses the normal delegate, and existing newChat/settings APIs are reused. Actual minimized/closed focus, outside-click/Escape, keyboard, VoiceOver, light/dark and reduced-motion checks are still required on the native owner's identified build. Do not insert this unaccepted candidate into the core build.
