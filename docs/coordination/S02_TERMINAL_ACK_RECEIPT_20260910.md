# Terminal configuration acknowledgement fault coverage

Frozen candidate `dd9cfedd6130c4704e5addeb28307a12b20c341f`, parent `94fbdcefe9fcad64d3527bf88e4a24acec84ceb6`. One-file test-only delta in the existing native host cfg(test) module; prior production code unchanged. The isolated candidate is clean and all committed blobs match the 125-file manifest. Nine source-stage checks pass.

Focused native test `configuration_recovery_terminal_ack_fault_retry_and_reopen` passed all eight combinations: applied/rejected terminal state, pre-rename AfterSync/post-rename AfterRename acknowledgement failure, and retry in the existing host/reopened host. It verifies no successful acknowledgement receipt on injected failure, exact visible/reopened acknowledgement state, pending reservation fence, no duplicate application, closed/delayed operation rejection, successful acknowledgement retry and durable reopen, unchanged provider/default/conversation data, fresh operation identity after completion, and rejection of the replaced identity. No implementation defect reproduced.

Log: qa-artifacts/s02-terminal-ack-20260910/native.log. Existing shared Cargo target/cache only; no runtime/provider/native app launch. One focused test with eight matrix cases ran; unchanged frontend and broader native tests were not repeated.

Both independent recovery reviews accepted the parent bounded implementation. This addition closes the targeted acknowledgement-write coverage gap without changing behavior. Preserve S02_EXECUTION_DEPENDENCIES_20260910.md: matched-runtime and real-provider verification remain separately authorized dependencies; no installation/publication or whole-build acceptance is claimed. Source is held steady for review of this final test delta.

No private cross-task forwarding was retried.
