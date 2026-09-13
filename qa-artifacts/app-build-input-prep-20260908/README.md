# App build input preparation

This directory contains an isolated proposed integration between the accepted R3 executor shape and the accepted macOS artifact metadata validator.

Primary files:

- HANDOFF.md: current inputs, blocking dependency, scope, and next gate.
- mac-artifact-evidence.mjs: collection and validator orchestration.
- safe-artifact-io.py: physical ancestry checks and directory-descriptor-anchored evidence/report creation.
- test-integration.mjs: deterministic integration and failure tests.
- PROPOSED_EXECUTOR.patch: patch against the frozen accepted executor.
- PROPOSED_RECEIPT_FRAGMENT.json: unresolved receipt binding template.
- CONFIG_POLICY_RECEIPT.md and test-config-receipt.mjs: exact 11.0 development-floor change and static consistency checks.
- LS_REQUIRES_CARBON_REVIEW.md: local origin evidence and a held minimal override proposal.
- BASELINE_BINDING.json: exact source and tool hashes used for this preparation.
- VALIDATION.json, CONFIG_POLICY_TEST_OUTPUT.txt, TEST_OUTPUT.txt, and PATH_SAFETY_TEST_OUTPUT.txt: results.
- PATH_SAFETY_CORRECTION.md: stable receipt for the independent P2 correction.
- MANIFEST.sha256: final artifact hashes.
