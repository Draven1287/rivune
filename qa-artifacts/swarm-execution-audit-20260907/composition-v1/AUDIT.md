# Swarm execution-to-filesystem composition — candidate v1

Status: isolated composition candidate. It depends on the independently accepted execution-kernel v2 and filesystem-v3 packages without modifying either. Swarm remains unavailable.

## Product boundary

Rivune stays one product, conversation, team, and composer. The appointed lead chooses Council, Swarm, or a sequence and supplies a structured reason. Runtime policy admits capability, permissions, and budget. This package begins only after a Swarm-containing strategy is admitted; it does not select strategy, call providers directly, or provide a separate mode UI.

## Composition contract implemented

1. Run the accepted execution kernel with injected workers and a capturing verifier.
2. Permit filesystem staging only when the execution receipt is schema v2, complete, integrity-valid, and bound to the same run.
3. Require exact equality across planned owned paths, receipt manifests, captured candidate paths, proposed byte counts/hashes, expected base hashes, and the admitted target snapshot.
4. Construct filesystem ownership from that verified binding rather than model prose.
5. Stage first and return a user-facing artifact manifest stating that nothing was applied.
6. Apply only through a separate call on the same session.
7. Propagate cancelled, failed, conflict, and recoveryRequired outcomes without a success label. A recoveryRequired result blocks another apply call and retains filesystem recovery evidence.

## Synthetic proofs

- complete two-worker execution stages exact artifacts and later applies them;
- worker failure produces no filesystem session or artifact success;
- caller cancellation propagates through the kernel and produces no staging;
- a project mutation after review fails filesystem admission and preserves the mutation;
- a later edit during apply propagates recoveryRequired, preserves the user edit, retains staged artifacts, and blocks automatic retry.

## Explicit limits

- The workers and verifier are injected synthetic fixtures; no CLI, provider, auth, network, or live model is exercised.
- The filesystem layer assumes a cooperative filesystem outside its documented boundary checks. Descriptor-relative no-follow hardening remains a gate.
- Multi-file apply is not atomic. Durable recovery for a crash between destination write and journal persistence remains unimplemented.
- This package does not prove native coordinator wiring, UI behavior, project permission acquisition, or installed application behavior.
- No shared native source, real project, provider state, installation, or Swarm availability changed.

## Remaining gates

Independent exact-source review; native mapping from lead admission; durable persistence/recovery UI; explicit project permission; frozen native tests/builds; and one authorized disposable two-provider run with functional and rendered evidence.
