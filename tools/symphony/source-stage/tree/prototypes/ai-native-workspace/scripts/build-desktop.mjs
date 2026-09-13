import { readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const native = fileURLToPath(new URL('../../../qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/', import.meta.url));

export function desktopHTML(html) {
  const entries = [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)];
  if (entries.length !== 1 || !/^\.\/assets\/[A-Za-z0-9_.-]+\.js$/.test(entries[0][1])) {
    throw new Error('Expected exactly one local Vite application entry.');
  }
  const policies = html.match(/<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*>/g) || [];
  if (policies.length !== 1) throw new Error('Expected exactly one browser preview CSP.');
  return {
    // Tauri injects/enforces app.security.csp. A browser dev-server policy must
    // not intersect with native IPC permissions or permit the preview socket.
    html: html.replace(policies[0], '').replace(entries[0][0], '<script type="module" src="./desktop-entry.mjs"></script>'),
    entry: `import './desktop-host.mjs';\nimport '${entries[0][1]}';\n`,
  };
}

export async function buildDesktop() {
  const config = JSON.parse(await readFile(resolve(native, 'tauri.conf.json'), 'utf8'));
  const output = resolve(frontend, 'dist-desktop');
  if (resolve(native, config.build.frontendDist) !== output) throw new Error('Native frontendDist does not match desktop output.');
  const csp = config.app?.security?.csp;
  if (typeof csp !== 'string' || !csp.includes("script-src 'self'") || !csp.includes('connect-src ipc: http://ipc.localhost') || /unsafe-eval|unsafe-inline|ws:|wss:/.test(csp)) {
    throw new Error('Native CSP is missing or unexpectedly permissive.');
  }
  // Clear only our dedicated generated output, never the browser dist/preview.
  await rm(output, { recursive: true, force: true });
  try {
    for (const args of [ ['node_modules/typescript/bin/tsc', '--noEmit'], ['node_modules/vite/bin/vite.js', 'build', '--outDir', output] ]) {
      const result = spawnSync(process.execPath, args, { cwd: frontend, stdio: 'inherit' });
      if (result.error || result.status !== 0) throw result.error || new Error(`Desktop web check/build failed (${result.status}).`);
    }
    const transformed = desktopHTML(await readFile(resolve(output, 'index.html'), 'utf8'));
    await copyFile(resolve(native, '../web/desktop-host.mjs'), resolve(output, 'desktop-host.mjs'));
    await writeFile(resolve(output, 'desktop-entry.mjs'), transformed.entry);
    await writeFile(resolve(output, 'index.html'), transformed.html);
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildDesktop();
}
