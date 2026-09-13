# Rivune interface — current direction

September 5, 2026. The latest user clarification limits the AnythingLLM screenshot reference to startup. The interior is an original Rivune design, informed by the clarity of Jan, LibreChat and Open WebUI. This supersedes the earlier outlined-sidebar and conversation-tree interpretation of the chat screenshot.

## Startup from the supplied references

- Black stage with Rivune's original silver emblem, outlined wordmark and quiet peripheral labels. Continue is deliberate; no simulated download percentage.
- Full-window CLI/API introduction and privacy page, using the supplied narrow columns, broad spacing and section dividers.
- Centered feature card over a blurred workspace, product illustration, four feature descriptions, cyan primary action, working carousel dots and dismissal.
- Native startup retains the cyan `startupAccent`; the interior uses its own muted ice accent.

## Original interior

- Graphite canvas `#15171a`, deep sidebar `#101214`, restrained raised surfaces, and a satin composer `#22252a`.
- Rivune's emblem and “Start with a thought.” home, with compact Together / Codex / Claude selection, recognizable provider marks, and subtle status dots.
- Unboxed conversation navigation, a clear New conversation action, search and a truthful Connections footer. Native history, filters, archive, favorites, projects and workspace controls retain their existing actions.
- Primary answers read on an open canvas. Supporting results use quiet surfaces and dividers.
- Full-window Settings with plain navigation, spacious sections and actual connection controls. Opening Settings keeps the workspace mounted: drafts, transcript position, inspector state and pending work remain intact.
- Provider mark provenance and bundled MIT notices: [Provider icon credits](PROVIDER_ICON_CREDITS.md).

## Runtime boundaries

Existing native Codex/Claude CLI execution, collaboration and the local browser bridge remain in place. This interface work does not add Google authentication, API-key execution, cloud sync, model downloads, local-model execution or MCP integration. Unavailable connection methods are labeled and do not collect keys. Automated tests use deterministic providers; visual checks did not send a provider request or enter credentials.

## Verification of the final source

- **Mac: 115 tests passed, zero failures.** Log: `/private/tmp/rivune-final-ui-mac-tests.log`. Derived data: `/private/tmp/rivune-final-ui-mac-build`.
- **iOS: generic Simulator build succeeded.** Log: `/private/tmp/rivune-final-ui-ios-build.log`.
- **Web: lint, TypeScript, all 7 workspace contract tests, and production build passed.** Logs: `/private/tmp/rivune-final-ui-web-{deps,lint,types,tests,build}.log`.
- Builds used local source mirrors to avoid earlier iCloud file-coordination stalls. All **48 native files and 28 web files** match the working source by SHA-256 in `/private/tmp/rivune-final-ui-manifest.json`. The original 27-file web mirror omitted the imported `.openai/hosting.json`; copying that existing config unchanged resolved the initial validation/startup failure. Locked dependencies were restored with install scripts disabled.
- Final browser inspection: default **1024×576 CSS viewport**, plus a **390×844 viewport override** (rendered as 312×675 CSS pixels with the browser's existing zoom). Home and Settings fit without horizontal overflow; navigation, Codex/Together selection, startup replay, privacy continuation and the feature card were checked. A temporary draft survived Settings/back and was then cleared. No browser console errors were reported. The viewport override was reset.
- Preview: `http://localhost:3187/workspace`, served locally from `/private/tmp/rivune-final-ui-web`. The original Rivune home is left open.
- Native visual inspection remains pending. Automatic approval review previously rejected launching the locally built app without action-time confirmation. No alternate launch method was used.

## Installed Mac build

`/Users/Aaravshah/Applications/Rivune Premium.app` contains the final build. It passed strict ad-hoc signature verification; only the generated test plugin was removed from the package copy. Binary hashes match the verified package. The existing app was preserved at:

`/Users/Aaravshah/Applications/Rivune Build Archives/Rivune Premium - before original interior.app`

Installation did not launch or quit any app. Source remains local and uncommitted; nothing was published.

```text
Rivune              37805a2810944a83df2e1de98c1a82e89e6a92aa1c954d8e60750daf633014f6
Rivune.debug.dylib  d91a80753a4be63ed320fb8a6ac6a71acba9e3ac3d313f2e1c77f9ddbb46d893
```

The native introduction marker is `rivune.introductionSeen.v2`; replay remains available. Existing conversation data and preferences are retained.
