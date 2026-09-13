# Root correction to smoothness audit focus finding

The audit's claim that accepted0623 has no composer focus observer is false. Do not implement a duplicate fix or treat this as an outstanding source gap.

Root read both shared Rivune/Components.swift and /private/tmp/rivune-phone-descriptor-0623.bXGPu5/Rivune/Components.swift. Both SHA-256 e920757f668ab2a8b08a52ad721cbcba98410e8a6fb8826dc5f40bd5b3532dc4. They contain composer focus binding (1791), task keyed by newConversationFocusRequest (1889), and workspaceReturnFocusRevision observer (1941), including existing caret restoration before next typing.

This source observation does not establish mounted native focus success. Actual Settings roundtrip/append remains in rendered acceptance, but the missing implementation claim is withdrawn. Original AUDIT and manifest stay frozen; owner and independent reviewer notified. The separate transcript-scroll correction remains under review.
