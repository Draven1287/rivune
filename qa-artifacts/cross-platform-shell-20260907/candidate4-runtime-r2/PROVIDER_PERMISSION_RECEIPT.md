# Provider permission receipt

Date: 2026-09-07

This is local CLI-help evidence for the exact adapters present during development. It is not a live account, authentication, provider-response, or cross-version acceptance test.

## Installed commands inspected

- `/Users/Aaravshah/.local/bin/codex`: `codex-cli 0.153.4`; SHA-256 `b973d440acac501fd2594a43e7ca9ce41e0a65b9dfb28d0d7a7837c99e1261e3`
- `/Users/Aaravshah/.local/bin/claude`: `2.1.263 (Claude Code)`; SHA-256 `ef5d2909c8af49f31ab6d5487e90316777bc2fac170adfe8160716caa8aaf4f9`

## Help-backed arguments enforced by Rivune

`codex exec --help` documents:

- `--sandbox read-only` selects the read-only sandbox policy.
- `--ephemeral` avoids persisting session files.
- `--ignore-user-config` avoids loading the user's Codex config while retaining auth lookup.
- `--ignore-rules` avoids loading user or project exec-policy rules.
- `--cd <DIR>` defines the working root. Rivune also sets the child process current directory to a newly-created private empty directory.
- `--color never` keeps captured output free of terminal color control sequences.

`claude --help` documents:

- `--restricted` removes command/code-running tools and WebFetch unless explicitly restored, confines file tools to working directories, and refuses bypass mode.
- `--safe-mode` disables local customizations such as project instructions, skills, plugins, hooks, MCP servers, and custom commands.
- `--permission-mode dontAsk` plus `--permission-prompts none` prevents an unattended print request from waiting for or inventing approval.
- `--no-session-persistence` avoids saving a provider session.
- `--no-chrome` disables browser integration.

Rivune passes these flags directly. It never falls back to a weaker invocation if a CLI version rejects them: a non-zero exit becomes a safe configuration/readiness error with raw stderr withheld. Codex read-only still permits sandbox-approved reads and must not be described as “no tools.” Claude receives the strongest inspected restricted/safe-mode/permission flags above, but option presence is not proof of every runtime behavior: the inspected help says restricted mode confines file tools and safe mode disables local customizations while retaining built-in behavior and permissions. The recording fixtures prove Rivune supplies the exact flags and isolated working directory; they do not prove the real CLIs enforce every documented effect on every account or future version. No live provider-behavior test was run.

## Detection and account boundary

Provider discovery does not execute either CLI. It reports only executable presence, with `authentication: unknown` and `tested: false`. Authentication checking and a usage-consuming response test require separate explicit user actions and are not part of this receipt.
