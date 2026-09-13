# Rivune native icon derivatives

Approved source: `Rivune/Assets.xcassets/AppIcon.appiconset/RivuneMac1024.png`  
Source SHA-256: `e9a0dc0311c9318a7170af34ea32add08304dde5a88df1651f35acc89b747fec`

| Candidate file | SHA-256 | Evidence |
|---|---|---|
| `icons/icon.png` | `1a33682351c6f7c811d99bdd4780851fe756fda52a636e95b4ce3fcb6e64c0f2` | 512×512 RGBA PNG; pixel-exact Lanczos resize of approved source |
| `icons/icon.ico` | `6777199b81650835defa8c7b4bd514d27bdcd396ce9b9830ffa227f68008d570` | Windows ICO with six PNG-backed entries: 16, 32, 48, 64, 128, and 256px |
| `icons/icon.icns` | `56609a9c6ae22c589706c9b4f26200c6777c724bb74114d0699a5116a23ea064` | Existing verified Rivune app ICNS, 98,123 bytes, reused without alteration |

Pillow 11.3.0 performed format conversion only. No composition, colors, typography, shape, or branding changed. Candidate 5 validates container headers, lengths, image-entry offsets, payload presence, dimensions, and required platform extensions before a build can pass its gate.
