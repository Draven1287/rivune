# Exact source manifest

Reference root at freeze time: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`

The `baseline/` directory is the immutable source freeze used for this work and contains byte-for-byte copies of only the touched files as captured. The shared reference continued changing afterward; its current `host.rs` is therefore not represented by the frozen hash below. The `candidate/` directory contains the proposed replacements plus the new controller. The exact applyable diff is `patches/REVIEW_QUICK_DRAFT.patch`; a fresh `git apply --check` still passed against the changing shared reference at final verification.

## Reference SHA-256

```text
402e6e8c54e2058156d4e7e8d59d3876770d2a76aa562ae28c47d50a3e7c941b  src-tauri/Cargo.toml
265fb445b6724ed2476435dd9c45a4dab46ac063c7ec5f3be5dadab8be3a3513  src-tauri/Cargo.lock
fea858fcfcfb924603cda6961294abcb35fd03dff460f47d46f8467183b0c87b  src-tauri/src/host.rs
2c404b63c5f13a4cba2b925d2cfb61beecae357fbb042de7803bbd4252b75198  src-tauri/src/main.rs
1dd4b5c7cf60c8cc7247ac41db25fa359fe69c0b3d9ecad1b5db7ed49894293a  src-tauri/src/tray.rs
d138aa3416d0c0f7531ae16069991c8e5a9de0f00b9318e986c0860af171e2d7  web/app.mjs
a113801cf2ea240a17adcde92d069b86dafef1d9b1967ce86170be2c8e6835f6  web/core.mjs
3ef63517456fea2a763c38e88f8005f0932042040bca98069426b7adb6e4c86a  web/desktop-host.mjs
f3f6d2769748c4d6727e8ae91975a06fa56a2004f5c42dac88dfaa2c3596a1cd  web/index.html
f627a5df6e8cdca30d1ac87f04fe784d746f0760f692635d8cfca37fde0f3d1d  web/styles.css
```

## Candidate SHA-256

```text
09b571d103b64f320318fdf373232def66469d49aa31c8d93e4c6503b63c59cb  src-tauri/Cargo.toml
d55b18f01897b8bc55c8fe1e4b36407ea3d995bc7cb415e39a2ea74eec159bf2  src-tauri/Cargo.lock
27ba4b7f2e6b72235c75b6363ba3a17b684d5ea908f2e7439e73b3af6b8fb793  src-tauri/src/host.rs
9654cebbe13b780979ff5399622bcb9403ac73fab3530e7acfcbf31b8f02775d  src-tauri/src/main.rs
896c54d33289fe4e3fccb11ce35e9fd550cb57ea74678a1bb51655c5608d87b1  src-tauri/src/tray.rs
3d7dd4c2ce06d130d7e2dae528f31eb586a3080e2bd42d56ed1f3f5a85f51f88  web/app.mjs
5bcf07d9b47a823661e82924614b9c445f1e63aa7c7b766eda76af5828897ec3  web/core.mjs
627db53825c55eb9e8180700b134857acb5dc4bb85f2f169b8db79dab78016f0  web/desktop-host.mjs
915c248f176ba274dacc1334a96a57f9bfdd609f4f8324fc135748028fc39951  web/index.html
9f80ba7882bd4470a41ff061dd65e938f4b3fe582fe5c97554b417ca5cca653f  web/review-quick-draft.mjs
51fb115ccc42a53f0e622638c976f666d4a4442ebe462c3a19740956bc3fe02a  web/styles.css
```

Test and patch hashes before the final documentation pass:

```text
5ce570a18bb8f2ba5d34726f7b4ae40bd9c0f9d4656b88c806fb46c686a44712  tests/review-quick-draft.test.mjs
e86063a4a0bd3d78d0f5770faca5d38d6541afc04e2cb70dd7b5594258107084  patches/REVIEW_QUICK_DRAFT.patch
```

## Apply sequence for the native integrator

1. Confirm the reference hashes above still match the integration worktree. If not, stop and rebase the candidate intentionally.
2. From the candidate4-runtime-r2-compatible project root, run `git apply --check /absolute/path/to/patches/REVIEW_QUICK_DRAFT.patch`.
3. Apply the same patch in the integrator-owned isolated worktree.
4. Run formatter and all existing Rust/web tests plus `node --test /absolute/path/to/tests/review-quick-draft.test.mjs`.
5. Review the additive `uuid` dependency already present in the lock graph and the new private profile file before accepting the host contract.
6. Do not install or replace the app until native/rendered acceptance is separately complete.
