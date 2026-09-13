# Rivune website and connected workspace

The public home page includes a separately labelled, prewritten product tour. `/workspace` is a real browser client for the local Rivune Mac app; it does not use demonstration answers.

## Start locally

From `website/`, with the existing dependencies available:

```sh
npm run dev -- --port 3187
```

Open `http://localhost:3187/workspace` in a browser on the same Mac. Port 3187 is included in the native connection’s allowed origins. Other origins must be explicitly configured in the native bridge.

## Connect the Mac app

1. Open the current Rivune Mac build.
2. Open **Browser connection** and enable browser access.
3. Copy its connection code.
4. In `/workspace`, select **Connect your Mac**, paste the complete code, and select **Connect workspace**.

The code contains an ephemeral loopback endpoint and a bearer token. It grants access to local conversations and supported text requests. The browser keeps the token in memory only: reloading or disconnecting clears it. The code is never added to the URL, local storage, session storage, analytics or cookies. Disable browser access in the Mac app to revoke access at the source.

Codex and Claude must be ready in the Mac app before their modes can run. Rivune team mode requires both providers and an explicit checkbox allowing this request and its recent context to be shared with both. Keep the Mac app open.

## Current behavior

- **Home** uses a centered greeting, working composer and three prompt starters. The bordered workspace sidebar searches actual conversation titles and opens existing threads. Its footer opens the conversation library, Mac connection settings and **Replay introduction**.
- First visits show a splash, an honest CLI/API connection choice, a privacy overview and a four-page feature introduction. Only the “introduction seen” preference is saved in local storage. The tour can be skipped or replayed, and does not grant permissions or run providers.
- Real conversations, provider readiness, text requests, cancellation, returned code copying and activity from `/v1/workspace`.
- New requests use one stable request ID. If receipt is uncertain, the browser checks the authoritative snapshot instead of automatically submitting another request.
- Drafts survive conversation selection within the current browser tab. Drafts and connection codes are not saved across reloads.
- The browser receives a limited recent-history window. Older messages and truncated results are identified in the interface; use **Open in Mac app** for the full conversation/result.
- Connection loss shows the last received data as offline and disables request actions. A closed browser is distinct from a stopped run; use Stop to request cancellation.
- Google sign-in, cloud account synchronization and browser API-provider configuration are not connected in this milestone. This local connection needs no cloud account.
- Project editing and development-server control are not browser operations in this milestone. The native project workflow is separate from these text requests.

## Checks

```sh
npm run test:workspace
npm run lint
npx tsc --noEmit
npm run build
```

The contract tests use synthetic responses and do not call a model. Native/browser integration and rendered UI should also be checked against the current Mac build before release.
