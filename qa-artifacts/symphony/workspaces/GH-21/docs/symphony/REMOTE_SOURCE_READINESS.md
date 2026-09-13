# Remote source readiness — GH-21 / S00a

## Inspection boundary and verdict

- Repository: `Draven1287/rivune`, isolated GH-21 clone only.
- Exact inspected commit: `201cb0705d1bf368b6bf416afa17f065f5c5a900`.
- Baseline: clean working tree; 138 tracked files at that commit.
- Requirements: [shared product goal, issue #6](https://github.com/Draven1287/rivune/issues/6), read through the GitHub API for this audit; assigned [issue #21](https://github.com/Draven1287/rivune/issues/21).
- **Not ready for current app implementation.** This revision contains legacy SwiftUI/Xcode source and a static website, but no current React/TypeScript frontend, Rust host, or Tauri bridge. Source-owner reconciliation is the prerequisite for [parent #7](https://github.com/Draven1287/rivune/issues/7). Do not recreate missing source or resume SwiftUI implementation.

These are source-presence findings, not a build, runtime, installation, or release verdict. No other checkout, build cache, profile, private QA evidence, or memory file was accessed. No dependencies were installed, applications launched, build/test suites executed, provider calls made, or website/CI files changed.

## Present entry points

| Area | Paths and observed role | Verification boundary |
| --- | --- | --- |
| Legacy application | `Rivune/RivuneApp.swift` declares `@main`, imports SwiftUI and opens `RootView`; `Rivune/RootView.swift`, `Rivune/WorkspaceView.swift`, `Rivune/RivuneStore.swift` are present | Historical implementation/reference; not the required Tauri shell |
| Apple build | `Rivune.xcodeproj/project.pbxproj`; shared `Rivune Mac.xcscheme` and `Rivune iOS.xcscheme` under `Rivune.xcodeproj/xcshareddata/xcschemes/` | Source and scheme files inspected; no Xcode execution |
| Swift dependencies | `Rivune.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` | JSON parsed: nine pins; project declares Supabase Swift 2.55.1 (`Auth`) and Sparkle 2.9.6 (`Sparkle`). Resolution/download/linking untested |
| Existing bridge/runtime | `Rivune/LocalWorkspaceServer.swift`, `Rivune/RivuneWebWorkspace.swift`, `Rivune/PeerBridge.swift`, `Rivune/TerminalAIService.swift`, `Rivune/APIRuntimeService.swift`, `Rivune/RivuneRunCoordinator.swift`, `Rivune/RivuneCollaborationRunner.swift` | Swift source present. Web workspace includes `/v1/workspace`, `/v1/readiness`, `/v1/runs` handlers; it is not evidence of a current Rust/Tauri command/event contract |
| Legacy tests | Seven Swift files under `RivuneTests/`, including runtime, coordinator, local server, project workspace, startup readiness and Universal API tests | Mac scheme has a test action; execution/results untested |
| Static website | `pages-site/build.py`, `pages-site/test_site.py`, `pages-site/check_publish.py`, HTML/CSS/assets, `pages-site/tour.js`, `pages-site/release.json` | Python/static site; `pages-site/README.md` explicitly describes `/app/` as a sample DOM tour with memory-only drafts, not connected AI execution |
| Source export | `scripts/prepare_open_source.py`, `scripts/open_source_files.txt`, `scripts/test_source_export.py` | Every non-comment allowlisted path exists. Current allowlist is native Swift source, not a future Tauri import manifest |
| Legacy packaging/update utilities | `scripts/package_macos_dmg.sh`, `scripts/prepare_update_feed.py`, `scripts/configure_update_release.py`, `scripts/test_update_signatures.py`, `scripts/validate_bridge_budget.swift` | Present utilities, not Tauri or Windows/Linux packaging proof; not executed |
| Artwork and licensing | `Rivune/Assets.xcassets/`, `pages-site/assets/`, `docs/ARTWORK_PROVENANCE.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `third-party-licenses/` | Source assets/notices exist; packaged identity and visual approval untested |

A small static check of explicit Xcode `<group>` file references found their paths under `Rivune/` or `RivuneTests/`. This limited path check is not a complete Xcode project validator. Swift package pins and file existence do not prove imports compile.

## Missing prerequisites versus untested behavior

The complete tracked tree contains **zero** `package.json`, JavaScript package lockfiles, `Cargo.toml`, `Cargo.lock`, `tauri.conf.json`, `tauri.conf.json5`, or `Tauri.toml` files. It also contains **zero** `.tsx`, `.jsx`, `.ts`, or `.rs` source files. Its only `.js` file is `pages-site/tour.js`. No `.gitmodules` supplies an alternate app-source checkout.

Consequently the following are missing from this revision:

- React entry point, application component tree, frontend package scripts/dependency lock, TypeScript configuration, and Tailwind integration.
- Rust crate/workspace manifest and sources, Tauri configuration/build entry point, native command/event registration, and capability/permission definitions for the current application.
- Current frontend-to-host imports, shared/versioned bridge types, and tests that establish compatibility between that frontend and host.
- Reproducible current-app build/test documentation and Tauri CI entry points for macOS, Windows and Linux.

No frontend imports can be resolved in this clone because the frontend itself is missing. Presence and correctness of source-owner local work are **unverified**, not disproven. Existing Swift and website builds, dependency availability, CI run health, supported provider inference, persistence/retry recovery, rendered UI, packaged icons, signing, installers and updates are **untested by this audit**. Historical receipts and tests mentioned in repository prose do not verify this commit.

## Documentation and existing CI

`README.md`, `CONTRIBUTING.md`, `docs/BUILD_FROM_SOURCE.md`, `docs/ARCHITECTURE.md`, and `docs/MACOS_RELEASE.md` describe the legacy Apple client. Build documentation lists Xcode 27 beta, macOS 26+ deployment, `xcodebuild` Mac build/test and iOS Simulator build commands. These are documented requirements, not toolchain checks performed here. The September 9 product goal supersedes this stack direction.

`docs/BUILD_FROM_SOURCE.md` also lists Node/npm checks for a separately maintained website, but this tree has no corresponding package manifest or `website/` directory. `pages-site/README.md` identifies `pages-site/build.py` as its actual build and refers to external local QA evidence that is absent from this clone and was not accessed. Neither reference supplies current app source.

| Workflow | Triggers and source-defined checks | Limits |
| --- | --- | --- |
| `.github/workflows/ci.yml` — Apple client CI | Push to main and pull requests; `macos-26`; `python3 scripts/test_source_export.py`; `xcodebuild` Mac build/test and iOS Simulator build, signing disabled | Legacy Apple checks only; no React/Rust/Tauri checks; no workflow run inspected or triggered |
| `.github/workflows/rivune-pages.yml` — Rivune project site | Path-filtered push/PR; manual dispatch; Ubuntu runs `python3 -m unittest -v` in `pages-site`, then `pages-site/build.py`; uploads `pages-site/dist` | Static website artifact only. Deployment requires manual publish request on main and matching approval variable/target gate; no dispatch or publication performed |

## Reproducible source-presence check

Run from the clone root with Git and Python 3. It reads the selected committed tree, does not install dependencies or execute project code, and prints all matching paths regardless of nesting. It is an inventory, **not an acceptance test**: future matches must still be inspected and integrated. To reproduce this audit exactly, keep the revision below; to inspect a future import, replace it with that import's full commit SHA.

```sh
python3 - <<'PY'
import subprocess
from pathlib import PurePosixPath

revision = "201cb0705d1bf368b6bf416afa17f065f5c5a900"
commit = subprocess.check_output(
    ["git", "rev-parse", "--verify", revision + "^{commit}"], text=True
).strip()
paths = subprocess.check_output(
    ["git", "ls-tree", "-r", "--name-only", commit], text=True
).splitlines()
groups = {
    "JS manifests": {"package.json"},
    "JS locks": {"package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"},
    "Cargo": {"Cargo.toml", "Cargo.lock"},
    "Tauri config": {"tauri.conf.json", "tauri.conf.json5", "Tauri.toml"},
}
print("commit:", commit, "tracked files:", len(paths))
for label, names in groups.items():
    print(label + ":", [p for p in paths if PurePosixPath(p).name in names])
print("React/TS/Rust source:", [p for p in paths if p.endswith((".tsx", ".jsx", ".ts", ".rs"))])
print("JS source:", [p for p in paths if p.endswith(".js")])
PY
```

Observed: 138 tracked files; all four manifest/config groups empty; React/TS/Rust source empty; JS source `['pages-site/tour.js']`.

## Future app-source import acceptance checklist

All items below are pending. This audit does not authorize import, CI edits, native replacement, paid inference, or release.

- [ ] Source owner supplies an explicitly reviewed handoff with provenance (source revision and file hashes/manifest), ownership, approved destination paths, and a complete feature/limitation ledger. Coordinator reconciles it against this baseline and identifies the single canonical app integration path.
- [ ] Import includes the actual current frontend, Rust host and bridge together, including required assets, tests, package manifests/locks and configuration. Inspect nested manifests, local/path dependencies, workspace membership, frontend imports, TypeScript aliases, Rust modules and referenced files; reject absent files, private absolute paths and dependencies on another local checkout or cache.
- [ ] Record supported Node/package-manager/Rust/Tauri versions, platform system prerequisites and exact clean-checkout build/test commands. Verify Tauri frontend output/dev URL and before-build commands resolve to the imported frontend; identify native entry points and command/event registrations.
- [ ] Inspect bridge/schema versions, cancellation, admission/retry identity and event routing across frontend and host. Record supported Council behavior and incomplete per-member model routing/Swarm honestly; fake-host evidence alone cannot establish integrated native behavior.
- [ ] Review provenance/licenses of code, fonts, icons and galaxy assets; exclude credentials, sessions, private transcripts, raw diagnostics, profiles, caches and generated packages. Validate secret handling later with synthetic values and host-owned OS storage.
- [ ] Review persistence schema, unreadable snapshot behavior and legacy migration plan, preserving conversations/drafts/projects plus backup/rollback. Retain dirty-draft shutdown and private QA forwarding approval holds.
- [ ] Under separately authorized integration scope, run lockfile-based dependency setup, frontend type/build and meaningful tests, Rust/bridge tests and integrated native checks against the exact imported revision. Capture failures and platform gaps; have an independent reviewer verify acceptance before releasing downstream work.
- [ ] Reconcile stale legacy build docs and source-export allowlist deliberately; propose separate reviewed CI changes for the canonical app. Preserve the website and existing CI during this audit; source presence must not automatically enable release workflows.
- [ ] Track rendered owner feedback, actual provider verification, latency measurements, restart/recovery, export, packaged icons, installation, signing/notarization/update/rollback evidence separately per platform. Source-import acceptance is not installer or publication approval.

## Handoff state

GH-21 inventory is ready for review. Parent #7 remains dependent on the source-owner handoff; no downstream task is made ready by this report. The report is a local uncommitted deliverable, accompanied by a concise comment on GH-21; no push or merge is part of this task.
