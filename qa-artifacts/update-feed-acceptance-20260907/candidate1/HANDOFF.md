# Update-feed acceptance candidate

This is an isolated release-tooling candidate. No app/source integration, installer creation, real signing key access, Apple submission, upload or publication occurred.

## Baseline and scope

Reviewed the resident public source preview 4 and the reviewed website PR checkout. Both copies of scripts/prepare_update_feed.py have SHA-256 93e5074e7bf9eb6dc93b3236d16ce388915a8fad04e2f7481121acd8030541bc. The canonical development copy is dataless and has not been read or equated with this baseline. Rebase and review against hydrated current source before integration. The different canonical DMG packager was not edited.

The original final-output check required one item, a nonempty signature and matching original archive length. A harness supplying faulty generator output passed a matching case and incorrectly accepted five cases: wrong signing key, same-length staged-archive change, nonempty invalid signature, wrong enclosure URL and wrong build. These are boundary fault injections; they do not prove the official generator produces these faults. In particular, inspected Sparkle generate_appcast/Appcast.swift already checks the private/public-key match during normal generation. The correction adds independent verification of final prepared output.

## Changes

Before creating the output directory, verify the staged archive hash and length, exact download URL, matching build and display version (modern elements or consistent legacy enclosure fields), no extra enclosure/delta, and a correct notes URL when notes are linked. Embedded HTML fragments remain supported. Apple's CryptoKit verifies the Ed25519 signature against SUPublicEDKey from the app that passed the existing signature/notarization checks. It does not read a private key. Failure leaves no prepared output directory.

The source export allowlist includes the new verifier and test. Preserve newer entries when rebasing; do not replace a newer allowlist wholesale. Xcode/Swift and CryptoKit are release-machine requirements, not app runtime additions. No third-party dependency installation is needed.

## Evidence limits

Six offline boundary tests passed after the correction, using disposable Ed25519 keys, official Sparkle sign_update and the real compiled CryptoKit verifier. Apple validation/mount operations and appcast generation were mocked in these tests. A seventh compatibility test exercises actual generate_appcast and the production Swift invocation with a synthetic zip, not a real app or DMG; it passed with the actual official generator and unmocked production Swift verifier. All seven tests passed in the final run (59.650 seconds). The initial actual-generator attempt failed solely on a denied standard Sparkle extraction-cache write; the scoped authorized rerun passed. See TEST_RESULTS.log. A temporary test compilation failure from the cloud-backed candidate path was followed by successful compilation and the six checks in a resident /private/tmp copy; its precise cause was not established.

No valid Developer ID/notarization identity, real update delivery, downgrade/upgrade behavior, installed-app updater presentation, or client-side trust/key rotation is proven here. Website remains informational with Mac installer coming soon.

Primary format reference: https://sparkle-project.org/documentation/publishing/
Local official source: /private/tmp/rivune-public-source-build/SourcePackages/checkouts/Sparkle/generate_appcast/Appcast.swift and FeedXML.swift.
