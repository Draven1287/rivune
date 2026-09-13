# Native phone host integration candidate 2

Candidate 1 is preserved and rejected. This replacement adds captured and revalidated peer principal and connection generation, owner-bound observations and Stop, navigation detachment, durable pending phone Stop recovery, terminal replay on Stop/completion races, and a result digest over the full persisted turn payload.

Verification: focused host tests, regression group, full Mac suite (337 passing, zero failed/skipped), Mac Release, and generic iOS Simulator Release. No live provider call, physical iPhone session, shared-source apply, or installed-app replacement occurred.
