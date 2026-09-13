# Focused expected UI states

This fixture plan verifies only the three copy corrections in `connection-copy.patch`. Rendering these states must perform zero discovery, configuration, authentication, model-discovery, save, or send calls.

## 1. Missing executable

Fixture: supported provider with `installation=missing`.

Expected guidance:

> Install the provider’s command-line app using its official instructions, then choose Find installed providers to look again. Installation and sign-in happen outside Rivune.

The existing **Find installed providers** control is the only in-app next action. No manual executable field, installer action, or sign-in action is introduced.

## 2. Durable saved route

Fixture: guarded configuration returns `state=durable`, then workspace refresh succeeds.

Expected status:

> Default connection saved. Sign-in and a successful response are still unverified. Close Settings and explicitly send a short message when you are ready.

The save occurs exactly once. The current draft remains unchanged. Settings stays open until the user closes it; no focus move, discovery, or send occurs automatically.

## 3. Configured route with no successful response

Fixture: supported, installed provider with verified authentication metadata, available catalog, provider default supported, and `responseTest=notTested`.

Expected guidance:

> No successful response is recorded. Close Settings and explicitly send a short message when you are ready. Sending starts a real provider request; this panel does not run a hidden test.

The helper identifies **Send** as a real request and keeps it user initiated. Rendering the helper performs zero host calls. A click on the existing **Send** control follows the existing admission path; this patch adds no test command, retry, authentication, discovery, or provider behavior.

## Focused checks

1. Apply the patch only when both base hashes in `BASE_HASHES.json` match.
2. Run the existing connection-guidance and provider-setup selected fixtures.
3. Assert each exact string above appears only in its intended state.
4. Assert merely opening Settings produces zero host calls.
5. Assert the durable-save fixture makes one configuration call and zero send calls.
6. Assert closing Settings restores focus through the existing behavior.
7. Verify the three messages wrap without horizontal overflow at 320 px.

Passing these checks establishes accurate guidance for existing capabilities. It does not establish installation, authentication, entitlement, model availability, or a successful live response.
