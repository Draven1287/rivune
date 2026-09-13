# Rivune build 2026090621 acceptance

## Installed result

- Installed app: `/Applications/Rivune.app`
- Bundle identifier: `com.aaravshah.alloy.mac`
- Marketing version: `0.2`
- Build: `2026090621`
- Executable SHA-256: `bc38e49625bb9f2419d6d1e6c5a9543eaf16b6771570888f1f6e091026118b88`
- Rollback copy: `/private/tmp/rivune-review-2026090621/Rivune-replaced-0620.app`
- `codesign --verify --deep --strict` passed. This local build is ad hoc signed; it is not a notarized public release.

## Final checks

- Mac tests: 297 passed, 0 failed.
- Mac Release build: succeeded and produced `Rivune.app`.
- iOS Simulator build: succeeded and produced `Rivune.app`.
- Installed startup: 24 conversations loaded; both ChatGPT/Codex CLI and Claude/Claude Code CLI showed Signed in.
- Installed Council composer: one Team control; no-preset manager reads `Manager · Automatic` and explains the runtime choice.
- Compact rendered width: 1008 points from the native split-view accessibility value.
- Wide rendered width: 1710 points from the native split-view accessibility value.
- Compact selected-file sequence: generated-file continuation, focused draft, long ordinary filename, three-file count, remove-all, and draft preservation passed without a crash.
- Wide selected-file continuation passed without a crash and retained the draft.
- No new Rivune crash report appeared after installing and opening build 0621.

## Data boundary

- `projects.json`, `workspace-drafts.json`, and `workspace-runs.json` remained byte-for-byte unchanged across installation.
- `conversations.json` and its backup were normalized when the installed app launched. Both decode successfully and contain 24 conversations; rendered startup also exposed all 24 through `Show all 24 conversations`.
- No model request, provider call, account mutation, publish, deployment, or purchase was made for this acceptance run.

## Scope still outside this acceptance

- Public distribution still requires Developer ID signing and notarization, or App Store/TestFlight review.
- Physical iPhone pairing and different-network remote use were not proven here.
- The phone request path needs a separate correctness repair for strict admission, idempotency conflicts, and requested-versus-resolved model provenance before it is presented as production-ready.

