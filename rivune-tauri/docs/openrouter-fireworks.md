# OpenRouter and Fireworks for Rivune

Reviewed September 12, 2026 against official documentation. Recommendation: prioritize OpenRouter for optional broad model access, then Fireworks for hosted open/customized-model inference. Keep existing subscription CLI connections as a separate connection type.

## What each adds

OpenRouter offers a unified API across model providers, model discovery, provider selection and fallbacks. Its OpenAI-compatible base URL is `https://openrouter.ai/api/v1`. Fireworks offers hosted inference and model customization; its OpenAI-compatible base URL is `https://api.fireworks.ai/inference/v1`. Both use their own API credentials and separate usage billing. Neither documented API flow transfers a user's consumer ChatGPT/Claude/Gemini/Grok subscription entitlement.

- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [Fireworks quickstart](https://docs.fireworks.ai/getting-started/quickstart)
- [Fireworks OpenAI compatibility](https://docs.fireworks.ai/tools-sdks/openai-compatibility)

## Routing is different from Council

A gateway routes a request to a model/provider. Rivune's Council needs explicit independent contributions and synthesis; Swarm needs task ownership, completion signals and independent review. A gateway does not implement those product behaviors automatically. Keep model identity, actual serving provider, and lead/member roles separate. Neither provider should appear as an extra council intelligence merely because it transports requests.

## Handling requirements for a later live adapter

1. Discover current model IDs, context limits, supported parameters and pricing. Never label a static mock list as discovered availability. OpenRouter uses catalog slugs/aliases; Fireworks IDs use `accounts/<account>/models/<model>`.
2. Keep OpenRouter provider fallback off until explicitly chosen. Do not silently replace a Council member with another model/provider. Provider max-price controls are per-million-token rates, not a hard per-request spending budget.
3. Separate provider-enforced account/key budgets from Rivune estimates. Multi-agent work can multiply calls, context, retries and synthesis cost. Require an aggregate job budget before enabling paid Council/Swarm execution.
4. Preserve final streaming usage, even in chunks without text. If a stopped stream omits final usage, show usage unavailable; never report zero cost merely because it is missing.
5. Use native secure credential storage and a narrow backend transport. No keys in the browser UI, localStorage, logs, fixtures or exports. Live configuration, credentials, billing and end-to-end provider replies remain unimplemented here.
6. Do not make automatic paid retries or change account limits. Review provider-side limits, eligible models and privacy routing before enabling a paid connection.

- [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
- [OpenRouter usage accounting](https://openrouter.ai/docs/cookbook/administration/usage-accounting)
- [OpenRouter spend controls](https://openrouter.ai/blog/tutorials/team-spend-controls-setup/)
- [Fireworks account quotas](https://docs.fireworks.ai/guides/quotas_usage/account-quotas)

## Implemented in this build

Connections → API connections · optional → Preview OpenRouter & Fireworks opens an anchored local simulation panel. It selects either service, accepts a test prompt and output-limit preview, and simulates success/streaming/slow/error scenarios using Rivune's existing local MockProvider. Request previews use the documented endpoints with explicitly fictional model IDs and no credentials. OpenRouter's request preview disables provider fallbacks; its routing fields never leak into the Fireworks body.

This is a request builder and UI simulation, not a live provider integration or an SSE protocol conformance test. Fixtures use simulated token counts and do not enforce real model output limits. Model discovery, billing verification, actual endpoint responses, provider quotas and secure-key setup are not tested by these mocks.

Validation: production build passed; 77 regression tests passed. Browser checks confirmed an OpenRouter success fixture and a Fireworks offline fixture. No live model calls, credentials, account creation, or paid API requests were used.
