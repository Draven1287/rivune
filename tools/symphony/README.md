# Symphony connection for Rivune

Status: worker dispatch enabled by explicit user request. PID 46523; dashboard http://127.0.0.1:4320/. At 2026-09-10 01:00:09 UTC, the state API reported one running worker (GH-21), zero retries and zero blocked workers. Its Codex session executed repository inventory commands and read issue #6. This proves execution, not completion of the app.

Official upstream: https://github.com/openai/symphony
Downloaded reference HEAD: e0ccc83720a42a600a53b61c5f8d3e518bebe1db
Executable: ../../.toolchains/symphony-v0.0.2/symphony-v0.0.2-macos_arm64
Verified SHA256: 902fb351aa2a4305887a1d8d10d47977100fe1398676e8d50e5baa3eb20db52c

WORKFLOW.md selects GitHub repository Draven1287/rivune, open/closed states,
180-second polling, one-worker maximum, workspace-write sandbox, and local
dashboard 127.0.0.1:4320. Only issues labeled symphony-ready are dispatched.
GH-21 is the first bounded remote inventory; app implementation remains gated on source import.
GitHub authentication was verified through gh keyring; no token saved here.

Starting requires GITHUB_TOKEN supplied securely from gh auth token in the
service environment and RIVUNE_SYMPHONY_WORKSPACES pointing to isolated storage.
The official executable requires an explicit no-usual-guardrails acknowledgement
flag. Startup approval was received. Worker enablement approval was also received. Preserve source ownership when releasing additional issues.

Before enabling actual workers, choose explicitly scoped issues and reconcile
ownership with RIVUNE APP BUILDER. Existing desktop tasks are not Symphony workers.
Do not run two coordinators against the same implementation assignment.

Compatibility: v0.0.2 defaults to an approval policy using `reject`, which this installed Codex rejects at thread startup. WORKFLOW.md explicitly uses `on-request` with workspace-write sandbox. Symphony does not auto-approve requests in this mode.
