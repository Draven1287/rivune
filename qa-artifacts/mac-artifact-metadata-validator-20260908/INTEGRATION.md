# Proposed packaging integration seam

Keep evidence collection and validation separate.

1. The packaging executor records Info.plist as a structured dictionary plus raw outputs and exit codes from argument-vector invocations of file, vtool -show-build, codesign -d --verbose=4, and strict bundle codesign --verify.
2. It writes one immutable evidence JSON file and hashes it.
3. It invokes this validator with direct argument vectors, never a constructed shell command.
4. Packaging proceeds to native review only when the validator exits 0 and the report's qualified_for_native_review value is true.
5. Distribution gates remain separate and must never consume qualified_for_native_review as release approval.

No canonical executor edit is included here. The integration owner should map current product ID, versions, architecture set, and minimum macOS into the expected object at the point where those values are frozen. Unknown tool results must remain unavailable and blocking; the executor must not substitute empty strings or infer values from filenames.

See fixtures/matched-thin.json for the minimal input shape.
