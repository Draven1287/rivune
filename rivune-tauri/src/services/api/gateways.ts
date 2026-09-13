/** Optional API request profiles. This module never sends requests or accepts keys. */
export const gateways = {
  openrouter: { name: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions', fixtureModel: 'rivune/mock-model', description: 'One API for models from multiple providers.', docs: 'https://openrouter.ai/docs/quickstart' },
  fireworks: { name: 'Fireworks', endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions', fixtureModel: 'accounts/rivune/models/mock-model', description: 'Hosted inference for open and customized models.', docs: 'https://docs.fireworks.ai/getting-started/quickstart' },
} as const;
export type GatewayId = keyof typeof gateways;
export function gatewayRequestPreview(id: GatewayId, prompt: string, maxTokens: number) {
  if (!Object.hasOwn(gateways, id)) throw new Error('Choose a supported API service.');
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 12000) throw new Error('Enter a prompt of 1–12,000 characters.');
  if (!Number.isSafeInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096) throw new Error('Use an output limit from 1 to 4,096 tokens.');
  const gateway = gateways[id];
  return {
    simulation: true as const,
    method: 'POST' as const,
    endpoint: gateway.endpoint,
    body: {
      model: gateway.fixtureModel,
      messages: [{ role: 'user' as const, content: prompt.trim() }],
      stream: true,
      max_tokens: maxTokens,
      ...(id === 'openrouter' ? { provider: { allow_fallbacks: false } } : {}),
    },
  };
}
