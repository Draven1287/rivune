import test from 'node:test';
import assert from 'node:assert/strict';
import { gatewayRequestPreview } from './compiled/services/api/gateways.js';

test('gateway previews use separate fixed endpoints and fictional models without network or credentials', () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Network forbidden'); };
  try {
    const router = gatewayRequestPreview('openrouter', ' Compare ideas ', 512);
    const fireworks = gatewayRequestPreview('fireworks', 'Compare ideas', 128);
    assert.equal(router.endpoint, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(fireworks.endpoint, 'https://api.fireworks.ai/inference/v1/chat/completions');
    assert.equal(router.body.messages[0].content, 'Compare ideas');
    assert.equal(router.body.model, 'rivune/mock-model');
    assert.equal(fireworks.body.model, 'accounts/rivune/models/mock-model');
    assert.equal(router.simulation, true);
    assert.equal(router.body.max_tokens, 512);
    assert.equal(fireworks.body.max_tokens, 128);
    assert.equal('headers' in router, false);
  } finally { globalThis.fetch = previous; }
});
test('OpenRouter routing policy is explicit and cannot leak into Fireworks requests', () => {
  const router = gatewayRequestPreview('openrouter', 'Test', 64);
  assert.deepEqual(router.body.provider, { allow_fallbacks: false });
  assert.equal('provider' in gatewayRequestPreview('fireworks', 'Test', 64).body, false);
  router.body.provider.allow_fallbacks = true;
  assert.equal(gatewayRequestPreview('openrouter', 'Test', 64).body.provider.allow_fallbacks, false);
});
test('invalid providers, prompts and output limits fail before a request preview is accepted', () => {
  for (const id of ['https://example.com', '__proto__', 'constructor', 'unknown']) assert.throws(() => gatewayRequestPreview(id, 'Test', 10));
  for (const limit of [0, -1, 1.5, NaN, Infinity, 4097]) assert.throws(() => gatewayRequestPreview('openrouter', 'Test', limit));
  for (const prompt of ['', '   ', 'a'.repeat(12001)]) assert.throws(() => gatewayRequestPreview('fireworks', prompt, 64));
});
