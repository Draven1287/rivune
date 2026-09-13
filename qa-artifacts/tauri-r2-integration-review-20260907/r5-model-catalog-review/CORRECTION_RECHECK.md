# R5 omission correction recheck

P2 closed at contract/fixture scope. Reviewed manifest SHA-256 `5ec3c0101b7971c7cd201913d287220fb76a2a11109fccb9ee8051d32ad1cc41`; all manifest-bound file lengths/hashes match. CASES.json has 32 unique cases.

Contract now requires supportsProviderDefault for null model across catalog states and supportsDefaultEffort for null effort on a concrete model. False flags require explicit advertised choices without recommendation substitution. Unsupported/unknown effort with omission forbidden has no runnable configuration; saved draft text/files remain intact. Provider-managed default explicitly attests to combined model/effort omission.

The supported available fixture-explicit provider forbids provider-default omission; explicit-reasoner requires its advertised focused effort. A separate unsupported-effort/omission-false model covers invalid configuration. Four added cases cover null-model rejection, null-effort rejection, valid explicit combination and unsupported omission rejection.

This was a bounded changed-contract/fixture recheck only. No admission implementation, provider discovery, model availability, account, CLI, UI or build behavior was exercised or accepted. R4 host correction remains the next implementation-review dependency.
