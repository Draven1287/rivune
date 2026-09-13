# Terminal process input and error cleanup

Separate one-file candidate; not applied or installed. Fixes two reproduced input-failure behaviors in current TerminalProcessJob.

## Reproduction

Exact source-extracted baseline, minimal surrounding value types and a finite local fixture that records its PID, closes stdin and execs /bin/sleep3. With SIGPIPE ignored only in the harness, writing128KiB throws and job returns while its directly owned child remains alive. BaselineProbe exits10, confirming the assertion; fixture cleanup terminates only that recorded process. With default signal handling, BaselineDefaultSignalProbe exits on SIGPIPE (Python returncode-13, shell141). These are fixture observations; no claim that a live provider failure occurred in the user's app.

CandidateProbe uses default signal handling and exits0: the error returns after the directly owned child has stopped. The fixture records its PID before closing input to avoid a marker-writing race; all final probes use the same ordering. Initial scratch candidate probe had a missing PID marker from the fixture ordering, not an application failure.

## Change

Set Darwin F_SETNOSIGPIPE on only the owned stdin write descriptor before launch, allowing FileHandle.write to throw EPIPE instead of changing application-global signal behavior. After successful Process.run, defer owned-process cancellation and waitUntilExit on any early return/error. Existing SIGINT/TERM/KILL escalation remains; output files and request ownership are retained until the direct process exits. Successful output, exit status, timeout, size and cancellation semantics remain intact.

## Validation

Swift6 source-extracted process harness compiles without warnings. Eight executed regression cases cover successful Unicode input, nil-input EOF, stderr/nonzero exit, launch failure, output limit, timeout, cancellation and closed stdin under default signal handling. reproduction-results.json records the three baseline/candidate outcomes; regression-results.log records the eight-case execution. Candidate process class is extracted exactly; minimal provider/error/output types are test stubs. This is not an app build, provider/session adapter, actual model run or rendered native test. It does not prove descendant process-tree termination or new streaming/session behavior.

## Integration

Apply source.patch only after matching baseline hash. Native owner owns shared source/build/install. Preserve phone candidate freeze and merge separately after independent acceptance, then native compile/tests. No UI styling or account/provider settings changed. No credentials, network, user project, real AI process, paid workload or install used.
