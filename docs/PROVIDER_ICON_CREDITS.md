# Provider icon credits

Rivune uses the OpenAI mark to identify Codex and the Claude asterisk to identify Claude. Rivune’s application logo remains its own artwork. Provider marks identify their respective services and do not indicate affiliation or endorsement.

## Source

The two monochrome vectors are copied from [LobeHub Icons](https://github.com/lobehub/lobe-icons), retrieved September 5, 2026:

- [OpenAI Mono.tsx](https://raw.githubusercontent.com/lobehub/lobe-icons/master/src/OpenAI/components/Mono.tsx)
- [Claude Mono.tsx](https://raw.githubusercontent.com/lobehub/lobe-icons/master/src/Claude/components/Mono.tsx)
- [MIT license](https://raw.githubusercontent.com/lobehub/lobe-icons/master/LICENSE)

The original 24 × 24 view box, even-odd fill rule and path data are unchanged. The React wrapper was replaced by static SVG assets and a small inline React component. Native assets render as templates, and website vectors inherit the surrounding text color. No icon package was installed.

## Distributed files

- Native: `ProviderCodex.imageset` and `ProviderClaude.imageset` in `Rivune/Assets.xcassets`.
- Native license: `ProviderIconLicense.dataset/LICENSE.txt`, compiled into the application’s asset catalog.
- Website: `website/public/providers/codex.svg`, `claude.svg` and `LICENSE.txt`.
- Website rendering: `website/app/workspace/provider-mark.tsx` contains the same path data.

## Verification

SHA-256 of the retrieved upstream source files:

- `src/OpenAI/components/Mono.tsx`: `1f186162e4690959058836bd386f331d7924f1b4878a98372821e5ca03d7a8db`
- `src/Claude/components/Mono.tsx`: `c17b129fe614b44c8991c1447831268464d345d20cf817dadee059838ff9beee`

## License

MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
