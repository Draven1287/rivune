# Build 2026090620 local review

Final source manifest: `final-source-manifest.json`. Mac test result: 297 passed, zero failed or skipped. Release and iOS Simulator compilation passed. Staged release is locally ad-hoc signed; this is not a public signed/notarized distribution.

Prior rendered checks passed: explicit complete-file selection without sending, draft preservation through Settings and conversation switches, selection removal preserving draft, CmdN immediate typing and append, attached team-sheet focus, fallback priority reorder and save/reopen.

Final accounting correction replaces the legacy percentage meter for selected generated files with a complete-file count and pre-send encoded-size-check explanation. Permissions and footer include selected files. Removal explicitly names attachments and generated files, leaving separate project consent unchanged. Artifact-only and mixed (two generated files plus one ordinary attachment) final rendered states passed. Removal clears both selected-file types and preserves the exact typed draft. Project consent is untouched by the action; this was source-reviewed, not a separate rendered project-consent test.

Build 2026090620 is installed and reopened normally, with 24 conversations and both existing CLI sign-ins restored. Canonical conversations, projects, drafts, run history, and every exported preferences value remain unchanged. The recovery backup changed one legacy sharedPlan phrase from “two direct responses” to “direct responses”; original backup is preserved in the private pre-update backup. See history-verification.json.

Preview model dispatch is disabled. Recorded tests establish complete selected-context transmission and oversized request rejection; preview UI is not evidence of a live provider request.
