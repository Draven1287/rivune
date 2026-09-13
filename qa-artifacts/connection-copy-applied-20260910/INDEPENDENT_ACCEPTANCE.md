# Independent connection-copy acceptance

September 10, 2026. **Accepted for the bounded three-string copy change.** No production edits, native operations, server changes, real provider discovery, setup, authentication, or send occurred.

## Exact source verification

Current hashes match `hashes.json`:

- `connectionGuidance.ts`: `0312ca0bb7e8f07a3c360d58743d7a84cfee2004b3c96f23e4da65815711ced6`
- `ProviderSetup.tsx`: `649a8f8e05c90bcd10786b4fd82386ba3e1afced4779af4c136a2fc9e338704c`

Reverse-applying the supplied two-hunk patch in an isolated temporary directory reconstructed both recorded bases exactly:

- `connectionGuidance.ts`: `59970e52d3ca3935540d83a085329d10f97b3cd78b8c9d3af51d86f6ad9c4b49`
- `ProviderSetup.tsx`: `c5cca56159b32dad13575dc9e82b7746bae2ce40e4d6b376088abbbc5820b595`

The current sources contain each intended replacement once:

1. Missing executable points to the existing **Find installed providers** action and says installation/sign-in occur outside Rivune.
2. Untested route says the first **Send** is a real provider request and that no hidden test runs.
3. Durable save retains the unverified sign-in/response boundary and tells the user to close Settings and explicitly send when ready.

No behavior, state precedence, or provider action changed in these hunks.

## Isolated fixture at 320 × 568

Inspected `http://127.0.0.1:4317/dist/connection-copy-review/index.html` using the existing server and a temporary 320 × 568 viewport override, which was reset afterward.

- All three exact messages rendered legibly with 277 px client and scroll widths for each paragraph.
- The actual `ProviderSetup` action read **Find installed providers**, measured 168 px client/scroll width, and remained readable.
- Initial counters were discovery 0, configuration 0, send 0.
- After the two explicit synthetic fixture actions, counters were discovery 1, configuration 1, send 0 and the durable-save message appeared exactly.
- No browser console errors or warnings were recorded.
- The saved message and action were reachable in the vertical flow. The fixture does not mount the full Settings dialog, so it cannot independently demonstrate the real Close Settings control or focus restoration; those remain covered by the selected mounted fixture cited in the applied receipt.

## Non-blocking fixture defect

The synthetic fixture page itself has horizontal document overflow at 320 px: document client width 309 px, scroll width 421 px. The only overflowing child is the unwrapped diagnostic `<pre>` containing `{"discovery":1,"configuration":1,"send":0}` (client width 277 px, scroll width 405 px). None of the three changed paragraphs or the action overflows. This does not block acceptance of the production copy, but the fixture receipt should not be read as proof that the entire review harness has no horizontal overflow.

## Boundary

This acceptance establishes that the supplied three-string patch was applied exactly and is readable in the isolated component harness. It does not establish a real provider installation, authenticated account, successful response, full native Settings render, or installed-app behavior.
