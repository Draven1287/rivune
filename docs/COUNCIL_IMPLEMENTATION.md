# Council native implementation — September 6, 2026

Local review build: Rivune 0.2 (2026090614). This is an ad-hoc signed local build, not a public release. Build613 is preserved at /private/tmp/rivune-review-2026090614/Rivune-previous.app. Existing accounts, CLI connections and history were not replaced.

## Implemented

Council uses concurrent, independent text-only CLI sessions with identical frozen task/context/criteria. A separate lead session sees all successful drafts and writes the final. New neutral Codable participant/run/result/appointment/event records preserve provider/adapter/requested-model/effort identities; the CLI transport does not report the resolved model, so it stays unknown. The first native version admits only the existing Codex CLI and Claude Code CLI routes.

Lead policy council-lead-v1 has no calibrated comparative evaluation. It discloses stable run-ID rotation among successful participants as a fallback, not a quality ranking. Eligibility requires successful drafting and complete synthesis input within112KiB. No drafts are truncated to fit. Failed lead attempts and replacement identities are retained. One successful draft is partial, never silently treated as reviewed final. Native Retry retains the original run/turn, frozen context, model/effort and successful drafts, asking only missing participants before synthesis.

Council and Swarm have distinct raw/wire identities. Historical Together remains Together (legacy), with its original trace. New default is Council for fresh preferences. Existing preferences/history are retained. Native run disclosure presents lead/rationale, independent drafts and actual activity. Artifact final answers reuse the exact-answer Preview/file/save viewer. Swarm is disabled in the picker and rejected at execution admission. New modes are not supported through the existing iPhone pairing protocol; requests fail explicitly, never fall back to Together.

## Verification

242/242 native macOS tests passed;0failures,0skips. Result: /private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_19-20-00--0600.xcresult. Recording-transport tests cover identical independent contexts, every draft in lead input, uncertainty instructions, honest lead fallback/replacement, failed-participant retry, exact Codable roundtrip, unknown resolved models, cancellation, journal recovery, legacy history and unavailable Swarm admission.

Universal Release build succeeded. Native inputs and hashes are frozen under /private/tmp/rivune-review-2026090614. Installed executable SHA256:19c6d5dcd5455d29a3e94d69f2fb67f676585ebe4d773f92e377ac586abd74b1. AccountEnabled=false and direct updates are not compiled. Signature verification succeeded.

Live Council acceptance and rendered result inspection are pending. These tests prove implementation behavior, not answer quality or real provider success. Swarm's separate worker foundation is not an enabled app workflow. No new tool capabilities, permissions, public publication, or vendor-native subagents were enabled.

## Live acceptance and rendering follow-up

Three real native Council tasks completed on614 with independent drafts and separate lead synthesis: code review35.3seconds, explanation38.0seconds and constrained decision119.3seconds. Both ChatGPT and Claude led runs. Receipts, original responses, rendered screenshots and quality limitations are in qa-artifacts/council-20260906/REVIEW.md. Workflow execution succeeded; answer quality did not pass every criterion. The decision invented an event date from a frequency and the explanation overstated the necessity of CLI. Generated code passed independent reviewer checks, not Council-executed tests.

Build0.2(2026090615) adds only the Markdown rendering correction to614's native runtime: legacy single-line section guessing no longer splits real Markdown headings/code.243/243tests passed,0failures/skips; result /private/tmp/rivune-draft-tests/Logs/Test/Test-Rivune Mac-2026.09.06_19-35-43--0600.xcresult. Universal Release build and deep strict ad-hoc signature verification passed. Installed executableSHA256:b9b1d9cec6ba41a613252f410d978338f31341c5bb2454fc0a992286d4434ce1. Frozen71native inputs/receipt are under /private/tmp/rivune-review-2026090615.614rollback is in that directory;613rollback remains under the614review directory. No original Council outputs were edited.

The next bounded quality improvement should make the lead audit premises against the frozen original task independently of draft agreement. Require it to retain critical constraints, distinguish supplied facts from assumptions/inferences, avoid treating cadence as an event date or frequency as a deadline, and label unresolved disagreements. Implement general source-grounding and constraint checks, not expected answers for the three recorded prompts. Evaluate on new constrained tasks plus the unchanged originals; preserve every revision and keep workflow success separate from correctness. No superiority or pilot claim is warranted yet.

## Grounding review build616

Installed0.2(2026090616) adds generalleadgrounding/constraintinstructions and optionalreviewPolicyVersion=council-grounding-v2; drafting, leadselection androutebehavior remain unchanged.246/246tests pass; universalRelease andstrictad-hoc signatureverified. Reviewreceipt/sourcefreeze: /private/tmp/rivune-review-2026090616;615rollbackretained. Exactly3newnativeCouncilruns completed against2newfrozencases andtheunchangeddecisionprompt. See qa-artifacts/council-grounding-20260906/REVIEW.md andrun-summary.json. Runtime3/3successful, butnotfullqualityacceptance: future-resourceguarantee remainedunsupported,495wordresponse exceeded250wordlimit, andoriginalquarterlytimingpremisepersisted. Usefuldraftcorrectionsobserved donotestablishreliablegroundingorqualitysuperiority. Originalrecordsunchanged; noextraevalrun/Swarm/cloudscope.

## Local whole-response budget candidate (not installed)

A narrow persisted word-budget contract now checks all final text, including any review note. Under-N is strict, at-most-N inclusive. Original synthesis and one bounded repair output are retained with validation receipts; repeated failure stays partial and cannot silently retry into another repair. Quote/context/ambiguous and unsupported instructions remain unchecked. Word-count compliance is explicitly separate from semantic correctness. The lead is no longer required to append a review note against the requested format.

255/255 native tests passed, including nine new recording-transport tests. Exact scope, parser limitations, result bundle, source hashes and remaining UI/live validation boundaries: `qa-artifacts/council-output-budget-20260906/REVIEW.md`. No new live evaluations or installation; installed build remains616. The earlier grounding evaluation remains0/3 full-quality passes.

Output-budget review revision2 separates measured word compliance from transport/output validity, shares retry eligibility across UI/store/coordinator/runner before any mutation, and labels/counts retained failed drafts correctly. Genuine missing-draft/transport retries work; terminal repair failures instead explain how to edit/start a new request explicitly. Failed draft outputs survive retry.259/259tests pass; see the revision2 section and frozen evidence in `qa-artifacts/council-output-budget-20260906/REVIEW.md`. Still local/uninstalled; no live quality claims.

Build0.2(2026090617) is now locally installed after259tests, universalRelease, strictad-hoc signature verification andfourisolatednativefixture render checks. Success/terminalfailure/retryableprovidererror/legacydisclosures verified; existinghistory semanticallyunchanged andreallegacyCouncilrenderswithoutretroactivechecks. ExecutableSHA256:dbdc31a140cde3de62e003d8e02b0c1f43cd859c3d850bb8b105e30a9d262680.616rollback/sourcefreeze:/private/tmp/rivune-review-2026090617. Evidence:qa-artifacts/council-output-budget-20260906/build-0617. Noadditional liveevaluation orqualityclaim.
