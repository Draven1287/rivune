import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { desktopHTML } from '../scripts/build-desktop.mjs';
const fixture = '<meta http-equiv="Content-Security-Policy" content="connect-src ws://127.0.0.1:4317"><div id="root"></div><script type="module" crossorigin src="./assets/index-test.js"></script>';
test('desktop entry evaluates bridge before application code', async () => {
  const transformed = desktopHTML(fixture);
  assert.match(transformed.html, /src="\.\/desktop-entry.mjs"/);
  assert.doesNotMatch(transformed.html, /Content-Security-Policy|4317/);
  const directory = await mkdtemp(join(tmpdir(), 'rivune-desktop-wiring-'));
  const key = `rivuneDesktopOrder${Date.now()}`;
  try {
    await mkdir(join(directory, 'assets'));
    await writeFile(join(directory, 'desktop-host.mjs'), `globalThis['${key}'] = ['bridge'];`);
    await writeFile(join(directory, 'assets/index-test.js'), `if (globalThis['${key}']?.[0] !== 'bridge') throw Error('Bridge missing'); globalThis['${key}'].push('app');`);
    await writeFile(join(directory, 'desktop-entry.mjs'), transformed.entry);
    await import(pathToFileURL(join(directory, 'desktop-entry.mjs')).href);
    assert.deepEqual(globalThis[key], ['bridge', 'app']);
  } finally { delete globalThis[key]; await rm(directory, { recursive: true, force: true }); }
});
test('desktop HTML rejects missing, duplicate and nonlocal entry/policy', () => {
  for (const html of ['', fixture + '<script type="module" src="./assets/other.js"></script>', fixture.replace('./assets/index-test.js', 'https://example.com/app.js'), fixture.replace('./assets/index-test.js', '../escape.js'), fixture.replace('Content-Security-Policy', 'Other'), fixture + '<meta http-equiv="Content-Security-Policy" content="">']) assert.throws(() => desktopHTML(html));
});
test('native config targets dedicated output and preserves IPC CSP', async () => {
  const native = new URL('../../../qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/src-tauri/', import.meta.url);
  const config = JSON.parse(await readFile(new URL('tauri.conf.json', native), 'utf8'));
  assert.equal(resolve(fileURLToPath(native), config.build.frontendDist), fileURLToPath(new URL('../dist-desktop', import.meta.url)));
  assert.equal(config.app.withGlobalTauri, true);
  assert.equal(config.app.security.csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ipc: http://ipc.localhost; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  assert.equal(config.app.security.dangerousDisableAssetCspModification, undefined);
});
