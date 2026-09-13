# Desktop web build

From this directory, with dependencies installed from package-lock.json:

```sh
npm run build:desktop
```

This runs TypeScript checking and a new Vite production build into `dist-desktop/`. It copies the current native bridge and generates an ES module entry that imports the bridge before the React bundle. Native `src-tauri/tauri.conf.json` points directly to this directory using a repository-relative path. Run this web step before a separately authorized native Cargo/Tauri build; direct Cargo builds do not invoke npm automatically. Generated output is excluded from source export.

Browser `index.html`, `npm run dev`, port 4317 and browser `dist/` are unchanged. The desktop output removes the browser preview CSP meta tag; Tauri's unchanged `app.security.csp` is authoritative and supplies IPC permissions and asset CSP handling. No unsafe-inline/eval, preview websocket permissions, capability changes, QA controls or provider configuration are added. The desktop output is intended for Tauri, not independent public web hosting.

The script resolves paths from its own source location, validates the native destination and CSP before building, accepts exactly one local Vite entry, and removes its dedicated output on build/transformation failure. It never consumes archived dist or QA scripts. Do not run concurrent desktop builds into the same output directory.

Focused validation:

```sh
node --test tests/desktopBuild.test.mjs
npm run build:desktop
```

These check module evaluation order, malformed/nonlocal entry rejection, native output/CSP wiring, and the web build. Native asset loading, CSP behavior, providers and packaged runtime still require independent validation. No native launch is part of this command.
