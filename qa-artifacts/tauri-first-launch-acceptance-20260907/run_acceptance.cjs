const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = __dirname;
const binding = JSON.parse(fs.readFileSync(path.join(root, 'SOURCE_BINDING.json')));
const source = path.resolve(root, binding.sourceRoot);
const candidateRoot = path.dirname(source);
const rustWirePath = path.join(root, 'evidence', 'rust-wire-fixture.json');
const rustWire = JSON.parse(fs.readFileSync(rustWirePath));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'FIXTURE_INDEX.json'))).cases
  .map(id => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', `${id}.json`))));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const check = (name, pass, observed, required) => ({ name, pass: Boolean(pass), observed, required });

for (const [name, digest] of Object.entries(binding.files)) {
  const actual = sha256(path.join(source, name));
  if (actual !== digest) throw new Error(`Source binding mismatch for ${name}: ${actual}`);
}
for (const [name, digest] of Object.entries(binding.rustSourceFiles)) {
  const actual = sha256(path.join(candidateRoot, name));
  if (actual !== digest) throw new Error(`Rust source binding mismatch for ${name}: ${actual}`);
}
if (sha256(rustWirePath) !== binding.rustWireFixtureSha256) throw new Error('Rust wire fixture hash mismatch.');
if (rustWire.providerCalls !== 0 || !rustWire.synthetic || rustWire.snapshot.schemaVersion !== 1 || !Object.hasOwn(rustWire.snapshot, 'selectedProviderID')) {
  throw new Error('Rust wire fixture does not preserve the synthetic v1 boundary.');
}
for (const fixture of fixtures) {
  if (!fixture.wireShape?.startsWith('Derived from evidence/rust-wire-fixture.json')) throw new Error(`Fixture ${fixture.id} lacks Rust wire provenance.`);
}

async function openFixture(browser, fixture) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.route('http://rivune-first-launch.test/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (!Object.hasOwn(binding.files, name)) return route.abort();
    await route.fulfill({
      status: 200,
      body: fs.readFileSync(path.join(source, name)),
      contentType: name.endsWith('.mjs') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html',
    });
  });
  await page.addInitScript(({ snapshot, behavior }) => {
    const state = structuredClone(snapshot);
    let fixtureID = 0;
    if (typeof crypto.randomUUID !== 'function') {
      Object.defineProperty(crypto, 'randomUUID', { value: () => `00000000-0000-4000-8000-${String(++fixtureID).padStart(12, '0')}` });
    }
    window.__acceptanceCalls = { configure: 0, save: 0, retry: 0, cancel: 0, submit: 0 };
    window.setInterval = () => 1;
    window.__RIVUNE_DESKTOP_HOST__ = {
      getSnapshot: async () => {
        if (behavior.initialSnapshotDelayMs) await new Promise(resolve => setTimeout(resolve, behavior.initialSnapshotDelayMs));
        return structuredClone(state);
      },
      openConversation: async () => {},
      createConversation: async ({ id, title }) => state.conversations.push({ id, title, draft: '' }),
      configureProvider: async (provider, select) => {
        window.__acceptanceCalls.configure += 1;
        if (behavior.configureError) throw new Error(behavior.configureError);
        state.providers.push(provider);
        if (select) state.selectedProviderID = provider.id;
      },
      saveDraft: async (conversationID, draft) => {
        window.__acceptanceCalls.save += 1;
        if (behavior.saveError) throw new Error(behavior.saveError);
        const conversation = state.conversations.find(item => item.id === conversationID);
        if (conversation) conversation.draft = draft;
      },
      submitRun: async request => {
        window.__acceptanceCalls.submit += 1;
        if (!state.selectedProviderID) return { state: 'rejected', requestID: request.id, error: behavior.submitWithoutProviderError || 'Choose a provider before sending.' };
        return { state: 'accepted', requestID: request.id };
      },
      reconcileRun: async requestID => ({ state: 'accepted', requestID }),
      retryRun: async (sourceRunID, newRequestID) => {
        window.__acceptanceCalls.retry += 1;
        state.runs.push({ id: newRequestID, conversationID: state.runs.find(item => item.id === sourceRunID)?.conversationID || 'c1', status: behavior.retryState || 'queued', updatedAt: '2026-09-07T20:01:00Z' });
        return { state: 'accepted', requestID: newRequestID };
      },
      cancelRun: async requestID => {
        window.__acceptanceCalls.cancel += 1;
        const run = state.runs.find(item => item.id === requestID);
        if (run) { run.status = 'cancelled'; run.updatedAt = '2026-09-07T20:01:00Z'; }
        return { state: 'accepted', requestID };
      },
    };
  }, { snapshot: fixture.snapshot, behavior: fixture.behavior });
  await page.goto('http://rivune-first-launch.test/', { waitUntil: 'domcontentloaded' });
  const initial = await page.evaluate(() => ({
    status: document.querySelector('#connection-status')?.textContent?.trim(),
    promptDisabled: document.querySelector('#prompt')?.disabled,
    submitDisabled: document.querySelector('#submit')?.disabled,
  }));
  await page.waitForFunction(() => document.querySelector('#connection-status')?.textContent !== 'Connecting…');
  await page.evaluate(id => {
    const badge = document.createElement('div');
    badge.id = 'synthetic-fixture-badge';
    badge.textContent = `SYNTHETIC ACCEPTANCE FIXTURE: ${id} — NO PROVIDER CALL`;
    Object.assign(badge.style, { position: 'fixed', inset: '0 0 auto 0', zIndex: '9999', padding: '7px', background: '#642020', color: 'white', textAlign: 'center', font: '700 12px system-ui' });
    document.body.prepend(badge);
  }, fixture.id);
  return { page, errors, initial };
}

async function evaluateCase(browser, fixture) {
  const { page, errors, initial } = await openFixture(browser, fixture);
  const checks = [];
  const status = () => page.locator('#connection-status').textContent().then(value => value.trim());
  try {
    if (fixture.action === 'observe') {
      const current = await status();
      const conversationCount = await page.locator('#conversations button').count();
      checks.push(check('status does not claim connected', !/connected/i.test(current), current, 'An empty or no-provider state must not be labeled connected.'));
      checks.push(check('new conversation is available', await page.locator('#new-conversation').isEnabled(), 'enabled', 'The user can start a conversation.'));
      if (fixture.id === 'empty') {
        checks.push(check('loading state is explicit', initial.status === 'Connecting…', initial.status, 'The initial host check is announced as Connecting.'));
        checks.push(check('send disabled while loading', initial.submitDisabled, initial.submitDisabled, 'Send stays disabled until the initial snapshot is valid.'));
        checks.push(check('message entry disabled while loading', initial.promptDisabled, initial.promptDisabled, 'Message entry stays disabled until the initial snapshot is valid.'));
        checks.push(check('message entry disabled with no conversation', await page.locator('#prompt').isDisabled(), await page.locator('#prompt').isDisabled(), 'Message entry stays disabled until a conversation exists.'));
        checks.push(check('empty state explains next step', /new conversation|start/i.test(current), current, 'The visible status explains the first step.'));
      } else {
        checks.push(check('send disabled with no provider', await page.locator('#submit').isDisabled(), await page.locator('#submit').isDisabled(), 'Send stays disabled until a provider is ready.'));
        checks.push(check('conversation remains visible', conversationCount === 1, conversationCount, 'The existing conversation is visible.'));
      }
    } else if (fixture.action === 'configure-invalid') {
      await page.locator('.provider-settings summary').click();
      await page.locator('#provider-path').fill('relative/provider');
      await page.locator('#connect-provider').click();
      const current = await status();
      checks.push(check('configuration invoked once', await page.evaluate(() => window.__acceptanceCalls.configure) === 1, await page.evaluate(() => window.__acceptanceCalls.configure), 'One configuration attempt.'));
      checks.push(check('correction is actionable', /absolute.*path/i.test(current), current, 'Explain that an absolute provider path is required.'));
      checks.push(check('state does not claim connected', !/is connected|connected to/i.test(current), current, 'Invalid configuration remains unconnected.'));
    } else if (fixture.action === 'type-draft') {
      await page.locator('#prompt').fill('Keep this draft visible');
      await page.waitForTimeout(260);
      const current = await status();
      checks.push(check('draft remains visible', await page.locator('#prompt').inputValue() === 'Keep this draft visible', await page.locator('#prompt').inputValue(), 'Draft text remains visible.'));
      checks.push(check('save failure announced', /permission denied/i.test(current), current, 'The save failure is announced in the status region.'));
      checks.push(check('save error uses user-facing recovery copy', /could not save|couldn.t save|try again|choose another/i.test(current), current, 'Explain that the draft was not saved and what the user can do.'));
    } else if (fixture.action === 'retry-run') {
      checks.push(check('retry offered for failed task', await page.locator('#retry-run').isVisible(), await page.locator('#retry-run').isVisible(), 'Retry is visible for the failed task.'));
      await page.locator('#retry-run').evaluate(element => element.click());
      await page.waitForTimeout(50);
      checks.push(check('retry invoked once', await page.evaluate(() => window.__acceptanceCalls.retry) === 1, await page.evaluate(() => window.__acceptanceCalls.retry), 'Exactly one retry request.'));
      checks.push(check('new task state is visible', /queued/i.test(await page.locator('#run-status').textContent()), await page.locator('#run-status').textContent(), 'The replacement task appears as queued.'));
      checks.push(check('connection status avoids provider-success claim', !/provider.*connected|connected through/i.test(await status()), await status(), 'Retry does not claim a provider connection succeeded.'));
    } else if (fixture.action === 'cancel-run') {
      checks.push(check('stop offered for running task', await page.locator('#cancel').isVisible(), await page.locator('#cancel').isVisible(), 'Stop is visible only while running.'));
      await page.locator('#cancel').click();
      await page.waitForTimeout(0);
      checks.push(check('cancel invoked once', await page.evaluate(() => window.__acceptanceCalls.cancel) === 1, await page.evaluate(() => window.__acceptanceCalls.cancel), 'Exactly one cancellation request.'));
      checks.push(check('cancelled state visible', /cancelled/i.test(await page.locator('#run-status').textContent()), await page.locator('#run-status').textContent(), 'The task is shown as cancelled.'));
      checks.push(check('stop removed after cancellation', await page.locator('#cancel').isHidden(), await page.locator('#cancel').isHidden(), 'Stop is hidden after cancellation.'));
    } else if (fixture.action === 'find-import-preview') {
      const controls = await page.getByRole('button', { name: /import|preview/i }).count();
      checks.push(check('import preview surface exists', controls > 0, controls, 'Explicit source selection and preview must exist before import can be accepted.'));
      checks.push(check('no automatic import or dispatch', await page.evaluate(() => window.__acceptanceCalls.submit) === 0, await page.evaluate(() => window.__acceptanceCalls.submit), 'Opening the workspace performs no request.'));
    } else if (fixture.action === 'find-unsupported-mode') {
      const body = await page.locator('body').innerText();
      checks.push(check('unsupported mode is identified', /council.*(not available|unsupported|planned)|unsupported.*council/i.test(body), body.includes('Council') ? 'Council title only' : 'No mode notice', 'The imported Council mode is identified as unavailable.'));
      checks.push(check('unsupported mode is not dispatched', await page.evaluate(() => window.__acceptanceCalls.submit) === 0, await page.evaluate(() => window.__acceptanceCalls.submit), 'No request is sent automatically.'));
      checks.push(check('imported draft remains reviewable', await page.locator('#prompt').inputValue() === 'Review this plan', await page.locator('#prompt').inputValue(), 'The imported draft remains visible.'));
    }

    await page.locator('#new-conversation').focus();
    const focus = await page.locator('#new-conversation').evaluate(element => ({ outlineWidth: getComputedStyle(element).outlineWidth, outlineColor: getComputedStyle(element).outlineColor }));
    checks.push(check('keyboard focus visible', parseFloat(focus.outlineWidth) >= 3, focus, 'Focused controls have a visible 3px indicator.'));
    checks.push(check('status is announced', await page.locator('#connection-status[role="status"]').count() === 1, 'role=status', 'State and errors use an announced status region.'));
    checks.push(check('no renderer error', errors.length === 0, errors, 'No page errors.'));
    await page.screenshot({ path: path.join(root, 'evidence', 'screenshots', `${fixture.id}.png`), fullPage: true });
    return { id: fixture.id, title: fixture.title, synthetic: true, providerCalls: 0, checks, accepted: checks.every(item => item.pass) };
  } finally {
    await page.close({ runBeforeUnload: false });
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell', headless: true });
  try {
    const cases = [];
    for (const fixture of fixtures) cases.push(await evaluateCase(browser, fixture));
    const results = {
      schema: 'rivune-first-launch-acceptance-results/v1',
      sourceCandidate: binding.candidate,
      tauriLaunched: false,
      syntheticHost: true,
      providerCalls: 0,
      accepted: cases.every(item => item.accepted),
      cases,
      summary: {
        cases: cases.length,
        acceptedCases: cases.filter(item => item.accepted).length,
        failedChecks: cases.flatMap(item => item.checks.filter(check => !check.pass).map(check => `${item.id}: ${check.name}`)),
      },
    };
    fs.writeFileSync(path.join(root, 'evidence', 'RESULTS.json'), JSON.stringify(results, null, 2) + '\n');
    fs.writeFileSync(path.join(root, 'evidence', 'RESULTS.txt'), `${results.accepted ? 'ACCEPTED' : 'BLOCKED'}: ${results.summary.acceptedCases}/${results.summary.cases} cases accepted\n${results.summary.failedChecks.map(item => `- ${item}`).join('\n')}\n`);
    console.log(fs.readFileSync(path.join(root, 'evidence', 'RESULTS.txt'), 'utf8'));
    process.exitCode = results.accepted ? 0 : 2;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
