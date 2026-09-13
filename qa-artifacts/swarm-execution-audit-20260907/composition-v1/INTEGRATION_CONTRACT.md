# Narrow native handoff — composition candidate v1

The coordinator must first admit a lead-selected Swarm-containing strategy. It supplies the frozen team/plan, user-approved context, exact project snapshot, injected provider workers, reviewed verifier, project permission URL, and application-owned staging URL.

Native integration must preserve these state meanings:

- `cancelled`: nothing staged; never auto-resume under the same success flow.
- `failed`: no approved bound result or staging rejection; never show final artifacts as applied.
- `staged`: reviewed artifact manifests exist, but project files are unchanged.
- `complete`: the separate apply call finished; this is not a claim of multi-file atomicity.
- `recoveryRequired`: preserve artifact and recovery receipts, block automatic retry, and require inspected reconciliation.

The native layer must persist the complete execution receipt, staging receipt, artifact manifest, and recovery state together before presenting completion. It must never reconstruct a fresh filesystem session to bypass a root-identity mismatch. Model text cannot provide roots, permissions, shell commands, conflict waivers, or state labels.

Keep single-provider and Council behavior unchanged. Missing Swarm capability reports unavailable; no substitute may be labeled Swarm.
