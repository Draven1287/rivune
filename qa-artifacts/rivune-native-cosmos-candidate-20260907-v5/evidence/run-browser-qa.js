const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const base = 'http://127.0.0.1:4300/rivune/';
const routes = ['', 'app/', 'how-it-works/', 'faq/', 'about/', 'contact/', 'download/', 'privacy/', 'council-vs-swarm/'];
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile390', width: 390, height: 844 },
  { name: 'mobile320', width: 320, height: 568 },
];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    headless: true,
  });
  const report = { routes: [], contact: {}, modes: {}, platforms: {}, errors: [] };
  try {
    const context = await browser.newContext({ viewport: viewports[0], permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.on('pageerror', error => report.errors.push(error.message));

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const route of routes) {
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
        const state = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          title: document.title,
        }));
        assert(response && response.status() === 200, `${viewport.name} ${route || 'home'} status`);
        assert(state.overflow <= 1, `${viewport.name} ${route || 'home'} overflow ${state.overflow}`);
        report.routes.push({ viewport: viewport.name, route: route || 'home', status: response.status(), ...state });
      }
    }

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(base + 'contact/');
      const bounds = await page.evaluate(() => {
        const card = document.querySelector('.contact-card');
        const rect = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        const contentLeft = rect.left + parseFloat(style.paddingLeft);
        const contentRight = rect.right - parseFloat(style.paddingRight);
        const children = [...card.querySelectorAll('.contact-email,.contact-actions,.contact-actions>*')].map(element => {
          const child = element.getBoundingClientRect();
          return { tag: element.tagName, className: element.className, left: child.left, right: child.right };
        });
        return { contentLeft, contentRight, children };
      });
      for (const child of bounds.children) {
        assert(child.left >= bounds.contentLeft - 0.5 && child.right <= bounds.contentRight + 0.5,
          `${width} contact child outside content bounds: ${JSON.stringify(child)}`);
      }
      await page.locator('[data-copy-email]').focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.querySelector('[data-copy-status]').textContent.trim() === 'Email copied.');
      const gmail = await page.locator('a:has-text("Open Gmail compose")').getAttribute('href');
      const mailto = await page.locator('a[href="mailto:rivune.crave757@slmails.com"]').count();
      assert(gmail.includes('to=rivune.crave757%40slmails.com'), `${width} Gmail address`);
      assert(mailto === 1, `${width} mailto`);
      report.contact[width] = { contained: true, copy: true, gmail: true, mailto: true, bounds };
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + 'how-it-works/');
    const labels = await page.locator('.mode-accordion summary strong').allTextContents();
    assert(labels.join('|') === 'Normal AI|Council strategy|Swarm strategy', `mode labels ${labels.join('|')}`);
    for (let i = 0; i < 3; i++) {
      await page.locator('.mode-accordion details').nth(i).evaluate(element => element.removeAttribute('open'));
      const summary = page.locator('.mode-accordion details').nth(i).locator('summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert(await page.locator('.mode-accordion details').nth(i).getAttribute('open') !== null, `accordion ${i}`);
    }
    const howText = await page.locator('main').innerText();
    assert(howText.includes('No live Tauri provider request has been verified yet.'), 'Tauri provider truth');
    report.modes = { labels, keyboard: true, tauriTruth: true };
    await page.screenshot({ path: path.join(__dirname, 'how-mobile390.png'), fullPage: true });

    await page.goto(base + 'download/');
    const expected = {
      mac: 'macOS download not yet available',
      windows: 'Windows download not yet available',
      linux: 'Linux download not yet available',
    };
    for (const [platform, title] of Object.entries(expected)) {
      await page.locator(`[data-platform="${platform}"]`).click();
      assert((await page.locator('[data-platform-title]').textContent()).trim() === title, `${platform} state`);
    }
    const downloadText = await page.locator('main').textContent();
    assert(downloadText.includes('legacy SwiftUI Mac code'), 'legacy source disclosure');
    report.platforms = expected;
    await page.screenshot({ path: path.join(__dirname, 'download-mobile390.png'), fullPage: true });

    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [route, file] of [['', 'home-desktop.png'], ['app/', 'app-desktop.png'], ['how-it-works/', 'how-desktop.png'], ['download/', 'download-desktop.png']]) {
      await page.goto(base + route);
      await page.screenshot({ path: path.join(__dirname, file), fullPage: true });
    }
    await page.setViewportSize({ width: 320, height: 568 });
    for (const [route, file] of [['', 'home-mobile320.png'], ['app/', 'app-mobile320.png']]) {
      await page.goto(base + route);
      await page.screenshot({ path: path.join(__dirname, file), fullPage: true });
    }

    assert(report.errors.length === 0, `browser errors: ${report.errors.join('; ')}`);
    fs.writeFileSync(path.join(__dirname, 'browser-qa.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(__dirname, 'browser-qa.log'), 'PASS 9 routes at 1280/768/390/320; contact, keyboard modes, platform states, Tauri disclosures, overflow and browser errors\n');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
