# Exact native-window smoke

Operator: Audit Rivune native app. Central approved this scoped test; runtime binary/source binding is still required before launch.

Use only a frozen Tauri development bundle with an explicit absolute RIVUNE_ISOLATED_PROFILE_DIR pointing at the empty sibling profile directory. Record exact binary hash, source manifest, effective bundle identity and process handle. Do not open or close the installed legacy app. No provider configuration succeeds and no provider is executed.

1. Confirm the actual development window has OS-owned titlebar controls and reviewed in-app content.
2. Read initial no-provider status and disabled Send.
3. Create a conversation through the rendered interface, enter a unique synthetic draft, switch conversations and return.
4. Open Settings via footer and keyboard; confirm modal containment, Escape/focus return and provider-rejection message using a deliberately invalid executable path only.
5. Exercise real window minimize/restore, then quit only the identified development process and reopen the same exact binary/profile.
6. Verify the created conversation and synthetic draft persist after the restart; confirm no provider records or runs exist in the isolated store.
7. Capture rendered state, identity, source/binary manifests and resulting isolated snapshot counts without reading any user history.

These checks prove only the corresponding development-window, IPC and local persistence behavior. They do not establish provider readiness, migration, real Council/Swarm, Review, installation or release acceptance.
