# Startup loader lifecycle/state review

**BOUNDED PASS for production source.** No lifecycle, bridge-classification or handoff-authority defect found. One evidence-file inconsistency is noted below; it does not change the inspected live test oracle.

## Identity

All eight after hashes and six existing-file before hashes match the implementation manifest. Key reviewed hashes:

- StartupFallback.tsx: `a896039f02c43ac5ca7a9e9a6fac9917e4ca35390b6d32c2d5c683c97f1cdb63`
- main.tsx: `c1daeb54d1da8d83584167073286f9b56bd3b38fa166b4d72b2656a93b154a05`
- App.tsx: `bb27e258f34441a7a775a757156615a7bc6878cf6fbeb2f2903a3c99ca49b977`
- hostRenderer.test.tsx: `8463c5ffe9df69c9beecc6e9a3d63161607c28bbd4bf3369162c583ed4bc9cd5`

## Lifecycle and classification

The default loader is stable at module scope. Every effect creates its own live flag; cleanup invalidates only that invocation. StrictMode's abandoned invocation can still request the dynamic import, but cannot publish its result. The default import uses module loading semantics; the optional test loader must not be interpreted as a once-only callback. Promise chaining also catches synchronous loader throws. No host or storage action is introduced by the loader itself.

Boundary failure is sticky for that boundary instance. Child or loader replacement does not reset it, and there is no retry/reload side effect. A fresh mount starts fresh. The intended production loader never changes; an injected loader prop change clears its result in the effect, not synchronously during render. This test seam is not a production account/session-switch mechanism.

App reads the own bridge descriptor and checks desktop-marker presence with `in`, without reading accessor values. Marked desktop with missing, accessor, null or primitive bridge returns the inert unavailable fallback. Object bridges still undergo existing HostWorkspace adapter validation. Unmarked browser entry preserves DemoWorkspace. The selector does not promise to validate every member of an arbitrary bridge object itself.

Controller hydration failures remain resolved error/uncertain state, not exceptions caught by this boundary. The integrated mounted assertions explicitly preserve that distinction. No unchanged controller or host audit was repeated.

## Independent focused checks

[check.cjs](check.cjs) verifies hashes and executes the actual transpiled loader and extracted App function with deterministic hook/element stubs. Both old resolve and old reject after an active replacement are ignored. Disposed rejection causes no update. Sticky boundary state survives child replacement. Six App branches select demo/host/fallback as intended with zero bridge or marker getter invocation. See [check.log](check.log).

These are callback/classification checks with simulated effect setup/cleanup, not an independent React StrictMode mount or browser run. The producer's twelve actual mounted cases and their width results remain producer-reported evidence; the live assertions were inspected. Native module loading, CSP and S02 behavior are not established here.

## Demo oracle and evidence correction

The live demo case compares session mutation counts after loader-mounted App against direct App, both under StrictMode, and asserts zero localStorage writes and no host calls. This supports unchanged synthetic mutation count; it does not prove byte-for-byte storage equivalence, real browser persistence, or zero session writes. The storage stand-in intentionally counts without persisting.

`mounted-cases.txt` is stale: it still contains the earlier unconditional zero-session-write assertion and omits the live direct-App baseline comparison. Regenerate that excerpt from the accepted live test file, or clearly label it superseded before using it as the asserted test evidence. The implementation receipt and actual hashed test source correctly describe/use baseline equivalence.

This is containment/observability, not a demonstrated S02 repair. HTML-not-loaded and initial bootstrap-dependency failures remain outside dynamic-App failure handling. Only local review evidence was written; no live/candidate edits, native/browser/build/server/profile/provider actions occurred.
