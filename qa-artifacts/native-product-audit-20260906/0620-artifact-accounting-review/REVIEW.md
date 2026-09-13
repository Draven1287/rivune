# Selected-artifact accounting correction

Bounded source acceptance; no actionable defect found in this Components-only delta. Exact reviewed file and SHA256 are preserved alongside the patch. No UI/build/provider tests performed; native owner retains UI.

The artifact branch avoids the legacy 48KiB percentage and approximate-token calculation entirely. It shows the snapshot file count and explains that the complete encoded request is checked before sending. It does not equate file bytes with tokens or promise an exact provider token quota. No raw-byte total is newly displayed or claimed. Ordinary estimates remain explicitly approximate and unchanged.

Permissions accessibility totals ordinary attachments plus snapshot files. Permission activity, footer no-attachment state, and Remove all selected files now account for either type; removal clears both the ordinary attachment IDs and draftArtifact, using existing store persistence behavior. Snapshot-specific Request context count is the generated snapshot count, while Permissions includes both types. The chip still lists the generated paths; this does not claim ordinary attachments are generated files.

No recipient list is added or changed. Existing selected mode/Team and project recipient disclosure remain the source of recipient information; this delta does not independently prove all recipient rendering states. Project-context approval and reset logic are untouched, as are shared submission, source validation, budgets and actual encoded-size admission. No provider dispatch or write authorization is added.

Native rendered validation should cover artifact only, ordinary attachments plus artifact, and removing all. The isolated fixture cannot demonstrate real send/admission outcomes; those stay tied to deterministic tests. AF02 and unrelated polish remain closed/outside this review.

## Additional project-scope wording check

Root subsequently requested explicit remove-all scope review. The existing label “Remove all selected files” clears attachments and generated snapshot but leaves separately approved project context. Recommend “Remove attachments and generated files” so users do not infer that project sharing was removed. Label-only clarification sent to root/native owner; other accounting source acceptance remains valid. No change to draft text or project consent requested.

## Final label verification

Final shared Components.swift line 2323 now says “Remove attachments and generated files”; scope wording clarification closed. Independently verified all 45 workspace files against final manifest `ff43d6b55a64f594cb4c5c0fd8b15a4a16a2c07794ca41feb1918ed62cbd2e74`, zero mismatches; read final supplied 297/0/0 summary. Artifact-only rendered pass is owner-reported, not repeated here. Mixed attachment/artifact and removal UI remain pending; no installation acceptance.
