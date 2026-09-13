const fs = require('fs');
const path = require('path');
const {chromium} = require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = __dirname, base = 'http://127.0.0.1:4298/rivune/';
const routes = ['', 'app/', 'about/', 'how-it-works/', 'faq/', 'contact/', 'download/', 'privacy/', 'council-vs-swarm/'];
const report = {scope: 'Independent local browser review; simulated clipboard capabilities, no email sent', states: [], clipboard: [], disclosures: [], errors: [], failures: []};
function check(value, message) { if (!value) report.failures.push(message); }
(async () => {
  const browser = await chromium.launch({executablePath: '/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell', headless: true});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(20000);
    page.on('pageerror', e => report.errors.push(e.message));
    for (const width of [1280, 768, 390, 320]) {
      await page.setViewportSize({width, height: width === 320 ? 568 : 900});
      for (const route of routes) {
        const response = await page.goto(base + route, {waitUntil: 'domcontentloaded'});
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(response.status() === 200, `${width} ${route} response`);
        check(overflow <= 1, `${width} ${route} overflow ${overflow}`);
        const contacts = await page.locator('nav a,footer a').evaluateAll(nodes => nodes.filter(n => n.textContent.trim() === 'Contact').map(n => n.getAttribute('href')));
        check(contacts.length > 0 && contacts.every(h => h === '/rivune/contact/'), `${width} ${route} contact navigation`);
        report.states.push({width, route, status: response.status(), overflow});
      }
    }
    await page.goto(base + 'contact/');
    const gmail = new URL(await page.getByRole('link', {name: /Open Gmail compose/}).getAttribute('href'));
    check(gmail.origin === 'https://mail.google.com' && gmail.searchParams.get('to') === 'rivune.crave757@slmails.com', 'Gmail compose recipient');
    check(await page.getByRole('link', {name: 'Open your email app'}).getAttribute('href') === 'mailto:rivune.crave757@slmails.com', 'mailto recipient');
    check(await page.locator('[data-copy-status]').getAttribute('aria-live') === 'polite', 'copy status announcement');
    for (const behavior of ['success', 'rejected', 'missing']) {
      await page.reload({waitUntil: 'domcontentloaded'});
      await page.evaluate(behavior => {
        window.__copied = null;
        Object.defineProperty(navigator, 'clipboard', {configurable: true, value: behavior === 'missing' ? undefined : {
          writeText: async text => { if (behavior === 'rejected') throw new DOMException('Not allowed', 'NotAllowedError'); window.__copied = text; }
        }});
      }, behavior);
      await page.locator('[data-copy-email]').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => /^(Email copied\.|Copy failed\.)/.test(document.querySelector('[data-copy-status]').textContent));
      const status = await page.locator('[data-copy-status]').textContent();
      const copied = await page.evaluate(() => window.__copied);
      const focus = await page.locator('[data-copy-email]').evaluate(n => n === document.activeElement);
      check(focus, `${behavior} copy retained keyboard focus`);
      check(behavior === 'success' ? status === 'Email copied.' && copied === 'rivune.crave757@slmails.com' : status.includes('copy it manually') && copied === null, `${behavior} clipboard outcome`);
      report.clipboard.push({behavior, status, copied, focus});
    }
    await page.screenshot({path: path.join(root, 'contact-320.png'), fullPage: true});
    await page.goto(base + 'how-it-works/');
    const summaries = page.locator('.mode-accordion summary');
    check(await summaries.count() === 3, 'three mode disclosures');
    for (let i = 0; i < 3; i++) {
      const summary = summaries.nth(i);
      await summary.focus();
      const before = await summary.evaluate(n => n.parentElement.open);
      await page.keyboard.press('Enter');
      const afterEnter = await summary.evaluate(n => n.parentElement.open);
      await page.keyboard.press('Space');
      const afterSpace = await summary.evaluate(n => n.parentElement.open);
      check(afterEnter !== before && afterSpace === before, `mode ${i} keyboard toggles`);
      report.disclosures.push({label: await summary.textContent(), before, afterEnter, afterSpace});
    }
    check((await page.locator('.mode-accordion').textContent()).includes('not installed'), 'Swarm availability truthful');
    await page.setViewportSize({width: 1280, height: 900});
    await page.goto(base);
    const footer = await page.locator('.footer').boundingBox();
    report.footerHeight = footer.height;
    check(footer.height < 180, 'compact footer');
    await page.screenshot({path: path.join(root, 'home-1280.png'), fullPage: true});
    check(report.errors.length === 0, 'no page errors');
    report.passed = report.failures.length === 0;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(root, 'INDEPENDENT_BROWSER.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify({states: report.states.length, clipboard: report.clipboard.length, failures: report.failures, errors: report.errors}));
  if (report.failures.length) process.exitCode = 1;
})().catch(e => { report.failures.push(String(e)); fs.writeFileSync(path.join(root, 'INDEPENDENT_BROWSER.json'), JSON.stringify(report, null, 2)); console.error(String(e)); process.exitCode = 1; });
