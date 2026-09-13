# Space workspace — web verification

Local implementation in `website/app/workspace`, served through the existing `/private/tmp/rivune-final-ui-web` mirror at `http://localhost:3187/workspace?design=space`.

## Implemented

- Black and silver workspace surfaces, restrained blue reflected light, sparse stars, new approved identity cropped through CSS without editing the raster.
- Arrival animation runs independently of native connection progress. The displayed percentage comes from the authenticated Mac snapshot, never animation elapsed time.
- Unpaired browser shows an em dash and a real pairing action. It cannot claim a ready CLI/API connection.
- After pairing and on replay, `POST /v1/readiness` triggers checks; existing snapshot polling receives their results.
- A live, ready selected CLI or API route enables its corresponding direct mode. Together requires both providers. During checks, sending remains disabled. When the current new-chat mode is unavailable, the first ready direct provider is selected.
- API configuration remains in the Mac app. Browser pairing codes remain memory-only and are never put in URLs or persistent storage.
- No chat or provider generation is sent by startup. The UI describes CLI sign-in and API model-access verification accurately; it does not claim usage limits have been verified.

## Checks

- `npm run test:workspace`: 9/9 tests passed, including new readiness, single-provider fallback, and startup schema validation tests.
- `npm run lint`: passed using the existing mirror dependency runtime.
- `npx tsc --noEmit`: passed using the existing mirror dependency runtime.
- `npm run build`: passed all five vinext build phases.
- Repo-local node_modules has a pre-existing ESLint/Ajv dependency error (`formats is not a function`); identical changed source was checked in the established isolated mirror.

## Rendered browser checks

- At the default 1024 × 576 CSS viewport, the startup dialog fits its 576px height with its pairing action visible.
- At 312 × 675 CSS pixels (390 × 844 requested viewport before existing browser zoom), mode buttons fit within the chat surface with no document horizontal overflow.
- Arrival, workspace, settings, sidebar, and local-pairing dialog inspected through the in-app browser.
- A typed QA draft survived navigating to settings and back. It was cleared by reloading the QA tab after verification.
- Send is disabled while disconnected. CLI and API cards both report that pairing is required.
- Browser console reported no errors.
- Temporary viewport override was reset. Screenshots were inspected inline through the CUA tool; no screenshot files were exported.

## Limits

No real Mac pairing token was entered and no live provider call was made during browser QA. The connected/readiness transitions are covered by contract tests and require the updated native bridge for an end-to-end live session. Logo asset revisions are owned by the parent task and may update after this verification without changing the layout.

## Landscape artwork follow-up

The approved startup artwork was replaced by the parent task with a 1536 × 1024 image. The actual startup now uses a 3:2 frame, with a seamless upper 74% logo/starfield layer and lower 26% lettering layer. The independent scaling transform was removed so the layers align throughout the reveal. Desktop and compact frame widths preserve the prior maximum artwork height; narrow frames are capped by their available container. The bare-R interior asset and all readiness logic are unchanged by this follow-up.

The updated production build passed; raw log: `/private/tmp/rivune-web-space-landscape-build.log`. Source CSS and the existing preview mirror are synchronized. Follow-up rendered QA was unavailable in the child task: both its previously selected browser and a fresh in-app browser request reported that the browser was unavailable. The desktop/narrow rendered checks above apply to the previous square artwork, not this landscape revision; the parent task should complete the new rendered check.
