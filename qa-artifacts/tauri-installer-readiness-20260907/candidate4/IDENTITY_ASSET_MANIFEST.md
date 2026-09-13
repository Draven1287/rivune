# Rivune identity asset manifest

This is a preparation record, not an applied runtime change.

## Approved existing lineage

| Role | Existing source | SHA-256 | Verification |
|---|---|---|---|
| Master branded PNG | `Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac1024.png` | `e9a0dc0311c9318a7170af34ea32add08304dde5a88df1651f35acc89b747fec` | PNG, 1024×1024, RGBA; approved galaxy/R identity |
| Existing macOS derivative | `release/Rivune.app/Contents/Resources/AppIcon.icns` | `56609a9c6ae22c589706c9b4f26200c6777c724bb74114d0699a5116a23ea064` | Valid ICNS container, 98,123 bytes; same hash as the verified UI-refinement app copy |

## Runtime correction state

- `candidate4-runtime-r2/src-tauri/icons/icon.png` is a different V-mark asset (`e8be5d1f...cff54`) and is not the approved galaxy/R identity.
- `bundle.icon` is empty, so the current Tauri config does not package an explicit app icon.
- No approved Rivune `.ico` derivative exists in the inspected workspace. Windows identity therefore remains **blocked** until the runtime owner derives and reviews `icon.ico` from the approved master.
- The Linux `icon.png` should also be derived from the approved 1024px source. Do not reuse the current V-mark.

`TAURI_IDENTITY.patch` is ready for the runtime owner after `icon.icns`, `icon.ico`, and `icon.png` exist under `src-tauri/icons/` and pass the candidate 4 native-format validator. The patch sets the Cargo package/binary name to `rivune`, retains the existing `Rivune` product/window name, and lists only DMG, NSIS, AppImage, and Debian packaging targets.
