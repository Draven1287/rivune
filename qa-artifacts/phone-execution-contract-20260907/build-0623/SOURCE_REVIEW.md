# Rivune build 2026090623 source review

Owner source review is complete. Independent re-review is pending; this candidate must not be installed until it is accepted.

The phone-to-Mac request carries an exact, Codable execution route. The Mac admits a request only when that exact route still matches the selected route and remains ready. Missing, stale, or fabricated routes fail before provider execution, and the selected route is frozen for the full run. API routes strip CLI-only options.

Execution provenance is explicit. CLI answers identify requested model and reasoning values. API answers say `response model unavailable`; a model observed during the prior readiness probe is separately labeled `connection check` and is never described as the model resolved for that response.

The Codex CLI receipt is opt-in and in-memory. It contains bounded metadata and hashes, and excludes prompt text, answer text, raw diagnostics, and raw provider identifiers.

Verification completed on the exact frozen source: 40 focused native tests, 323 full native tests, macOS Release build, generic iOS Simulator Release build, and 47 browser contract tests. No live provider call was made.
