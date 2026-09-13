# Central independent composition-v2 review

BOUNDED ACCEPT of the isolated injected-worker/cooperative-filesystem composition. Native and live Swarm remain unavailable.

Verified source SHA bef5c633226fbba4372973b9129db9b5ed1838ad0060f011452b8dd69aaeb6cb, copied accepted dependencies and candidate into a clean disposable tree, and checked dependency/production Swift source equality afterward. Ran all eight supplied tests and two original independent v1 probes adapted to assert corrected behavior. Ten passed, zero failures; final run exit0. Logs/probes/results are under central-evidence. Original frozen source/tests and rejectedv1 are unchanged.

The original observable-worker barrier now records exactly two calls for the two-worker team, matching repeats observe running, and conflicting in-flight context returns busy. The pre-cancelled apply probe verifies actual original project bytes remain intact. Supplied overlapping-apply test observes applying and then complete, alongside retained failure, cancellation, project-conflict and recoveryRequired tests.

Source review confirms executing is reserved before the first suspension, applying before filesystem suspension, and final state recorded after bounded filesystem completion/compensation. No new blocking finding in this delta. Stored terminal states are monotonic. Callers must distinguish an individual cancelled apply attempt from receipt()'s still-staged persistent session state; cancellation after filesystem apply begins is not an atomic undo. Subsequent execute calls after staging/terminal return the existing receipt, not a new run.

Limits: only exact synthetic composition, no provider tools, native/UI, authorization policy, durable composition restart, hostile concurrent filesystem protection or multi-file atomicity. Accepted kernel2/filesystem3 restrictions persist. Native owner must deliberately map runtime states and permissions and validate its merged candidate before any availability claim. Do not delay alreadyaccepted core-only fixes on Swarm integration.

Initial sandboxed attempt failed because Swift's default cache was outside writable roots. Successful run used temporary module/package caches; that environment failure was not a product defect.
