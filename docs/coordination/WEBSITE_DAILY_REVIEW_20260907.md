# Rivune Daily Website Review — 2026-09-07

## Run record

- Started: 2026-09-07 09:01:56 MDT (15:01:56 UTC)
- Ended: 2026-09-07 09:17:55 MDT (15:17:55 UTC)
- Actual active duration: 15 minutes 59 seconds
- Review target: the public Rivune marketing and download website for the native Mac app
- Implementation owner: Codex task `Update Rivune product direction` (`01a06efc-96d4-76d1-a67f-60d63b0fb1e2`)

The run ended before the two-hour target because the bounded scheduled invocation reached a useful stopping point after the public endpoint failed, the isolated current-source preview could not be rendered reliably, and all actionable findings had been sent to the implementation task. No time was spent idling.

## Result

The configured public URL is not publicly accessible. `https://rivune.seventhman.chatgpt.site/` returned HTTP 401 with a `Sign in required` page and a `Continue with ChatGPT` control. This is the highest-priority issue because the current product direction calls for a public website that distributes the native Mac app.

The public GitHub prerelease `v0.2.0-source-preview.4` remains accessible. Its archive resolves successfully and is 11,064,421 bytes. The published checksum file resolves successfully and contains:

```text
c2c816c818aa3150c3f0f47634fa599626f735e1879fc38815d34dec021aadb1  Rivune-0.2-source-preview-4.zip
```

The release is explicitly a source preview. It does not provide the signed and notarized DMG required by the stated distribution direction.

## Findings sent to the implementation task

1. **P0 — Restore public access.** The configured public site returns 401. Verify anonymous access from a signed-out browser after fixing the hosting/access configuration. Publishing or changing authentication was not performed during this review.
2. **P1 — Retire or refresh the stale local preview.** The preview already running at `http://localhost:3187/` shows version 0.1/build 1, a local source ZIP, `API connectors — Planned`, and an `Open workspace` browser CTA. These conflict with the current native Mac plus public download direction and the current website source.
3. **P1 — Fix the stale preview's narrow-mobile overflow.** At an effective 312×675 viewport, the rendered page had a 333 px document width and clipped the `Open workspace` button. The same stale preview did not overflow at effective 614 px and 1152 px widths. Current source contains a mobile navigation rule that may address this, but the current source could not be rendered to verify it.
4. **P1 — Investigate current-source build and preview reliability.** In an isolated snapshot, `npm run build` remained at vinext `transforming...` for more than two minutes and was terminated. The normal isolated dev server started workerd but did not bind the requested port. A temporary snapshot-only Vite configuration reported a local port, but browser navigation timed out, so no current-source rendered acceptance was claimed.
5. **P2 — Add baseline public-site SEO discovery files.** Metadata exists, but the website has no canonical declaration, `robots` route/file, sitemap, or manifest. The `/workspace` route does correctly declare `index: false, follow: false`.
6. **P2 — Optimize the marketing mark and favicon.** `website/public/brand/rivune-orbit-stars.png` is 1,440,161 bytes at 1024×1024, while the marketing page displays it at roughly 28–46 CSS px and also uses it for favicon/apple-icon metadata. Create compact web and favicon variants, then verify visual consistency and layout stability on desktop and mobile. Public transfer size could not be measured because the site returns 401.

## Verification completed

- `npm ci` completed in the isolated snapshot.
- `npm run lint` passed.
- `npm run test:workspace` passed 27 of 27 tests.
- `npm run test:account` passed 20 of 20 tests.
- `npm audit --omit=dev --json` reported zero production dependency vulnerabilities.
- The release archive size and checksum match the values currently referenced by the website source.
- Source inspection confirmed that the current marketing page links to the GitHub source prerelease rather than the stale bundled local ZIP.
- Source inspection confirmed responsive mobile-navigation rules, visible focus styles, an `aria-live` product-demo status, and `aria-pressed` state on demo controls.

## Limits and boundaries

- No shared product source was edited.
- No site was published or deployed.
- No authentication, hosting, account, provider, security, or release configuration was changed.
- No native installer was built, signed, notarized, or uploaded.
- No fixes were verified because the implementation task had not completed a new change during this review.
- The current-source UI was not successfully rendered; responsive observations of the active localhost preview apply only to that stale build.
- The isolated snapshot is `/private/tmp/rivune-daily-web-20260907-0902`. Its Vite configuration was changed only inside that snapshot to isolate preview-tooling behavior.

## Coordination

All concrete requests were sent to the `Update Rivune product direction` task. A follow-up status check showed its latest turn remained interrupted, so there was no implementation output to accept in this run.
