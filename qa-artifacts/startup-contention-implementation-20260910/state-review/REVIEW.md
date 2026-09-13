# Startup contention — host/state review

**BOUNDED PASS.** No blocker found in the lock classification, host ownership, or recovery-state delta. Detailed desktop constructor ordering belongs to the desktop reviewer. OS-level double-invocation suppression remains untested here.

## Identity

Both live files match the implementation manifest, both before-images match frozen commit `c84cc2d07fffc1050c2be52ef31b62fbd3c1181a`, and their independently regenerated unified diff matches the scoped patch exactly.

- host.rs: `35dce8bf9e43eaad08ba475ca0b4b4c252fd18016be10c778739f3101ab9e3dc`
- main.rs: `3294fceae48998eb73de91ffef271d3094003b6e09e4c1917ce4feb78fe03298`

Captured copies and [identity.json](identity.json) are retained beside this report. The accepted sent-draft identity matrix was not repeated.

## Host and state findings

`HostState::open` maps only the error from `try_lock_exclusive` through `classify_profile_lock`. Classification compares the raw OS code with fs2's platform contention error, preserving every nonmatching error object. The local pinned fs2 0.4.3 Unix implementation uses nonblocking exclusive flock and constructs its contention error from EWOULDBLOCK. A synthetic permission error without an OS code therefore cannot accidentally match. Directory creation, lock-file opening, snapshot reading and decoding failures bypass this classification.

The lock is acquired before snapshot enumeration, initialization, repair, or persistence. A failed contender drops only its own local file handle; it has no HostState and cannot reach snapshot mutation. Successful open moves the File into `HostState::_profile_lock`. The existing Arc ownership and operation leases keep the host alive; final host drop closes the owned handle. Error returns after acquisition also unwind that local handle. No new unlock, lock-file deletion, detached ownership or lock cloning was introduced.

The OS-backed two-open test opens separate handles to one fresh temporary profile, verifies typed contention, compares the first host's serialized state and snapshot filename/byte set, drops the first host, and successfully reopens without changing snapshot bytes. This is actual filesystem lock contention within one test process, not two application invocations. It does not prove metadata preservation: the existing profile-directory setup can set permissions before attempting the lock, and the assertions cover state/snapshot bytes.

Startup classification recognizes the typed error by downcast. Every other host-open error yields recovery status with no managed host. The corrupt-latest-snapshot case retains the older snapshot and verifies all profile file bytes remain unchanged rather than falling back to an empty/older workspace. Invalid saved recovery state likewise produces recovery with no host. Public recovery status does not expose the corrupt marker or profile path. Recovery retains the exit gate; healthy startup retains the normal shutdown handshake.

## Recorded evidence and limits

Inspected actual assertions, test runner, and logs: host contention 2/2, startup 6/6, dock 2/2 passed. No tests were independently rerun and no new native compilation was performed. The host contention test uses the real OS lock and temporary files. Permission denial is injected into classification/startup helpers; there is no actual filesystem permission-denial test in this focused evidence. The test named unreadable saved recovery state uses semantically invalid JSON data, not unreadable filesystem permissions. The source error propagation supports genuine I/O recovery, but that distinction remains explicit.

The startup callback tests exercise branching helpers with counters; they do not construct native UI or establish window/tray suppression at runtime. Detailed main ordering is outside this reviewer assignment. No concrete host gap warranted an additional isolated executable check.

Only local review copies and evidence were written. No live/candidate edits, app launch, new build/bundle, process control, provider action, installation, or publication occurred.
