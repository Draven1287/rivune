# Frozen concurrency and projection review

One remaining P1 source-traced finding. All eight hashes in constellation-concurrency-review-snapshot-v4 independently verified, including host04ee08f8, projection54198ee4, acceptance84b7cfb6, libef139a35. No suites independently executed.

## P1: completed sibling outcomes are held until all workers join, then discarded on cancellation

host.rs:1415–1429 joins every thread before recording any result. If A has returned successfully while B remains blocked, A is not checkpointed or projected. A restart during this interval restores both as uncertain, losing A's already-returned text. If B is cancelled, the any-Cancelled branch cancels the session and skips the entire result loop, permanently discarding A. The later outcome-save error return also abandons remaining collected outcomes, rather than retaining them for reconciliation.

Process results in completion order, persist or retain each actual outcome while siblings run, and drain/join all outstanding workers even after failures. Preserve completed successes before applying cancellation. Add one deterministic A-completed/B-latched case: require A's contribution in durable checkpoint while B unresolved; reopen preserves A without replaying B; cancellation of the original B retains A. This is distinct from the current two-unresolved overlap fixture.

Batch dispatch ordering itself marks the batch and durably checkpoints before process launch. Normal workers share cancellation and are joined; the result-retention gap above prevents full concurrency acceptance. The panic join branch also exits without draining remaining handles and should follow the same drain/retain path.

Projection source review found no additional concrete defect: explicit public answer fields only, IndependentAnswer role filter, bounded UTF-8 text/aggregate/row count, IDs validated without truncation, no bindings/checkpoints/decision proposals/artifact receipt serialization. Resolution derives from actual Council delivery. This is structural projection privacy, not a guarantee that provider-generated public text contains no sensitive content, nor acceptance of the broader settings snapshot.

Runtime reports 100 library + 2 binary + 54 Node plus keyboard/wire/syntax passes. Our authored overlap test was executed by runtime, not this reviewer: it proves two actual processes overlap, captured durable bytes restore two unresolved invocations without replay, recovery cancels/reopens, and original execution completes two projected member answers/one final. It does not prove a completed sibling survives while another is running or cancelled. Native/live/build acceptance remains separate.
