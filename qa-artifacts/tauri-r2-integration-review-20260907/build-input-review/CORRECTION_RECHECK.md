# Output-path correction recheck

Original ancestor-alias P2 closed in isolated helper/fixture scope. Manifest files verified. Independently11 tests pass, including actual helper execution against temporary alias, output-root symlink and post-preflight replacement fixtures with zero redirected source writes. Metadata commands remain stubbed; no app/build/signing.

Helper opens source/output directories, walks output physical ancestry by device/inode and refuses source containment. It repeats validation at final creation, retains the output descriptor through both O_EXCL/O_NOFOLLOW direct-child writes, and passes the still-open evidence descriptor to the bound validator. Evidence descriptor closes only after validator returns; output descriptor closes after report creation. Validator outcome must have zero exit, native-review true, distribution false and exact serialized evidence hash. Evidence is retained on later validation failure. This addresses the reported lexical/immediate-parent bypass and replacement schedule.

No broader release qualification: final accepted inputs and explicit minimum macOS remain absent; unsigned/unsealed bundle failure is retained. This review supplies neither build nor sealing authority, and does not establish native app readiness.
