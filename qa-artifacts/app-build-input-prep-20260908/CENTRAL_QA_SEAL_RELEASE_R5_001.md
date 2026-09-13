# R5 staged local QA seal release

Central authorizes packaging task01a07831 to stage and seal exactly one copy of the verified R5 app for local native QA. This implements the existing authorized local app testing objective; it is not distribution signing or security-policy bypass.

Source: /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/.toolchains/target-candidate4-r2/release/bundle/macos/Rivune.app
Source tree SHA256: 56427c2018054cee1898aeb773682d84f85418b2aeeccdd8fb96047c4b03d058
Source executable SHA256: f134aad42c69e75f806f11073d6eae6f319590659b8d76e64fe4433afcb2e28d

Create fresh real staging root /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-staging-r5-seal-001; copy app to /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-staging-r5-seal-001/Rivune.app; verify whole tree equals source hash before signing. Do not mutate original app, R3 rollback or installed app. Abort on mismatch.

Exact signing argv: ["/usr/bin/codesign", "--force", "--sign", "-", "--timestamp=none", "/Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-staging-r5-seal-001/Rivune.app"]

Use this command once on staged app only. No entitlements, hardened-runtime changes, quarantine removal, OS security changes, Developer ID, notarization or rebuild. If it fails, stop and report.

Then compute new full sealed tree/executable hashes. Use the accepted hash-bound collector and validator with fresh real external output root /Users/Aaravshah/Documents/ChatGPT/App for me to integrate all my AI/qa-artifacts/mac-artifact-evidence-r5-sealed-001, direct children mac-artifact-evidence.json and mac-artifact-validation.json. Copy the accepted metadata policy, changing only artifact/output paths necessary for this staged result; preserve minimum OS, identifier/version, architecture and tool/helper/validator hashes. Return exact policy/command and evidence hashes. Require strict verification, Info.plist binding, resource seal, qualified_for_native_review=true and distribution_ready=false.

This release authorizes staging, local ad-hoc sealing and evidence collection only. No launch, install, DMG, provider call or publication. Frontend remains sole native operator after separate exact-artifact native release.
