# S00 candidate notice integration and native source compile

## Exact candidate

Commit `a52cde8f25d0af4fc57ebd42b858510ca69b6797`, Git tree `81a6d46772fab13c82c99e07dad82d39e092602b`, source manifest SHA-256 `d985a8468ee582877711d74705b7dde79135a61ee4a5b8c5bbd1aef488c4e4ec`; **97 allowlisted files**. Four notice input files were added to the previous 93-file candidate at `third-party-notices/rivune-desktop/`: runtime candidates, separate build/tooling text, package/hash inventory, and README with unresolved gaps. Applicable available texts were preserved byte-for-byte; no missing copyright/license text was invented. The full dependency-review folder, cache, collector and private QA reports were not imported. Source/stage/candidate remain byte-matched; candidate working tree clean after generated cleanup.

## Compile evidence

- Fresh `npm run build:desktop` passed in the isolated candidate, including TypeScript checking and Vite output. A temporary symlink reused the previously verified locked npm installation; it was removed afterward. No dependency cache was duplicated and no archived dist was consumed. An initial npm invocation from the wrong directory failed before the correctly scoped build; both logs remain local.
- Native Cargo **build passed** in 18.32 seconds, `dev` profile with `custom-protocol`, `--locked --offline --bin rivune`. It compiled the desktop and both sibling import crates using the existing shared Cargo home/rustup/target. No native binary was executed.
- `TAURI_CONFIG` was explicitly unset. Checked native frontendDist resolves to the candidate's fresh `prototypes/ai-native-workspace/dist-desktop`. Existing native CSP/capabilities remain unchanged, and no QA driver/control entry was injected.
- Binary at `.toolchains/target-candidate4-r2/debug/rivune`, **41069128 bytes**, SHA-256 **`4707442b3e9056566952bb5e3e088080fc8edf3326693d44d1460a5e7e1ca0d0`**. This is a compile artifact, not an installer, signed release or rendered runtime proof. Shared output may be replaced by later builds; rehash before reuse.
- Reproducible stage validator passed for 97 files and 92 static dependency references. Seven reported validator tests passed (six cases plus containing group). Per-file fresh web hashes, notice hashes, exact source/build parameters and generated cleanup list are in `qa-artifacts/s00-native-source-build-20260909/verification.json`.

From the authoritative repository root, the native command used was:

```sh
env -u TAURI_CONFIG CARGO_HOME="$PWD/.toolchains/cargo" RUSTUP_HOME="$PWD/.toolchains/rustup" CARGO_TARGET_DIR="$PWD/.toolchains/target-candidate4-r2" PATH="$PWD/.toolchains/cargo/bin:$PATH" .toolchains/cargo/bin/cargo build --manifest-path tools/symphony/source-import-candidate/qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/Cargo.toml --locked --offline --features custom-protocol --bin rivune
```

Run `npm run build:desktop` first in the candidate frontend with locked dependencies installed. The candidate needs no QA staging override, external native source tree or source recreation to compile locally. Generated schemas and dependency symlink were removed from the isolated candidate; fresh dist remains ignored. No broad workspace index was used.

## Precise remaining gates

**Technical source build:** passed on current macOS arm64 toolchain/cache. Independent reviewer can now verify this exact local commit and repeat its source validator/build without remote source recreation. Minimum Rust/Node and other target-platform builds remain untested; full offline cross-platform cache is incomplete.

**Publication notices:** 17 native runtime notice-material gaps remain explicitly listed in source README/runtime notice file, along with tooling/optional-platform gaps and final shipped-output mapping. Selectors source-availability/license handling and alternative-license choices require review. These are provisional inputs, not complete distribution notices; no automatic bundle integration of incomplete notices was added.

**Resource provenance:** current galaxy/old icons are publication-held fidelity inputs. Selected silver-R asset integration and its exact provenance handoff remain pending. No artwork was approved by this compile.

**Other evidence:** 51 npm lock entries lack integrity fields. Runtime native CSP/asset loading, retry/Dock behavior, signing/installer/install and provider behavior were not exercised. No N5 or dirty-draft shutdown occurred.

**Next-ready assignment:** independently verify candidate `a52cde8` and compile receipt, then resolve the package-specific missing notice inputs and selected-logo handoff; source owner can normalize lock integrity in a separate version-preserving change. Native runtime checks require their own authorized scope. No push, app launch/install, private evidence forwarding or Symphony changes occurred.
