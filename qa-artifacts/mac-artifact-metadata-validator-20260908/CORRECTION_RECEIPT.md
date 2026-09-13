# Correction receipt

Both independently reproduced fail-open cases are corrected.

- LC_BUILD_VERSION now requires an explicit MACOS platform or documented numeric platform 1 for every parsed slice. IOS, another platform, or a missing platform remains parsed but produces deployment.slice_platform_not_macos and blocks qualification. LC_VERSION_MIN_MACOSX remains a distinct valid macOS load command.
- A successful strict verification result now requires explicit app-bundle format, identifier, sealed-resource, and bound-Info.plist evidence before bundle_sealed classification. Removing the positive resource/plist lines or marking the display output truncated produces unknown and blocks qualification.

Seventeen deterministic tests pass, including stored non-macOS and incomplete-seal regression fixtures. The original reports and evidence remain in reports/ and fixtures/. No canonical source, native build, signature, app, or provider was touched. distribution_ready remains false for every result.
