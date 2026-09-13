# Remote source-readiness audit for Rivune

This task is READY for one Symphony worker. It is independent of the local app builder: inspect only this issue's isolated clone of Draven1287/rivune. Do not access other local checkouts, build caches, profiles or private QA evidence.

Goal: make the first source handoff reviewable. Inspect the repository tree and build/test documentation. Produce `docs/symphony/REMOTE_SOURCE_READINESS.md` documenting the exact inspected Git commit, present application/build entry points, missing Tauri/React prerequisites, existing CI entry points, and an explicit checklist for accepting a future app-source import. Do not invent or implement the missing app. Do not change website content or CI. This is a concrete source inventory needed by issue #7.

Acceptance:
- Report facts from this clone with paths and commit, distinguishing missing from untested.
- Check relevant manifests/import paths without installing dependencies or launching applications.
- Include a reproducible small source-presence check if useful; never declare the future source already present.
- Read the shared product goal in issue #6 (also embedded in your workflow).
- Write your result locally and post a concise non-sensitive result as a comment on THIS issue through github_api; no git push, merge, deployment or paid provider calls.
- When done, use github_api to add symphony-review and remove symphony-ready from THIS issue. Do not close parent #7 or label any other task ready. This releases the worker slot without repeatedly running this completed audit.

Dependency: none for this remote-only inventory. App implementation remains dependent on the local source-owner handoff.
