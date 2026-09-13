# Contributing to Rivune

Thank you for helping improve Rivune. This project welcomes focused bug fixes,
tests, documentation, accessibility improvements, provider adapters, and
well-scoped feature proposals.

## Before you begin

- Search existing issues and pull requests before opening a new one.
- Use a feature request for behavior changes large enough to need design
  agreement before implementation.
- Keep each pull request focused on one concern.
- Never include credentials, session cookies, pairing QR codes, reconnect
  secrets, private prompts, private attachments, or unredacted logs.
- Submit only work you have the right to license. Do not copy proprietary
  source code, private product assets, brand logos, screenshots, or a
  pixel-for-pixel implementation from another application.

Rivune is independent from the AI providers and platform companies it can work
with. Third-party product names and marks belong to their respective owners;
compatibility references do not imply affiliation or endorsement.

## Development setup

You need a Mac with a compatible current Xcode installation. Provider-backed
manual tests also require the corresponding supported CLI to be installed and
signed in through its own normal authentication flow. Do not place provider
credentials in this repository or in test fixtures.

1. Extract the prepared source candidate (or clone a verified repository when one is published).
2. Open `Rivune.xcodeproj`.
3. Build the `Rivune Mac` scheme for My Mac or the `Rivune iOS` scheme for an
   iOS Simulator.
4. Run the `Rivune Mac` scheme's test action before submitting a change.

Exact tested prerequisites and candidate-export commands are in
[BUILD_FROM_SOURCE.md](docs/BUILD_FROM_SOURCE.md).

Equivalent command-line checks are:

```sh
xcodebuild -project Rivune.xcodeproj -scheme "Rivune Mac" \
  -destination 'platform=macOS' CODE_SIGNING_ALLOWED=NO build

xcodebuild -project Rivune.xcodeproj -scheme "Rivune Mac" \
  -destination 'platform=macOS' CODE_SIGNING_ALLOWED=NO test

xcodebuild -project Rivune.xcodeproj -scheme "Rivune iOS" \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

If a check cannot run in your environment, explain why in the pull request.

## Pull requests

A useful pull request includes:

- A concise explanation of the problem and the chosen approach.
- Tests for changed behavior, including failure and cancellation paths where
  relevant.
- The exact checks run and their results.
- Screenshots or a short recording for visible interface changes, with private
  content removed.
- Security and privacy impact notes when changing process execution,
  attachments, persistence, provider data sharing, Keychain use, pairing,
  transport, or logging.

Avoid drive-by formatting or unrelated refactors. Preserve the distinction
between implemented capabilities and aspirational or provider-native features.

## Security reports

Do not report vulnerabilities in a public issue. Follow `SECURITY.md` so the
maintainers can coordinate a fix before details are disclosed.

## License

Unless you explicitly state otherwise, any contribution intentionally submitted
for inclusion in Rivune is licensed under the Apache License, Version 2.0, in
accordance with the repository's `LICENSE` file. By submitting a contribution,
you represent that you have the right to do so.
