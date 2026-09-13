# Inherited admission correction

Frozen candidate `ae27a875aab6bc4d78f05f73e1374d73a5826171` (parent6119dad). Two-file change: native host admission and conversation-connection contract. Inherited null selection now resolves the current default through the current catalog/defaults-only resolver. Legacy provider.model is cleared in the admitted copy, providerManagedDefault provenance is recorded, and saved selection stays null. Missing routes reject.

Synthetic native regression passed: legacy override, default changed since earlier frontend catalog, unchanged saved config/null selection, missing route rejection; no process launch. Two model_capabilities compatibility tests and nine source-stage checks passed. Isolated candidate clean; committed blobs match manifest. Persistence extension remains separate WIP.

Next ready: independent confirmation of the reported P2. No private forwarding retried.
