import test from 'node:test';
import assert from 'node:assert/strict';
import { createHostLifecycleAdapter, createHostLifecycleCoordinator } from '../../prototypes/ai-native-workspace/src/host/lifecycle.ts';

function fixture({ delayed = false, rejectRegistration = false } = {}) {
  let handler; let finish; let opens = 0; let mutations = 0; let subscriptions = 0;
  const forbidden = async () => { mutations++; throw Error('Mutation forbidden in Settings fixture'); };
  const bridge = {
    beginShutdown: forbidden, flushShutdownDraft: forbidden,
    completeShutdown: forbidden, abortShutdown: forbidden,
    async onShutdownRequested() { return () => {}; },
    async onOpenSettings(callback) {
      subscriptions++;
      if (rejectRegistration) throw Error('registration unavailable');
      if (delayed) await new Promise(resolve => { finish = resolve; });
      handler = callback;
      return () => { handler = undefined; };
    },
  };
  const coordinator = createHostLifecycleCoordinator(createHostLifecycleAdapter(bridge), {
    prepareShutdown: forbidden, onOpenSettings() { opens++; },
  });
  return { coordinator, emit: () => handler?.(), finish: () => finish(),
    counts: () => ({ opens, mutations, subscriptions }) };
}

test('current source loses a Settings event before start; it is not replayed', async () => {
  const f = fixture(); f.emit(); await f.coordinator.start();
  assert.equal(f.counts().opens, 0);
  f.emit(); assert.equal(f.counts().opens, 1);
  assert.equal(f.counts().mutations, 0); f.coordinator.dispose();
});

test('current source loses an event during delayed registration', async () => {
  const f = fixture({ delayed: true }); const starting = f.coordinator.start();
  f.emit(); f.finish(); await starting;
  assert.equal(f.counts().opens, 0);
  f.emit(); assert.equal(f.counts().opens, 1);
  assert.equal(f.counts().mutations, 0); f.coordinator.dispose();
});

test('ready repeated clicks reach one subscription; disposal stops delivery', async () => {
  const f = fixture(); await Promise.all([f.coordinator.start(), f.coordinator.start()]);
  f.emit(); f.emit(); f.emit();
  assert.deepEqual(f.counts(), { opens: 3, mutations: 0, subscriptions: 1 });
  f.coordinator.dispose(); f.emit(); assert.equal(f.counts().opens, 3);
});

test('unavailable subscription blocks lifecycle without mutation', async () => {
  const f = fixture({ rejectRegistration: true });
  await assert.rejects(f.coordinator.start(), /subscription failed/);
  f.emit(); assert.equal(f.coordinator.getState().phase, 'blocked');
  assert.equal(f.counts().opens, 0); assert.equal(f.counts().mutations, 0);
  f.coordinator.dispose();
});

// Proposed protocol model only: one volatile navigation slot, not workspace data.
function pendingNavigation() {
  let sequence = 0; let pending = null; let mode = 'starting';
  return {
    click() { if (mode === 'recovery') return { unavailable: true }; pending = ++sequence; return pending; },
    peek: () => pending,
    ack(id) { if (pending === id) pending = null; },
    recovery() { mode = 'recovery'; pending = null; },
  };
}
test('proposed slot coalesces early clicks and old ACK cannot clear a newer click', () => {
  const p = pendingNavigation(); p.click(); const second = p.click();
  assert.equal(p.peek(), second);
  const third = p.click(); p.ack(second); assert.equal(p.peek(), third);
  p.ack(third); assert.equal(p.peek(), null);
});
test('proposed recovery rejects Settings and never carries an old request forward', () => {
  const p = pendingNavigation(); p.click(); p.recovery();
  assert.equal(p.peek(), null); assert.deepEqual(p.click(), { unavailable: true });
});
