# Artwork provenance

This record covers the visual assets packaged in the Rivune native client. It
exists so maintainers and redistributors can distinguish project artwork from
third-party compatibility marks.

## Rivune project artwork

The following raster images were created specifically for Rivune on September
5, 2026 using OpenAI's built-in image-generation tool. The project owner
directed and reviewed the generations, selected the final images, and packaged
them for this client. OpenAI's Terms of Use describe ownership of output as
between the user and OpenAI, to the extent permitted by law:
https://openai.com/policies/terms-of-use/

| Packaged asset | SHA-256 |
| --- | --- |
| `Rivune/Assets.xcassets/RivuneIdentity.imageset/rivune-orbit-stars.png` | `17c311ea8690d5c8c3ca43c787ffbc5525ae37165d692442573e78b912795c84` |
| `Rivune/Assets.xcassets/RivuneRibbonIdentity.imageset/rivune-ribbon-r.png` | `34864d08a20282a1af2431725a3e150343ff14e8aa3f6a25f03ff044cb6c62b7` |
| `Rivune/Assets.xcassets/RivuneSpaceIdentity.imageset/rivune-space.png` | `eabda34c18366421eaa4ce451a2ebde4236a953e5ff41510b398298e05e33bcf` |
| `Rivune/Assets.xcassets/RivuneWorkspaceCosmos.imageset/rivune-workspace-milky-way.png` | `0e758d81cd77a3ad9e73fe3db997e45eb91c34107cf538dfa95254996fe0878f` |

The app icon sizes are derived from the selected Rivune identity artwork with
`scripts/generate_app_icon.swift`. The packaged wordmark SVG was created for
this project. The Apache-2.0 license applies to the files as project material,
subject to the brand-use limits in `TRADEMARKS.md`.

Generative tools can produce similarities that neither the tool provider nor
this project can fully exclude. This record documents how the assets were made;
it is not a trademark clearance or a guarantee of uniqueness.

## Third-party compatibility marks

The Claude and Codex provider icons identify compatible services. They are not
Rivune brand artwork, do not imply endorsement, and are not relicensed under
Apache-2.0. Their retained license and attribution text is packaged at
`Rivune/Assets.xcassets/ProviderIconLicense.dataset/LICENSE.txt` and summarized
in `THIRD_PARTY_NOTICES.md`.

Forks and hosted services should use their own identity as described in
`TRADEMARKS.md`.
