const fs = require("fs");
const path = require("path");
const { chromium } = require("/Users/Aaravshah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/Users/Aaravshah/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.route("http://rivune-runtime.test/**", async (route) => {
      const name = new URL(route.request().url()).pathname.slice(1) || "index.html";
      if (!["index.html", "styles.css", "app.mjs", "core.mjs", "desktop-host.mjs"].includes(name)) return route.abort();
      await route.fulfill({ status: 200, body: fs.readFileSync(path.join(__dirname, "..", "web", name)), contentType: name.endsWith(".mjs") ? "text/javascript" : name.endsWith(".css") ? "text/css" : "text/html" });
    });
    await page.addInitScript(() => {
      window.__polls = [];
      window.setInterval = (callback) => { window.__polls.push(callback); return 1; };
      window.__RIVUNE_DESKTOP_HOST__ = {
        getSnapshot: async () => ({ schemaVersion: 1, selectedProviderID: "fixture", conversations: [{ id: "c1", title: "Fixture conversation", draft: "" }], runs: [] }),
        openConversation: async () => {}, submitRun: async (request) => ({ state: "accepted", requestID: request.id }), reconcileRun: async (id) => ({ state: "accepted", requestID: id }),
      };
    });
    await page.goto("http://rivune-runtime.test/", { waitUntil: "networkidle" });
    await page.locator("#conversations button").focus();
    await page.evaluate(async () => { for (const tick of window.__polls) tick(); await new Promise((done) => setTimeout(done, 0)); });
    const preserved = await page.evaluate(() => document.activeElement.matches("#conversations button"));
    if (!preserved || errors.length) throw new Error(JSON.stringify({ preserved, errors }));
    console.log(JSON.stringify({ focusPreserved: true, errors: [] }));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
