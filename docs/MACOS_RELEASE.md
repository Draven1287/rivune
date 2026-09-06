# Rivune macOS DMG release

Rivune has two deliberately separate distribution paths:

| Artifact | Purpose | Default location |
| --- | --- | --- |
| Source-release ZIP | Auditable Xcode source for developers | A maintainer-selected release path |
| macOS DMG | Drag-to-Applications package for end users | `release/Rivune.dmg` |

Generate a revision-bound source ZIP independently with
`scripts/prepare_open_source.py`; the command writes the archive and checksum
next to the selected destination. The DMG script never replaces or repackages
the source ZIP. It builds the
`Rivune Mac` scheme in Release configuration using Xcode Beta, signs the app,
creates a disk image containing `Rivune.app` and an `/Applications` symlink,
applies a Finder icon layout when an interactive Finder session is available,
mounts the finished image again, validates its contents and metadata, and
writes a SHA-256 checksum.

## Distributable public release

Public release is the default mode and is deliberately fail closed. Running the
script with no credentials does not fall back to ad-hoc signing and does not
create a new DMG. An authorized maintainer must supply both:

- The exact valid **Developer ID Application** identity already installed in
  the signing Keychain.
- The name of an existing `notarytool` Keychain profile.

The script only reads and uses those supplied credentials. It does not create,
download, repair, or bypass a certificate or notarization profile.

Run:

```sh
RIVUNE_DEVELOPER_ID="Developer ID Application: Example Name (TEAMID)" \
RIVUNE_NOTARY_PROFILE="rivune-notary" \
./scripts/package_macos_dmg.sh --public-release
```

The `--public-release` flag is optional because public is the default, but it is
recommended in release automation for clarity. The run stops without replacing
`release/Rivune.dmg` unless every gate succeeds:

1. The requested identity exists as a valid code-signing identity and its name
   begins with `Developer ID Application:`.
2. `Rivune.app` is signed with hardened runtime and a secure timestamp.
3. Apple accepts a ZIP containing the app; the ticket is stapled to the app and
   `stapler validate` succeeds.
4. The stapled app is placed in the DMG. The DMG receives its own Developer ID
   signature and secure timestamp.
5. Apple accepts the DMG; its ticket is stapled and validated.
6. The final DMG is mounted read-only. The app inside it passes strict code-sign
   verification and staple validation.
7. Gatekeeper accepts the mounted app as executable code and accepts the DMG as
   a primary-signature disk image.
8. Only then are `Rivune.dmg`, its checksum, and its release-info file written
   to the public release output directory.

The successful public artifacts are:

- `release/Rivune.dmg`
- `release/Rivune.dmg.sha256`
- `release/Rivune.dmg.release-info.txt`

The release-info file must say `Distributable public release`, `Developer ID
signed`, `App and DMG notarized and stapled`, and `Accepted mounted app and
DMG`. Anything else is not a public release.

## Explicit local ad-hoc preview

Ad-hoc packaging remains available for local testing, but it requires an
explicit opt-in flag:

```sh
./scripts/package_macos_dmg.sh --allow-adhoc-preview
```

Preview mode rejects `RIVUNE_DEVELOPER_ID` and `RIVUNE_NOTARY_PROFILE` so it
cannot be confused with a partially signed release. It also uses a separate
output directory and distinct filenames:

- `release/preview/Rivune-Preview.dmg`
- `release/preview/Rivune-Preview.dmg.sha256`
- `release/preview/Rivune-Preview.dmg.release-info.txt`

The DMG still contains `Rivune.app` and the Applications shortcut for testing.
Its outer volume is named **Rivune Preview**. It is ad-hoc signed, is not
notarized, is not Gatekeeper-ready, and must never be copied over the public
`Rivune.dmg` or offered as an end-user download.

Override the Xcode location, preview output location, or architectures only
when needed:

```sh
RIVUNE_DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer \
RIVUNE_OUTPUT_DIR="$PWD/release/preview" \
RIVUNE_ARCHS="arm64 x86_64" \
./scripts/package_macos_dmg.sh --allow-adhoc-preview
```

Set `RIVUNE_SKIP_FINDER_LAYOUT=1` for a headless build. The image still contains
the same app and Applications symlink, but Finder chooses the initial icon
positions.

## Verification

The packaging run fails unless all of these checks pass:

- The Release app is named `Rivune.app` and contains executable `Rivune` code.
- Its display name is Rivune.
- Its bundle identifier is `com.aaravshah.alloy.mac`, intentionally retained so
  Rivune can reuse the former app container and migrate its data. The differently
  named `Alloy.app` bundle remains a separate file in Applications; verify the
  Rivune migration before removing that old bundle without deleting its data.
- Its bundle name, display name, app-icon name, compiled `AppIcon.icns`, and
  executable all use the Rivune build identity.
- The requested binary architectures are reported in the release-info file.
- Public builds prove the exact Developer ID authority, team identifier,
  hardened-runtime flag, and secure timestamps from the signatures.
- Both the staged app and the app remounted from the DMG pass strict code-sign
  verification.
- The mounted DMG contains an `/Applications` symlink.
- The checksum check passes for the mode-specific DMG filename (`Rivune.dmg`
  for public releases or `Rivune-Preview.dmg` for local previews).
- Public builds notarize the app and DMG separately, require Apple status
  `Accepted`, and pass `stapler validate` for both artifacts.
- `spctl` accepts the mounted app with assessment type `execute` and the DMG
  with assessment type `open` and `context:primary-signature`.

Before publishing, inspect `Rivune.dmg.release-info.txt`. Only a completed public
run whose signing, notarization, and Gatekeeper lines all show success is
suitable for a normal end-user download. Keep the checksum beside the DMG and
publish the revision-bound source ZIP independently.

The DMG is the only release artifact. The script intentionally does not leave a
second loose app in `release/`: a cloud-backed Documents folder can add Finder
metadata after validation. Only the app remounted from the immutable DMG is
used as the distribution-integrity check and should be copied to Applications.
