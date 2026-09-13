import { openPopover } from '../../components/shared/popover.js';
import { gateways, gatewayRequestPreview, type GatewayId } from '../../services/api/gateways.js';
import { MockProvider, scenarios, type Scenario } from '../../services/api/mockProvider.js';

export function openGatewayPreview(anchor: HTMLElement) {
  const panel = openPopover(anchor, 'API simulation');
  panel.classList.add('gateway-preview');
  panel.innerHTML = `<strong>Optional API services</strong><p>Local simulation · no keys, network, or charges.</p>
    <label>Service<select id="gateway-service"><option value="openrouter">OpenRouter</option><option value="fireworks">Fireworks</option></select></label>
    <p id="gateway-description"></p><p>These use separate API billing. Your existing AI subscriptions do not pay for these requests.</p>
    <label>Test prompt<textarea id="gateway-prompt" maxlength="12000" rows="2">Explain how several perspectives can improve an idea.</textarea></label>
    <label>Output limit in request<input id="gateway-limit" type="number" min="1" max="4096" step="1" value="512"></label>
    <label>Simulation scenario<select id="gateway-scenario">${scenarios.filter(s => s !== 'tool-call').map(s => `<option value="${s}">${s.replaceAll('-', ' ')}</option>`).join('')}</select></label>
    <button id="gateway-run">Run local simulation</button><button id="gateway-stop" hidden>Stop simulation</button>
    <p id="gateway-status" role="status">Not connected. This tests Rivune’s UI, not the provider endpoint.</p><pre id="gateway-output"></pre>
    <details><summary>Request preview · not sent</summary><p>Fictional model ID. The output limit is serialized here; fixture token counts are simulated.</p><pre id="gateway-request"></pre></details>
    <p><a id="gateway-docs" target="_blank" rel="noopener noreferrer">Official setup documentation ↗</a></p>`;
  const service = panel.querySelector<HTMLSelectElement>('#gateway-service')!;
  const prompt = panel.querySelector<HTMLTextAreaElement>('#gateway-prompt')!;
  const limit = panel.querySelector<HTMLInputElement>('#gateway-limit')!;
  const scenario = panel.querySelector<HTMLSelectElement>('#gateway-scenario')!;
  const run = panel.querySelector<HTMLButtonElement>('#gateway-run')!;
  const stop = panel.querySelector<HTMLButtonElement>('#gateway-stop')!;
  const status = panel.querySelector<HTMLElement>('#gateway-status')!;
  const output = panel.querySelector<HTMLElement>('#gateway-output')!;
  const request = panel.querySelector<HTMLElement>('#gateway-request')!;
  const update = () => {
    const gateway = gateways[service.value as GatewayId];
    panel.querySelector('#gateway-description')!.textContent = gateway.description;
    panel.querySelector<HTMLAnchorElement>('#gateway-docs')!.href = gateway.docs;
    try { request.textContent = JSON.stringify(gatewayRequestPreview(service.value as GatewayId, prompt.value, Number(limit.value)), null, 2); run.disabled = false; }
    catch (error) { request.textContent = error instanceof Error ? error.message : 'Invalid request.'; run.disabled = true; }
  };
  service.onchange = prompt.oninput = limit.oninput = update;
  run.onclick = async () => {
    const preview = gatewayRequestPreview(service.value as GatewayId, prompt.value, Number(limit.value));
    const controller = new AbortController();
    // Closing/replacing the dropdown cancels its local fixture work.
    const observer = new MutationObserver(() => { if (!panel.isConnected) controller.abort(); });
    observer.observe(document.body, { childList: true });
    stop.onclick = () => { controller.abort(); stop.disabled = true; };
    run.disabled = service.disabled = prompt.disabled = limit.disabled = scenario.disabled = true;
    stop.hidden = false; stop.disabled = false; output.textContent = ''; status.textContent = 'Simulating locally…';
    try {
      for await (const event of new MockProvider().stream({ prompt: preview.body.messages[0].content, model: `Mock ${gateways[service.value as GatewayId].name}`, scenario: scenario.value as Scenario, signal: controller.signal })) {
        if (event.type === 'text') output.textContent += event.text;
        if (event.type === 'usage') status.textContent = `Fixture usage: ${event.input} input · ${event.output} output · $0 API cost.`;
      }
      status.textContent += ' Local simulation complete; provider not contacted.';
    } catch (error) {
      status.textContent = controller.signal.aborted ? 'Stopped. Partial fixture output kept.' : error instanceof Error ? error.message : 'Simulation failed.';
    } finally {
      observer.disconnect(); stop.hidden = true;
      run.disabled = service.disabled = prompt.disabled = limit.disabled = scenario.disabled = false;
      run.textContent = 'Run again';
    }
  };
  update();
}
