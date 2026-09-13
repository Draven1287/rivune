# R4 host integration receipt

Status: source-integrated and locally verified; not a release qualification.

Date: 2026-09-08

Canonical source: `qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2`

## Integrated behavior

- The native host owns file selection through `NSOpenPanel`; renderer payloads never contain source paths or file bytes.
- Text attachment admission freezes exact UTF-8 bytes and SHA-256, rejects empty/NUL/invalid/oversize content, and rejects symlinked leaf or parent components.
- Approval and rich-draft persistence are conversation-bound, revision-checked, mutation-idempotent, and limited to four files / 128 KiB total.
- Public snapshots redact attachment locators, bytes, attachment text, and the durable mutation ledger.
- Sending requires the saved prompt and rich-draft revision to match, revalidates the original source identity and digest, and freezes the admitted attachment content into the exact request.
- Retry reuses the original admitted request and never rereads disk or later project context.
- Reopen marks attachment sources unchecked and now fails closed on duplicate conversation/attachment IDs, malformed rich drafts, unbound attachment references, and invalid mutation-ledger bindings.
- Provider input labels every approved context field as untrusted reference text that cannot authorize host actions.
- Shutdown rich-draft receipts are distinct and revision-bound. Lost acknowledgement retry for the recovered token is idempotent; an older recovered token cannot cancel or acknowledge a newer shutdown.

## Source hashes

| File | SHA-256 |
| --- | --- |
| `src-tauri/src/attachments.rs` | `c4742ef3595708cddd4d903fd95daf0fce02436bf56e835a9a5d050729d5140d` |
| `src-tauri/src/host.rs` | `f936623ac272cbf7921ba2a0d8ddbdb102d7c4f2166ab36ce64eee24932b8815` |
| `src-tauri/src/main.rs` | `2c404b63c5f13a4cba2b925d2cfb61beecae357fbb042de7803bbd4252b75198` |
| `src-tauri/src/lib.rs` | `c16fef3d5753bf85d9f02ae94e39bd495dca546d2c85877f8849fab4ee050e02` |
| `src-tauri/Cargo.toml` | `402e6e8c54e2058156d4e7e8d59d3876770d2a76aa562ae28c47d50a3e7c941b` |
| `src-tauri/Cargo.lock` | `265fb445b6724ed2476435dd9c45a4dab46ac063c7ec5f3be5dadab8be3a3513` |
| `src-tauri/examples/wire_fixture.rs` | `5cb77564bbdcae02fa5771423188e28416a98a8e33782c5b3d90d561b66f4c98` |
| `web/app.mjs` | `d138aa3416d0c0f7531ae16069991c8e5a9de0f00b9318e986c0860af171e2d7` |
| `web/styles.css` | `f627a5df6e8cdca30d1ac87f04fe784d746f0760f692635d8cfca37fde0f3d1d` |
| `web/desktop-host.mjs` | `3ef63517456fea2a763c38e88f8005f0932042040bca98069426b7adb6e4c86a` |
| `tests/attachments-bridge.test.mjs` | `c34fa3a6b4616f3b12722ac3137aea41fc54e203bbdf4b2e5d2f01f37dd7c7dc` |
| `tests/attachments-browser.cjs` | `d41473bea5e263ee3cdc36b2e7131f446e4ea6fb346821efdb6f4dc72df2e373` |
| `tests/integrated-browser.cjs` | `3004a6bfe2c6be105c821d2a75ec223350414d9a4e2ff96df08972a8672a8677` |

## Verification

- `rustfmt --check`: pass for all modified Rust source and the wire fixture.
- Sequential Rust suite: 85 library tests passed, 0 failed; 2 binary tests passed, 0 failed; doc tests passed.
- Node unit/wire suite: 19 passed, 0 failed.
- Syntax check: pass.
- Keyboard harness: pass, focus preserved, no errors.
- Attachment browser harness: 46 checks passed.
- Integrated browser harness: 67 checks passed, no errors.
- Rust-to-JS and JS-to-Rust wire fixture: pass.

The first combined browser command referenced the obsolete name `keyboard-browser.cjs` and stopped with `MODULE_NOT_FOUND`. The corrected canonical file `keyboard.test.cjs` passed; this was a verification-command error, not an application failure.

## Independent-review corrections

The first review identified two P2 defects. Both are corrected in the hashes above:

- Unix attachment opening now walks path components with descriptor-relative `openat`, `O_NOFOLLOW`, and a nonblocking leaf open. Deterministic tests prove that a swapped parent is not followed and a FIFO is rejected without blocking.
- A mutation already visible after a post-rename uncertainty remains `uncertain` if a later reconciliation save fails before commit. It keeps the exact mutation identity and revision until the same request becomes durable. The host regression covers `AfterRename -> precommit resync failure -> durable`, and the renderer harness requires three same-identity attempts before newer text is saved.

## Deliberate boundaries

- No app build, launch, install, replacement, DMG creation, signing, notarization, publishing, provider call, or CUA action was performed.
- The frozen accepted R3 app and its receipt were not modified.
- Native visual interaction with `NSOpenPanel` remains unverified in this receipt.
- This receipt does not claim that every narrative R4 contract case has an individually named executable test, only the verified suites above.
- Release metadata/signature blockers remain outside R4 and unresolved for a public installer.
