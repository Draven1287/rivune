# Independent source review and corrections

A separate read-only reviewer checked untrusted output, projection, changing content and focus behavior. Review found and corrected:

1. Whole-answer replacement removed focus/selection from unchanged earlier content. Reconciliation now retains equal blocks and plain-text append prefixes; necessary action replacements restore matching semantics or focus a stable content wrapper.
2. External anchors permitted alternate navigation outside the injected callback. External link controls now have no browser-navigable href.
3. Inline code decoded literal entities. Code spans now use literal token text.
4. Ordinal focus restoration could focus a newly resolved link. Restoration now uses target/text/code identity, tested with the reviewer's changing-reference example.
5. Linked images created nested buttons and two callbacks. Nested link/image content is now plain label text under the enclosing action, tested for one callback.

Final independent source recheck found no remaining blocker within those corrections. Reviewer did not rerun browser tests or verify native behavior.

Root browser result: 31 checks pass, no script errors or remote resource requests. Rendered evidence includes desktop history, code/table detail, and 760/390/320px views. The underlying data is synthetic, beginning with actual R2 Rust-serialized DTO JSON. It is not live AI output.
