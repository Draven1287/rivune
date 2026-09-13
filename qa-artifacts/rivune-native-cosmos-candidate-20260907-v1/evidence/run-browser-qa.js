const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const base = 'http://127.0.0.1:4295/rivune/';
const browserPath = '/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const outDir = __dirname;
const routes = [
  ['', 'Rivune — A Native Mac Workspace for Your AI Team', 1],
  ['app/', 'The Rivune App — Native AI Workspace for Mac', 2],
  ['how-it-works/', 'How Rivune Works — One AI Team and Appointed Lead', 2],
  ['faq/', 'Rivune FAQ — Availability, Providers, Usage, and Privacy', 2],
  ['about/', 'About Aarav and Rivune — Why the Project Exists', 2],
  ['download/', 'Download Rivune — Platform Availability', 2],
  ['privacy/', 'Privacy & data sharing — Rivune', 3],
  ['council-vs-swarm/', 'How Rivune Coordinates One AI Team', 2],
];
const viewports = [
  ['desktop', 1280, 1000],
  ['tablet', 768, 900],
  ['mobile', 390, 844],
  ['small-mobile', 320, 568],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  const report = { base, routes: [], viewportChecks: [], navigation: {}, desktopMore: {}, mobileMenu: {}, demo: {}, productPreview: {}, reducedMotion: {}, download: {}, consoleErrors: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
    page.on('pageerror', err => report.consoleErrors.push(err.message));

    for (const [route, title, currentCount] of routes) {
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      assert(response && response.status() === 200, `${route || 'home'} direct load was not HTTP 200`);
      const reload = await page.reload({ waitUntil: 'networkidle' });
      assert(reload && reload.status() === 200, `${route || 'home'} refresh was not HTTP 200`);
      assert(await page.title() === title, `${route || 'home'} title mismatch: ${await page.title()}`);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      assert(canonical === `https://draven1287.github.io/rivune/${route}`, `${route || 'home'} canonical mismatch: ${canonical}`);
      assert(await page.locator('[aria-current="page"]').count() === currentCount, `${route || 'home'} aria-current count mismatch`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 1, `${route || 'home'} horizontally overflows by ${overflow}px`);
      const badImages = await page.locator('img').evaluateAll(imgs => imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
      assert(badImages.length === 0, `${route || 'home'} has broken images: ${badImages.join(', ')}`);
      report.routes.push({ route: '/' + route, status: response.status(), refreshStatus: reload.status(), title, canonical, currentCount, overflow });
    }

    await page.goto(base);
    await page.locator('.nav-links a[href="/rivune/app/"]').click();
    await page.locator('.nav-links a[href="/rivune/how-it-works/"]').click();
    assert(page.url() === base + 'how-it-works/', 'navigation did not reach how-it-works');
    await page.goBack(); assert(page.url() === base + 'app/', 'first Back did not return to app');
    await page.goBack(); assert(page.url() === base, 'second Back did not return home');
    await page.goForward(); assert(page.url() === base + 'app/', 'Forward did not return to app');
    await page.reload(); assert(page.url() === base + 'app/', 'refresh did not preserve app route');
    report.navigation = { homeToAppToHow: true, backBackForwardRefresh: true };

    for (const [name, width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto(base, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 1, `home ${name} horizontally overflows by ${overflow}px`);
      await page.screenshot({ path: path.join(outDir, `home-${name}-${width}x${height}.png`), fullPage: true });
      report.viewportChecks.push({ name, width, height, overflow });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route] of routes.slice(1)) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 1, `${route} mobile horizontally overflows by ${overflow}px`);
      await page.screenshot({ path: path.join(outDir, `${route.replace(/\/$/, '')}-mobile-390x844.png`), fullPage: true });
    }

    await page.goto(base);
    await page.locator('.mobile-menu summary').focus();
    await page.keyboard.press('Enter');
    assert(await page.locator('.mobile-menu').getAttribute('open') !== null, 'mobile menu did not open with Enter');
    await page.keyboard.press('Tab');
    const focusedHref = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('href'));
    assert(focusedHref === '/rivune/app/', `first mobile menu focus was ${focusedHref}`);
    await page.keyboard.press('Enter');
    await page.waitForURL(base + 'app/');
    assert(await page.locator('.mobile-menu').getAttribute('open') === null, 'mobile menu remained open on destination');
    report.mobileMenu = { keyboardOpen: true, firstLink: focusedHref, destination: page.url(), closedOnDestination: true };

    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(base);
    const moreSummary = page.locator('.nav-more summary');
    await moreSummary.focus(); await page.keyboard.press('Enter');
    assert(await page.locator('.nav-more').getAttribute('open') !== null, 'desktop More did not open by keyboard');
    await page.keyboard.press('Escape');
    assert(await page.locator('.nav-more').getAttribute('open') === null, 'desktop More did not close with Escape');
    assert(await moreSummary.evaluate(el => el === document.activeElement), 'desktop More did not return focus');
    await moreSummary.click(); await page.locator('.hero-copy').click();
    assert(await page.locator('.nav-more').getAttribute('open') === null, 'desktop More did not close outside');
    report.desktopMore = { keyboardOpen: true, escapeDismissal: true, focusReturn: true, outsideDismissal: true };

    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(base);
    await page.locator('[data-demo-example="proposal"]').click();
    assert(await page.locator('[data-demo-example="proposal"]').getAttribute('aria-pressed') === 'true', 'proposal example was not selected');
    assert((await page.locator('[data-demo-label]').textContent()).includes('Review a proposal'), 'proposal content did not render');
    await page.locator('[data-demo-stage="review"]').click();
    await page.waitForTimeout(50);
    assert((await page.locator('[data-demo-label]').textContent()).includes('Review'), 'review stage did not render');
    assert(await page.locator('[data-demo-stage="review"]').evaluate(el => el === document.activeElement), 'demo control did not retain focus');
    await page.locator('[data-demo-reset]').click();
    assert((await page.locator('[data-demo-label]').textContent()).includes('Plan a project · Perspectives'), 'demo reset failed');
    report.demo = { exampleSelection: true, stageSelection: true, controlRetainsFocus: true, reset: true, disclosure: await page.locator('.cosmos-demo-foot p').textContent() };

    await page.goto(base);
    assert(await page.locator('.cosmos-demo').count() === 1, 'home interactive demo missing');
    assert(await page.locator('.workspace-preview').count() === 0, 'home still has the stacked workspace preview');
    assert(await page.locator('img[src*="native-workspace"],.product-image-zoom').count() === 0, 'home still references an app screenshot');
    const backgroundImage = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage);
    assert(backgroundImage.includes('/rivune/assets/rivune-workspace-milky-way.png'), `native background missing: ${backgroundImage}`);
    const assetResponse = await page.request.get(base + 'assets/rivune-workspace-milky-way.png');
    assert(assetResponse.status() === 200, `native background returned ${assetResponse.status()}`);
    report.productPreview.home = { singleInteractiveHero: true, workspacePreviewCount: 0, screenshotReferences: 0, backgroundImage };

    await page.goto(base + 'app/');
    assert(await page.locator('.workspace-preview').count() === 1, 'app DOM workspace preview missing');
    assert(await page.locator('img[src*="native-workspace"],.product-image-zoom').count() === 0, 'app still references an app screenshot');
    report.productPreview.app = { domBuilt: true, screenshotReferences: 0, disclosure: await page.locator('.preview-disclosure').textContent() };

    await page.goto(base + 'download/');
    const disabled = await page.locator('button:disabled').count();
    const macOnlyInitial = await page.locator('[data-mac-only]:visible').count();
    const sourceHref = await page.locator('.source-link').getAttribute('href');
    assert(disabled === 0, `expected no unavailable installer control, found ${disabled}`);
    assert(sourceHref.includes('source-preview'), 'source preview link is missing or mixed with installer control');
    await page.locator('[data-platform="windows"]').click();
    assert(await page.locator('[data-platform-title]').textContent() === 'Windows version is planned', 'Windows unavailable state mismatch');
    assert(await page.locator('[data-mac-only]:visible').count() === 0, 'Mac-only download remains visible for Windows');
    await page.locator('[data-platform="linux"]').click();
    assert(await page.locator('[data-platform-title]').textContent() === 'Linux version is planned', 'Linux unavailable state mismatch');
    assert(await page.locator('[data-mac-only]:visible').count() === 0, 'Mac-only download remains visible for Linux');
    await page.locator('[data-platform="mac"]').click();
    assert(await page.locator('[data-mac-only]:visible').count() === macOnlyInitial, 'Mac-only content did not return to its initial state');
    report.download = { disabledInstallerControls: disabled, sourcePreviewHref: sourceHref, windowsPlanned: true, linuxPlanned: true, macOnlyContentGated: true };

    await page.setViewportSize({ width: 640, height: 500 });
    await page.goto(base);
    const zoomOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(zoomOverflow <= 1, `200% zoom equivalent viewport overflows by ${zoomOverflow}px`);
    report.viewportChecks.push({ name: '200-percent-zoom-equivalent', width: 640, height: 500, overflow: zoomOverflow });
    await context.close();

    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(base);
    const scrollBehavior = await reducedPage.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    assert(scrollBehavior === 'auto', `reduced-motion scroll behavior is ${scrollBehavior}`);
    report.reducedMotion = { scrollBehavior };
    await reduced.close();

    assert(report.consoleErrors.length === 0, `console errors: ${report.consoleErrors.join('; ')}`);
    fs.writeFileSync(path.join(outDir, 'browser-qa.json'), JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'browser-qa.log'), `PASS: ${routes.length} routes, ${viewports.length} home viewports, history, accessible More/mobile menus, DOM product previews, demo controls, reduced motion, and download gating verified.\n`);
    console.log('PASS', JSON.stringify(report, null, 2));
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 2000))]);
  }
})().then(() => process.exit(0)).catch(error => { console.error(error.stack || error); process.exit(1); });
