# REVIEW-QUICK-DRAFT evidence

## Verified in this isolated artifact

- `node --test tests/review-quick-draft.test.mjs`: 11/11 passing on 2026-09-08.
- `node --check` passed for candidate `web/app.mjs`, `web/core.mjs`, `web/desktop-host.mjs`, and `web/review-quick-draft.mjs`.
- From the candidate4-runtime-r2 root, `git apply --check ../../review-quick-draft-prep-20260908/patches/REVIEW_QUICK_DRAFT.patch` passed.
- Baseline copies match the frozen hashes in `MANIFEST.md`. Shared `host.rs` changed after that freeze; the patch was not silently rebased, but it still passed `git apply --check` against the newer shared file at final verification.

Behavioral tests cover:

1. Existing draft preservation and ordered attachment preservation.
2. Duplicate action delivery without text reset or duplicate save.
3. Target selection only after ordinary draft settlement.
4. Read-only, archived, pending, and otherwise stale target rejection.
5. Lost acknowledgement with byte-identical same-mutation retry.
6. Restart recovery with no automatic save.
7. Profile isolation.
8. Shutdown/recovery freeze.
9. Complete UTF-8 size accounting with no truncation.
10. An unresolved action cannot be replaced by a second action.
11. No model-dispatch surface on the controller.

## Supplied but not executed here

- Rust tests added to the candidate verify stable/restart-safe and profile-isolated recovery scopes, private `0600` scope-file permissions on Unix, and bounded unique Review action IDs.
- Rust formatting/compilation was not run: this shell has no `cargo` or `rustfmt`, and the assignment reserves native build ownership for the integrator.
- No native app was launched or controlled. No rendered UI, menu-bar icon, focus behavior, Escape/backdrop behavior, light/dark appearance, or reduced-motion behavior was visually verified.
- No installer was produced and no source newer than installed build `2026090623` is claimed installed.

## Required integration verification

The native integrator should run formatting and the complete candidate4 Rust/web suite in an isolated worktree, then take a coordinated UI review slot. The rendered acceptance pass must verify one native menu item per activation, main-window focus without always-on-top behavior, modal focus/keyboard order, Escape and outside-click dismissal, retained uncertain text, task status remaining live, light/dark menu-bar visibility, accessible contrast, and reduced motion.
