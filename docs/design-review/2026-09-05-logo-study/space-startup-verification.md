# Silver orbit startup preview

Local visual study: `website/public/identity-study/space-startup.html`.

Uses the approved `brand-assets/explorations/rivune-silver-orbit-space.png`, copied into the public study folder. CSS layers display the original artwork unchanged: the stars appear, a dim silhouette becomes visible, a soft mask reveals the silver emblem, and the embedded wordmark follows. The twelve-second timeline drives an explicitly illustrative percentage, not app initialization or provider status.

Controls: replay, pause/resume, keyboard-accessible timeline scrubbing, return to logo studies. The LOADING label and percentage are visible above the timeline as well as beside the artwork. Hidden tabs pause the preview and resume when visible, including a page first loaded in the background. Reduced motion keeps the artwork still while the percentage continues through the full duration.

## Verification

### September 5 timing follow-up

The user's 14-second recording showed the old 6.8-second reveal and a replay. The browser workspace had received the earlier eight-second change, but this separate public study had not. The study, browser workspace, and native startup now share a twelve-second duration. The later [setup handoff follow-up](milky-way-arrival-verification.md#september-5-setup-handoff-follow-up) lets the app reveal reach 100% and then routes to setup or a ready workspace. Provider readiness continues to gate chat submission.

- Measured the real rendered study after Replay: 0% at 0ms, 24% at 3006ms, 49% at 6000ms, 74% at 9001ms, 99% at 11902ms, and 100% at 12403ms. The label remains LOADING until completion.
- Reload started the sequence again at the beginning; the first accessibility snapshot showed 2%.
- Inline JavaScript syntax check, 26 web workspace tests, and web production build passed.
- The 16 native startup/readiness tests passed. Log: `/private/tmp/rivune-twelve-second-native-tests.log`; web build: `/private/tmp/rivune-twelve-second-web-build.log`.
- Updated source and local serving/build mirrors; no publication or normal native launch.

### Original visual inspection

- Inline JavaScript passed `node --check`.
- Visually inspected finished and 50% states at 1024 × 576 CSS pixels; checked pause, resume, and timeline scrubbing.
- Visually inspected at 312 × 675 CSS pixels. Moved counters away from the wordmark after finding an overlap; the final view has no horizontal overflow.
- The original reduced-motion behavior rendered 100% immediately; the timing follow-up above replaces that skip with static artwork and a timed percentage.
- Image readiness and matching counters verified from rendered DOM. The new concept is linked from the identity study.
- The original visual study did not change app code. The timing follow-up updates the native and browser startup duration as well; installed assets are unchanged.
