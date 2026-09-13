# Rivune Tauri first-launch acceptance package

This package tests the exact `candidate4-runtime-r2` renderer against eight synthetic first-launch and recovery states. It does not edit or launch Rivune, import user data, invoke a real Tauri window, or call a provider. Every screenshot carries a visible synthetic-fixture banner.

Run:

```sh
node run_acceptance.cjs
```

Exit `0` means every current acceptance expectation passed. Exit `2` means the candidate is blocked and `evidence/RESULTS.json` contains the failed checks. The renderer and Rust source hashes in `SOURCE_BINDING.json` prevent silently testing a newer candidate.

`wire_probe/` exercises the candidate's exact serde field-name contract independently because the current full host source does not compile. Its output is `evidence/rust-wire-fixture.json`; all scenario envelopes are derived from that Rust-produced shape. This proves serialization shape only. It does not prove Tauri IPC.

The final acceptance gate in `ACCEPTANCE.md` must run inside an actually launched Tauri window. Browser fixtures cannot establish that the packaged CSP permits IPC or that `get_snapshot`, `configure_provider`, `create_conversation`, and `save_draft` cross the real bridge.

