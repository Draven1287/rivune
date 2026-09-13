import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../../qa-artifacts/cross-platform-shell-20260907/candidate4-runtime-r2/web/desktop-host.mjs', import.meta.url), 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  let pending = false, listener = null, rejectListen = false, holdListen = null, holdConsume = null;
  const calls = [];
  const context = { __TAURI__: { core: { invoke: async name => {
    calls.push(name); assert.equal(name, 'take_pending_settings_request');
    const value = pending; pending = false;
    if (holdConsume) { const held = holdConsume; holdConsume = null; await held; }
    return value;
  } }, event: { listen: async (name, callback) => {
    assert.equal(name, 'rivune://open-settings');
    if (rejectListen) throw new Error('subscription rejected');
    if (holdListen) await holdListen;
    listener = callback;
    return () => { if (listener === callback) listener = null; };
  } } } };
  vm.runInNewContext(source, context);
  return { bridge: context.__RIVUNE_DESKTOP_HOST__, calls,
    activate() { pending = true; listener?.(); },
    duplicateHint() { listener?.(); },
    holdRegistration(value) { holdListen = value; },
    holdConsumption(value) { holdConsume = value; },
    rejectRegistration(value) { rejectListen = value; },
    hasListener() { return listener !== null; },
  };
}

test('Settings before delayed subscription coalesces and delivers exactly once after registration', async () => {
  const f = fixture(); let release, received = 0;
  f.holdRegistration(new Promise(resolve => { release = resolve; }));
  const subscribing = f.bridge.onOpenSettings(() => received++);
  f.activate(); f.activate(); assert.equal(received, 0); assert.equal(f.calls.length, 0);
  release(); const cleanup = await subscribing;
  assert.equal(received, 1); f.duplicateHint(); f.duplicateHint(); await tick(); assert.equal(received, 1);
  cleanup(); assert.equal(f.hasListener(), false);
});

test('Settings consumed during unmount reaches only the replacement receiver', async () => {
  const f = fixture(); let old = 0, replacement = 0, release;
  const cleanup = await f.bridge.onOpenSettings(() => old++);
  f.holdConsumption(new Promise(resolve => { release = resolve; }));
  f.activate(); cleanup();
  const nextCleanup = await f.bridge.onOpenSettings(() => replacement++);
  release(); await tick();
  assert.equal(old, 0); assert.equal(replacement, 1); nextCleanup();
});

test('Settings retained after unmount is delivered on the next registration without replay', async () => {
  const f = fixture(); let received = 0, release;
  const cleanup = await f.bridge.onOpenSettings(() => received++);
  f.holdConsumption(new Promise(resolve => { release = resolve; }));
  f.activate(); cleanup(); release(); await tick(); assert.equal(received, 0);
  const nextCleanup = await f.bridge.onOpenSettings(() => received++);
  assert.equal(received, 1); nextCleanup();
  const lastCleanup = await f.bridge.onOpenSettings(() => received++);
  assert.equal(received, 1); lastCleanup();
});

test('Rejected Settings registration does not consume pending navigation or leak a receiver', async () => {
  const f = fixture(); let received = 0; f.activate(); f.rejectRegistration(true);
  await assert.rejects(f.bridge.onOpenSettings(() => received++), /subscription rejected/);
  assert.equal(f.calls.length, 0); assert.equal(f.hasListener(), false);
  f.rejectRegistration(false); const cleanup = await f.bridge.onOpenSettings(() => received++);
  assert.equal(received, 1); cleanup();
});

test('A second Settings receiver is rejected without replacing the active receiver', async () => {
  const f = fixture(); let received = 0;
  const cleanup = await f.bridge.onOpenSettings(() => received++);
  await assert.rejects(f.bridge.onOpenSettings(() => assert.fail('duplicate receiver')), /already has a receiver/);
  f.activate(); await tick(); assert.equal(received, 1); cleanup();
});
