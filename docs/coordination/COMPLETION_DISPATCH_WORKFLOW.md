# Completion-to-next-task workflow

User authorized September 8: keep available Rivune tasks supplied with useful work when they finish. Technical coordinator owns dispatch; root forwards completion messages requiring follow-through instead of merely acknowledging them. PM audits coverage and progress.

1. On each completion message, read the deliverable and distinguish implemented, integrated, tested, installed and released. Accept it or return a specific correction with evidence.
2. In that same coordination turn, select the highest-priority unblocked remaining requirement and send the finished owner a concrete next assignment. Include outcome, exact file ownership, dependencies, expected evidence, and stop condition. Do not require another user prompt for already authorized work.
3. Maintain one current assignment and one ready next assignment per responsive worker in CURRENT_WORK_QUEUE.md. Replace stale ownership entries with a clear current table; move historical handoffs out of the active view. Recheck ownership before dispatch and never queue duplicate writers or builds.
4. If a worker is blocked, assign independent work from the remaining feature-parity, provider, Constellation, packaging, website, accessibility or recovery backlog. Record the dependency and unblock owner. Do not invent repeated audits to occupy a worker after meaningful checks pass.
5. If no safe useful task is ready, explicitly record why that worker is waiting. Known empty-turn/unreachable tasks are unavailable capacity; do not repeatedly send the same prompt or count delivery as execution.
6. Every 3 minutes the existing coordinator heartbeat checks for missed completion/idle transitions and dispatches outstanding ready work. Incoming task messages permit earlier dispatch while the coordinator is available; this is not a guaranteed always-running event service. Host availability and account limits still apply. Unchanged checks must be lightweight; deduplicate pending assignments.
7. Completion handoff format: assignment ID; changed files/artifact; evidence; remaining limitations; released file/build ownership; suggested next task. Workers send it to technical coordinator and PM. Root forwards any misrouted handoff for next-task dispatch.
8. Keep one native UI operator and one shared Cargo target (.toolchains/target-candidate4-r2). Preserve profiles, rollback, approved design and all source. Spend $0; no public release or unverified installed replacement. Routine unchanged coordination stays out of the user's product conversation.

## Standing continuation rule

User reiterated: every finished task should receive its next useful assignment. Before an owner finishes its current assignment, coordinator should supply a concrete approved next item with its file boundary and dependency. An owner may continue directly into that preassigned item when its dependencies are satisfied; it must not wait for Aarav to say continue. Sending a receipt alone is not completion of dispatch.

After sending an assignment, coordinator checks for actual progress or a concrete blocker. If the owner returns idle without doing the assignment, inspect the response and resume once with the precise pending action; repeated empty turns are recorded as unavailable rather than continually pinged. A review dependency must name the reviewer and the evidence needed to release it. Do not self-release shared files, a build, or an installed replacement.

Each queue entry records current work, approved next work, and any waiting reason. Completion receipt handling and the existing three-minute heartbeat both enforce this rule. This is a best-effort workflow while Codex and the host are available, not a guarantee of uninterrupted execution.

Priority: restore original Rivune feature parity and deliver usable Tauri workflows; finish current build/provenance and native acceptance; wire Constellation through real host/UI; complete truthful installers. Preserve accepted website overlay/static-review-v2 rather than restarting design.
