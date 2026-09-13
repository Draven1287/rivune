import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createModelDiscoveryAdapter } from '../src/host/modelDiscovery.ts';

test('documented registration race: frontend cancellation does not prove native cancellation', async () => {
  let register, release;
  let active = false;
  const cancellations = [];
  const adapter = createModelDiscoveryAdapter({
    discoverProviderModels: request => new Promise(resolve => {
      register = () => { active = true; };
      release = () => { active = false; resolve({ ...request, schemaVersion: 1,
        source: 'codexAppServerModelList', scope: 'isolatedUnauthenticated',
        state: 'unauthenticated', authentication: 'notAuthenticated',
        selectionEnabled: false, models: [], errorCode: null }); };
    }),
    cancelModelDiscovery: async () => { cancellations.push(active); return active; },
  });
  const controller = new AbortController();
  const pending = adapter.discover({ requestID: 'race', providerID: 'fixture' }, controller.signal);
  await Promise.resolve();
  controller.abort();
  assert.equal((await pending).state, 'cancelled');
  assert.deepEqual(cancellations, [false]);
  register();
  assert.equal(active, true);
  release();
  await Promise.resolve();
  assert.equal(cancellations.length, 1);
});
